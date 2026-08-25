import { addDoc, orderBy, query, serverTimestamp } from "firebase/firestore";
import { plansCol } from "./paths";
import { getDocsPreferCache } from "./cache";
import type { MembershipPlan } from "./types";

export interface CreatePlanInput {
  name: string;
  priceCents: number;
  billingInterval: string;
  maxMembers: number;
}

export async function listPlans(gymId: string): Promise<MembershipPlan[]> {
  const snap = await getDocsPreferCache(query(plansCol(gymId), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({
    id: d.id,
    name: d.data().name,
    priceCents: d.data().priceCents,
    billingInterval: d.data().billingInterval,
    maxMembers: d.data().maxMembers,
    createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
  }));
}

export async function createPlan(gymId: string, input: CreatePlanInput): Promise<string> {
  const docRef = await addDoc(plansCol(gymId), { ...input, createdAt: serverTimestamp() });
  return docRef.id;
}

export function billingIntervalToDays(interval: string): number {
  switch (interval) {
    case "day":
      return 1;
    case "week":
      return 7;
    case "year":
      return 365;
    case "month":
    default:
      return 30;
  }
}
