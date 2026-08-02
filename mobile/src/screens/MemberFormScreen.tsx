import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Switch,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import SignatureScreen, { SignatureViewRef } from "react-native-signature-canvas";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainStackParamList } from "../navigation/types";
import { useGymId } from "../context/AuthContext";
import { createMemberWithWaiver } from "../firestore/members";

type Props = NativeStackScreenProps<MainStackParamList, "MemberForm">;

const WAIVER_TEMPLATE_VERSION = "v1";

export default function MemberFormScreen({ navigation }: Props) {
  const gymId = useGymId();
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("");

  const [showSignature, setShowSignature] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signatureRef = useRef<SignatureViewRef>(null);

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

  const handleSignatureOK = (dataUrl: string) => {
    setSignatureData(dataUrl);
  };

  const handleSubmit = async () => {
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
      navigation.goBack();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (showSignature) {
    return (
      <View style={styles.signatureContainer}>
        <Text style={styles.signatureTitle}>
          {isMinor ? "Guardian signature required" : "Signature required"}
        </Text>
        <Text style={styles.signatureSubtitle}>
          By signing, {isMinor ? `${guardianName || "the guardian"} confirms` : `${fullName || "the member"} confirms`} they
          have read and accepted the gym's liability waiver.
        </Text>
        <View style={styles.signaturePad}>
          <SignatureScreen
            ref={signatureRef}
            onOK={handleSignatureOK}
            onEmpty={() => setError("Please provide a signature.")}
            descriptionText=""
            webStyle=".m-signature-pad--footer { display: none; margin: 0; }"
          />
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.signatureActions}>
          <Pressable style={styles.secondaryButton} onPress={() => signatureRef.current?.clearSignature()}>
            <Text style={styles.secondaryButtonText}>Clear</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => signatureRef.current?.readSignature()}>
            <Text style={styles.secondaryButtonText}>Confirm Signature</Text>
          </Pressable>
        </View>

        {signatureData && (
          <Pressable
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Member</Text>}
          </Pressable>
        )}

        <Pressable onPress={() => setShowSignature(false)} disabled={submitting}>
          <Text style={styles.link}>Back to details</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.label}>Full name</Text>
      <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

      <Text style={styles.label}>Date of birth (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        placeholder="1990-01-31"
      />

      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

      <Text style={styles.label}>Phone</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

      <View style={styles.switchRow}>
        <Text style={styles.label}>This member is a minor</Text>
        <Switch value={isMinor} onValueChange={setIsMinor} />
      </View>

      {isMinor && (
        <>
          <Text style={styles.label}>Guardian full name</Text>
          <TextInput style={styles.input} value={guardianName} onChangeText={setGuardianName} />

          <Text style={styles.label}>Guardian relationship</Text>
          <TextInput
            style={styles.input}
            value={guardianRelationship}
            onChangeText={setGuardianRelationship}
            placeholder="Parent, Guardian, ..."
          />
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={handleContinueToSignature}>
        <Text style={styles.buttonText}>Continue to Signature</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, marginTop: 14, color: "#333" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 16 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18 },
  error: { color: "#c0392b", marginTop: 12, textAlign: "center" },
  button: { backgroundColor: "#2d5be3", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 24 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { color: "#2d5be3", textAlign: "center", marginTop: 16 },
  signatureContainer: { flex: 1, padding: 20, backgroundColor: "#fff" },
  signatureTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  signatureSubtitle: { color: "#666", marginBottom: 12 },
  signaturePad: { height: 220, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, overflow: "hidden" },
  signatureActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, gap: 12 },
  secondaryButton: { flex: 1, backgroundColor: "#eee", borderRadius: 8, padding: 12, alignItems: "center" },
  secondaryButtonText: { fontWeight: "600", color: "#333" },
});
