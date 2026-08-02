import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, browserSessionPersistence, type Auth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { initializeFirestore, getFirestore, type Firestore } from "firebase/firestore";

// Fill these in from Firebase Console > Project Settings > General > Your apps.
// Safe to keep in source (these are public client identifiers, not secrets) —
// access control is enforced by firestore.rules / storage.rules, never by
// this config or by the client.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// initializeAuth (not a bare getAuth) is required here: newer firebase
// majors (v12+) throw "Component auth has not been registered yet" from a
// plain getAuth(app) call the same way React Native always did — hence
// pinning this project to firebase ^10.13.1 (matching mobile/) and being
// explicit about persistence here regardless, to sidestep this class of
// bug entirely rather than depend on it being fixed upstream.
//
// Using browserSessionPersistence (cleared when the tab/browser closes),
// not the default browserLocalPersistence (survives forever), to match the
// product requirement: every visit requires a fresh email/password login,
// no "remember me". See AuthContext: even after Firebase auth succeeds,
// reading the gym's own subscriptionStatus (itself gated by
// firestore.rules) is what decides whether the user gets in.
//
// Guarded with try/catch because initializeAuth throws if called twice on
// the same app instance (e.g. Vite HMR re-evaluating this module) — falls
// back to getAuth, which is safe once auth is already registered.
let auth: Auth;
try {
  auth = initializeAuth(app, { persistence: browserSessionPersistence });
} catch {
  auth = getAuth(app);
}

const storage = getStorage(app);

// Firestore's default transport (WebChannel/gRPC-streaming) fails with
// "client is offline" behind some proxies and inside some WebViews — this
// app runs inside an Android WebView via Capacitor, so that's not
// hypothetical. Auto-detecting long-polling falls back to plain HTTPS
// requests when the streaming connection can't establish, same as it does
// in this project's own sandboxed preview environment.
let db: Firestore;
try {
  db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
} catch {
  db = getFirestore(app);
}

export { app, auth, storage, db };
