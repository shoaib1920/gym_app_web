export type MainStackParamList = {
  Dashboard: undefined;
  MembersList: undefined;
  MemberForm: undefined;
  MemberDetail: { memberId: string };
  MemberQR: { memberId: string; memberName: string };
  Plans: undefined;
  Payers: undefined;
  PayerForm: undefined;
  PayerDetail: { payerId: string };
  Classes: { bookingForMemberId?: string } | undefined;
  ClassForm: undefined;
  Scanner: undefined;
};
