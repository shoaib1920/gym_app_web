import {
  addDoc,
  getDocs,
  increment,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { classesCol, classRef, bookingRef } from "./paths";
import type { GymClass } from "./types";

export interface CreateClassInput {
  name: string;
  trainerName?: string;
  startsAt: string; // ISO string
  durationMinutes: number;
  capacity: number;
}

export async function listUpcomingClasses(gymId: string): Promise<GymClass[]> {
  const now = Timestamp.now();
  const snap = await getDocs(
    query(classesCol(gymId), where("startsAt", ">=", now), orderBy("startsAt", "asc"))
  );

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      trainerName: data.trainerName ?? null,
      startsAt: (data.startsAt as Timestamp).toDate(),
      durationMinutes: data.durationMinutes,
      capacity: data.capacity,
      spotsRemaining: data.capacity - (data.bookingsCount ?? 0),
    };
  });
}

export async function createClass(gymId: string, input: CreateClassInput): Promise<string> {
  const docRef = await addDoc(classesCol(gymId), {
    name: input.name,
    trainerName: input.trainerName ?? null,
    startsAt: Timestamp.fromDate(new Date(input.startsAt)),
    durationMinutes: input.durationMinutes,
    capacity: input.capacity,
    bookingsCount: 0,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Books a member into a class inside a transaction. Firestore's web SDK
 * only allows tx.get() on a single document reference, never a query, so
 * capacity can't be checked by counting the bookings subcollection inside a
 * transaction — instead a bookingsCount counter lives on the class doc
 * itself (kept in sync by this function and cancelBooking below) and is
 * incremented atomically alongside the booking write. Using the member's id
 * as the booking document's id is what makes double-booking structurally
 * impossible rather than just checked for.
 */
export async function bookClass(gymId: string, classId: string, memberId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const classSnap = await tx.get(classRef(gymId, classId));
    if (!classSnap.exists()) throw new Error("Class not found");

    const existingBooking = await tx.get(bookingRef(gymId, classId, memberId));
    if (existingBooking.exists()) throw new Error("This member is already booked into this class");

    const bookingsCount = classSnap.data().bookingsCount ?? 0;
    if (bookingsCount >= classSnap.data().capacity) throw new Error("This class is full");

    tx.set(bookingRef(gymId, classId, memberId), { bookedAt: serverTimestamp() });
    tx.update(classRef(gymId, classId), { bookingsCount: increment(1) });
  });
}

export async function cancelBooking(gymId: string, classId: string, memberId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const existingBooking = await tx.get(bookingRef(gymId, classId, memberId));
    if (!existingBooking.exists()) return;

    tx.delete(bookingRef(gymId, classId, memberId));
    tx.update(classRef(gymId, classId), { bookingsCount: increment(-1) });
  });
}
