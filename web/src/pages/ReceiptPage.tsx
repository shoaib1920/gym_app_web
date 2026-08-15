import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useGymId } from "../context/AuthContext";
import { getMember } from "../firestore/members";
import { getGym } from "../firestore/gym";
import type { Gym, MemberDetail } from "../firestore/types";
import { formatCurrency } from "../lib/currency";
import { Button, Icon, PageSpinner } from "../components/ui";

function LineItem({ label, cents }: { label: string; cents: number | null }) {
  if (!cents) return null;
  return (
    <div className="flex justify-between border-b border-black/10 py-xs">
      <span className="font-medium">{label}</span>
      <span className="font-medium">{formatCurrency(cents)}</span>
    </div>
  );
}

/**
 * Printable proof-of-registration for the member's own records. Rendered
 * with hardcoded light colors (not the app's theme tokens) since this is
 * meant to be printed on plain paper, not viewed on a dark screen — and
 * index.css hides the app chrome (nav/header) in @media print so only this
 * receipt goes to the printer.
 */
export default function ReceiptPage() {
  const gymId = useGymId();
  const { memberId } = useParams<{ memberId: string }>();
  const [searchParams] = useSearchParams();
  const isFresh = searchParams.get("fresh") === "1";

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [gym, setGym] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memberId) return;
    setLoading(true);
    Promise.all([getMember(gymId, memberId), getGym(gymId)])
      .then(([m, g]) => {
        setMember(m);
        setGym(g);
      })
      .finally(() => setLoading(false));
  }, [gymId, memberId]);

  if (loading || !member) {
    return <PageSpinner />;
  }

  const totalCents = (member.registrationFeeCents ?? 0) + (member.gymFeeCents ?? 0) + (member.lockerFeeCents ?? 0);

  // Most browsers print a document-title header above the page content
  // (from document.title, "Iron Ops | Gym Manager" everywhere else in this
  // app) — swapping it to the gym's own name just for the print call is
  // what actually keeps that off the printed receipt, since @media print
  // CSS can't reach a browser-injected header/footer.
  const handlePrint = () => {
    const original = document.title;
    document.title = gym?.name ?? "Receipt";
    const restore = () => {
      document.title = original;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  return (
    <div className="max-w-[32rem] mx-auto">
      <div className="print:hidden mb-lg flex items-center justify-between">
        {isFresh ? (
          <Link to="/members" className="font-label-md text-label-md text-primary-container">
            Skip &amp; go to members
          </Link>
        ) : (
          <Link to={`/members/${member.id}`} className="font-label-md text-label-md text-primary-container">
            &larr; Back to profile
          </Link>
        )}
        <Button onClick={handlePrint}>
          <Icon name="print" className="!text-lg" />
          Print receipt
        </Button>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-xl text-black print:border-0 print:rounded-none print:p-0">
        <div className="text-center mb-lg">
          <h1 className="text-2xl font-black uppercase tracking-tight">{gym?.name ?? "Gym"}</h1>
          <p className="text-sm text-black/80 font-semibold mt-xs">Registration Receipt</p>
        </div>

        <div className="flex justify-between text-sm font-semibold mb-lg">
          <span>Date: {new Date().toLocaleDateString()}</span>
          <span>Reg. #: {member.memberCode}</span>
        </div>

        <div className="grid grid-cols-2 gap-md text-sm mb-lg">
          <div>
            <p className="text-black font-bold uppercase text-xs">Member name</p>
            <p className="font-semibold">{member.fullName}</p>
          </div>
          <div>
            <p className="text-black font-bold uppercase text-xs">Phone</p>
            <p className="font-semibold">{member.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-black font-bold uppercase text-xs">Gender</p>
            <p className="font-semibold capitalize">{member.gender ?? "—"}</p>
          </div>
          <div>
            <p className="text-black font-bold uppercase text-xs">Date of joining</p>
            <p className="font-semibold">{member.joiningDate ?? "—"}</p>
          </div>
          <div>
            <p className="text-black font-bold uppercase text-xs">Ending date</p>
            <p className="font-semibold">{member.endingDate ?? "—"}</p>
          </div>
        </div>

        <div className="border-t border-black/20 pt-md">
          <p className="font-bold uppercase text-sm mb-sm">Fees received</p>
          <LineItem label="Registration fee (one-time)" cents={member.registrationFeeCents} />
          <LineItem label="Gym fee" cents={member.gymFeeCents} />
          <LineItem label="Locker fee" cents={member.lockerFeeCents} />
          <div className="flex justify-between pt-sm font-bold text-lg">
            <span>Total</span>
            <span>{formatCurrency(totalCents)}</span>
          </div>
        </div>

        <div className="mt-2xl flex justify-between text-xs font-semibold text-black/80">
          <div>
            <p className="border-t border-black/40 pt-1 mt-8 w-32 text-center">Member signature</p>
          </div>
          <div>
            <p className="border-t border-black/40 pt-1 mt-8 w-32 text-center">Received by</p>
          </div>
        </div>

        <div className="mt-xl pt-md border-t border-black/10 text-center text-[10px] text-black/60">
          Powered by Devtimize
        </div>
      </div>
    </div>
  );
}
