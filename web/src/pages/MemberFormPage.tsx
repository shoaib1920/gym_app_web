import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGymId } from "../context/AuthContext";
import { createMember } from "../firestore/members";
import { getGym } from "../firestore/gym";
import { sendRegistrationEmailIfAvailable } from "../lib/electronBridge";
import type { Gender } from "../firestore/types";
import { Button, ErrorText, Icon, Input } from "../components/ui";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

function toCentsOrUndefined(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Math.round(parseFloat(value) * 100);
  return isNaN(parsed) ? undefined : parsed;
}

export default function MemberFormPage() {
  const gymId = useGymId();
  const navigate = useNavigate();

  const [memberCode, setMemberCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [joiningDate, setJoiningDate] = useState("");
  const [endingDate, setEndingDate] = useState("");
  const [registrationFee, setRegistrationFee] = useState("");
  const [gymFee, setGymFee] = useState("");
  const [lockerFee, setLockerFee] = useState("");
  const [isMinor, setIsMinor] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const newMember = await createMember(gymId, {
        fullName: fullName.trim(),
        memberCode: memberCode.trim() || undefined,
        gender: gender || undefined,
        phone: phone || undefined,
        email: email || undefined,
        joiningDate: joiningDate || undefined,
        endingDate: endingDate || undefined,
        registrationFeeCents: toCentsOrUndefined(registrationFee),
        gymFeeCents: toCentsOrUndefined(gymFee),
        lockerFeeCents: toCentsOrUndefined(lockerFee),
        isMinor,
      });

      if (email.trim()) {
        const gym = await getGym(gymId);
        void sendRegistrationEmailIfAvailable({
          to: email.trim(),
          gymName: gym?.name ?? "the gym",
          memberName: fullName.trim(),
          memberCode: newMember.memberCode,
        });
      }

      navigate(`/members/${newMember.id}/receipt?fresh=1`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[42rem] mx-auto">
      <h2 className="font-headline text-headline-lg font-bold text-on-surface mb-lg">Add new member</h2>

      <form onSubmit={handleSubmit}>
        <div className="bg-surface-container p-lg border border-outline-variant rounded-xl space-y-md">
          <Input
            label="Registration number"
            placeholder="Leave blank to auto-generate"
            value={memberCode}
            onChange={(e) => setMemberCode(e.target.value)}
          />
          <Input label="Full name" placeholder="e.g. John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="Phone number" type="tel" placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input
            label="Email (optional — sends a welcome email + fee reminders)"
            type="email"
            placeholder="member@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="mb-md block">
            <span className="mb-xs block font-label-md text-label-md text-on-surface">Gender</span>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender | "")}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm text-on-surface outline-none transition-colors focus:border-primary-container"
            >
              <option value="">Select gender</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
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
              label="Registration fee (one-time)"
              inputMode="decimal"
              placeholder="Rs"
              value={registrationFee}
              onChange={(e) => setRegistrationFee(e.target.value)}
            />
            <Input
              label="Gym fee (monthly)"
              inputMode="decimal"
              placeholder="Rs"
              value={gymFee}
              onChange={(e) => setGymFee(e.target.value)}
            />
            <Input
              label="Locker fee"
              inputMode="decimal"
              placeholder="Rs"
              value={lockerFee}
              onChange={(e) => setLockerFee(e.target.value)}
            />
          </div>

          <label className="flex items-center justify-between rounded-lg border border-outline-variant px-md py-sm">
            <span className="font-label-md text-label-md text-on-surface">This member is a minor</span>
            <input
              type="checkbox"
              checked={isMinor}
              onChange={(e) => setIsMinor(e.target.checked)}
              className="h-5 w-5 accent-primary-container"
            />
          </label>
        </div>

        <ErrorText>{error}</ErrorText>

        <div className="mt-lg flex justify-end">
          <Button type="submit" loading={submitting}>
            <Icon name="save" className="!text-lg" />
            Save member
          </Button>
        </div>
      </form>
    </div>
  );
}
