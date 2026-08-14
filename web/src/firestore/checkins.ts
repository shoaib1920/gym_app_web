import { getDoc, getDocs, query, where, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { memberRef, checkInsCol, membersCol, attendanceLogCol } from "./paths";
import type { AttendanceSource } from "./types";

interface QrPayload {
  gymId: string;
  memberId: string;
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
export async function recordCheckInByCode(
  gymId: string,
  memberCode: string
): Promise<{ memberId: string; fullName: string }> {
  const trimmed = memberCode.trim();
  if (!trimmed) {
    throw new Error("Enter your member code");
  }

  const snap = await getDocs(query(membersCol(gymId), where("memberCode", "==", trimmed)));
  if (snap.empty) {
    throw new Error("No member found with that code");
  }

  const memberDoc = snap.docs[0];
  const fullName = memberDoc.data().fullName;
  await batchCheckIn(gymId, memberDoc.id, fullName, "kiosk");

  return { memberId: memberDoc.id, fullName };
}
