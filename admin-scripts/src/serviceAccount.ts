import fs from "fs";

export interface ServiceAccountJson {
  project_id: string;
  client_email: string;
  private_key: string;
  [key: string]: unknown;
}

export function loadServiceAccount(): ServiceAccountJson {
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (inlineJson) return JSON.parse(inlineJson);
  if (path) return JSON.parse(fs.readFileSync(path, "utf-8"));

  throw new Error(
    "Missing Firebase Admin credentials: set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH"
  );
}
