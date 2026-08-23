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
    gender: data.gender ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    profilePhotoUrl: data.profilePhotoUrl ?? null,
    isMinor: !!data.isMinor,
    status: data.status ?? "active",
    joiningDate: data.joiningDate ?? null,
    endingDate: data.endingDate ?? null,
    gymFeeCents: data.gymFeeCents ?? null,
    lockerFeeCents: data.lockerFeeCents ?? null,
    registrationFeeCents: data.registrationFeeCents ?? null,
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

/** Used whenever an owner manually types a registration number (on add, or editing an existing member) instead of taking the auto-generated one. */
async function assertMemberCodeAvailable(gymId: string, memberCode: string, excludeMemberId?: string): Promise<void> {
  const snap = await getDocs(query(membersCol(gymId), where("memberCode", "==", memberCode)));
  const takenByOther = snap.docs.some((d) => d.id !== excludeMemberId);
  if (takenByOther) {
    throw new Error(`Registration number "${memberCode}" is already in use by another member.`);
  }
}

export interface CreateMemberInput {
  fullName: string;
  memberCode?: string;
  gender?: Member["gender"];
  email?: string;
  phone?: string;
  isMinor: boolean;
  joiningDate?: string;
  endingDate?: string;
  gymFeeCents?: number;
  lockerFeeCents?: number;
  registrationFeeCents?: number;
}

/** Creates a member. No waiver/signature required — this gym doesn't use digital waivers. */
export async function createMember(gymId: string, input: CreateMemberInput): Promise<{ id: string; memberCode: string }> {
  const manualCode = input.memberCode?.trim();
  if (manualCode) {
    await assertMemberCodeAvailable(gymId, manualCode);
  }
  const memberCode = manualCode || (await nextMemberCode(gymId));
  const memberDocRef = doc(membersCol(gymId));

  await writeBatch(db)
    .set(memberDocRef, {
      memberCode,
      fullName: input.fullName,
      gender: input.gender ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      profilePhotoUrl: null,
      isMinor: input.isMinor,
      status: "active",
      joiningDate: input.joiningDate ?? null,
      endingDate: input.endingDate ?? null,
      gymFeeCents: input.gymFeeCents ?? null,
      lockerFeeCents: input.lockerFeeCents ?? null,
      registrationFeeCents: input.registrationFeeCents ?? null,
      createdAt: serverTimestamp(),
    })
    .commit();

  return { id: memberDocRef.id, memberCode };
}

/** Kiosk lookup: a member types their own code, this resolves it to a doc. */
export async function getMemberByCode(gymId: string, memberCode: string): Promise<Member | null> {
  const snap = await getDocs(query(membersCol(gymId), where("memberCode", "==", memberCode)));
  if (snap.empty) return null;
  return toMember(snap.docs[0].id, snap.docs[0].data());
}

export type MemberEditableFields = Partial<
  Pick<
    Member,
    | "fullName"
    | "memberCode"
    | "gender"
    | "email"
    | "phone"
    | "status"
    | "profilePhotoUrl"
    | "isMinor"
    | "joiningDate"
    | "endingDate"
    | "gymFeeCents"
    | "lockerFeeCents"
    | "registrationFeeCents"
  >
>;

export async function updateMember(gymId: string, memberId: string, patch: MemberEditableFields): Promise<void> {
  const finalPatch = { ...patch };
  if (finalPatch.memberCode) {
    finalPatch.memberCode = finalPatch.memberCode.trim();
    await assertMemberCodeAvailable(gymId, finalPatch.memberCode, memberId);
  }
  await updateDoc(memberRef(gymId, memberId), finalPatch as Record<string, unknown>);
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

function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface ImportMemberInput {
  fullName: string;
  memberCode?: string;
  email?: string;
  phone?: string;
  joinedAt?: Date;
}

/**
 * Bulk-import counterpart to createMember. createdAt (and joiningDate) are
 * backdated to the sheet's join date when known, so "member since" reflects
 * reality instead of import day. If the sheet has its own registration
 * number column, that's used as-is (skipping a duplicate silently rather
 * than failing the whole import — spreadsheets exported from an old system
 * sometimes have stale/reused numbers).
 */
export async function importMember(gymId: string, input: ImportMemberInput): Promise<string> {
  const manualCode = input.memberCode?.trim();
  let memberCode: string;
  if (manualCode) {
    try {
      await assertMemberCodeAvailable(gymId, manualCode);
      memberCode = manualCode;
    } catch {
      memberCode = await nextMemberCode(gymId);
    }
  } else {
    memberCode = await nextMemberCode(gymId);
  }
  const memberDocRef = doc(membersCol(gymId));
  await writeBatch(db)
    .set(memberDocRef, {
      memberCode,
      fullName: input.fullName,
      gender: null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      profilePhotoUrl: null,
      isMinor: false,
      status: "active",
      joiningDate: input.joinedAt ? formatDateOnly(input.joinedAt) : null,
      endingDate: null,
      gymFeeCents: null,
      lockerFeeCents: null,
      registrationFeeCents: null,
      createdAt: input.joinedAt ? Timestamp.fromDate(input.joinedAt) : serverTimestamp(),
    })
    .commit();
  return memberDocRef.id;
}
