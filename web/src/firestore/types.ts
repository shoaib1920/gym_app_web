export type SubscriptionStatus = "trialing" | "active" | "past_due" | "suspended" | "cancelled";

export interface Gym {
  id: string;
  name: string;
  timezone: string;
  ownerFirebaseUid: string;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
  fcmToken?: string | null;
  nextMemberSeq?: number;
  createdAt: Date;
}

export type Gender = "male" | "female" | "other";

export interface Member {
  id: string;
  memberCode: string;
  fullName: string;
  gender: Gender | null;
  email: string | null;
  phone: string | null;
  profilePhotoUrl: string | null;
  isMinor: boolean;
  status: "active" | "frozen" | "cancelled";
  joiningDate: string | null;
  endingDate: string | null;
  gymFeeCents: number | null;
  lockerFeeCents: number | null;
  registrationFeeCents: number | null;
  createdAt: Date;
}

export interface Waiver {
  id: string;
  templateVersion: string;
  signedByName: string;
  signedByRelationship: string | null;
  signatureData: string;
  signedAt: Date;
}

export interface CheckIn {
  id: string;
  checkedInAt: Date;
}

export interface MemberDetail extends Member {
  waivers: Waiver[];
  checkIns: CheckIn[];
}

export interface Payer {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  createdAt: Date;
}

export interface PayerMemberLink {
  linkId: string;
  memberId: string;
  fullName: string;
}

export interface PayerDetail extends Payer {
  memberLinks: PayerMemberLink[];
}

export interface MembershipPlan {
  id: string;
  name: string;
  priceCents: number;
  billingInterval: string;
  maxMembers: number;
  createdAt: Date;
}

export interface GymClass {
  id: string;
  name: string;
  trainerName: string | null;
  startsAt: Date;
  durationMinutes: number;
  capacity: number;
  spotsRemaining: number;
}

export type EquipmentCondition = "good" | "needs_repair" | "needs_replacement";

export interface Equipment {
  id: string;
  name: string;
  purchaseDate: string | null;
  condition: EquipmentCondition;
  notes: string | null;
  createdAt: Date;
}

export interface Expense {
  id: string;
  category: string;
  amountCents: number;
  description: string | null;
  date: string;
  createdAt: Date;
}

export interface FeeOverviewPayer {
  payerId: string;
  payerName: string;
  planName: string | null;
  priceCents: number;
  currentPeriodEnd: Date | null;
  status: "paid" | "pending";
  joinedAt: Date;
}

export interface FeeOverview {
  collectedCents: number;
  pendingCents: number;
  paidCount: number;
  pendingCount: number;
  payers: FeeOverviewPayer[];
}

export type AttendanceSource = "scanner" | "kiosk" | "import";

export interface AttendanceLogEntry {
  id: string;
  memberId: string;
  memberName: string;
  checkedInAt: Date;
  source: AttendanceSource;
}
