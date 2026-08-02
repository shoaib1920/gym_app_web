import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { mapFirebaseError } from "../lib/firebaseErrors";
import { AuthStackParamList } from "../navigation/AuthStack";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { login, loginWithGoogle, googleSignInReady, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!email.trim()) return "Email is required.";
    if (!EMAIL_REGEX.test(email.trim())) return "Enter a valid email address.";
    if (!password) return "Password is required.";
    return null;
  };

  const handleLogin = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(mapFirebaseError(err?.code));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(mapFirebaseError(err?.code));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      setError("Enter your email above first, then tap 'Forgot password'.");
      return;
    }
    try {
      await resetPassword(email.trim());
      Alert.alert("Check your email", "We sent a password reset link.");
    } catch (err: any) {
      setError(mapFirebaseError(err?.code));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>Gym Manager</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!submitting}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!submitting}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Log In</Text>
        )}
      </Pressable>

      <Pressable
        style={[styles.googleButton, (submitting || !googleSignInReady) && styles.buttonDisabled]}
        onPress={handleGoogleLogin}
        disabled={submitting || !googleSignInReady}
      >
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </Pressable>

      <Pressable onPress={handleForgotPassword} disabled={submitting}>
        <Text style={styles.link}>Forgot password?</Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate("Signup")} disabled={submitting}>
        <Text style={styles.link}>Don't have an account? Sign up</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#666", textAlign: "center", marginBottom: 32 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  error: { color: "#c0392b", marginBottom: 12, textAlign: "center" },
  button: {
    backgroundColor: "#2d5be3",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  googleButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 12,
  },
  googleButtonText: { color: "#333", fontSize: 16, fontWeight: "600" },
  link: { color: "#2d5be3", textAlign: "center", marginTop: 18 },
});
