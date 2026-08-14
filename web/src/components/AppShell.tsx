import type { ReactNode } from "react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Icon } from "./ui";

const MEMBERS_GROUP = [
  { label: "Members", to: "/members", icon: "group" },
  { label: "Front Desk Scanner", to: "/scanner", icon: "qr_code_scanner" },
  { label: "Self Check-in Kiosk", to: "/kiosk", icon: "touch_app" },
  { label: "Attendance Log", to: "/attendance", icon: "event_available" },
];

const MANAGEMENT_GROUP = [
  { label: "Membership Plans", to: "/plans", icon: "card_membership" },
  { label: "Payers & Billing", to: "/payers", icon: "payments" },
  { label: "Equipment", to: "/equipment", icon: "fitness_center" },
  { label: "Expenses", to: "/expenses", icon: "receipt_long" },
  { label: "Import from Excel", to: "/import", icon: "upload_file" },
];

const BOTTOM_NAV_ITEMS = [
  { label: "Home", to: "/", icon: "home", end: true },
  { label: "Members", to: "/members", icon: "group", end: false },
];

function navLinkClass(isActive: boolean) {
  return `flex items-center gap-md rounded-lg mx-2 my-1 px-md py-3 font-label-md text-label-md transition-all ${
    isActive ? "bg-primary-container text-on-primary-container" : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
  }`;
}

function NavGroup({ title, items, onNavigate }: { title: string; items: typeof MEMBERS_GROUP; onNavigate?: () => void }) {
  return (
    <div className="mb-md">
      <p className="px-md mb-xs font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">{title}</p>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} onClick={onNavigate} className={({ isActive }) => navLinkClass(isActive)}>
          <Icon name={item.icon} />
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { state, logout } = useAuth();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const trialDays = state.phase === "accessGranted" ? state.trialDaysRemaining : undefined;
  const status = state.phase === "accessGranted" ? state.status : undefined;
  const urgent = trialDays !== undefined && trialDays <= 3;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-svh bg-background">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-md h-16 bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-sm">
          <Icon name="fitness_center" filled className="text-primary-container" />
          <h1 className="font-headline text-headline-sm font-black text-primary-container tracking-tighter">IRON OPS</h1>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-xs rounded-lg px-md py-sm text-on-surface-variant hover:bg-surface-container-highest transition-colors font-label-md text-label-md"
        >
          <Icon name="logout" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </header>

      {status === "trialing" && trialDays !== undefined && (
        <div
          className={`fixed top-16 left-0 lg:left-72 right-0 z-40 flex items-center justify-center gap-xs px-md py-sm font-label-md text-label-md ${
            urgent ? "bg-error-container text-on-error-container" : "bg-surface-container-high text-on-surface-variant"
          }`}
        >
          <Icon name={urgent ? "warning" : "schedule"} className="!text-base" />
          Trial: {trialDays} day{trialDays === 1 ? "" : "s"} remaining
        </div>
      )}

      {/* Sidebar (desktop) — two clear panels: Members, then Management */}
      <nav className="hidden lg:flex flex-col fixed left-0 top-0 h-full z-40 bg-surface-container border-r border-outline-variant w-72 pt-20 overflow-y-auto">
        <div className="px-md pb-lg border-b border-outline-variant mb-md">
          <div className="flex items-center gap-md">
            <div className="w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center">
              <Icon name="store" className="text-primary-fixed-dim" />
            </div>
            <div>
              <h2 className="font-label-md text-label-md text-on-surface">Your Gym</h2>
              <p className="text-xs text-on-surface-variant flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" /> Active
              </p>
            </div>
          </div>
        </div>

        <NavLink to="/" end className={({ isActive }) => navLinkClass(isActive)}>
          <Icon name="dashboard" />
          Dashboard
        </NavLink>

        <div className="mt-md">
          <NavGroup title="Members" items={MEMBERS_GROUP} />
          <NavGroup title="Management" items={MANAGEMENT_GROUP} />
        </div>
      </nav>

      <main className={`pt-20 pb-24 lg:pb-8 lg:pl-80 px-md min-h-svh ${status === "trialing" ? "mt-10" : ""}`}>{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 bg-surface-container-lowest border-t border-outline-variant shadow-lg">
        {BOTTOM_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-transform duration-150 ${
                isActive ? "text-primary-container font-bold" : "text-on-surface-variant"
              }`
            }
          >
            <Icon name={item.icon} />
            <span className="font-label-sm text-label-sm">{item.label}</span>
          </NavLink>
        ))}

        <NavLink to="/scanner" className="relative -top-4">
          {({ isActive }) => (
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform duration-150 border-4 border-surface-container-lowest ${
                isActive ? "bg-primary-fixed-dim" : "bg-primary-container"
              }`}
            >
              <Icon name="qr_code_scanner" className="!text-3xl text-on-primary" />
            </div>
          )}
        </NavLink>

        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 text-on-surface-variant active:scale-90 transition-transform duration-150"
        >
          <Icon name="menu" />
          <span className="font-label-sm text-label-sm">More</span>
        </button>
        <div className="flex flex-col items-center justify-center gap-0.5 text-on-surface-variant opacity-0 pointer-events-none">
          <Icon name="menu" />
          <span className="font-label-sm text-label-sm">·</span>
        </div>
      </nav>

      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] flex items-end" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="relative w-full max-h-[80vh] overflow-y-auto rounded-t-xl border-t border-outline-variant bg-surface-container p-lg pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-md font-headline text-headline-sm font-bold text-on-surface">More</h3>
            <NavGroup title="Members" items={MEMBERS_GROUP} onNavigate={() => setMoreOpen(false)} />
            <NavGroup title="Management" items={MANAGEMENT_GROUP} onNavigate={() => setMoreOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
