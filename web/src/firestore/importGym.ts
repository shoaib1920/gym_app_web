import { doc, writeBatch, Timestamp, type DocumentReference } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { checkInsCol, attendanceLogCol } from "./paths";
import { importMember } from "./members";
import { createPayer, linkMemberToPayer } from "./payers";
import { createPlan, listPlans, billingIntervalToDays } from "./plans";
import { createImportedSubscription } from "./subscriptions";
import type { MembershipPlan } from "./types";
import type { MappedRow } from "../lib/excelImport";

/**
 * Firestore's writeBatch caps out at 500 operations. Attendance history can
 * run into the thousands of rows for a gym with years of records, so those
 * writes are chunked here; everything else in the import (one member, one
 * payer, one subscription per row) is far below that limit per row and just
 * goes through the normal single-write helpers already used elsewhere in
 * this app.
 */
class ChunkedBatch {
  private batch = writeBatch(db);
  private opsInBatch = 0;
  private commits: Promise<void>[] = [];

  set(ref: DocumentReference, data: Record<string, unknown>) {
    this.batch.set(ref, data);
    this.opsInBatch++;
    if (this.opsInBatch >= 400) this.flush();
  }

  private flush() {
    this.commits.push(this.batch.commit());
    this.batch = writeBatch(db);
    this.opsInBatch = 0;
  }

  async commitAll() {
    if (this.opsInBatch > 0) this.flush();
    await Promise.all(this.commits);
  }
}

export interface ImportSummary {
  membersCreated: number;
  payersCreated: number;
  plansCreated: number;
  subscriptionsCreated: number;
  attendanceEntriesCreated: number;
  skipped: { rowIndex: number; fullName: string; reason: string }[];
}

/** Finds a plan matching (name, price, interval) or creates one — dedups within a single import run so 50 rows on the same plan don't create 50 plans. */
function makePlanResolver(gymId: string, existingPlans: MembershipPlan[], summary: ImportSummary) {
  const cache = new Map<string, string>();

  return async function resolvePlanId(name: string, priceCents: number, billingInterval: string): Promise<string> {
    const key = `${name}|${priceCents}|${billingInterval}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const existing = existingPlans.find(
      (p) => p.name === name && p.priceCents === priceCents && p.billingInterval === billingInterval
    );
    if (existing) {
      cache.set(key, existing.id);
      return existing.id;
    }

    const id = await createPlan(gymId, { name, priceCents, billingInterval, maxMembers: 1 });
    summary.plansCreated++;
    cache.set(key, id);
    existingPlans.push({ id, name, priceCents, billingInterval, maxMembers: 1, createdAt: new Date() });
    return id;
  };
}

export async function importRows(
  gymId: string,
  rows: MappedRow[],
  onProgress?: (done: number, total: number) => void
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    membersCreated: 0,
    payersCreated: 0,
    plansCreated: 0,
    subscriptionsCreated: 0,
    attendanceEntriesCreated: 0,
    skipped: [],
  };

  const existingPlans = await listPlans(gymId);
  const resolvePlanId = makePlanResolver(gymId, existingPlans, summary);
  const attendanceBatch = new ChunkedBatch();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.error) {
      summary.skipped.push({ rowIndex: row.rowIndex, fullName: row.fullName || "(unnamed)", reason: row.error });
      onProgress?.(i + 1, rows.length);
      continue;
    }

    try {
      const memberId = await importMember(gymId, {
        fullName: row.fullName,
        email: row.email,
        phone: row.phone,
        joinedAt: row.joinedAt,
      });
      summary.membersCreated++;

      if (row.planName && row.planPriceCents !== undefined) {
        const interval = row.billingInterval || "month";
        const planId = await resolvePlanId(row.planName, row.planPriceCents, interval);

        const payerId = await createPayer(gymId, { fullName: row.fullName, email: row.email ?? "", phone: row.phone });
        summary.payersCreated++;
        await linkMemberToPayer(gymId, payerId, memberId);

        const periodStart = row.joinedAt ?? new Date();
        const periodEnd = row.nextDueDate ?? new Date(periodStart.getTime() + billingIntervalToDays(interval) * 24 * 60 * 60 * 1000);
        await createImportedSubscription(gymId, { payerId, planId, memberIds: [memberId], periodStart, periodEnd });
        summary.subscriptionsCreated++;
      }

      for (const date of row.attendanceDates) {
        const checkedInAt = Timestamp.fromDate(date);
        attendanceBatch.set(doc(checkInsCol(gymId, memberId)), { checkedInAt });
        attendanceBatch.set(doc(attendanceLogCol(gymId)), {
          memberId,
          memberName: row.fullName,
          checkedInAt,
          source: "import",
        });
        summary.attendanceEntriesCreated++;
      }
    } catch (err) {
      summary.skipped.push({ rowIndex: row.rowIndex, fullName: row.fullName, reason: (err as Error).message });
    }

    onProgress?.(i + 1, rows.length);
  }

  await attendanceBatch.commitAll();
  return summary;
}
