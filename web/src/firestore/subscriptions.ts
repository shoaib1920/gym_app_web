import { addDoc, getDocs, orderBy, query, serverTimestamp, Timestamp, where } from "firebase/firestore";
import { subscriptionsCol } from "./paths";
import { listPlans } from "./plans";
import { listPayers } from "./payers";
import type { FeeOverview, FeeOverviewPayer } from "./types";

export interface PayerFeeStatus {
  planName: string;
  priceCents: number;
  currentPeriodEnd: Date;
  isPaid: boolean;
}

/**
 * Just this one payer's standing — used on the payer detail page, where
 * fetching every payer via getFeeOverview would be wasteful.
 *
 * Sorts client-side rather than adding orderBy("currentPeriodEnd") to the
 * where("payerId", ...) query: that combination needs a composite Firestore
 * index that doesn't exist by default, and a gym's per-payer subscription
 * history is small enough that fetching it unsorted and sorting here is
 * simpler than maintaining an index config for it.
 */
export async function getLatestSubscriptionForPayer(gymId: string, payerId: string): Promise<PayerFeeStatus | null> {
  const snap = await getDocs(query(subscriptionsCol(gymId), where("payerId", "==", payerId)));
  if (snap.empty) return null;
  const latest = snap.docs
    .map((d) => d.data())
    .sort((a, b) => (b.currentPeriodEnd as Timestamp).toMillis() - (a.currentPeriodEnd as Timestamp).toMillis())[0];
  const plans = await listPlans(gymId);
  const plan = plans.find((p) => p.id === latest.planId);
  if (!plan) return null;
  const currentPeriodEnd = (latest.currentPeriodEnd as Timestamp).toDate();
  return { planName: plan.name, priceCents: plan.priceCents, currentPeriodEnd, isPaid: currentPeriodEnd.getTime() >= Date.now() };
}

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

export interface ImportSubscriptionInput {
  payerId: string;
  planId: string;
  memberIds: string[];
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Same shape as createSubscription, but for backfilling a subscription from
 * a spreadsheet's own recorded dates instead of computing the period from
 * "now" — an imported payment happened in the past, not at import time.
 */
export async function createImportedSubscription(gymId: string, input: ImportSubscriptionInput): Promise<string> {
  const docRef = await addDoc(subscriptionsCol(gymId), {
    payerId: input.payerId,
    planId: input.planId,
    memberIds: input.memberIds,
    status: "active",
    currentPeriodStart: Timestamp.fromDate(input.periodStart),
    currentPeriodEnd: Timestamp.fromDate(input.periodEnd),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Fee collection snapshot for the dashboard: each payer's *latest*
 * subscription decides whether they're currently paid (period hasn't
 * lapsed) or pending (it has) — a payer can have many subscription docs
 * over time as they renew, so "latest by currentPeriodEnd" is what
 * actually reflects their current standing, not just the most recently
 * created one.
 */
export async function getFeeOverview(gymId: string): Promise<FeeOverview> {
  const [subsSnap, plans, payers] = await Promise.all([
    getDocs(query(subscriptionsCol(gymId), orderBy("currentPeriodEnd", "desc"))),
    listPlans(gymId),
    listPayers(gymId),
  ]);

  const planById = new Map(plans.map((p) => [p.id, p]));
  const latestSubByPayer = new Map<string, { planId: string; currentPeriodEnd: Timestamp }>();
  for (const d of subsSnap.docs) {
    const data = d.data();
    if (!latestSubByPayer.has(data.payerId)) {
      latestSubByPayer.set(data.payerId, { planId: data.planId, currentPeriodEnd: data.currentPeriodEnd });
    }
  }

  const now = Date.now();
  let collectedCents = 0;
  let pendingCents = 0;
  let paidCount = 0;
  let pendingCount = 0;
  const feePayers: FeeOverviewPayer[] = [];

  for (const payer of payers) {
    const sub = latestSubByPayer.get(payer.id);
    // A payer who has never had a subscription recorded owes exactly as
    // much as one whose plan lapsed — both mean "this person's fee isn't
    // accounted for" — so both count as pending. Their priceCents is
    // unknown (no plan on record), so they don't add to pendingCents; they
    // still show up so the owner can follow up.
    if (!sub) {
      pendingCount++;
      feePayers.push({
        payerId: payer.id,
        payerName: payer.fullName,
        planName: null,
        priceCents: 0,
        currentPeriodEnd: null,
        status: "pending",
        joinedAt: payer.createdAt,
      });
      continue;
    }
    const plan = planById.get(sub.planId);
    if (!plan) continue;
    const periodEnd = sub.currentPeriodEnd.toDate();
    const isPaid = periodEnd.getTime() >= now;
    if (isPaid) {
      collectedCents += plan.priceCents;
      paidCount++;
    } else {
      pendingCents += plan.priceCents;
      pendingCount++;
    }
    feePayers.push({
      payerId: payer.id,
      payerName: payer.fullName,
      planName: plan.name,
      priceCents: plan.priceCents,
      currentPeriodEnd: periodEnd,
      status: isPaid ? "paid" : "pending",
      joinedAt: payer.createdAt,
    });
  }

  const statusOrder = { pending: 0, paid: 1 };
  feePayers.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return { collectedCents, pendingCents, paidCount, pendingCount, payers: feePayers };
}
