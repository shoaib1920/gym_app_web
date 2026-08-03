import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useGymId } from "../context/AuthContext";
import { getPayer, linkMemberToPayer } from "../firestore/payers";
import { listMembers } from "../firestore/members";
import { listPlans, billingIntervalToDays } from "../firestore/plans";
import { createSubscription, getLatestSubscriptionForPayer } from "../firestore/subscriptions";
import type { PayerFeeStatus } from "../firestore/subscriptions";
import type { Member, MembershipPlan, PayerDetail as PayerDetailType } from "../firestore/types";
import { Button, Icon, PageSpinner, StatusPill } from "../components/ui";
import { formatCurrency } from "../lib/currency";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function dueLabel(feeStatus: PayerFeeStatus): string {
  const days = Math.round((feeStatus.currentPeriodEnd.getTime() - Date.now()) / MS_PER_DAY);
  if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
  if (days === 0) return "Due today";
  return `Due in ${days} day${days === 1 ? "" : "s"}`;
}

export default function PayerDetailPage() {
  const gymId = useGymId();
  const { payerId } = useParams<{ payerId: string }>();

  const [payer, setPayer] = useState<PayerDetailType | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [feeStatus, setFeeStatus] = useState<PayerFeeStatus | null | undefined>(undefined);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = () => {
    if (!payerId) return;
    setLoading(true);
    Promise.all([getPayer(gymId, payerId), listMembers(gymId), listPlans(gymId), getLatestSubscriptionForPayer(gymId, payerId)])
      .then(([payerData, membersData, plansData, feeStatusData]) => {
        setPayer(payerData);
        setAllMembers(membersData);
        setPlans(plansData);
        setFeeStatus(feeStatusData);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [gymId, payerId]);

  if (loading || !payer) {
    return <PageSpinner />;
  }

  const linkedMemberIds = new Set(payer.memberLinks.map((l) => l.memberId));
  const unlinkedMembers = allMembers.filter((m) => !linkedMemberIds.has(m.id));

  const handleLink = async (memberId: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await linkMemberToPayer(gymId, payerId!, memberId, "self");
      load();
    } catch (err) {
      setNotice(`Couldn't link member: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleRecordSubscription = async () => {
    if (!selectedPlanId || !payerId) return;
    const plan = plans.find((p) => p.id === selectedPlanId);
    const memberIds = [...linkedMemberIds];
    if (!plan) return;
    if (memberIds.length === 0) {
      setNotice("Link at least one member before recording a subscription.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await createSubscription(gymId, {
        payerId,
        planId: plan.id,
        memberIds,
        billingIntervalDays: billingIntervalToDays(plan.billingInterval),
      });
      setNotice(
        "Subscription recorded — marked active for this billing period. Payment is collected outside the app; update this record when it's time to renew."
      );
      load();
    } catch (err) {
      setNotice(`Couldn't record subscription: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-[32rem] mx-auto">
      <h1 className="font-headline text-headline-lg font-bold text-on-surface">{payer.fullName}</h1>
      <p className="mt-xs font-label-md text-label-md text-on-surface-variant">{payer.email}</p>
      <p className="mt-xs font-label-sm text-label-sm text-on-surface-variant">
        Member since {payer.createdAt.toLocaleDateString()} (
        {Math.max(0, Math.floor((Date.now() - payer.createdAt.getTime()) / MS_PER_DAY))} days)
      </p>

      <div className="mt-lg rounded-xl border border-outline-variant bg-surface-container-low p-md flex items-center justify-between gap-md">
        {feeStatus === undefined ? (
          <p className="font-label-md text-label-md text-on-surface-variant">Checking fee status…</p>
        ) : feeStatus === null ? (
          <p className="font-label-md text-label-md text-on-surface-variant">No plan recorded yet — record one below.</p>
        ) : (
          <>
            <div>
              <p className="font-label-md text-label-md text-on-surface">
                {feeStatus.planName} · {formatCurrency(feeStatus.priceCents)}
              </p>
              <p className={`font-label-sm text-label-sm ${feeStatus.isPaid ? "text-on-surface-variant" : "text-error"}`}>
                {dueLabel(feeStatus)}
              </p>
            </div>
            <StatusPill variant={feeStatus.isPaid ? "active" : "error"}>{feeStatus.isPaid ? "Paid" : "Pending"}</StatusPill>
          </>
        )}
      </div>

      <h4 className="font-headline text-headline-sm font-bold text-on-surface mb-md mt-xl">Linked members</h4>
      {payer.memberLinks.length === 0 ? (
        <p className="font-label-md text-label-md text-on-surface-variant">No members linked yet.</p>
      ) : (
        <div className="space-y-sm">
          {payer.memberLinks.map((l) => (
            <div key={l.linkId} className="flex items-center gap-sm p-md bg-surface-container-low rounded-lg">
              <Icon name="check_circle" className="text-primary-container !text-lg" />
              <p className="font-label-md text-label-md text-on-surface">{l.fullName}</p>
            </div>
          ))}
        </div>
      )}

      <h4 className="font-headline text-headline-sm font-bold text-on-surface mb-md mt-xl">Link a member</h4>
      {unlinkedMembers.length === 0 ? (
        <p className="font-label-md text-label-md text-on-surface-variant">No unlinked members.</p>
      ) : (
        <div className="flex flex-col gap-sm">
          {unlinkedMembers.map((m) => (
            <button
              key={m.id}
              onClick={() => handleLink(m.id)}
              disabled={busy}
              className="flex items-center gap-xs rounded-lg border border-outline-variant px-md py-sm text-left font-label-md text-label-md text-on-surface hover:bg-surface-container-highest disabled:opacity-50 transition-colors"
            >
              <Icon name="add" className="!text-lg text-primary-container" />
              {m.fullName}
            </button>
          ))}
        </div>
      )}

      <h4 className="font-headline text-headline-sm font-bold text-on-surface mb-xs mt-xl">Record a subscription</h4>
      <p className="mb-md font-label-sm text-label-sm text-on-surface-variant">
        Payment is collected outside the app — this just records which plan the payer is on and when it's paid through.
      </p>

      <div className="flex flex-col gap-sm">
        {plans.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPlanId(p.id)}
            className={`rounded-lg border px-md py-sm text-left transition-colors ${
              selectedPlanId === p.id ? "border-primary-container bg-primary-container/10" : "border-outline-variant bg-surface-container-low"
            }`}
          >
            <p className="font-label-md text-label-md font-semibold text-on-surface">{p.name}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              {formatCurrency(p.priceCents)} / {p.billingInterval}
            </p>
          </button>
        ))}
      </div>

      {notice && (
        <p className="mt-md rounded-lg bg-primary-container/10 px-md py-sm font-label-md text-label-md text-primary-fixed-dim">
          {notice}
        </p>
      )}

      <Button fullWidth className="mt-lg" loading={busy} disabled={!selectedPlanId} onClick={handleRecordSubscription}>
        Record subscription
      </Button>
    </div>
  );
}
