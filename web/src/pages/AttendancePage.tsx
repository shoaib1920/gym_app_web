import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useGymId } from "../context/AuthContext";
import { listAttendance } from "../firestore/attendance";
import type { AttendanceLogEntry, AttendanceSource } from "../firestore/types";
import { EmptyState, PageHeader, PageSpinner, StatusPill } from "../components/ui";

const SOURCE_LABEL: Record<AttendanceSource, string> = {
  scanner: "Front desk",
  kiosk: "Self check-in",
  import: "Imported",
};

function toDateInputValue(d: Date): string {
  const tzOffsetMs = d.getTimezoneOffset() * 60 * 1000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}

function parseDayBounds(dateInput: string): { from: Date; to: Date } {
  const from = new Date(`${dateInput}T00:00:00`);
  const to = new Date(`${dateInput}T23:59:59.999`);
  return { from, to };
}

export default function AttendancePage() {
  const gymId = useGymId();
  const [dateInput, setDateInput] = useState(() => toDateInputValue(new Date()));
  const [entries, setEntries] = useState<AttendanceLogEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const { from, to } = parseDayBounds(dateInput);
    listAttendance(gymId, from, to)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [gymId, dateInput]);

  const isToday = dateInput === toDateInputValue(new Date());

  return (
    <div>
      <PageHeader
        title="Attendance Log"
        subtitle={`${entries?.length ?? 0} check-in${entries?.length === 1 ? "" : "s"} ${isToday ? "today" : "on this day"}.`}
        action={
          <input
            type="date"
            value={dateInput}
            max={toDateInputValue(new Date())}
            onChange={(e) => setDateInput(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm text-on-surface outline-none focus:border-primary-container"
          />
        }
      />

      {loading && <PageSpinner />}

      {!loading && entries && entries.length === 0 && <EmptyState>No check-ins on this day.</EmptyState>}

      {!loading && entries && entries.length > 0 && (
        <div className="flex flex-col gap-sm">
          {entries.map((entry) => (
            <Link key={entry.id} to={`/members/${entry.memberId}`}>
              <div className="flex items-center justify-between gap-md rounded-xl border border-outline-variant bg-surface-container-low p-md transition-all hover:bg-surface-container-high active:scale-[0.99]">
                <div className="min-w-0">
                  <p className="truncate font-headline text-headline-sm font-semibold text-on-surface">{entry.memberName}</p>
                  <p className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">
                    {entry.checkedInAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <StatusPill variant="neutral">{SOURCE_LABEL[entry.source]}</StatusPill>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
