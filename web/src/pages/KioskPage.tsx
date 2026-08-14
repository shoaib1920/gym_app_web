import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGymId } from "../context/AuthContext";
import { recordCheckInByCode, type KioskCheckInResult } from "../firestore/checkins";
import { Icon } from "../components/ui";

const FEE_BANNER: Record<KioskCheckInResult["fee"]["state"], { icon: string; className: string }> = {
  paid: { icon: "check_circle", className: "bg-primary-container text-on-primary" },
  overdue: { icon: "error", className: "bg-error-container text-on-error-container" },
  "no-plan": { icon: "info", className: "bg-surface-container-highest text-on-surface-variant" },
};

type Result = { ok: true; data: KioskCheckInResult } | { ok: false; message: string };

/**
 * Full-screen self-service terminal — meant to be left running on a tablet
 * at the front desk, signed in once as the gym owner. Members type their
 * own memberCode to check in without staff involvement; there's no member
 * login involved (this app doesn't have one), the write still happens
 * under the owner's already-authenticated session. Rendered outside
 * AppShell (see App.tsx) so a member left alone with the tablet can't
 * wander into admin screens — the small icon in the corner is the only way
 * back, mirroring the gear-icon pattern from the original kiosk app.
 *
 * Mirrors what gym_attendence_system's kiosk showed: not just a bare "you're
 * checked in", but the member's name and their current fee standing — paid
 * (with days left), overdue, or no plan on record — so the member gets the
 * same self-serve answer a front-desk staffer would have given them.
 */
export default function KioskPage() {
  const gymId = useGymId();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [result]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    try {
      const data = await recordCheckInByCode(gymId, code);
      setResult({ ok: true, data });
    } catch (err) {
      setResult({ ok: false, message: (err as Error).message });
    } finally {
      setCode("");
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setCode("");
  };

  return (
    <div className="relative flex min-h-svh w-full flex-col items-center justify-center bg-background px-lg py-xl">
      <button
        onClick={() => navigate("/")}
        aria-label="Exit kiosk mode"
        className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant/40 transition-colors hover:bg-surface-container hover:text-on-surface-variant"
      >
        <Icon name="settings" />
      </button>

      {!result ? (
        <div className="w-full max-w-[26rem] text-center">
          <Icon name="fitness_center" filled className="!text-5xl text-primary-container" />
          <h1 className="mt-md font-headline text-headline-lg font-black text-on-surface">Check In</h1>
          <p className="mt-xs font-body-md text-body-md text-on-surface-variant">Enter your member code</p>

          <form onSubmit={handleSubmit} className="mt-xl">
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoFocus
              placeholder="0000"
              className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-md py-lg text-center font-headline text-headline-lg tracking-[0.3em] text-on-surface outline-none focus:border-primary-container"
            />
            <button
              type="submit"
              disabled={!code.trim() || submitting}
              className="mt-lg w-full rounded-xl bg-primary-container px-lg py-md font-label-md text-label-md font-bold uppercase tracking-wide text-on-primary transition-all active:scale-95 disabled:opacity-30"
            >
              {submitting ? "Checking in…" : "Check In"}
            </button>
          </form>
        </div>
      ) : result.ok ? (
        <div className="w-full max-w-[26rem] text-center">
          <Icon name="account_circle" className="!text-5xl text-primary-container" />
          <h2 className="mt-md font-headline text-headline-lg font-bold text-on-surface">{result.data.fullName}</h2>
          <p className="mt-xs font-label-md text-label-md text-on-surface-variant">Member #{result.data.memberCode}</p>

          <div className={`mt-lg rounded-xl px-lg py-lg ${FEE_BANNER[result.data.fee.state].className}`}>
            <Icon name={FEE_BANNER[result.data.fee.state].icon} filled className="!text-3xl" />
            <p className="mt-xs font-headline text-headline-sm font-bold">{result.data.fee.label}</p>
            {result.data.fee.planName && (
              <p className="mt-0.5 font-label-sm text-label-sm opacity-80">{result.data.fee.planName}</p>
            )}
          </div>

          <div className="mt-md rounded-xl border border-outline-variant bg-surface-container-low p-md text-left">
            <div className="flex justify-between py-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Status</span>
              <span className="font-label-sm text-label-sm text-on-surface capitalize">{result.data.status}</span>
            </div>
            <div className="flex justify-between py-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Member since</span>
              <span className="font-label-sm text-label-sm text-on-surface">{result.data.memberSince.toLocaleDateString()}</span>
            </div>
          </div>

          <p className="mt-md flex items-center justify-center gap-xs font-label-sm text-label-sm text-on-surface-variant">
            <Icon name="check_circle" filled className="!text-base text-primary-container" />
            Attendance marked for today
          </p>

          <button
            onClick={handleReset}
            className="mt-xl w-full rounded-xl bg-surface-container px-xl py-md font-label-md text-label-md font-bold uppercase tracking-wide text-on-surface transition-all active:scale-95"
          >
            Next
          </button>
        </div>
      ) : (
        <div className="w-full max-w-[26rem] text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-error-container">
            <Icon name="cancel" filled className="!text-5xl text-on-error-container" />
          </div>
          <h2 className="mt-lg font-headline text-headline-md font-bold text-error">Check-in failed</h2>
          <p className="mt-xs font-body-md text-body-md text-on-surface-variant">{result.message}</p>

          <button
            onClick={handleReset}
            className="mt-xl w-full rounded-xl bg-surface-container px-xl py-md font-label-md text-label-md font-bold uppercase tracking-wide text-on-surface transition-all active:scale-95"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
