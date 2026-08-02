import {
  addDoc,
  deleteDoc,
  getCountFromServer,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { classesCol, classRef, bookingsCol, bookingRef } from "./paths";
import { GymClass } from "./types";

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

  return Promise.all(
    snap.docs.map(async (d) => {
      const bookingsCount = await getCountFromServer(bookingsCol(gymId, d.id));
      const data = d.data();
      return {
        id: d.id,
        name: data.name,
        trainerName: data.trainerName ?? null,
        startsAt: (data.startsAt as Timestamp).toDate(),
        durationMinutes: data.durationMinutes,
        capacity: data.capacity,
        spotsRemaining: data.capacity - bookingsCount.data().count,
      };
    })
  );
}

export async function createClass(gymId: string, input: CreateClassInput): Promise<string> {
  const docRef = await addDoc(classesCol(gymId), {
    name: input.name,
    trainerName: input.trainerName ?? null,
    startsAt: Timestamp.fromDate(new Date(input.startsAt)),
    durationMinutes: input.durationMinutes,
    capacity: input.capacity,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Books a member into a class inside a transaction: re-reads the class'
 * capacity and checks for an existing booking atomically, so two
 * simultaneous booking attempts can't both slip in over capacity — the
 * same guarantee the old Postgres unique constraint + capacity check gave.
 * Using the member's id as the booking document's id is what makes
 * double-booking structurally impossible rather than just checked for.
 */
export async function bookClass(gymId: string, classId: string, memberId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const classSnap = await tx.get(classRef(gymId, classId));
    if (!classSnap.exists()) throw new Error("Class not found");

    const existingBooking = await tx.get(bookingRef(gymId, classId, memberId));
    if (existingBooking.exists()) throw new Error("This member is already booked into this class");

    const bookingsSnap = await tx.get(query(bookingsCol(gymId, classId)));
    if (bookingsSnap.size >= classSnap.data().capacity) throw new Error("This class is full");

    tx.set(bookingRef(gymId, classId, memberId), { bookedAt: serverTimestamp() });
  });
}

export async function cancelBooking(gymId: string, classId: string, memberId: string): Promise<void> {
  await deleteDoc(bookingRef(gymId, classId, memberId));
}
