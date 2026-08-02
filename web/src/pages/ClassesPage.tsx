import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useGymId } from "../context/AuthContext";
import { listUpcomingClasses, bookClass } from "../firestore/classes";
import type { GymClass } from "../firestore/types";
import { Button, EmptyState, Icon, PageHeader, PageSpinner } from "../components/ui";

export default function ClassesPage() {
  const gymId = useGymId();
  const [searchParams] = useSearchParams();
  const bookingForMemberId = searchParams.get("bookFor") ?? undefined;

  const [classes, setClasses] = useState<GymClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    listUpcomingClasses(gymId)
      .then(setClasses)
      .finally(() => setLoading(false));
  };

  useEffect(load, [gymId]);

  const handleBook = async (classId: string) => {
    if (!bookingForMemberId) return;
    setBookingId(classId);
    setNotice(null);
    try {
      await bookClass(gymId, classId, bookingForMemberId);
      setNotice("Booked!");
      load();
    } catch (err) {
      setNotice(`Couldn't book class: ${(err as Error).message}`);
    } finally {
      setBookingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Classes"
        action={
          !bookingForMemberId && (
            <Link to="/classes/new">
              <Button>
                <Icon name="event_note" className="!text-lg" />
                New class
              </Button>
            </Link>
          )
        }
      />

      {notice && (
        <p className="mb-md rounded-lg bg-primary-container/10 px-md py-sm font-label-md text-label-md text-primary-fixed-dim">
          {notice}
        </p>
      )}
      {loading && <PageSpinner />}
      {!loading && classes.length === 0 && <EmptyState>No upcoming classes.</EmptyState>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
        {classes.map((c) => {
          const booked = c.capacity - c.spotsRemaining;
          const pct = c.capacity > 0 ? Math.round((booked / c.capacity) * 100) : 0;
          const full = c.spotsRemaining <= 0;
          return (
            <div key={c.id} className="bg-surface-container border border-outline-variant rounded-xl p-md">
              <div className="flex justify-between items-start mb-sm">
                <h4 className="font-headline text-headline-sm font-bold text-on-surface">{c.name}</h4>
                <span className="text-on-surface-variant font-label-sm text-label-sm">
                  {c.startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mb-md">
                {c.startsAt.toLocaleDateString()} · {c.durationMinutes} min
                {c.trainerName ? ` · ${c.trainerName}` : ""}
              </p>

              <div className="flex items-center gap-sm mb-md">
                <div className="flex-1 h-2 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${full ? "bg-error" : "bg-primary-container"}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-bold text-on-surface">
                  {booked}/{c.capacity}
                </span>
              </div>

              {bookingForMemberId && (
                <Button fullWidth onClick={() => handleBook(c.id)} disabled={full || bookingId === c.id} loading={bookingId === c.id}>
                  {full ? "Full" : "Book"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
