import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useGymId } from "../context/AuthContext";
import { getMember, getMemberQrPayload } from "../firestore/members";
import { Icon, PageSpinner } from "../components/ui";

export default function MemberQRPage() {
  const gymId = useGymId();
  const { memberId } = useParams<{ memberId: string }>();
  const [memberName, setMemberName] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId) return;
    getMember(gymId, memberId).then((data) => setMemberName(data?.fullName ?? null));
  }, [gymId, memberId]);

  if (!memberId) return null;
  if (memberName === null) return <PageSpinner />;

  const qrValue = getMemberQrPayload(gymId, memberId);

  return (
    <div className="flex flex-col items-center justify-center py-xl text-center">
      <h1 className="font-headline text-headline-lg font-bold text-on-surface">{memberName}</h1>
      <p className="mb-lg mt-xs font-label-md text-label-md text-on-surface-variant">
        Show this code at the front desk to check in.
      </p>
      <div className="rounded-xl border-2 border-primary-container bg-white p-lg">
        <QRCodeSVG value={qrValue} size={220} />
      </div>
      <div className="mt-lg flex items-center gap-xs text-on-surface-variant">
        <Icon name="qr_code_2" className="!text-lg" />
        <span className="font-label-sm text-label-sm">Scan at the front desk kiosk</span>
      </div>
    </div>
  );
}
