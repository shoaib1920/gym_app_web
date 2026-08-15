import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useGymId } from "../context/AuthContext";
import { getMember, updateMember } from "../firestore/members";
import type { Gender, MemberDetail } from "../firestore/types";
import { uploadMemberPhoto } from "../lib/memberPhoto";
import { formatCurrency } from "../lib/currency";
import { Button, ErrorText, Icon, Input, PageSpinner, StatusPill } from "../components/ui";

const STATUS_PILL = { active: "active", frozen: "neutral", cancelled: "error" } as const;
const STATUSES: MemberDetail["status"][] = ["active", "frozen", "cancelled"];
const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

function centsToInput(cents: number | null): string {
  return cents === null || cents === undefined ? "" : String(cents / 100);
}

function inputToCents(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Math.round(parseFloat(value) * 100);
  return isNaN(parsed) ? null : parsed;
}

export default function MemberDetailPage() {
  const gymId = useGymId();
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [memberCode, setMemberCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [status, setStatus] = useState<MemberDetail["status"]>("active");
  const [isMinor, setIsMinor] = useState(false);
  const [joiningDate, setJoiningDate] = useState("");
  const [endingDate, setEndingDate] = useState("");
  const [registrationFee, setRegistrationFee] = useState("");
  const [gymFee, setGymFee] = useState("");
  const [lockerFee, setLockerFee] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const populateForm = (data: MemberDetail) => {
    setMemberCode(data.memberCode);
    setFullName(data.fullName);
    setEmail(data.email ?? "");
    setPhone(data.phone ?? "");
    setGender(data.gender ?? "");
    setStatus(data.status);
    setIsMinor(data.isMinor);
    setJoiningDate(data.joiningDate ?? "");
    setEndingDate(data.endingDate ?? "");
    setRegistrationFee(centsToInput(data.registrationFeeCents));
    setGymFee(centsToInput(data.gymFeeCents));
    setLockerFee(centsToInput(data.lockerFeeCents));
  };

  useEffect(() => {
    if (!memberId) return;
    let cancelled = false;
    setLoading(true);
    getMember(gymId, memberId)
      .then((data) => {
        if (cancelled) return;
        if (!data) throw new Error("Member not found");
        setMember(data);
        populateForm(data);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [gymId, memberId]);

  const handleSave = async () => {
    if (!memberId || !member) return;
    setSaving(true);
    setError(null);
    try {
      const patch = {
        memberCode,
        fullName,
        email,
        phone,
        gender: gender || null,
        status,
        isMinor,
        joiningDate: joiningDate || null,
        endingDate: endingDate || null,
        registrationFeeCents: inputToCents(registrationFee),
        gymFeeCents: inputToCents(gymFee),
        lockerFeeCents: inputToCents(lockerFee),
      };
      await updateMember(gymId, memberId, patch);
      setMember((prev) => (prev ? { ...prev, ...patch, memberCode: patch.memberCode.trim() || prev.memberCode } : prev));
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (member) populateForm(member);
    setEditing(false);
    setError(null);
  };

  const handlePickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !memberId) return;

    setUploadingPhoto(true);
    setError(null);
    try {
      const downloadUrl = await uploadMemberPhoto(memberId, file);
      await updateMember(gymId, memberId, { profilePhotoUrl: downloadUrl });
      setMember((prev) => (prev ? { ...prev, profilePhotoUrl: downloadUrl } : prev));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading || !member) {
    return <PageSpinner />;
  }

  return (
    <div className="max-w-[32rem] mx-auto">
      {editing ? (
        <div className="bg-surface-container border border-outline-variant rounded-xl p-lg">
          <Input label="Registration number" value={memberCode} onChange={(e) => setMemberCode(e.target.value)} />
          <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label className="mb-md block">
            <span className="mb-xs block font-label-md text-label-md text-on-surface">Gender</span>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender | "")}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm text-on-surface outline-none transition-colors focus:border-primary-container"
            >
              <option value="">Not set</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>

          <label className="mb-md block">
            <span className="mb-xs block font-label-md text-label-md text-on-surface">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as MemberDetail["status"])}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm text-on-surface outline-none transition-colors focus:border-primary-container capitalize"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-md">
            <Input label="Date of joining" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
            <Input label="Ending date" type="date" value={endingDate} onChange={(e) => setEndingDate(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-md">
            <Input
              label="Registration fee"
              inputMode="decimal"
              placeholder="Rs"
              value={registrationFee}
              onChange={(e) => setRegistrationFee(e.target.value)}
            />
            <Input label="Gym fee" inputMode="decimal" placeholder="Rs" value={gymFee} onChange={(e) => setGymFee(e.target.value)} />
            <Input
              label="Locker fee"
              inputMode="decimal"
              placeholder="Rs"
              value={lockerFee}
              onChange={(e) => setLockerFee(e.target.value)}
            />
          </div>

          <label className="flex items-center justify-between rounded-lg border border-outline-variant px-md py-sm mb-md">
            <span className="font-label-md text-label-md text-on-surface">This member is a minor</span>
            <input
              type="checkbox"
              checked={isMinor}
              onChange={(e) => setIsMinor(e.target.checked)}
              className="h-5 w-5 accent-primary-container"
            />
          </label>

          <ErrorText>{error}</ErrorText>
          <div className="mt-md flex gap-md">
            <Button variant="secondary" fullWidth onClick={handleCancelEdit} disabled={saving}>
              Cancel
            </Button>
            <Button fullWidth loading={saving} onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center mb-lg">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-primary-container p-1"
            >
              <span className="flex w-full h-full items-center justify-center rounded-xl bg-surface-container-highest text-center px-2 text-xs text-on-surface-variant overflow-hidden">
                {member.profilePhotoUrl ? (
                  <img src={member.profilePhotoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : uploadingPhoto ? (
                  "Uploading…"
                ) : (
                  <Icon name="add_a_photo" />
                )}
              </span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickPhoto} />

            <h1 className="mt-md font-headline text-headline-lg font-bold text-on-surface text-center">{member.fullName}</h1>
            <div className="mt-xs flex items-center gap-sm">
              <StatusPill variant={STATUS_PILL[member.status]}>{member.status}</StatusPill>
              {member.isMinor && <span className="text-xs text-on-surface-variant">Minor</span>}
              {member.gender && <span className="text-xs text-on-surface-variant capitalize">{member.gender}</span>}
            </div>
          </div>

          <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant mb-md text-center">
            <p className="text-on-surface-variant font-label-sm text-label-sm uppercase mb-1">Registration number</p>
            <p className="text-on-surface font-headline text-headline-sm font-bold tracking-[0.2em]">{member.memberCode || "—"}</p>
          </div>

          <div className="grid grid-cols-2 gap-md mb-md">
            <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant">
              <p className="text-on-surface-variant font-label-sm text-label-sm uppercase mb-1">Phone</p>
              <p className="text-on-surface font-label-md text-label-md truncate">{member.phone ?? "—"}</p>
            </div>
            <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant">
              <p className="text-on-surface-variant font-label-sm text-label-sm uppercase mb-1">Email</p>
              <p className="text-on-surface font-label-md text-label-md truncate">{member.email ?? "—"}</p>
            </div>
            <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant">
              <p className="text-on-surface-variant font-label-sm text-label-sm uppercase mb-1">Date of joining</p>
              <p className="text-on-surface font-label-md text-label-md truncate">{member.joiningDate ?? "—"}</p>
            </div>
            <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant">
              <p className="text-on-surface-variant font-label-sm text-label-sm uppercase mb-1">Ending date</p>
              <p className="text-on-surface font-label-md text-label-md truncate">{member.endingDate ?? "—"}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-md mb-lg">
            <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant">
              <p className="text-on-surface-variant font-label-sm text-label-sm uppercase mb-1">Reg. fee</p>
              <p className="text-on-surface font-label-md text-label-md truncate">
                {member.registrationFeeCents !== null ? formatCurrency(member.registrationFeeCents) : "—"}
              </p>
            </div>
            <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant">
              <p className="text-on-surface-variant font-label-sm text-label-sm uppercase mb-1">Gym fee</p>
              <p className="text-on-surface font-label-md text-label-md truncate">
                {member.gymFeeCents !== null ? formatCurrency(member.gymFeeCents) : "—"}
              </p>
            </div>
            <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant">
              <p className="text-on-surface-variant font-label-sm text-label-sm uppercase mb-1">Locker fee</p>
              <p className="text-on-surface font-label-md text-label-md truncate">
                {member.lockerFeeCents !== null ? formatCurrency(member.lockerFeeCents) : "—"}
              </p>
            </div>
          </div>

          <ErrorText>{error}</ErrorText>

          <Button variant="secondary" fullWidth onClick={() => setEditing(true)}>
            Edit profile
          </Button>

          <div className="mt-md flex gap-md">
            <Link to={`/members/${member.id}/qr`} className="flex-1">
              <Button fullWidth variant="secondary">
                <Icon name="qr_code_2" className="!text-lg" />
                View QR
              </Button>
            </Link>
            <Link to={`/members/${member.id}/receipt`} className="flex-1">
              <Button fullWidth variant="secondary">
                <Icon name="print" className="!text-lg" />
                Print receipt
              </Button>
            </Link>
          </div>

          <div className="mt-md">
            <Button fullWidth onClick={() => navigate(`/classes?bookFor=${member.id}`)}>
              <Icon name="event_available" className="!text-lg" />
              Book a class
            </Button>
          </div>

          <h4 className="font-headline text-headline-sm font-bold text-on-surface mb-md mt-xl">Check-in history</h4>
          {member.checkIns.length === 0 ? (
            <p className="font-label-md text-label-md text-on-surface-variant">No check-ins yet.</p>
          ) : (
            <div className="space-y-sm">
              {member.checkIns.map((c) => (
                <div key={c.id} className="flex justify-between items-center p-md bg-surface-container-low rounded-lg border-l-4 border-primary-container">
                  <p className="text-xs text-on-surface-variant">{c.checkedInAt.toLocaleString()}</p>
                  <Icon name="login" className="text-primary-container !text-lg" />
                </div>
              ))}
            </div>
          )}

          <h4 className="font-headline text-headline-sm font-bold text-on-surface mb-md mt-xl">Waivers on file</h4>
          {member.waivers.length === 0 ? (
            <p className="font-label-md text-label-md text-on-surface-variant">No waivers signed.</p>
          ) : (
            <div className="space-y-sm">
              {member.waivers.map((w) => (
                <div key={w.id} className="flex items-center gap-sm p-md bg-surface-container-low rounded-lg">
                  <Icon name="verified" className="text-primary-container" />
                  <p className="font-label-md text-label-md text-on-surface">
                    Signed by {w.signedByName} on {w.signedAt.toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
