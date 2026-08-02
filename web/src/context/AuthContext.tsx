import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import { ensureGym, hasAccess, trialDaysRemaining } from "../firestore/gym";
import type { SubscriptionStatus } from "../firestore/types";

type AuthState =
  | { phase: "loggedOut" }
  | { phase: "authenticating" }
  | { phase: "accessGranted"; gymId: string; status: SubscriptionStatus; trialDaysRemaining?: number }
  | { phase: "accessDenied"; status: SubscriptionStatus };

interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, gymName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  googleSignInReady: boolean;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ phase: "loggedOut" });

  /**
   * Shared by every sign-in path (password login, signup, Google). Firebase
   * only proves *who* is signing in — the gym doc's own subscriptionStatus
   * (read here, but ultimately enforced by firebase/firestore.rules on
   * every subsequent request, not by this check) is what decides whether
   * they get past the gate.
   */
  const completeSignIn = async (user: User, gymNameFallback: string) => {
    const gym = await ensureGym(user.uid, gymNameFallback);

    if (hasAccess(gym)) {
      setState({
        phase: "accessGranted",
        gymId: gym.id,
        status: gym.subscriptionStatus,
        trialDaysRemaining: trialDaysRemaining(gym),
      });
    } else {
      setState({ phase: "accessDenied", status: gym.subscriptionStatus });
    }
  };

  const login = async (email: string, password: string) => {
    setState({ phase: "authenticating" });
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await completeSignIn(credential.user, credential.user.email ?? "My Gym");
    } catch (err) {
      setState({ phase: "loggedOut" });
      throw err;
    }
  };

  const signup = async (email: string, password: string, gymName: string) => {
    setState({ phase: "authenticating" });
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      // Passing gymName here is what names the gym created on this very
      // first ensureGym() call — see firestore/gym.ts.
      await completeSignIn(credential.user, gymName);
    } catch (err) {
      setState({ phase: "loggedOut" });
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setState({ phase: "authenticating" });
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      await completeSignIn(credential.user, credential.user.displayName ?? credential.user.email ?? "My Gym");
    } catch (err) {
      setState({ phase: "loggedOut" });
      throw err;
    }
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setState({ phase: "loggedOut" });
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const value = useMemo(
    () => ({
      state,
      login,
      signup,
      loginWithGoogle,
      // Google sign-in must be enabled in the Firebase console regardless;
      // this flag just mirrors mobile's "leave the client id blank to hide
      // the button" escape hatch for gyms that haven't set it up yet.
      googleSignInReady: !!import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID,
      logout,
      resetPassword,
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Only valid to call from pages inside the authenticated app shell, which only ever mounts while state.phase === "accessGranted". */
export function useGymId(): string {
  const { state } = useAuth();
  if (state.phase !== "accessGranted") {
    throw new Error("useGymId called outside of an authenticated session");
  }
  return state.gymId;
}
