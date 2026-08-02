import { collection, doc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

// Every business collection nests under gyms/{gymId} — see
// firebase/firestore.rules at the repo root for why that single nesting
// point is what makes multi-tenancy and the subscription kill switch work
// with one rule instead of one per collection.
export const gymRef = (gymId: string) => doc(db, "gyms", gymId);

export const membersCol = (gymId: string) => collection(db, "gyms", gymId, "members");
export const memberRef = (gymId: string, memberId: string) => doc(db, "gyms", gymId, "members", memberId);
export const waiversCol = (gymId: string, memberId: string) => collection(memberRef(gymId, memberId), "waivers");
export const checkInsCol = (gymId: string, memberId: string) => collection(memberRef(gymId, memberId), "checkIns");

export const payersCol = (gymId: string) => collection(db, "gyms", gymId, "payers");
export const payerRef = (gymId: string, payerId: string) => doc(db, "gyms", gymId, "payers", payerId);
export const payerMemberLinksCol = (gymId: string) => collection(db, "gyms", gymId, "payerMemberLinks");

export const plansCol = (gymId: string) => collection(db, "gyms", gymId, "membershipPlans");

export const subscriptionsCol = (gymId: string) => collection(db, "gyms", gymId, "subscriptions");

export const classesCol = (gymId: string) => collection(db, "gyms", gymId, "classes");
export const classRef = (gymId: string, classId: string) => doc(db, "gyms", gymId, "classes", classId);
export const bookingsCol = (gymId: string, classId: string) => collection(classRef(gymId, classId), "bookings");
export const bookingRef = (gymId: string, classId: string, memberId: string) =>
  doc(bookingsCol(gymId, classId), memberId);
