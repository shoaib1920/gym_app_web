import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainStackParamList } from "../navigation/types";
import { useGymId } from "../context/AuthContext";
import { createClass } from "../firestore/classes";

type Props = NativeStackScreenProps<MainStackParamList, "ClassForm">;

export default function ClassFormScreen({ navigation }: Props) {
  const gymId = useGymId();
  const [name, setName] = useState("");
  const [trainerName, setTrainerName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [capacity, setCapacity] = useState("10");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const startsAtDate = new Date(startsAt);
    if (!name.trim()) {
      setError("Class name is required.");
      return;
    }
    if (Number.isNaN(startsAtDate.getTime())) {
      setError("Enter a valid start date/time, e.g. 2026-08-01T09:00");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createClass(gymId, {
        name: name.trim(),
        trainerName: trainerName || undefined,
        startsAt: startsAtDate.toISOString(),
        durationMinutes: parseInt(duration, 10),
        capacity: parseInt(capacity, 10),
      });
      navigation.goBack();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Class name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>Trainer</Text>
      <TextInput style={styles.input} value={trainerName} onChangeText={setTrainerName} />

      <Text style={styles.label}>Starts at (YYYY-MM-DDTHH:mm)</Text>
      <TextInput style={styles.input} value={startsAt} onChangeText={setStartsAt} placeholder="2026-08-01T09:00" />

      <Text style={styles.label}>Duration (minutes)</Text>
      <TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="number-pad" />

      <Text style={styles.label}>Capacity</Text>
      <TextInput style={styles.input} value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Class</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, marginTop: 14, color: "#333" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 16 },
  error: { color: "#c0392b", marginTop: 12, textAlign: "center" },
  button: { backgroundColor: "#2d5be3", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 24 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
