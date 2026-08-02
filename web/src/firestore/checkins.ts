import { getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { memberRef, checkInsCol } from "./paths";

interface QrPayload {
  gymId: string;
  memberId: string;
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

  await addDoc(checkInsCol(gymId, parsed.memberId), { checkedInAt: serverTimestamp() });

  return { memberId: parsed.memberId, fullName: memberSnap.data().fullName };
}
