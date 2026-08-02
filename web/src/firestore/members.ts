import { getDoc, getDocs, query, orderBy, limit, updateDoc, writeBatch, serverTimestamp, doc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { membersCol, memberRef, waiversCol, checkInsCol } from "./paths";
import type { Member, MemberDetail, Waiver, CheckIn } from "./types";

function toMember(id: string, data: any): Member {
  return {
    id,
    fullName: data.fullName,
    dateOfBirth: data.dateOfBirth ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    profilePhotoUrl: data.profilePhotoUrl ?? null,
    isMinor: !!data.isMinor,
    status: data.status ?? "active",
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
  };
}

export async function listMembers(gymId: string): Promise<Member[]> {
  const snap = await getDocs(query(membersCol(gymId), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => toMember(d.id, d.data()));
}

export async function getMember(gymId: string, memberId: string): Promise<MemberDetail | null> {
  const memberSnap = await getDoc(memberRef(gymId, memberId));
  if (!memberSnap.exists()) return null;

  const [waiversSnap, checkInsSnap] = await Promise.all([
    getDocs(query(waiversCol(gymId, memberId), orderBy("signedAt", "desc"))),
    getDocs(query(checkInsCol(gymId, memberId), orderBy("checkedInAt", "desc"), limit(20))),
  ]);

  const waivers: Waiver[] = waiversSnap.docs.map((d) => ({
    id: d.id,
    templateVersion: d.data().templateVersion,
    signedByName: d.data().signedByName,
    signedByRelationship: d.data().signedByRelationship ?? null,
    signatureData: d.data().signatureData,
    signedAt: d.data().signedAt?.toDate?.() ?? new Date(),
  }));

  const checkIns: CheckIn[] = checkInsSnap.docs.map((d) => ({
    id: d.id,
    checkedInAt: d.data().checkedInAt?.toDate?.() ?? new Date(),
  }));

  return { ...toMember(memberSnap.id, memberSnap.data()), waivers, checkIns };
}

export interface CreateMemberInput {
  fullName: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  isMinor: boolean;
  waiver: {
    templateVersion?: string;
    signedByName: string;
    signedByRelationship?: string;
    signatureData: string;
  };
}

/** Creates the member + its founding waiver in one atomic batch — the same
 * guarantee the old backend's DB transaction gave: a member row never
 * exists without a signed waiver attached. */
export async function createMemberWithWaiver(gymId: string, input: CreateMemberInput): Promise<string> {
  const batch = writeBatch(db);
  const memberDocRef = doc(membersCol(gymId));

  batch.set(memberDocRef, {
    fullName: input.fullName,
    dateOfBirth: input.dateOfBirth ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    profilePhotoUrl: null,
    isMinor: input.isMinor,
    status: "active",
    createdAt: serverTimestamp(),
  });

  const waiverDocRef = doc(waiversCol(gymId, memberDocRef.id));
  batch.set(waiverDocRef, {
    templateVersion: input.waiver.templateVersion ?? "v1",
    signedByName: input.waiver.signedByName,
    signedByRelationship: input.waiver.signedByRelationship ?? null,
    signatureData: input.waiver.signatureData,
    signedAt: serverTimestamp(),
  });

  await batch.commit();
  return memberDocRef.id;
}

export async function updateMember(
  gymId: string,
  memberId: string,
  patch: Partial<Pick<Member, "fullName" | "dateOfBirth" | "email" | "phone" | "status" | "profilePhotoUrl">>
): Promise<void> {
  await updateDoc(memberRef(gymId, memberId), patch as Record<string, unknown>);
}

/**
 * QR payload for check-in: just identifies the member, no signature needed.
 * Unlike the old HMAC-signed token (needed because a standalone Express
 * endpoint had no other way to trust the payload), firestore.rules already
 * restrict writing check-ins to this gym's authenticated owner, and
 * recordCheckIn() (checkins.ts) verifies the member doc actually exists
 * before writing.
 */
export function getMemberQrPayload(gymId: string, memberId: string): string {
  return JSON.stringify({ gymId, memberId });
}
