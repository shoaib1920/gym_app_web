import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGymId } from "../context/AuthContext";
import { recordCheckInByCode } from "../firestore/checkins";
import { Icon } from "../components/ui";

/**
 * Full-screen self-service terminal — meant to be left running on a tablet
 * at the front desk, signed in once as the gym owner. Members type their
 * own memberCode to check in without staff involvement; there's no member
 * login involved (this app doesn't have one), the write still happens
 * under the owner's already-authenticated session. Rendered outside
 * AppShell (see App.tsx) so a member left alone with the tablet can't
 * wander into admin screens — the small icon in the corner is the only way
 * back, mirroring the gear-icon pattern from the original kiosk app.
 */
export default function KioskPage() {
  const gymId = useGymId();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [result]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await recordCheckInByCode(gymId, code);
      setResult({ ok: true, message: `Welcome, ${res.fullName}!` });
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
    <div className="relative flex h-svh w-full flex-col items-center justify-center bg-background px-lg">
      <button
        onClick={() => navigate("/")}
        aria-label="Exit kiosk mode"
        className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant/40 transition-colors hover:bg-surface-container hover:text-on-surface-variant"
      >
        <Icon name="settings" />
      </button>

      {!result ? (
        <div className="w-full max-w-sm text-center">
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
      ) : (
        <div className="w-full max-w-sm text-center">
          <div
            className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${
              result.ok ? "bg-primary-container" : "bg-error-container"
            }`}
          >
            <Icon
              name={result.ok ? "check_circle" : "cancel"}
              filled
              className={`!text-5xl ${result.ok ? "text-on-primary" : "text-on-error-container"}`}
            />
          </div>
          <h2 className={`mt-lg font-headline text-headline-md font-bold ${result.ok ? "text-on-surface" : "text-error"}`}>
            {result.ok ? "Checked in" : "Check-in failed"}
          </h2>
          <p className="mt-xs font-body-md text-body-md text-on-surface-variant">{result.message}</p>

          <button
            onClick={handleReset}
            className="mt-xl rounded-xl bg-surface-container px-xl py-md font-label-md text-label-md font-bold uppercase tracking-wide text-on-surface transition-all active:scale-95"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
