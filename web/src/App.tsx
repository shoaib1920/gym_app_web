import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import InactiveAccountPage from "./pages/InactiveAccountPage";
import DashboardPage from "./pages/DashboardPage";
import MembersListPage from "./pages/MembersListPage";
import MemberFormPage from "./pages/MemberFormPage";
import MemberDetailPage from "./pages/MemberDetailPage";
import MemberQRPage from "./pages/MemberQRPage";
import PlansPage from "./pages/PlansPage";
import PayersPage from "./pages/PayersPage";
import PayerDetailPage from "./pages/PayerDetailPage";
import ClassesPage from "./pages/ClassesPage";
import ClassFormPage from "./pages/ClassFormPage";
import ScannerPage from "./pages/ScannerPage";
import EquipmentPage from "./pages/EquipmentPage";
import ExpensesPage from "./pages/ExpensesPage";
import FeeOverviewPage from "./pages/FeeOverviewPage";
import AttendancePage from "./pages/AttendancePage";
import ImportPage from "./pages/ImportPage";
import KioskPage from "./pages/KioskPage";

/**
 * The app-access gate. Which subtree renders is driven entirely by
 * AuthContext's state machine, which itself only advances past login after
 * reading the gym's own subscription status from Firestore. This UI gate is
 * a convenience, not the real security boundary: firebase/firestore.rules
 * independently enforces the same check on every read/write, so even a
 * bypassed gate here couldn't reach another gym's data or a suspended gym's
 * own data.
 */
export default function App() {
  const { state } = useAuth();
  const location = useLocation();

  if (state.phase === "accessDenied") {
    return <InactiveAccountPage />;
  }

  if (state.phase !== "accessGranted") {
    return (
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  // Rendered outside AppShell, full-screen, on purpose: this is the
  // front-desk kiosk terminal a member operates unattended, so it shouldn't
  // expose the admin sidebar/nav the way every other authenticated route
  // does. See KioskPage.tsx.
  if (location.pathname === "/kiosk") {
    return <KioskPage />;
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/members" element={<MembersListPage />} />
        <Route path="/members/new" element={<MemberFormPage />} />
        <Route path="/members/:memberId" element={<MemberDetailPage />} />
        <Route path="/members/:memberId/qr" element={<MemberQRPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/payers" element={<PayersPage />} />
        <Route path="/payers/:payerId" element={<PayerDetailPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/classes/new" element={<ClassFormPage />} />
        <Route path="/scanner" element={<ScannerPage />} />
        <Route path="/equipment" element={<EquipmentPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/fees" element={<FeeOverviewPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
