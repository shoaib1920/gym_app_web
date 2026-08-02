# Gym Management App — Phase 1 MVP

**One app, no separately-hosted backend.** The mobile app talks directly to
Firebase (Auth + Firestore + Storage) — there's no Express/Node server to
deploy or keep running anywhere. The only thing "online" is Firestore
itself, which Firebase already hosts.

```
/mobile         Expo React Native app (TypeScript) — the entire product
/firebase       firestore.rules + storage.rules — this is the real backend
/admin-scripts  On-demand Node scripts (not a server) for one-time setup
                and the subscription kill switch
```

## Why this is still secure without a server

Firestore Security Rules run on Google's servers, not on the phone. That's
what makes the following still true even with zero custom backend code:

1. **Multi-tenancy is enforced server-side.** Every business record (members,
   waivers, payers, plans, subscriptions, classes, bookings, check-ins)
   lives under `gyms/{gymId}/**`, where `gymId` is literally the gym owner's
   Firebase Auth UID. [firebase/firestore.rules](firebase/firestore.rules)
   only allows reads/writes there when `request.auth.uid == gymId` — a
   modified app has no way to read another gym's data, because the request
   never reaches app code at all; Firestore itself rejects it.
2. **The subscription kill switch is still immediate and still
   server-authoritative.** The same rules file checks the gym doc's
   `subscriptionStatus` (and `trialEndsAt`, using Firestore's own server
   clock) on *every single read/write* under that gym — not just at login.
   The moment `admin-scripts/setGymStatus.ts` flips a gym to `suspended`,
   every subsequent request from that gym's app is rejected, with no app
   update or redeploy needed.
3. **The trial length can't be self-extended.** When a new gym signs up, the
   app writes its own `trialing` gym doc — but firestore.rules independently
   requires the `trialEndsAt` it's asking for to land within ~14 days of
   Firestore's server time before allowing the write at all. A modified
   client sending a longer trial gets rejected.
4. **No login persistence.** Firebase Auth uses `inMemoryPersistence` (see
   [mobile/src/firebase/firebaseConfig.ts](mobile/src/firebase/firebaseConfig.ts)) — every app launch requires a
   fresh login, same as before.

The one thing that's now honestly out of scope: real in-app payment
processing. Stripe's secret key can never live inside a mobile app (it would
let anyone who decompiles the APK access your whole Stripe account), so
there is no Stripe integration here. Members pay the gym owner directly
(e.g. JazzCash) outside the app; the app just records who's on which plan
and the owner keeps that record updated manually. See `PayerDetailScreen`.

## One-time Firebase setup

You don't have to hand-configure anything in the Firebase Console beyond
the handful of steps that genuinely require your own Google login — see
below. Everything else is scripted.

1. Create a project at the [Firebase Console](https://console.firebase.google.com).
2. **Project Settings → General → Your apps → Add app → Web.** Copy the
   config object — it goes in `mobile/.env`.
3. **Project Settings → Service Accounts → Generate new private key.** Save
   the JSON — it goes in `admin-scripts/.env`.
4. **Google Cloud Console → IAM & Admin → IAM** → find the
   `firebase-adminsdk-...` service account → grant it two roles:
   **Firebase Authentication Admin** and **Firebase Rules Admin**. This is
   what lets the scripts below act on your behalf.
5. *Only if you want "Continue with Google"*: create an OAuth 2.0 Client ID
   (Web application) in Google Cloud Console → APIs & Services →
   Credentials — Google's own consent-screen setup can't be scripted. Put
   the id/secret in `admin-scripts/.env`.

Then, from `admin-scripts/`:

```bash
cp .env.example .env
```

Fill in `FIREBASE_SERVICE_ACCOUNT_PATH` (or `_JSON`) from step 3, and
optionally the Google OAuth id/secret from step 5. Then:

```bash
npm install
```
```bash
npm run setup-firebase
```

This enables Email/Password sign-in, publishes
[firebase/firestore.rules](firebase/firestore.rules) and
[firebase/storage.rules](firebase/storage.rules) as the live rules, and
enables Google sign-in if you configured it. Re-run it any time you edit
either `.rules` file — there's no console paste step, ever.

## Mobile app setup

```bash
cd mobile
cp .env.example .env
```

Fill in the Firebase web config from step 2 above, and (optionally) the
Google OAuth client IDs. Then:

```bash
npm install
```
```bash
npm run start
```

### Testing the signup → trial → kill-switch flow

1. In the app, tap **Sign up**, enter a gym name, email, and password. This
   creates the Firebase user *and* the gym's Firestore doc in one flow — no
   console interaction needed. You should land on the dashboard with a
   "Trial: 14 days remaining" banner.
2. Grab that user's Firebase UID (Firebase Console → Authentication →
   Users, or `firebase.auth().currentUser.uid` while debugging) — this is
   also the gym's document id in Firestore.
3. From `admin-scripts/`, suspend it:
   ```bash
   npm run set-gym-status -- <firebase-uid> suspended
   ```
4. Log out and back in — you should now see the "Account Inactive" screen.
   Reactivate with:
   ```bash
   npm run set-gym-status -- <firebase-uid> active
   ```

## What's built

All Phase 1 features, now backed by Firestore instead of a REST API:

1. **Auth** — email/password or "Continue with Google" signup/login, gated
   by the gym's own subscription status (see security model above).
2. **Gym onboarding** — automatic on first login (`mobile/src/firestore/gym.ts`).
3. **Member management** — CRUD screens backed by `gyms/{gymId}/members`.
4. **Digital waiver signing** — `MemberFormScreen` captures a signature
   (`react-native-signature-canvas`); the member doc and its waiver subdoc
   are written together in one Firestore batch, so a member never exists
   without a signed waiver.
5. **Membership plans + payer setup** — plans and payers are plain Firestore
   docs; payers link to one or more members via `payerMemberLinks`.
6. **Billing (manual, no processor)** — `PayerDetailScreen` records which
   plan a payer/members are on and the current billing period; the owner
   updates this by hand as payments come in outside the app.
7. **QR check-in** — each member's QR encodes `{gymId, memberId}`
   (`getMemberQrPayload` in `members.ts`) — no signing needed, since
   firestore.rules already restrict writing check-ins to this gym's
   authenticated owner, and `checkins.ts` verifies the member actually
   exists before recording one.
8. **Class scheduling** — capacity and double-booking are enforced inside a
   Firestore transaction (`classes.ts`), using the member's id as the
   booking document id so double-booking is structurally impossible, not
   just checked for.
9. **Member portal** — QR code, class booking, and check-in history are
   reachable from `MemberDetailScreen` inside the owner's app. There's no
   separate member login — the original brief only specified owner auth,
   and members have no credentials of their own in this data model. If you
   want members logging in on their own devices, that's a separate auth
   system to add later.

## Push notifications

`mobile/src/lib/pushNotifications.ts` registers a device's FCM token on
login (`gyms/{gymId}.fcmToken`). Since there's no Stripe/dunning flow
anymore, there's currently nothing that automatically *sends* a
notification — the plumbing is there for you to trigger one (e.g. a
"payment reminder" button) via a Cloud Function or another admin script
later, using `firebase-admin`'s `messaging().send()`.

## Building an APK

The mobile app uses a few native modules (camera, image picker,
notifications, signature canvas) that don't run in Expo Go, so builds go
through **EAS** (Expo's cloud build service — this also sidesteps needing
Android Studio/Gradle locally):

```bash
npm install -g eas-cli
```
```bash
cd mobile
eas login
```
```bash
eas build --platform android --profile preview
```

`mobile/eas.json`'s `preview` profile is already set to build an installable
`.apk` (not an `.aab`). Since `mobile/.env` is gitignored and EAS Build runs
in the cloud, mirror your real values into the `env` block of that same
profile in `eas.json` before building — everything in there is a public
client identifier (Firebase web config, Google client id), never a secret,
so this is safe to commit. When the build finishes, EAS gives you a direct
download link for the APK.

## Not yet built

- Automated tests.
- iOS FCM token registration needs `@react-native-firebase/messaging` +
  `GoogleService-Info.plist` — Android gets a working token out of the box
  via `expo-notifications`, iOS currently no-ops.
- Any kind of in-app payment collection (see the security note above for
  why that's a deliberate scope boundary, not an oversight).
