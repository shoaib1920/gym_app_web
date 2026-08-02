import { useAuth } from "../context/AuthContext";
import { Icon } from "../components/ui";

const STATUS_COPY: Record<string, { headline: string; status: string }> = {
  past_due: { headline: "We weren't able to process your last payment.", status: "PAST DUE" },
  suspended: { headline: "Your subscription is inactive.", status: "SUSPENDED" },
  cancelled: { headline: "Your subscription has been cancelled.", status: "CANCELLED" },
};

export default function InactiveAccountPage() {
  const { state, logout } = useAuth();
  const status = state.phase === "accessDenied" ? state.status : "";
  const copy = STATUS_COPY[status] ?? { headline: "Your account doesn't currently have access.", status: "INACTIVE" };

  return (
    <div className="min-h-svh bg-background flex flex-col">
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-md h-16 bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <Icon name="fitness_center" filled className="text-primary-container" />
          <h1 className="font-headline text-headline-sm font-black text-primary-container tracking-tighter uppercase">Iron Ops</h1>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-md py-sm rounded hover:bg-surface-container-highest transition-colors text-on-surface-variant font-label-md text-label-md"
        >
          <Icon name="logout" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </header>

      <main className="flex-grow flex items-center justify-center p-md pt-24">
        <div className="max-w-[32rem] w-full">
          <div className="bg-surface-container border border-outline-variant p-lg md:p-xl rounded-xl relative overflow-hidden">
            <div className="flex justify-center mb-lg">
              <div className="w-20 h-20 rounded-full bg-error-container/20 border-2 border-error flex items-center justify-center animate-pulse">
                <Icon name="lock_person" filled className="!text-4xl text-error" />
              </div>
            </div>

            <div className="text-center space-y-md">
              <h2 className="font-headline text-headline-lg font-bold text-on-surface uppercase tracking-tight">Account inactive</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-[32rem] mx-auto">{copy.headline}</p>
            </div>

            <div className="mt-xl grid grid-cols-1 md:grid-cols-2 gap-sm">
              <div className="bg-surface-container-low p-md border border-outline-variant rounded-lg">
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-xs">Status</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-error" />
                  <span className="font-headline text-headline-sm font-bold text-error">{copy.status}</span>
                </div>
              </div>
              <div className="bg-surface-container-low p-md border border-outline-variant rounded-lg">
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-xs">Next step</p>
                <span className="font-headline text-headline-sm font-bold text-on-surface">Contact us</span>
              </div>
            </div>

            <div className="mt-xl flex flex-col sm:flex-row gap-md">
              <a
                href="mailto:support@gymmanager.app?subject=Reactivate%20my%20account"
                className="flex-grow bg-primary-container text-on-primary font-label-md text-label-md font-bold uppercase py-lg rounded-lg flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all"
              >
                <Icon name="payments" filled />
                Contact us to reactivate
              </a>
              <button
                onClick={logout}
                className="flex-grow border border-outline-variant text-on-surface font-label-md text-label-md font-bold uppercase py-lg rounded-lg flex items-center justify-center gap-2 hover:bg-surface-container-highest active:scale-95 transition-all"
              >
                <Icon name="logout" />
                Log out
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
