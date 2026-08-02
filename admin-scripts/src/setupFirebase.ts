import "dotenv/config";
import fs from "fs";
import path from "path";
import { GoogleAuth } from "google-auth-library";
import { loadServiceAccount } from "./serviceAccount";

/**
 * One-time (and re-runnable) Firebase bootstrap: enables Email/Password
 * (and optionally Google) sign-in, and publishes firebase/firestore.rules +
 * firebase/storage.rules as the live rules — using the same service
 * account the app already needs for other admin scripts. No separate
 * hosting, no Firebase CLI login required.
 *
 * What this CANNOT do, because they require the project owner's own Google
 * login (not something this script or an agent should ever ask you for):
 *   - Creating the Firebase project itself.
 *   - Registering a Web app / getting the client SDK config.
 *   - Granting this service account the IAM roles it needs (see README):
 *     "Firebase Authentication Admin" and "Firebase Rules Admin".
 *   - Creating the Google OAuth client (id/secret) for "Continue with
 *     Google" — Google's own OAuth consent screen setup has to happen in
 *     Cloud Console under your account.
 *
 * Run: npm run setup-firebase   (from admin-scripts/)
 */

const IDENTITY_TOOLKIT_BASE = "https://identitytoolkit.googleapis.com/v2";
const FIREBASE_RULES_BASE = "https://firebaserules.googleapis.com/v1";
const REPO_FIREBASE_DIR = path.join(__dirname, "..", "..", "firebase");

async function getAccessToken(): Promise<{ token: string; projectId: string }> {
  const serviceAccount = loadServiceAccount();
  const auth = new GoogleAuth({
    credentials: { client_email: serviceAccount.client_email, private_key: serviceAccount.private_key },
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Failed to obtain an access token for the service account");
  return { token, projectId: serviceAccount.project_id };
}

async function enableEmailPasswordSignIn(projectId: string, token: string) {
  const res = await fetch(`${IDENTITY_TOOLKIT_BASE}/projects/${projectId}/config?updateMask=signIn.email`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ signIn: { email: { enabled: true, passwordRequired: true } } }),
  });
  if (!res.ok) throw new Error(`Identity Toolkit config update failed (${res.status}): ${await res.text()}`);
  console.log("✅ Email/Password sign-in enabled.");
}

async function enableGoogleSignIn(projectId: string, token: string, clientId: string, clientSecret: string) {
  const res = await fetch(
    `${IDENTITY_TOOLKIT_BASE}/projects/${projectId}/defaultSupportedIdpConfigs/google.com?updateMask=enabled,clientId,clientSecret`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true, clientId, clientSecret }),
    }
  );

  if (res.status === 404) {
    const createRes = await fetch(
      `${IDENTITY_TOOLKIT_BASE}/projects/${projectId}/defaultSupportedIdpConfigs?idpId=google.com`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "google.com", enabled: true, clientId, clientSecret }),
      }
    );
    if (!createRes.ok) throw new Error(`Failed to create Google IDP config (${createRes.status}): ${await createRes.text()}`);
    console.log("✅ Google sign-in enabled (created new IDP config).");
    return;
  }
  if (!res.ok) throw new Error(`Failed to enable Google sign-in (${res.status}): ${await res.text()}`);
  console.log("✅ Google sign-in enabled.");
}

/** Shared by publishFirestoreRules and publishStorageRules — the Firebase
 * Rules API is the same service for both, just a different `release` name. */
async function publishRules(
  projectId: string,
  token: string,
  releaseSuffix: "cloud.firestore" | "firebase.storage",
  filename: string
) {
  const source = fs.readFileSync(path.join(REPO_FIREBASE_DIR, filename), "utf-8");

  const createRulesetRes = await fetch(`${FIREBASE_RULES_BASE}/projects/${projectId}/rulesets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ source: { files: [{ name: filename, content: source }] } }),
  });
  if (!createRulesetRes.ok) {
    throw new Error(`Failed to create ruleset for ${filename} (${createRulesetRes.status}): ${await createRulesetRes.text()}`);
  }
  const ruleset = (await createRulesetRes.json()) as { name: string };

  const releaseName = `projects/${projectId}/releases/${releaseSuffix}`;
  const releaseBody = { name: releaseName, rulesetName: ruleset.name };

  const patchRes = await fetch(`${FIREBASE_RULES_BASE}/${releaseName}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ release: releaseBody, updateMask: "rulesetName" }),
  });

  if (patchRes.status === 404) {
    const createReleaseRes = await fetch(`${FIREBASE_RULES_BASE}/projects/${projectId}/releases`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(releaseBody),
    });
    if (!createReleaseRes.ok) {
      throw new Error(`Failed to create rules release for ${filename} (${createReleaseRes.status}): ${await createReleaseRes.text()}`);
    }
    console.log(`✅ ${filename} published (new release).`);
    return;
  }
  if (!patchRes.ok) throw new Error(`Failed to update rules release for ${filename} (${patchRes.status}): ${await patchRes.text()}`);
  console.log(`✅ ${filename} published.`);
}

async function main() {
  const { token, projectId } = await getAccessToken();
  console.log(`Bootstrapping Firebase project: ${projectId}\n`);

  const steps: { label: string; run: () => Promise<void> }[] = [
    { label: "Enable Email/Password sign-in", run: () => enableEmailPasswordSignIn(projectId, token) },
    { label: "Publish Firestore rules", run: () => publishRules(projectId, token, "cloud.firestore", "firestore.rules") },
    { label: "Publish Storage rules", run: () => publishRules(projectId, token, "firebase.storage", "storage.rules") },
  ];

  const googleClientId = process.env.GOOGLE_OAUTH_WEB_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_OAUTH_WEB_CLIENT_SECRET;
  if (googleClientId && googleClientSecret) {
    steps.push({
      label: "Enable Google sign-in",
      run: () => enableGoogleSignIn(projectId, token, googleClientId, googleClientSecret),
    });
  } else {
    console.log(
      "⏭  Skipping Google sign-in setup — set GOOGLE_OAUTH_WEB_CLIENT_ID and GOOGLE_OAUTH_WEB_CLIENT_SECRET in admin-scripts/.env to enable it.\n"
    );
  }

  let failures = 0;
  for (const step of steps) {
    try {
      await step.run();
    } catch (err) {
      failures++;
      console.error(`❌ ${step.label} failed:`, err instanceof Error ? err.message : err);
    }
  }

  if (failures > 0) {
    console.error(
      `\n${failures} step(s) failed. Common cause: the service account is missing IAM roles ` +
        `"Firebase Authentication Admin" and "Firebase Rules Admin" — grant them in Google Cloud ` +
        `Console > IAM & Admin > IAM, then re-run this script.`
    );
    process.exit(1);
  }

  console.log("\nDone. Re-run this script any time you change firebase/firestore.rules or firebase/storage.rules.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
