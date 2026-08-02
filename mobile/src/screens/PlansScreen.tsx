import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useGymId } from "../context/AuthContext";
import { listPlans, createPlan } from "../firestore/plans";
import { MembershipPlan } from "../firestore/types";

const INTERVALS = ["day", "week", "month", "year"];

export default function PlansScreen() {
  const gymId = useGymId();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [interval, setInterval_] = useState("month");
  const [maxMembers, setMaxMembers] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPlans(await listPlans(gymId));
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleCreate = async () => {
    const priceCents = Math.round(parseFloat(price) * 100);
    if (!name.trim() || !priceCents || priceCents <= 0) {
      setError("Enter a plan name and a valid price.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createPlan(gymId, {
        name: name.trim(),
        priceCents,
        billingInterval: interval,
        maxMembers: parseInt(maxMembers, 10) || 1,
      });
      setModalVisible(false);
      setName("");
      setPrice("");
      setMaxMembers("1");
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>+ New Plan</Text>
      </Pressable>

      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}

      <FlatList
        data={plans}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowName}>{item.name}</Text>
            <Text style={styles.rowMeta}>
              ${(item.priceCents / 100).toFixed(2)} / {item.billingInterval} · up to {item.maxMembers} member(s)
            </Text>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No plans yet.</Text> : null}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Membership Plan</Text>

            <TextInput style={styles.input} placeholder="Plan name" value={name} onChangeText={setName} />
            <TextInput
              style={styles.input}
              placeholder="Price (e.g. 49.99)"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />

            <View style={styles.intervalRow}>
              {INTERVALS.map((i) => (
                <Pressable
                  key={i}
                  style={[styles.intervalChip, interval === i && styles.intervalChipActive]}
                  onPress={() => setInterval_(i)}
                >
                  <Text style={interval === i ? styles.intervalChipTextActive : styles.intervalChipText}>{i}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Max members on this plan"
              value={maxMembers}
              onChangeText={setMaxMembers}
              keyboardType="number-pad"
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryButton} onPress={() => setModalVisible(false)} disabled={saving}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.button} onPress={handleCreate} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  addButton: { backgroundColor: "#2d5be3", margin: 16, borderRadius: 8, padding: 14, alignItems: "center" },
  addButtonText: { color: "#fff", fontWeight: "600" },
  row: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#eee" },
  rowName: { fontSize: 16, fontWeight: "600" },
  rowMeta: { color: "#777", marginTop: 2 },
  empty: { textAlign: "center", color: "#888", marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: "#00000088", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 10 },
  intervalRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  intervalChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, backgroundColor: "#eee" },
  intervalChipActive: { backgroundColor: "#2d5be3" },
  intervalChipText: { color: "#333" },
  intervalChipTextActive: { color: "#fff", fontWeight: "600" },
  error: { color: "#c0392b", marginBottom: 8, textAlign: "center" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  button: { flex: 1, backgroundColor: "#2d5be3", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  secondaryButton: { flex: 1, backgroundColor: "#eee", borderRadius: 8, padding: 14, alignItems: "center" },
  secondaryButtonText: { fontWeight: "600", color: "#333" },
});
