import "dotenv/config";
import admin from "firebase-admin";
import { loadServiceAccount } from "./serviceAccount";

/**
 * The kill switch. There's no admin HTTP endpoint anymore — the Admin SDK
 * used here authenticates with credentials that bypass firestore.rules
 * entirely, which is exactly the separate trust boundary the old backend's
 * `/api/admin/gyms/:id/status` endpoint (guarded by a distinct API key) used
 * to provide. Run this any time you need to revoke or restore a gym's
 * access — it takes effect on that gym owner's very next Firestore read,
 * no redeploy needed.
 *
 * Usage:
 *   npm run set-gym-status -- <gym-id-aka-owner-firebase-uid> <status> [trialDays]
 *   status: trialing | active | past_due | suspended | cancelled
 *   trialDays only applies when status=trialing (default 14)
 */

const VALID_STATUSES = ["trialing", "active", "past_due", "suspended", "cancelled"];

async function main() {
  const [gymId, status, trialDaysArg] = process.argv.slice(2);

  if (!gymId || !status || !VALID_STATUSES.includes(status)) {
    console.error(`Usage: npm run set-gym-status -- <gym-id> <${VALID_STATUSES.join("|")}> [trialDays]`);
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount() as admin.ServiceAccount) });
  }
  const db = admin.firestore();
  const gymRef = db.collection("gyms").doc(gymId);

  const update: Record<string, unknown> = { subscriptionStatus: status };

  if (status === "trialing") {
    const trialDays = trialDaysArg ? Number(trialDaysArg) : 14;
    update.trialEndsAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
    );
  }

  const snap = await gymRef.get();
  if (!snap.exists) {
    console.error(
      `No gym doc found for id "${gymId}". This id must be the gym owner's Firebase Auth UID — ` +
        `find it in Firebase Console > Authentication > Users, or have them sign up first.`
    );
    process.exit(1);
  }

  await gymRef.set(update, { merge: true });
  console.log(`Updated gyms/${gymId}:`, update);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
