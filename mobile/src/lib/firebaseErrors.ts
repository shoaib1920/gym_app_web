export function mapFirebaseError(code?: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "That email address looks invalid.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    case "auth/email-already-in-use":
      return "An account with that email already exists. Try logging in instead.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/account-exists-with-different-credential":
      return "An account with this email already exists using a different sign-in method. Try logging in with email/password instead.";
    default:
      return "Something went wrong. Please try again.";
  }
}
