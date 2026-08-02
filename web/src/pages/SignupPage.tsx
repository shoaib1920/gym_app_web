import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { mapFirebaseError } from "../lib/firebaseErrors";
import { Button, Input, ErrorText } from "../components/ui";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const { signup, loginWithGoogle, googleSignInReady } = useAuth();
  const [gymName, setGymName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!gymName.trim()) return "Gym name is required.";
    if (!email.trim()) return "Email is required.";
    if (!EMAIL_REGEX.test(email.trim())) return "Enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirmPassword) return "Passwords don't match.";
    return null;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signup(email.trim(), password, gymName.trim());
    } catch (err) {
      setError(mapFirebaseError((err as { code?: string })?.code));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(mapFirebaseError((err as { code?: string })?.code));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <form onSubmit={handleSignup} className="w-full max-w-[24rem]">
        <h1 className="text-center font-headline text-headline-lg font-bold text-on-surface">Create your account</h1>
        <p className="mb-xl mt-1 text-center font-label-md text-label-md text-on-surface-variant">Start your 14-day free trial</p>

        <Input label="Gym name" value={gymName} onChange={(e) => setGymName(e.target.value)} disabled={submitting} />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={submitting}
        />

        <ErrorText>{error}</ErrorText>

        <Button type="submit" fullWidth loading={submitting} className="mt-2">
          Create Account
        </Button>

        <Button
          type="button"
          variant="secondary"
          fullWidth
          className="mt-3"
          onClick={handleGoogleSignup}
          disabled={submitting || !googleSignInReady}
        >
          Continue with Google
        </Button>

        <Link to="/login" className="mt-5 block text-center font-label-md text-label-md text-primary-container">
          Already have an account? Log in
        </Link>
      </form>
    </div>
  );
}
