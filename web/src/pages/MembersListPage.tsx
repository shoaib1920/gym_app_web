import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useGymId } from "../context/AuthContext";
import { listMembers } from "../firestore/members";
import type { Member } from "../firestore/types";
import { Button, EmptyState, ErrorText, Icon, ListRow, PageHeader, PageSpinner, StatusPill } from "../components/ui";

const STATUS_PILL: Record<Member["status"], "active" | "neutral" | "error"> = {
  active: "active",
  frozen: "neutral",
  cancelled: "error",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function MembersListPage() {
  const gymId = useGymId();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listMembers(gymId)
      .then((data) => !cancelled && setMembers(data))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [gymId]);

  return (
    <div>
      <PageHeader
        title="Member roster"
        subtitle={`${members.length} total ${members.length === 1 ? "member" : "members"}`}
        action={
          <Link to="/members/new">
            <Button>
              <Icon name="person_add" className="!text-lg" />
              Add member
            </Button>
          </Link>
        }
      />

      <ErrorText>{error}</ErrorText>
      {loading && <PageSpinner />}

      {!loading && members.length === 0 && <EmptyState>No members yet.</EmptyState>}

      <div className="flex flex-col gap-sm">
        {members.map((m) => (
          <Link key={m.id} to={`/members/${m.id}`}>
            <ListRow className="flex items-center gap-md">
              <div className="w-12 h-12 shrink-0 rounded-lg bg-surface-container-highest flex items-center justify-center font-headline text-label-md font-bold text-on-surface-variant">
                {initials(m.fullName)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-headline text-headline-sm font-semibold text-on-surface group-hover:text-primary-container transition-colors truncate">
                  {m.fullName}
                </h4>
                {m.isMinor && <p className="text-xs text-on-surface-variant">Minor</p>}
              </div>
              <StatusPill variant={STATUS_PILL[m.status]}>{m.status}</StatusPill>
            </ListRow>
          </Link>
        ))}
      </div>
    </div>
  );
}
