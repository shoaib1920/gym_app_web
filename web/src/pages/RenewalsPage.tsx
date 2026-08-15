import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useGymId } from "../context/AuthContext";
import { listMembers } from "../firestore/members";
import { listDueMembers, renewalLabel, type DueMember } from "../lib/renewals";
import { EmptyState, PageHeader, PageSpinner, StatusPill } from "../components/ui";

const WITHIN_DAYS = 7;

export default function RenewalsPage() {
  const gymId = useGymId();
  const [dueMembers, setDueMembers] = useState<DueMember[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listMembers(gymId)
      .then((members) => setDueMembers(listDueMembers(members, WITHIN_DAYS)))
      .finally(() => setLoading(false));
  }, [gymId]);

  return (
    <div>
      <PageHeader
        title="Renewals"
        subtitle={`Members overdue or due within ${WITHIN_DAYS} days, based on their ending date.`}
      />

      {loading && <PageSpinner />}

      {!loading && dueMembers && dueMembers.length === 0 && <EmptyState>No renewals due right now.</EmptyState>}

      {!loading && dueMembers && dueMembers.length > 0 && (
        <div className="flex flex-col gap-sm">
          {dueMembers.map(({ member, status }) => (
            <Link key={member.id} to={`/members/${member.id}`}>
              <div className="flex items-center justify-between gap-md rounded-xl border border-outline-variant bg-surface-container-low p-md transition-all hover:bg-surface-container-high active:scale-[0.99]">
                <div className="min-w-0">
                  <p className="truncate font-headline text-headline-sm font-semibold text-on-surface">{member.fullName}</p>
                  <p className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">
                    #{member.memberCode} &middot; {member.endingDate}
                  </p>
                </div>
                <StatusPill variant={status.isOverdue ? "error" : "neutral"}>{renewalLabel(status)}</StatusPill>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
