import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGymId } from "../context/AuthContext";
import { recordCheckInByCode, type KioskCheckInResult } from "../firestore/checkins";
import { getGym } from "../firestore/gym";
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
 * One screen, not two: the code input never goes away and stays focused
 * after every submission (success or failure), so the next person can
 * start typing immediately without anyone tapping "Next" first. Laid out
 * side-by-side (input | result) rather than stacked, so the page's total
 * height never depends on whether a result is showing — it always fits
 * one screen with no scrolling, on a typical landscape kiosk tablet.
 */
export default function KioskPage() {
  const gymId = useGymId();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [gymName, setGymName] = useState("Check In");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    getGym(gymId).then((gym) => gym?.name && setGymName(gym.name));
  }, [gymId]);

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
      inputRef.current?.focus();
    }
  };

  return (
    <div className="relative flex h-svh w-full items-center justify-center gap-16 bg-background px-16 overflow-hidden">
      <button
        onClick={() => navigate("/")}
        aria-label="Exit kiosk mode"
        className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant/40 transition-colors hover:bg-surface-container hover:text-on-surface-variant"
      >
        <Icon name="settings" />
      </button>

      {/* Left: sized off viewport height (clamped) so it scales up on a big
          kiosk screen but can never push the button below a short window —
          that's what was happening with fixed px sizes before. */}
      <div className="w-full max-w-[30rem] text-center shrink-0">
        <img
          src={`${import.meta.env.BASE_URL}gym-logo.jpg`}
          alt=""
          className="mx-auto rounded-full object-cover border-4 border-primary-container"
          style={{ height: "clamp(6rem, 43vh, 15rem)", width: "clamp(6rem, 43vh, 15rem)" }}
        />
        <h1
          className="mt-md font-headline font-black text-on-surface leading-tight"
          style={{ fontSize: "clamp(1.75rem, 6vh, 3.75rem)" }}
        >
          {gymName}
        </h1>
        <p className="mt-xs font-body-md text-on-surface-variant" style={{ fontSize: "clamp(0.9rem, 2.2vh, 1.25rem)" }}>
          Enter your member code
        </p>

        <form onSubmit={handleSubmit} className="mt-md">
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoFocus
            placeholder="0000"
            className="w-full rounded-xl border border-outline-variant bg-surface-container-low text-center font-headline tracking-[0.3em] text-on-surface outline-none focus:border-primary-container"
            style={{ fontSize: "clamp(1.75rem, 6vh, 3.75rem)", padding: "clamp(0.6rem, 2.5vh, 1.5rem) 1rem" }}
          />
          <button
            type="submit"
            disabled={!code.trim() || submitting}
            className="mt-sm w-full rounded-xl bg-primary-container font-label-md font-bold uppercase tracking-wide text-on-primary transition-all active:scale-95 disabled:opacity-30"
            style={{ fontSize: "clamp(0.9rem, 2vh, 1.15rem)", padding: "clamp(0.5rem, 1.8vh, 1rem) 1.25rem" }}
          >
            {submitting ? "Checking in…" : "Check In"}
          </button>
        </form>
      </div>

      <div className="hidden md:block h-[70vh] w-px bg-outline-variant" />

      {/* Right: result panel, same footprint whether idle or showing a result */}
      <div className="hidden md:flex w-full max-w-[30rem] flex-col justify-center">
        {!result && (
          <div className="text-center text-on-surface-variant">
            <Icon name="account_circle" className="!text-4xl opacity-40" />
            <p className="mt-xs font-label-md text-label-md">Your details will show up here</p>
          </div>
        )}

        {result?.ok && (
          <div className="text-left">
            <div className="text-center">
              <Icon name="account_circle" className="!text-3xl text-primary-container" />
              <h2 className="mt-1 font-headline text-5xl font-bold text-on-surface leading-tight">{result.data.fullName}</h2>
              <p className="text-2xl text-on-surface-variant">
                #{result.data.memberCode}
                {result.data.phone && <> &middot; {result.data.phone}</>}
              </p>
            </div>

            <div className={`mt-sm rounded-xl px-md py-md text-center ${FEE_BANNER[result.data.fee.state].className}`}>
              <Icon name={FEE_BANNER[result.data.fee.state].icon} filled className="!text-3xl" />
              <p className="mt-0.5 font-headline text-4xl font-bold">{result.data.fee.label}</p>
              {result.data.fee.planName && <p className="mt-0.5 text-lg opacity-80">{result.data.fee.planName}</p>}
            </div>

            <div className="mt-sm rounded-xl border border-outline-variant bg-surface-container-low px-md py-xs">
              <div className="flex justify-between py-xs">
                <span className="text-lg text-on-surface-variant">Status</span>
                <span className="text-lg text-on-surface capitalize">{result.data.status}</span>
              </div>
              <div className="flex justify-between py-xs">
                <span className="text-lg text-on-surface-variant">Member since</span>
                <span className="text-lg text-on-surface">{result.data.memberSince.toLocaleDateString()}</span>
              </div>
            </div>

            <p className="mt-sm flex items-center justify-center gap-xs font-label-sm text-label-sm text-on-surface-variant">
              <Icon name="check_circle" filled className="!text-base text-primary-container" />
              Attendance marked for today
            </p>
          </div>
        )}

        {result && !result.ok && (
          <div className="text-center">
            <Icon name="cancel" filled className="!text-4xl text-error" />
            <h2 className="mt-xs font-headline text-headline-sm font-bold text-error">Check-in failed</h2>
            <p className="mt-xs font-body-md text-body-md text-on-surface-variant">{result.message}</p>
          </div>
        )}
      </div>

      {/* Narrow/portrait screens: result overlays instead of a second column, so it still never grows the page */}
      {result && (
        <div className="md:hidden absolute inset-0 flex items-center justify-center bg-background/98 px-lg" onClick={() => inputRef.current?.focus()}>
          <div className="w-full max-w-[22rem]">
            {result.ok ? (
              <div className="text-left">
                <div className="text-center">
                  <Icon name="account_circle" className="!text-3xl text-primary-container" />
                  <h2 className="mt-1 font-headline text-5xl font-bold text-on-surface leading-tight">{result.data.fullName}</h2>
                  <p className="text-2xl text-on-surface-variant">
                #{result.data.memberCode}
                {result.data.phone && <> &middot; {result.data.phone}</>}
              </p>
                </div>
                <div className={`mt-sm rounded-xl px-md py-md text-center ${FEE_BANNER[result.data.fee.state].className}`}>
                  <Icon name={FEE_BANNER[result.data.fee.state].icon} filled className="!text-3xl" />
                  <p className="mt-0.5 font-headline text-4xl font-bold">{result.data.fee.label}</p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <Icon name="cancel" filled className="!text-4xl text-error" />
                <h2 className="mt-xs font-headline text-headline-sm font-bold text-error">Check-in failed</h2>
                <p className="mt-xs font-body-md text-body-md text-on-surface-variant">{result.message}</p>
              </div>
            )}
            <p className="mt-md text-center font-label-sm text-label-sm text-on-surface-variant">Tap anywhere to check in the next person</p>
          </div>
        </div>
      )}
    </div>
  );
}
