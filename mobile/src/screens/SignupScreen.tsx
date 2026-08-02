import React, { useState } from "react";
import {
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { mapFirebaseError } from "../lib/firebaseErrors";
import { AuthStackParamList } from "../navigation/AuthStack";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

export default function SignupScreen({ navigation }: Props) {
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

  const handleSignup = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signup(email.trim(), password, gymName.trim());
    } catch (err: any) {
      setError(mapFirebaseError(err?.code));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Start your 14-day free trial</Text>

        <TextInput
          style={styles.input}
          placeholder="Gym name"
          value={gymName}
          onChangeText={setGymName}
          editable={!submitting}
        />
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
        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          editable={!submitting}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.googleButton, (submitting || !googleSignInReady) && styles.buttonDisabled]}
          onPress={handleGoogleSignup}
          disabled={submitting || !googleSignInReady}
        >
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate("Login")} disabled={submitting}>
          <Text style={styles.link}>Already have an account? Log in</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { flexGrow: 1, justifyContent: "center", padding: 24 },
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
