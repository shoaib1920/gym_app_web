import React from "react";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import { useAuth } from "../context/AuthContext";

const STATUS_COPY: Record<string, string> = {
  past_due: "We weren't able to process your last payment. Please update your billing details to keep access.",
  suspended: "Your subscription is inactive.",
  cancelled: "Your subscription has been cancelled.",
};

export default function InactiveAccountScreen() {
  const { state, logout } = useAuth();
  const status = state.phase === "accessDenied" ? state.status : "";

  const message = STATUS_COPY[status] ?? "Your account doesn't currently have access.";

  const contactSupport = () => {
    Linking.openURL(
      "mailto:support@gymmanager.app?subject=Reactivate%20my%20account"
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account Inactive</Text>
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.message}>Contact us to reactivate your account.</Text>

      <Pressable style={styles.button} onPress={contactSupport}>
        <Text style={styles.buttonText}>Contact us to reactivate</Text>
      </Pressable>

      <Pressable onPress={logout} style={styles.logoutLink}>
        <Text style={styles.link}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center", marginBottom: 16 },
  message: { fontSize: 16, color: "#444", textAlign: "center", marginBottom: 12 },
  button: {
    backgroundColor: "#2d5be3",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  logoutLink: { marginTop: 24 },
  link: { color: "#999", textAlign: "center" },
});
