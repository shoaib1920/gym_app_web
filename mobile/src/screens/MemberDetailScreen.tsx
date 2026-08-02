import React, { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Image, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainStackParamList } from "../navigation/types";
import { useGymId } from "../context/AuthContext";
import { getMember, updateMember } from "../firestore/members";
import { MemberDetail } from "../firestore/types";
import { uploadMemberPhoto } from "../lib/memberPhoto";

type Props = NativeStackScreenProps<MainStackParamList, "MemberDetail">;

export default function MemberDetailScreen({ route, navigation }: Props) {
  const gymId = useGymId();
  const { memberId } = route.params;
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMember(gymId, memberId);
      if (!data) throw new Error("Member not found");
      setMember(data);
      setFullName(data.fullName);
      setEmail(data.email ?? "");
      setPhone(data.phone ?? "");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [gymId, memberId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateMember(gymId, memberId, { fullName, email, phone });
      setMember((prev) => (prev ? { ...prev, fullName, email, phone } : prev));
      setEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo library access is needed to set a profile photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    setUploadingPhoto(true);
    setError(null);
    try {
      const downloadUrl = await uploadMemberPhoto(memberId, result.assets[0].uri);
      await updateMember(gymId, memberId, { profilePhotoUrl: downloadUrl });
      setMember((prev) => (prev ? { ...prev, profilePhotoUrl: downloadUrl } : prev));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading || !member) {
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      {editing ? (
        <>
          <Text style={styles.label}>Full name</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" />
          <Text style={styles.label}>Phone</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.row}>
            <Pressable style={styles.secondaryButton} onPress={() => setEditing(false)} disabled={saving}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save</Text>}
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Pressable style={styles.photoWrap} onPress={handlePickPhoto} disabled={uploadingPhoto}>
            {member.profilePhotoUrl ? (
              <Image source={{ uri: member.profilePhotoUrl }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <Text style={styles.photoPlaceholderText}>
                  {uploadingPhoto ? "Uploading..." : "Add Photo"}
                </Text>
              </View>
            )}
            {uploadingPhoto && <ActivityIndicator style={StyleSheet.absoluteFill} />}
          </Pressable>

          <Text style={styles.name}>{member.fullName}</Text>
          <Text style={styles.meta}>{member.status}{member.isMinor ? " · minor" : ""}</Text>
          {member.email ? <Text style={styles.detailLine}>{member.email}</Text> : null}
          {member.phone ? <Text style={styles.detailLine}>{member.phone}</Text> : null}
          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.secondaryButton} onPress={() => setEditing(true)}>
            <Text style={styles.secondaryButtonText}>Edit Profile</Text>
          </Pressable>

          <View style={styles.actionsRow}>
            <Pressable
              style={styles.button}
              onPress={() => navigation.navigate("MemberQR", { memberId: member.id, memberName: member.fullName })}
            >
              <Text style={styles.buttonText}>View QR Code</Text>
            </Pressable>
            <Pressable
              style={styles.button}
              onPress={() => navigation.navigate("Classes", { bookingForMemberId: member.id })}
            >
              <Text style={styles.buttonText}>Book a Class</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Check-in history</Text>
          {member.checkIns.length === 0 ? (
            <Text style={styles.meta}>No check-ins yet.</Text>
          ) : (
            member.checkIns.map((c) => (
              <Text key={c.id} style={styles.detailLine}>
                {c.checkedInAt.toLocaleString()}
              </Text>
            ))
          )}

          <Text style={styles.sectionTitle}>Waivers on file</Text>
          {member.waivers.map((w) => (
            <Text key={w.id} style={styles.detailLine}>
              Signed by {w.signedByName} on {w.signedAt.toLocaleDateString()}
            </Text>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  photoWrap: { alignSelf: "center", marginBottom: 16 },
  photo: { width: 96, height: 96, borderRadius: 48 },
  photoPlaceholder: { backgroundColor: "#eee", alignItems: "center", justifyContent: "center" },
  photoPlaceholderText: { color: "#777", fontSize: 12, textAlign: "center", paddingHorizontal: 8 },
  name: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  meta: { color: "#777", marginTop: 4, marginBottom: 12 },
  detailLine: { color: "#333", marginBottom: 4 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, marginTop: 14, color: "#333" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 16 },
  error: { color: "#c0392b", marginTop: 12, textAlign: "center" },
  row: { flexDirection: "row", gap: 12, marginTop: 20 },
  actionsRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  button: { flex: 1, backgroundColor: "#2d5be3", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  secondaryButton: { backgroundColor: "#eee", borderRadius: 8, padding: 12, alignItems: "center", marginTop: 8 },
  secondaryButtonText: { fontWeight: "600", color: "#333" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 24, marginBottom: 8 },
});
