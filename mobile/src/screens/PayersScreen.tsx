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
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainStackParamList } from "../navigation/types";
import { useGymId } from "../context/AuthContext";
import { listPayers, createPayer } from "../firestore/payers";
import { Payer } from "../firestore/types";

type Props = NativeStackScreenProps<MainStackParamList, "Payers">;

export default function PayersScreen({ navigation }: Props) {
  const gymId = useGymId();
  const [payers, setPayers] = useState<Payer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPayers(await listPayers(gymId));
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
    if (!fullName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a name and a valid email.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payerId = await createPayer(gymId, { fullName: fullName.trim(), email, phone: phone || undefined });
      setModalVisible(false);
      setFullName("");
      setEmail("");
      setPhone("");
      load();
      navigation.navigate("PayerDetail", { payerId });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>+ New Payer</Text>
      </Pressable>

      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}

      <FlatList
        data={payers}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => navigation.navigate("PayerDetail", { payerId: item.id })}>
            <Text style={styles.rowName}>{item.fullName}</Text>
            <Text style={styles.rowMeta}>{item.email}</Text>
          </Pressable>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No payers yet.</Text> : null}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Payer</Text>
            <TextInput style={styles.input} placeholder="Full name" value={fullName} onChangeText={setFullName} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput style={styles.input} placeholder="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

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
  error: { color: "#c0392b", marginBottom: 8, textAlign: "center" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  button: { flex: 1, backgroundColor: "#2d5be3", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  secondaryButton: { flex: 1, backgroundColor: "#eee", borderRadius: 8, padding: 14, alignItems: "center" },
  secondaryButtonText: { fontWeight: "600", color: "#333" },
});
