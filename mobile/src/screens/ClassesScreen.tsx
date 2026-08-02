import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainStackParamList } from "../navigation/types";
import { useGymId } from "../context/AuthContext";
import { listUpcomingClasses, bookClass } from "../firestore/classes";
import { GymClass } from "../firestore/types";

type Props = NativeStackScreenProps<MainStackParamList, "Classes">;

export default function ClassesScreen({ route, navigation }: Props) {
  const gymId = useGymId();
  const bookingForMemberId = route.params?.bookingForMemberId;
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setClasses(await listUpcomingClasses(gymId));
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleBook = async (classId: string) => {
    if (!bookingForMemberId) return;
    setBookingId(classId);
    try {
      await bookClass(gymId, classId, bookingForMemberId);
      Alert.alert("Booked!");
      load();
    } catch (err: any) {
      Alert.alert("Couldn't book class", err.message);
    } finally {
      setBookingId(null);
    }
  };

  return (
    <View style={styles.container}>
      {!bookingForMemberId && (
        <Pressable style={styles.addButton} onPress={() => navigation.navigate("ClassForm")}>
          <Text style={styles.addButtonText}>+ New Class</Text>
        </Pressable>
      )}

      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}

      <FlatList
        data={classes}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowName}>{item.name}</Text>
            <Text style={styles.rowMeta}>
              {item.startsAt.toLocaleString()} · {item.durationMinutes} min
              {item.trainerName ? ` · ${item.trainerName}` : ""}
            </Text>
            <Text style={styles.rowMeta}>{item.spotsRemaining} spot(s) left</Text>

            {bookingForMemberId && (
              <Pressable
                style={[styles.bookButton, item.spotsRemaining <= 0 && styles.bookButtonDisabled]}
                onPress={() => handleBook(item.id)}
                disabled={item.spotsRemaining <= 0 || bookingId === item.id}
              >
                <Text style={styles.bookButtonText}>
                  {item.spotsRemaining <= 0 ? "Full" : bookingId === item.id ? "Booking..." : "Book"}
                </Text>
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No upcoming classes.</Text> : null}
      />
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
  bookButton: { backgroundColor: "#2d5be3", borderRadius: 8, padding: 10, alignItems: "center", marginTop: 10 },
  bookButtonDisabled: { backgroundColor: "#bbb" },
  bookButtonText: { color: "#fff", fontWeight: "600" },
});
