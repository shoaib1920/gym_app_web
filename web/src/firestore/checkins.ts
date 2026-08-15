import { getDoc, getDocs, query, where, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { memberRef, checkInsCol, membersCol, attendanceLogCol } from "./paths";
import { findPayerIdForMember } from "./payers";
import { getLatestSubscriptionForPayer } from "./subscriptions";
import { getRenewalStatus, renewalLabel } from "../lib/renewals";
import { formatCurrency } from "../lib/currency";
import type { AttendanceSource, Member } from "./types";

interface QrPayload {
  gymId: string;
  memberId: string;
}

export interface KioskFeeStatus {
  state: "paid" | "overdue" | "no-plan";
  label: string;
  planName?: string;
  periodEnd?: Date;
}

export interface KioskCheckInResult {
  memberId: string;
  fullName: string;
  memberCode: string;
  status: Member["status"];
  memberSince: Date;
  fee: KioskFeeStatus;
}

/**
 * Mirrors the original gym_attendence_system's computeFeeStatus so the
 * kiosk still greets a member with their paid/overdue standing, not just a
 * bare "checked in" confirmation.
 *
 * Checks the member's own endingDate/gymFeeCents fields first — that's
 * what the add-member form actually collects now — and only falls back to
 * the older Payer/Subscription system for members registered before those
 * fields existed. Previously this only ever checked Payer/Subscription,
 * so a member added with a fee and ending date still showed "No payment
 * on record" at the kiosk because nothing had created a Payer/Subscription
 * for them.
 */
async function getKioskFeeStatus(
  gymId: string,
  memberId: string,
  endingDate: string | null,
  gymFeeCents: number | null
): Promise<KioskFeeStatus> {
  const renewal = getRenewalStatus({ endingDate });
  if (renewal) {
    return {
      state: renewal.isOverdue ? "overdue" : "paid",
      label: renewalLabel(renewal),
      planName: gymFeeCents ? formatCurrency(gymFeeCents) : undefined,
    };
  }

  const payerId = await findPayerIdForMember(gymId, memberId);
  const status = payerId ? await getLatestSubscriptionForPayer(gymId, payerId) : null;
  if (!status) {
    return { state: "no-plan", label: "No payment on record" };
  }

  const daysDiff = Math.round((status.currentPeriodEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (daysDiff >= 0) {
    return {
      state: "paid",
      label: daysDiff === 0 ? "Fee due today" : `${daysDiff} day${daysDiff === 1 ? "" : "s"} left`,
      planName: status.planName,
      periodEnd: status.currentPeriodEnd,
    };
  }
  return {
    state: "overdue",
    label: `Overdue by ${-daysDiff} day${-daysDiff === 1 ? "" : "s"}`,
    planName: status.planName,
    periodEnd: status.currentPeriodEnd,
  };
}

/**
 * Writes the check-in to both the per-member `checkIns` subcollection (used
 * by MemberDetailPage) and the gym-wide `attendanceLog` (used by
 * AttendancePage) in one batch, so the two views can never disagree.
 */
function batchCheckIn(gymId: string, memberId: string, fullName: string, source: AttendanceSource) {
  const batch = writeBatch(db);
  const checkedInAt = serverTimestamp();
  batch.set(doc(checkInsCol(gymId, memberId)), { checkedInAt });
  batch.set(doc(attendanceLogCol(gymId)), { memberId, memberName: fullName, checkedInAt, source });
  return batch.commit();
}

/**
 * Front-desk scan handler. Parses the QR payload, confirms it's for this
 * gym and that the member actually exists (guards against a garbled or
 * foreign QR code), then records the check-in. firestore.rules
 * independently enforce that only this gym's authenticated owner — with an
 * active subscription — can write here at all; this function only handles
 * the "does this payload make sense" part.
 */
export async function recordCheckIn(
  gymId: string,
  qrPayload: string
): Promise<{ memberId: string; fullName: string }> {
  let parsed: QrPayload;
  try {
    parsed = JSON.parse(qrPayload);
  } catch {
    throw new Error("Invalid QR code");
  }
  if (!parsed.memberId || parsed.gymId !== gymId) {
    throw new Error("This QR code doesn't belong to a member at this gym");
  }

  const memberSnap = await getDoc(memberRef(gymId, parsed.memberId));
  if (!memberSnap.exists()) {
    throw new Error("This QR code doesn't belong to a member at this gym");
  }

  const fullName = memberSnap.data().fullName;
  await batchCheckIn(gymId, parsed.memberId, fullName, "scanner");

  return { memberId: parsed.memberId, fullName };
}

/**
 * Self-service kiosk handler: a member types their own short memberCode
 * instead of a staff member scanning a QR code. Same underlying write path
 * as recordCheckIn, just a different lookup.
 */
export async function recordCheckInByCode(gymId: string, memberCode: string): Promise<KioskCheckInResult> {
  const trimmed = memberCode.trim();
  if (!trimmed) {
    throw new Error("Enter your member code");
  }

  const snap = await getDocs(query(membersCol(gymId), where("memberCode", "==", trimmed)));
  if (snap.empty) {
    throw new Error("No member found with that code");
  }

  const memberDoc = snap.docs[0];
  const data = memberDoc.data();
  const fullName = data.fullName;

  const [, fee] = await Promise.all([
    batchCheckIn(gymId, memberDoc.id, fullName, "kiosk"),
    getKioskFeeStatus(gymId, memberDoc.id, data.endingDate ?? null, data.gymFeeCents ?? null),
  ]);

  return {
    memberId: memberDoc.id,
    fullName,
    memberCode: data.memberCode ?? trimmed,
    status: data.status ?? "active",
    memberSince: data.createdAt?.toDate?.() ?? new Date(),
    fee,
  };
}
