import type { Member } from "../firestore/types";

// Local-date parsing (no UTC conversion) matches how joiningDate/endingDate
// are stored — plain "YYYY-MM-DD" strings, same convention the original
// gym_attendence_system's feeService.js used to avoid timezone off-by-one
// bugs around midnight.
function parseDateOnly(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function todayDateOnly(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface RenewalStatus {
  /** Negative = overdue by that many days. 0 = due today. Positive = days left. */
  daysLeft: number;
  isOverdue: boolean;
}

/** Pure date math against whatever member data is already loaded — works offline since it doesn't touch the network. */
export function getRenewalStatus(member: Pick<Member, "endingDate">): RenewalStatus | null {
  if (!member.endingDate) return null;
  const daysLeft = Math.round((parseDateOnly(member.endingDate).getTime() - todayDateOnly().getTime()) / MS_PER_DAY);
  return { daysLeft, isOverdue: daysLeft < 0 };
}

export interface DueMember {
  member: Member;
  status: RenewalStatus;
}

/** Members whose membership is overdue or ending within `withinDays`, soonest first. */
export function listDueMembers(members: Member[], withinDays = 7): DueMember[] {
  const due: DueMember[] = [];
  for (const member of members) {
    const status = getRenewalStatus(member);
    if (status && status.daysLeft <= withinDays) {
      due.push({ member, status });
    }
  }
  return due.sort((a, b) => a.status.daysLeft - b.status.daysLeft);
}

export function renewalLabel(status: RenewalStatus): string {
  if (status.isOverdue) return `Overdue by ${-status.daysLeft} day${-status.daysLeft === 1 ? "" : "s"}`;
  if (status.daysLeft === 0) return "Due today";
  return `${status.daysLeft} day${status.daysLeft === 1 ? "" : "s"} left`;
}
