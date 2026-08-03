import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useGymId } from "../context/AuthContext";
import { getFeeOverview } from "../firestore/subscriptions";
import type { FeeOverview, FeeOverviewPayer } from "../firestore/types";
import { EmptyState, Pill, PageHeader, PageSpinner, StatusPill } from "../components/ui";
import { formatCurrency } from "../lib/currency";

const STATUS_PILL: Record<FeeOverviewPayer["status"], "active" | "error"> = {
  paid: "active",
  pending: "error",
};

const FILTERS = ["all", "pending", "paid"] as const;
type Filter = (typeof FILTERS)[number];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function dueLabel(p: FeeOverviewPayer): string {
  if (!p.currentPeriodEnd) return "No plan recorded yet";
  const days = Math.round((p.currentPeriodEnd.getTime() - Date.now()) / MS_PER_DAY);
  if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
  if (days === 0) return "Due today";
  return `Due in ${days} day${days === 1 ? "" : "s"}`;
}

function daysAsMember(joinedAt: Date): number {
  return Math.max(0, Math.floor((Date.now() - joinedAt.getTime()) / MS_PER_DAY));
}

export default function FeeOverviewPage() {
  const gymId = useGymId();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = (searchParams.get("status") as Filter) ?? "all";

  const [overview, setOverview] = useState<FeeOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getFeeOverview(gymId)
      .then(setOverview)
      .finally(() => setLoading(false));
  }, [gymId]);

  if (loading || !overview) {
    return <PageSpinner />;
  }

  const visible = filter === "all" ? overview.payers : overview.payers.filter((p) => p.status === filter);

  return (
    <div>
      <PageHeader title="Fees" subtitle="Who's paid and who's overdue, based on their latest recorded subscription." />

      <div className="mb-lg flex flex-wrap gap-sm">
        {FILTERS.map((f) => (
          <Pill key={f} active={filter === f} onClick={() => setSearchParams(f === "all" ? {} : { status: f })}>
            {f === "all" ? "All" : f === "pending" ? "Pending" : "Paid"}
          </Pill>
        ))}
      </div>

      {visible.length === 0 && <EmptyState>No payers in this filter.</EmptyState>}

      <div className="flex flex-col gap-sm">
        {visible.map((p) => (
          <Link key={p.payerId} to={`/payers/${p.payerId}`}>
            <div className="group flex items-center justify-between gap-md rounded-xl border border-outline-variant bg-surface-container-low p-md hover:bg-surface-container-high transition-all active:scale-[0.99]">
              <div className="min-w-0">
                <p className="font-headline text-headline-sm font-semibold text-on-surface group-hover:text-primary-container transition-colors truncate">
                  {p.payerName}
                </p>
                <p className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">
                  {p.planName ? `${p.planName} · ${formatCurrency(p.priceCents)}` : "Not on a plan"}
                  {" · "}
                  <span className={p.status === "pending" ? "text-error" : ""}>{dueLabel(p)}</span>
                </p>
                <p className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">
                  Member since {p.joinedAt.toLocaleDateString()} ({daysAsMember(p.joinedAt)} days)
                </p>
              </div>
              <StatusPill variant={STATUS_PILL[p.status]}>{p.status === "paid" ? "Paid" : "Pending"}</StatusPill>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
