import { useEffect, useMemo, useState } from "react";
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
  const [search, setSearch] = useState("");

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.memberCode.toLowerCase().includes(q) ||
        (m.phone ?? "").toLowerCase().includes(q)
    );
  }, [members, search]);

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

      <div className="relative mb-md">
        <Icon
          name="search"
          className="!text-lg pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by reg #, name, or phone"
          className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-sm pl-10 pr-md text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/60 focus:border-primary-container"
        />
      </div>

      <ErrorText>{error}</ErrorText>
      {loading && <PageSpinner />}

      {!loading && members.length === 0 && <EmptyState>No members yet.</EmptyState>}
      {!loading && members.length > 0 && filtered.length === 0 && <EmptyState>No members match "{search}".</EmptyState>}

      <div className="flex flex-col gap-sm">
        {filtered.map((m) => (
          <Link key={m.id} to={`/members/${m.id}`}>
            <ListRow className="flex items-center gap-md">
              <div className="w-12 h-12 shrink-0 rounded-lg bg-surface-container-highest flex items-center justify-center font-headline text-label-md font-bold text-on-surface-variant">
                {initials(m.fullName)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-headline text-headline-sm font-semibold text-on-surface group-hover:text-primary-container transition-colors truncate">
                  {m.fullName}
                </h4>
                <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
                  #{m.memberCode}
                  {m.phone && <> &middot; {m.phone}</>}
                  {m.isMinor && <> &middot; Minor</>}
                </p>
              </div>
              <StatusPill variant={STATUS_PILL[m.status]}>{m.status}</StatusPill>
            </ListRow>
          </Link>
        ))}
      </div>
    </div>
  );
}
