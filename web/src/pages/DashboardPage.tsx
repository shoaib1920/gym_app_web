import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGymId } from "../context/AuthContext";
import { listMembers } from "../firestore/members";
import { getFeeOverview } from "../firestore/subscriptions";
import { listEquipment } from "../firestore/equipment";
import type { FeeOverview } from "../firestore/types";
import { Icon } from "../components/ui";
import { formatCurrency } from "../lib/currency";

const QUICK_ACTIONS = [
  { label: "Add Member", to: "/members/new", icon: "person_add" },
  { label: "Scan QR", to: "/scanner", icon: "qr_code_scanner" },
];

function StatCard({
  to,
  label,
  value,
  hint,
  accent = "primary-container",
}: {
  to: string;
  label: string;
  value: string;
  hint: string;
  accent?: string;
}) {
  return (
    <Link
      to={to}
      className="bg-surface-container border border-outline-variant p-lg rounded-xl flex flex-col justify-between hover:bg-surface-container-high transition-all active:scale-[0.99]"
      style={{ borderLeftWidth: 4, borderLeftColor: `var(--color-${accent})` }}
    >
      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">{label}</span>
      <h4 className="font-headline text-headline-lg text-on-surface mt-md">{value}</h4>
      <p className="text-xs text-on-surface-variant mt-sm">{hint}</p>
    </Link>
  );
}

export default function DashboardPage() {
  const gymId = useGymId();
  const navigate = useNavigate();
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [fees, setFees] = useState<FeeOverview | null>(null);
  const [attentionCount, setAttentionCount] = useState<number | null>(null);

  useEffect(() => {
    listMembers(gymId).then((m) => setMemberCount(m.length));
    getFeeOverview(gymId).then(setFees);
    listEquipment(gymId).then((items) => setAttentionCount(items.filter((i) => i.condition !== "good").length));
  }, [gymId]);

  return (
    <div>
      <section className="mb-lg">
        <h2 className="font-headline text-headline-lg font-bold text-on-surface mb-xs">Command Center</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">Today's operations overview.</p>
      </section>

      <div className="grid grid-cols-12 gap-md">
        {/* Quick Actions */}
        <div className="col-span-12 lg:col-span-3 order-2 lg:order-1 flex flex-col gap-md">
          <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest mb-xs">Quick actions</h3>
          {QUICK_ACTIONS.map((action, i) => (
            <button
              key={action.to}
              onClick={() => navigate(action.to)}
              className={`p-lg rounded-xl flex items-center justify-between group active:scale-95 transition-all ${
                i === 0
                  ? "bg-primary-container text-on-primary-fixed hover:bg-primary-fixed-dim"
                  : "bg-surface-container text-on-surface border border-outline-variant hover:bg-surface-container-highest"
              }`}
            >
              <div className="flex items-center gap-md">
                <Icon name={action.icon} />
                <span className="font-label-md text-label-md uppercase font-bold">{action.label}</span>
              </div>
              <Icon name="chevron_right" className="group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>

        {/* Stat cards */}
        <div className="col-span-12 lg:col-span-9 order-1 lg:order-2 grid grid-cols-1 md:grid-cols-2 gap-md">
          <StatCard to="/members" label="Total members" value={memberCount === null ? "—" : String(memberCount)} hint="Everyone registered at your gym." />

          <StatCard
            to="/fees?status=pending"
            label="Fee pending"
            value={fees === null ? "—" : formatCurrency(fees.pendingCents)}
            hint={fees === null ? "" : `${fees.pendingCount} payer${fees.pendingCount === 1 ? "" : "s"} overdue`}
            accent="error"
          />

          <StatCard
            to="/fees?status=paid"
            label="Fee collected"
            value={fees === null ? "—" : formatCurrency(fees.collectedCents)}
            hint={fees === null ? "" : `${fees.paidCount} payer${fees.paidCount === 1 ? "" : "s"} current`}
          />

          <StatCard
            to="/equipment"
            label="Equipment needing attention"
            value={attentionCount === null ? "—" : String(attentionCount)}
            hint="Flagged for repair or replacement."
            accent={attentionCount ? "error" : "primary-container"}
          />
        </div>
      </div>
    </div>
  );
}
