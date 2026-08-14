import { getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { attendanceLogCol } from "./paths";
import type { AttendanceLogEntry } from "./types";

function toEntry(id: string, data: any): AttendanceLogEntry {
  return {
    id,
    memberId: data.memberId,
    memberName: data.memberName,
    checkedInAt: data.checkedInAt?.toDate?.() ?? new Date(),
    source: data.source ?? "scanner",
  };
}

/**
 * Range filter and orderBy both target checkedInAt, so this stays a
 * single-field query Firestore can serve without a composite index —
 * same reasoning as the rest of this codebase's date-sorted queries.
 */
export async function listAttendance(gymId: string, from: Date, to: Date): Promise<AttendanceLogEntry[]> {
  const snap = await getDocs(
    query(
      attendanceLogCol(gymId),
      where("checkedInAt", ">=", Timestamp.fromDate(from)),
      where("checkedInAt", "<=", Timestamp.fromDate(to)),
      orderBy("checkedInAt", "desc")
    )
  );
  return snap.docs.map((d) => toEntry(d.id, d.data()));
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function listTodayAttendance(gymId: string): Promise<AttendanceLogEntry[]> {
  return listAttendance(gymId, startOfToday(), endOfToday());
}
