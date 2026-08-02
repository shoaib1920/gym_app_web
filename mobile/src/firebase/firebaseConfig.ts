import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, inMemoryPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

// Fill these in from Firebase Console > Project Settings > General > Your apps.
// Safe to keep in source (these are public client identifiers, not secrets) —
// access control is enforced by firestore.rules / storage.rules, never by
// this config or by the client.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Must use initializeAuth (not getAuth) as the *first* call against this app
// instance in React Native: unlike on web, the RN environment has no
// automatic default-persistence detection, so a bare getAuth(app) throws
// "Component auth has not been registered yet." initializeAuth registers it.
//
// Deliberately using inMemoryPersistence, not AsyncStorage-backed
// persistence: the app must always require a fresh email/password login on
// launch — a cached Firebase session must never be enough to reach the main
// app by itself. See AuthContext: even after Firebase auth succeeds, reading
// the gym's own subscriptionStatus (itself gated by firestore.rules) is what
// decides whether the user gets in.
//
// Guarded with try/catch because initializeAuth throws if called twice on
// the same app instance (e.g. Metro Fast Refresh re-evaluating this module)
// — falls back to getAuth, which is safe once auth is already registered.
let auth;
try {
  auth = initializeAuth(app, { persistence: inMemoryPersistence });
} catch {
  auth = getAuth(app);
}

const storage = getStorage(app);
const db = getFirestore(app);

export { app, auth, storage, db };
