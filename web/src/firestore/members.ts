import {
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  writeBatch,
  runTransaction,
  serverTimestamp,
  Timestamp,
  doc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { membersCol, memberRef, waiversCol, checkInsCol, gymRef } from "./paths";
import type { Member, MemberDetail, Waiver, CheckIn } from "./types";

function toMember(id: string, data: any): Member {
  return {
    id,
    memberCode: data.memberCode ?? "",
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

/**
 * Short, human-typeable code (e.g. "0007") assigned to every new member —
 * used at the self check-in kiosk, where typing a Firestore doc id isn't an
 * option. Backed by a counter on the gym doc, incremented inside a
 * transaction so two members created at the same moment can't collide.
 */
async function nextMemberCode(gymId: string): Promise<string> {
  const seq = await runTransaction(db, async (tx) => {
    const gymSnap = await tx.get(gymRef(gymId));
    const current = (gymSnap.data()?.nextMemberSeq as number | undefined) ?? 1;
    tx.update(gymRef(gymId), { nextMemberSeq: current + 1 });
    return current;
  });
  return String(seq).padStart(4, "0");
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
  const memberCode = await nextMemberCode(gymId);
  const batch = writeBatch(db);
  const memberDocRef = doc(membersCol(gymId));

  batch.set(memberDocRef, {
    memberCode,
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

/** Kiosk lookup: a member types their own code, this resolves it to a doc. */
export async function getMemberByCode(gymId: string, memberCode: string): Promise<Member | null> {
  const snap = await getDocs(query(membersCol(gymId), where("memberCode", "==", memberCode)));
  if (snap.empty) return null;
  return toMember(snap.docs[0].id, snap.docs[0].data());
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

export interface ImportMemberInput {
  fullName: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  joinedAt?: Date;
}

/**
 * Bulk-import counterpart to createMemberWithWaiver. Historical members
 * from a spreadsheet never signed a waiver in this app, so — unlike normal
 * signup — this doesn't create one; MemberDetail.waivers already renders
 * fine as an empty array. createdAt is backdated to the sheet's join date
 * when known, so "member since" reflects reality instead of import day.
 */
export async function importMember(gymId: string, input: ImportMemberInput): Promise<string> {
  const memberCode = await nextMemberCode(gymId);
  const memberDocRef = doc(membersCol(gymId));
  await writeBatch(db)
    .set(memberDocRef, {
      memberCode,
      fullName: input.fullName,
      dateOfBirth: input.dateOfBirth ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      profilePhotoUrl: null,
      isMinor: false,
      status: "active",
      createdAt: input.joinedAt ? Timestamp.fromDate(input.joinedAt) : serverTimestamp(),
    })
    .commit();
  return memberDocRef.id;
}
