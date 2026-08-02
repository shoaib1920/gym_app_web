export type SubscriptionStatus = "trialing" | "active" | "past_due" | "suspended" | "cancelled";

export interface Gym {
  id: string;
  name: string;
  timezone: string;
  ownerFirebaseUid: string;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
  fcmToken?: string | null;
  createdAt: Date;
}

export interface Member {
  id: string;
  fullName: string;
  dateOfBirth: string | null;
  email: string | null;
  phone: string | null;
  profilePhotoUrl: string | null;
  isMinor: boolean;
  status: "active" | "frozen" | "cancelled";
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
  email: string;
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
