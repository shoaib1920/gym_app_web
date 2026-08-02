import React from "react";
import { View, Text, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainStackParamList } from "../navigation/types";
import { useGymId } from "../context/AuthContext";
import { getMemberQrPayload } from "../firestore/members";

type Props = NativeStackScreenProps<MainStackParamList, "MemberQR">;

export default function MemberQRScreen({ route }: Props) {
  const gymId = useGymId();
  const { memberId, memberName } = route.params;
  const qrValue = getMemberQrPayload(gymId, memberId);

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{memberName}</Text>
      <Text style={styles.subtitle}>Show this code at the front desk to check in.</Text>

      <View style={styles.qrBox}>
        <QRCode value={qrValue} size={220} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  name: { fontSize: 20, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "#666", textAlign: "center", marginBottom: 24 },
  qrBox: { width: 260, height: 260, alignItems: "center", justifyContent: "center" },
});
