import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainStackParamList } from "../navigation/types";
import { useGymId } from "../context/AuthContext";
import { listMembers } from "../firestore/members";
import { Member } from "../firestore/types";

type Props = NativeStackScreenProps<MainStackParamList, "MembersList">;

export default function MembersListScreen({ navigation }: Props) {
  const gymId = useGymId();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMembers(await listMembers(gymId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={styles.container}>
      <Pressable style={styles.addButton} onPress={() => navigation.navigate("MemberForm")}>
        <Text style={styles.addButtonText}>+ Add Member</Text>
      </Pressable>

      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}
      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={members}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate("MemberDetail", { memberId: item.id })}
          >
            <Text style={styles.rowName}>{item.fullName}</Text>
            <Text style={styles.rowMeta}>
              {item.status}
              {item.isMinor ? " · minor" : ""}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No members yet.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  addButton: { backgroundColor: "#2d5be3", margin: 16, borderRadius: 8, padding: 14, alignItems: "center" },
  addButtonText: { color: "#fff", fontWeight: "600" },
  error: { color: "#c0392b", textAlign: "center", marginTop: 12 },
  row: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#eee" },
  rowName: { fontSize: 16, fontWeight: "600" },
  rowMeta: { color: "#777", marginTop: 2 },
  empty: { textAlign: "center", color: "#888", marginTop: 40 },
});
