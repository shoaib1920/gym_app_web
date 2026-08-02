import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { mapFirebaseError } from "../lib/firebaseErrors";
import { Button, Input, ErrorText, Icon } from "../components/ui";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { login, loginWithGoogle, googleSignInReady, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!email.trim()) return "Email is required.";
    if (!EMAIL_REGEX.test(email.trim())) return "Enter a valid email address.";
    if (!password) return "Password is required.";
    return null;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(mapFirebaseError((err as { code?: string })?.code));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(mapFirebaseError((err as { code?: string })?.code));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      setError("Enter your email above first, then click 'Forgot password'.");
      return;
    }
    setError(null);
    try {
      await resetPassword(email.trim());
      setNotice("Check your email — we sent a password reset link.");
    } catch (err) {
      setError(mapFirebaseError((err as { code?: string })?.code));
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <form onSubmit={handleLogin} className="w-full max-w-[24rem]">
        <div className="mb-xl flex flex-col items-center">
          <Icon name="fitness_center" filled className="!text-4xl text-primary-container mb-xs" />
          <h1 className="font-headline text-headline-lg font-black text-primary-container tracking-tighter">IRON OPS</h1>
          <p className="mt-1 font-label-md text-label-md text-on-surface-variant">Sign in to continue</p>
        </div>

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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
        />

        <ErrorText>{error}</ErrorText>
        {notice && (
          <p className="mb-md rounded-lg bg-primary-container/10 px-md py-sm font-label-md text-label-md text-primary-fixed-dim">
            {notice}
          </p>
        )}

        <Button type="submit" fullWidth loading={submitting} className="mt-2">
          Log in
        </Button>

        <Button
          type="button"
          variant="secondary"
          fullWidth
          className="mt-3"
          onClick={handleGoogleLogin}
          disabled={submitting || !googleSignInReady}
        >
          Continue with Google
        </Button>

        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={submitting}
          className="mt-5 block w-full text-center font-label-md text-label-md text-primary-container"
        >
          Forgot password?
        </button>

        <Link to="/signup" className="mt-3 block text-center font-label-md text-label-md text-primary-container">
          Don't have an account? Sign up
        </Link>
      </form>
    </div>
  );
}
