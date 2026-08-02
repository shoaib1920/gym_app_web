import { addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { subscriptionsCol } from "./paths";

export interface CreateSubscriptionInput {
  payerId: string;
  planId: string;
  memberIds: string[];
  billingIntervalDays: number;
}

/**
 * Records a membership as paid outside the app (e.g. JazzCash directly to
 * the owner) — there's no payment processor wired up here, this is just the
 * gym's own record of who's on what plan and until when. The owner marks
 * renewals/lapses manually; see billingIntervalToDays in plans.ts for how
 * currentPeriodEnd gets computed from the plan's billing interval.
 */
export async function createSubscription(gymId: string, input: CreateSubscriptionInput): Promise<string> {
  const now = new Date();
  const periodEnd = new Date(now.getTime() + input.billingIntervalDays * 24 * 60 * 60 * 1000);

  const docRef = await addDoc(subscriptionsCol(gymId), {
    payerId: input.payerId,
    planId: input.planId,
    memberIds: input.memberIds,
    status: "active",
    currentPeriodStart: Timestamp.fromDate(now),
    currentPeriodEnd: Timestamp.fromDate(periodEnd),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}
