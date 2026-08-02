import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { auth } from "../firebase/firebaseConfig";
import { ensureGym, hasAccess, trialDaysRemaining, updateGymFcmToken } from "../firestore/gym";
import { SubscriptionStatus } from "../firestore/types";
import { registerForPushNotifications } from "../lib/pushNotifications";

WebBrowser.maybeCompleteAuthSession();

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ phase: "loggedOut" });

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: ["openid", "profile", "email"],
  });

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

      // Best-effort: a denied notification permission or missing native
      // FCM setup should never block the user from getting into the app.
      registerForPushNotifications()
        .then((fcmToken) => (fcmToken ? updateGymFcmToken(gym.id, fcmToken) : undefined))
        .catch((err) => console.warn("Failed to register push token", err));
    } else {
      setState({ phase: "accessDenied", status: gym.subscriptionStatus });
    }
  };

  // Google's redirect result arrives asynchronously via this response object
  // rather than as a promise resolution, so it has to be handled here.
  useEffect(() => {
    if (googleResponse?.type !== "success") return;

    (async () => {
      setState({ phase: "authenticating" });
      try {
        const idTokenFromGoogle = googleResponse.params.id_token;
        const credential = GoogleAuthProvider.credential(idTokenFromGoogle);
        const userCredential = await signInWithCredential(auth, credential);
        await completeSignIn(userCredential.user, userCredential.user.displayName ?? userCredential.user.email ?? "My Gym");
      } catch (err) {
        setState({ phase: "loggedOut" });
        console.error("Google sign-in failed", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleResponse]);

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
      // first ensureGym() call — see gym.ts.
      await completeSignIn(credential.user, gymName);
    } catch (err) {
      setState({ phase: "loggedOut" });
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    await promptGoogleAsync();
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
      googleSignInReady: !!googleRequest,
      logout,
      resetPassword,
    }),
    [state, googleRequest]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Only valid to call from screens inside MainStack, which only ever mounts while state.phase === "accessGranted". */
export function useGymId(): string {
  const { state } = useAuth();
  if (state.phase !== "accessGranted") {
    throw new Error("useGymId called outside of an authenticated session");
  }
  return state.gymId;
}
