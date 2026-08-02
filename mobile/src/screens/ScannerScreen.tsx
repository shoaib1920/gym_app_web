import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { useGymId } from "../context/AuthContext";
import { recordCheckIn } from "../firestore/checkins";

export default function ScannerScreen() {
  const gymId = useGymId();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleScanned = async (result: BarcodeScanningResult) => {
    if (!scanning) return;
    setScanning(false);
    try {
      const res = await recordCheckIn(gymId, result.data);
      setLastResult(`✅ ${res.fullName} checked in`);
    } catch (err: any) {
      setLastResult(`❌ ${err.message}`);
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera access is needed to scan check-in codes.</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Camera Access</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanning ? handleScanned : undefined}
      />

      <View style={styles.overlay}>
        {lastResult && <Text style={styles.resultText}>{lastResult}</Text>}
        {!scanning && (
          <Pressable
            style={styles.button}
            onPress={() => {
              setLastResult(null);
              setScanning(true);
            }}
          >
            <Text style={styles.buttonText}>Scan Next</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  message: { color: "#fff", textAlign: "center", marginBottom: 16, paddingHorizontal: 24 },
  overlay: { position: "absolute", bottom: 40, alignItems: "center", width: "100%" },
  resultText: { color: "#fff", fontSize: 18, fontWeight: "700", backgroundColor: "#000000aa", padding: 12, borderRadius: 8, marginBottom: 12 },
  button: { backgroundColor: "#2d5be3", borderRadius: 8, padding: 14, paddingHorizontal: 24 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
