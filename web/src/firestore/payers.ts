import { addDoc, getDoc, getDocs, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import { payersCol, payerRef, payerMemberLinksCol, memberRef } from "./paths";
import { getDocsPreferCache } from "./cache";
import type { Payer, PayerDetail } from "./types";

export interface CreatePayerInput {
  fullName: string;
  email: string;
  phone?: string;
}

export async function listPayers(gymId: string): Promise<Payer[]> {
  const snap = await getDocs(query(payersCol(gymId), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({
    id: d.id,
    fullName: d.data().fullName,
    email: d.data().email,
    phone: d.data().phone ?? null,
    createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
  }));
}

export async function createPayer(gymId: string, input: CreatePayerInput): Promise<string> {
  const docRef = await addDoc(payersCol(gymId), {
    fullName: input.fullName,
    email: input.email,
    phone: input.phone ?? null,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getPayer(gymId: string, payerId: string): Promise<PayerDetail | null> {
  const payerSnap = await getDoc(payerRef(gymId, payerId));
  if (!payerSnap.exists()) return null;

  const linksSnap = await getDocs(query(payerMemberLinksCol(gymId), where("payerId", "==", payerId)));
  const memberLinks = await Promise.all(
    linksSnap.docs.map(async (linkDoc) => {
      const memberId = linkDoc.data().memberId as string;
      const memberSnap = await getDoc(memberRef(gymId, memberId));
      return {
        linkId: linkDoc.id,
        memberId,
        fullName: memberSnap.exists() ? memberSnap.data().fullName : "Unknown member",
      };
    })
  );

  return {
    id: payerSnap.id,
    fullName: payerSnap.data().fullName,
    email: payerSnap.data().email,
    phone: payerSnap.data().phone ?? null,
    createdAt: payerSnap.data().createdAt?.toDate?.() ?? new Date(),
    memberLinks,
  };
}

/** Reverse lookup of getPayer's member links — used by the kiosk to find whose subscription a member's fee status is tracked under. A member could in theory be linked to more than one payer; the first link found is what's shown. */
export async function findPayerIdForMember(gymId: string, memberId: string): Promise<string | null> {
  const snap = await getDocsPreferCache(query(payerMemberLinksCol(gymId), where("memberId", "==", memberId)));
  return snap.empty ? null : (snap.docs[0].data().payerId as string);
}

export async function linkMemberToPayer(
  gymId: string,
  payerId: string,
  memberId: string,
  relationship?: string
): Promise<void> {
  await addDoc(payerMemberLinksCol(gymId), {
    payerId,
    memberId,
    relationship: relationship ?? null,
    isActive: true,
    startedAt: serverTimestamp(),
  });
}
