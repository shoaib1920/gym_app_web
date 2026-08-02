import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainStackParamList } from "../navigation/types";
import { useAuth } from "../context/AuthContext";

type Props = NativeStackScreenProps<MainStackParamList, "Dashboard">;

const MENU: { label: string; screen: keyof MainStackParamList }[] = [
  { label: "Members", screen: "MembersList" },
  { label: "Membership Plans", screen: "Plans" },
  { label: "Payers & Billing", screen: "Payers" },
  { label: "Classes", screen: "Classes" },
  { label: "Front Desk Scanner", screen: "Scanner" },
];

export default function DashboardScreen({ navigation }: Props) {
  const { state, logout } = useAuth();
  const trialDaysRemaining = state.phase === "accessGranted" ? state.trialDaysRemaining : undefined;
  const status = state.phase === "accessGranted" ? state.status : undefined;

  return (
    <View style={styles.container}>
      {status === "trialing" && trialDaysRemaining !== undefined && (
        <View style={styles.trialBanner}>
          <Text style={styles.trialBannerText}>
            Trial: {trialDaysRemaining} day{trialDaysRemaining === 1 ? "" : "s"} remaining
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Gym Manager</Text>

        {MENU.map((item) => (
          <Pressable
            key={item.screen}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen as any)}
          >
            <Text style={styles.menuItemText}>{item.label}</Text>
          </Pressable>
        ))}

        <Pressable style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  trialBanner: { backgroundColor: "#fff4d6", padding: 10, alignItems: "center" },
  trialBannerText: { color: "#7a5c00", fontWeight: "600" },
  content: { padding: 24 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 24 },
  menuItem: {
    backgroundColor: "#f4f6fb",
    borderRadius: 10,
    padding: 18,
    marginBottom: 12,
  },
  menuItemText: { fontSize: 17, fontWeight: "600", color: "#1f2a44" },
  logoutButton: { alignSelf: "center", padding: 16, marginTop: 12 },
  logoutText: { color: "#c0392b", fontWeight: "600" },
});
