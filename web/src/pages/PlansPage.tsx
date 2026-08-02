import { useEffect, useState } from "react";
import { useGymId } from "../context/AuthContext";
import { listPlans, createPlan } from "../firestore/plans";
import type { MembershipPlan } from "../firestore/types";
import { Button, EmptyState, ErrorText, Icon, Input, ListRow, Modal, PageHeader, PageSpinner, Pill } from "../components/ui";

const INTERVALS = ["day", "week", "month", "year"];

export default function PlansPage() {
  const gymId = useGymId();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [interval, setInterval_] = useState("month");
  const [maxMembers, setMaxMembers] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    listPlans(gymId)
      .then(setPlans)
      .finally(() => setLoading(false));
  };

  useEffect(load, [gymId]);

  const handleCreate = async () => {
    const priceCents = Math.round(parseFloat(price) * 100);
    if (!name.trim() || !priceCents || priceCents <= 0) {
      setError("Enter a plan name and a valid price.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createPlan(gymId, {
        name: name.trim(),
        priceCents,
        billingInterval: interval,
        maxMembers: parseInt(maxMembers, 10) || 1,
      });
      setModalOpen(false);
      setName("");
      setPrice("");
      setMaxMembers("1");
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Membership plans"
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Icon name="add" className="!text-lg" />
            New plan
          </Button>
        }
      />

      {loading && <PageSpinner />}
      {!loading && plans.length === 0 && <EmptyState>No plans yet.</EmptyState>}

      <div className="flex flex-col gap-sm">
        {plans.map((p) => (
          <ListRow key={p.id} className="flex items-center justify-between">
            <div>
              <p className="font-headline text-headline-sm font-semibold text-on-surface">{p.name}</p>
              <p className="mt-0.5 font-label-md text-label-md text-on-surface-variant">
                up to {p.maxMembers} member{p.maxMembers === 1 ? "" : "s"}
              </p>
            </div>
            <p className="font-headline text-headline-sm font-bold text-primary-container">
              ${(p.priceCents / 100).toFixed(2)}
              <span className="text-on-surface-variant font-label-sm text-label-sm">/{p.billingInterval}</span>
            </p>
          </ListRow>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Membership Plan">
        <Input label="Plan name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Price (e.g. 49.99)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />

        <div className="mb-3 flex flex-wrap gap-2">
          {INTERVALS.map((i) => (
            <Pill key={i} active={interval === i} onClick={() => setInterval_(i)}>
              {i}
            </Pill>
          ))}
        </div>

        <Input
          label="Max members on this plan"
          inputMode="numeric"
          value={maxMembers}
          onChange={(e) => setMaxMembers(e.target.value)}
        />

        <ErrorText>{error}</ErrorText>

        <div className="mt-2 flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setModalOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button fullWidth loading={saving} onClick={handleCreate}>
            Create
          </Button>
        </div>
      </Modal>
    </div>
  );
}
