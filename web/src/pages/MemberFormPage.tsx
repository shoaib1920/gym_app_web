import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { useNavigate } from "react-router-dom";
import { useGymId } from "../context/AuthContext";
import { createMemberWithWaiver } from "../firestore/members";
import { Button, ErrorText, Icon, Input } from "../components/ui";

const WAIVER_TEMPLATE_VERSION = "v1";

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-sm mb-xl">
      <div className={`flex items-center gap-xs ${step === 1 ? "text-primary-container" : "text-on-surface-variant"}`}>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
            step === 1 ? "bg-primary-container text-on-primary-container" : "border border-outline-variant"
          }`}
        >
          1
        </div>
        <span className="font-label-md text-label-md">Basic info</span>
      </div>
      <div className="w-12 h-px bg-outline-variant" />
      <div className={`flex items-center gap-xs ${step === 2 ? "text-primary-container" : "text-on-surface-variant"}`}>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
            step === 2 ? "bg-primary-container text-on-primary-container" : "border border-outline-variant"
          }`}
        >
          2
        </div>
        <span className="font-label-md text-label-md">Digital waiver</span>
      </div>
    </div>
  );
}

export default function MemberFormPage() {
  const gymId = useGymId();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("");

  const [showSignature, setShowSignature] = useState(false);
  const [signatureEmpty, setSignatureEmpty] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signatureRef = useRef<SignatureCanvas>(null);

  const validateForm = (): string | null => {
    if (!fullName.trim()) return "Full name is required.";
    if (isMinor && !guardianName.trim()) return "Guardian name is required for a minor.";
    if (isMinor && !guardianRelationship.trim()) return "Guardian relationship is required for a minor.";
    return null;
  };

  const handleContinueToSignature = () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setShowSignature(true);
  };

  const handleSubmit = async () => {
    if (signatureRef.current?.isEmpty() || !agreed) {
      setError("Please sign and agree to the waiver before saving.");
      return;
    }
    const signatureData = signatureRef.current?.toDataURL("image/png");
    if (!signatureData) {
      setError("Please sign the waiver before saving.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createMemberWithWaiver(gymId, {
        fullName: fullName.trim(),
        dateOfBirth: dateOfBirth || undefined,
        email: email || undefined,
        phone: phone || undefined,
        isMinor,
        waiver: {
          templateVersion: WAIVER_TEMPLATE_VERSION,
          signedByName: isMinor ? guardianName.trim() : fullName.trim(),
          signedByRelationship: isMinor ? guardianRelationship.trim() : undefined,
          signatureData,
        },
      });
      navigate("/members");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (showSignature) {
    return (
      <div className="max-w-[42rem] mx-auto">
        <h2 className="font-headline text-headline-lg font-bold text-on-surface mb-sm">Add new member</h2>
        <StepIndicator step={2} />

        <div className="rounded-xl border border-outline-variant bg-surface-container overflow-hidden">
          <div className="p-lg border-b border-outline-variant bg-surface-container-low">
            <div className="flex items-center gap-md text-error mb-sm">
              <Icon name="warning" />
              <span className="font-label-md text-label-md uppercase tracking-wider">Mandatory waiver disclosure</span>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Member and waiver are saved together atomically. Registration cannot be finalized without a valid digital signature.
            </p>
          </div>

          <div className="p-lg h-48 overflow-y-auto bg-surface-container-lowest text-on-surface-variant text-sm space-y-md">
            <p className="font-bold text-on-surface uppercase tracking-tight">1. Release of liability</p>
            <p>
              I understand that physical activity carries inherent risks. I release the gym, its officers, and employees from any and
              all liability for loss, damage, injury, or death arising from my participation in gym activities or presence on the
              premises.
            </p>
            <p className="font-bold text-on-surface uppercase tracking-tight">2. Use of equipment</p>
            <p>
              I agree to follow all posted safety rules and to use all equipment only as intended. I certify I am in good physical
              health and have no condition preventing safe participation in exercise.
            </p>
          </div>

          <div className="p-lg">
            <p className="mb-sm font-label-md text-label-md text-on-surface">
              By signing, {isMinor ? `${guardianName || "the guardian"} confirms` : `${fullName || "the member"} confirms`} they have
              read and accepted the waiver above.
            </p>
            <label className="block font-label-md text-label-md text-on-surface mb-sm">Sign below (e-signature)</label>
            <div className="relative">
              <SignatureCanvas
                ref={signatureRef}
                penColor="#c3f400"
                canvasProps={{
                  className: "w-full h-48 border-2 border-outline-variant rounded-lg cursor-crosshair bg-surface-container-low touch-none",
                }}
                onBegin={() => setSignatureEmpty(false)}
                onEnd={() => setSignatureEmpty(!!signatureRef.current?.isEmpty())}
              />
              <button
                onClick={() => {
                  signatureRef.current?.clear();
                  setSignatureEmpty(true);
                }}
                className="absolute top-sm right-sm flex items-center gap-xs bg-surface-container-highest text-on-surface-variant hover:text-on-surface px-sm py-xs rounded active:scale-95 transition-transform"
              >
                <Icon name="refresh" className="!text-sm" />
                <span className="text-[10px] font-bold">CLEAR</span>
              </button>
            </div>

            <div className="mt-md flex items-center gap-sm">
              <input
                type="checkbox"
                id="waiver-agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-5 h-5 rounded border-outline-variant bg-surface-container-low accent-primary-container"
              />
              <label htmlFor="waiver-agree" className="font-label-sm text-label-sm text-on-surface">
                I have read and agree to the terms above.
              </label>
            </div>
          </div>
        </div>

        <ErrorText>{error}</ErrorText>

        <div className="mt-lg flex justify-between items-center gap-md">
          <Button variant="secondary" onClick={() => setShowSignature(false)} disabled={submitting}>
            Back
          </Button>
          <Button loading={submitting} disabled={signatureEmpty || !agreed} onClick={handleSubmit}>
            <Icon name="save" className="!text-lg" />
            Save member and waiver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[42rem] mx-auto">
      <h2 className="font-headline text-headline-lg font-bold text-on-surface mb-sm">Add new member</h2>
      <StepIndicator step={1} />

      <div className="bg-surface-container p-lg border border-outline-variant rounded-xl space-y-md">
        <Input label="Full name" placeholder="e.g. John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input label="Date of birth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
        <Input label="Email address" type="email" placeholder="john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Phone number" type="tel" placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <label className="flex items-center justify-between rounded-lg border border-outline-variant px-md py-sm">
          <span className="font-label-md text-label-md text-on-surface">This member is a minor</span>
          <input
            type="checkbox"
            checked={isMinor}
            onChange={(e) => setIsMinor(e.target.checked)}
            className="h-5 w-5 accent-primary-container"
          />
        </label>

        {isMinor && (
          <>
            <Input label="Guardian full name" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
            <Input
              label="Guardian relationship"
              placeholder="Parent, Guardian, ..."
              value={guardianRelationship}
              onChange={(e) => setGuardianRelationship(e.target.value)}
            />
          </>
        )}
      </div>

      <ErrorText>{error}</ErrorText>

      <div className="mt-lg flex justify-end">
        <Button onClick={handleContinueToSignature}>
          Continue to waiver
          <Icon name="arrow_forward" className="!text-lg" />
        </Button>
      </div>
    </div>
  );
}
