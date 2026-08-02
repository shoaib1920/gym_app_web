import { getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { gymRef } from "./paths";
import { Gym } from "./types";

const TRIAL_LENGTH_DAYS = 14;

function toGym(id: string, data: any): Gym {
  return {
    id,
    name: data.name,
    timezone: data.timezone,
    ownerFirebaseUid: data.ownerFirebaseUid,
    subscriptionStatus: data.subscriptionStatus,
    trialEndsAt: data.trialEndsAt ? (data.trialEndsAt as Timestamp).toDate() : null,
    fcmToken: data.fcmToken ?? null,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
  };
}

export async function getGym(gymId: string): Promise<Gym | null> {
  const snap = await getDoc(gymRef(gymId));
  return snap.exists() ? toGym(snap.id, snap.data()) : null;
}

/**
 * Called on every login/signup. If the gym doc doesn't exist yet (first
 * login), creates it in `trialing` status with a 14-day window. This is the
 * client *requesting* a trial — firebase/firestore.rules independently
 * verifies the trialEndsAt it's asking for is actually ~14 days out before
 * allowing the write at all, so a modified client can't grant itself a
 * longer trial by just sending a different value here.
 */
export async function ensureGym(gymId: string, gymNameFallback: string): Promise<Gym> {
  const existing = await getGym(gymId);
  if (existing) return existing;

  const trialEndsAt = new Date(Date.now() + TRIAL_LENGTH_DAYS * 24 * 60 * 60 * 1000);

  await setDoc(gymRef(gymId), {
    name: gymNameFallback,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
    ownerFirebaseUid: gymId,
    subscriptionStatus: "trialing",
    trialEndsAt: Timestamp.fromDate(trialEndsAt),
    createdAt: serverTimestamp(),
  });

  return (await getGym(gymId))!;
}

export async function updateGymFcmToken(gymId: string, fcmToken: string): Promise<void> {
  await updateDoc(gymRef(gymId), { fcmToken });
}

/**
 * Client-side mirror of firebase/firestore.rules' hasAccess() — used only
 * to decide which screen to show. It is NOT the security boundary: even if
 * this were bypassed, every read/write under gyms/{gymId}/** would still be
 * rejected server-side by the matching rule.
 */
export function hasAccess(gym: Pick<Gym, "subscriptionStatus" | "trialEndsAt">): boolean {
  if (gym.subscriptionStatus === "active") return true;
  if (gym.subscriptionStatus === "trialing" && gym.trialEndsAt && gym.trialEndsAt.getTime() > Date.now()) {
    return true;
  }
  return false;
}

export function trialDaysRemaining(gym: Pick<Gym, "subscriptionStatus" | "trialEndsAt">): number | undefined {
  if (gym.subscriptionStatus !== "trialing" || !gym.trialEndsAt) return undefined;
  return Math.max(0, Math.ceil((gym.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}
