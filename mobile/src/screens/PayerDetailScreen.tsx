import React, { useCallback, useState } from "react";
import { Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainStackParamList } from "../navigation/types";
import { useGymId } from "../context/AuthContext";
import { getPayer, linkMemberToPayer } from "../firestore/payers";
import { listMembers } from "../firestore/members";
import { listPlans, billingIntervalToDays } from "../firestore/plans";
import { createSubscription } from "../firestore/subscriptions";
import { Member, MembershipPlan, PayerDetail as PayerDetailType } from "../firestore/types";

type Props = NativeStackScreenProps<MainStackParamList, "PayerDetail">;

export default function PayerDetailScreen({ route }: Props) {
  const gymId = useGymId();
  const { payerId } = route.params;

  const [payer, setPayer] = useState<PayerDetailType | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [payerData, membersData, plansData] = await Promise.all([
        getPayer(gymId, payerId),
        listMembers(gymId),
        listPlans(gymId),
      ]);
      setPayer(payerData);
      setAllMembers(membersData);
      setPlans(plansData);
    } finally {
      setLoading(false);
    }
  }, [gymId, payerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const linkedMemberIds = new Set((payer?.memberLinks ?? []).map((l) => l.memberId));
  const unlinkedMembers = allMembers.filter((m) => !linkedMemberIds.has(m.id));

  const handleLink = async (memberId: string) => {
    setBusy(true);
    try {
      await linkMemberToPayer(gymId, payerId, memberId, "self");
      await load();
    } catch (err: any) {
      Alert.alert("Couldn't link member", err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRecordSubscription = async () => {
    if (!selectedPlanId) return;
    const plan = plans.find((p) => p.id === selectedPlanId);
    const memberIds = [...linkedMemberIds];
    if (!plan) return;
    if (memberIds.length === 0) {
      Alert.alert("Link at least one member before recording a subscription.");
      return;
    }
    setBusy(true);
    try {
      await createSubscription(gymId, {
        payerId,
        planId: plan.id,
        memberIds,
        billingIntervalDays: billingIntervalToDays(plan.billingInterval),
      });
      Alert.alert(
        "Subscription recorded",
        "Marked active for this billing period. Payment is collected outside the app — update this record when it's time to renew."
      );
    } catch (err: any) {
      Alert.alert("Couldn't record subscription", err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !payer) {
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.name}>{payer.fullName}</Text>
      <Text style={styles.meta}>{payer.email}</Text>

      <Text style={styles.sectionTitle}>Linked members</Text>
      {payer.memberLinks.length === 0 ? (
        <Text style={styles.meta}>No members linked yet.</Text>
      ) : (
        payer.memberLinks.map((l) => (
          <Text key={l.linkId} style={styles.detailLine}>
            {l.fullName}
          </Text>
        ))
      )}

      <Text style={styles.sectionTitle}>Link a member</Text>
      {unlinkedMembers.length === 0 ? (
        <Text style={styles.meta}>No unlinked members.</Text>
      ) : (
        unlinkedMembers.map((m) => (
          <Pressable key={m.id} style={styles.secondaryButton} onPress={() => handleLink(m.id)} disabled={busy}>
            <Text style={styles.secondaryButtonText}>+ {m.fullName}</Text>
          </Pressable>
        ))
      )}

      <Text style={styles.sectionTitle}>Record a subscription</Text>
      <Text style={styles.meta}>
        Payment is collected outside the app (e.g. JazzCash directly to you) — this just records which
        plan the payer is on and when it's paid through.
      </Text>
      {plans.map((p) => (
        <Pressable
          key={p.id}
          style={[styles.planRow, selectedPlanId === p.id && styles.planRowActive]}
          onPress={() => setSelectedPlanId(p.id)}
        >
          <Text style={styles.planName}>{p.name}</Text>
          <Text style={styles.meta}>
            ${(p.priceCents / 100).toFixed(2)} / {p.billingInterval}
          </Text>
        </Pressable>
      ))}
      <Pressable style={styles.button} onPress={handleRecordSubscription} disabled={busy || !selectedPlanId}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Record Subscription</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  name: { fontSize: 22, fontWeight: "700" },
  meta: { color: "#777", marginTop: 4 },
  detailLine: { color: "#333", marginBottom: 4 },
  button: { backgroundColor: "#2d5be3", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 16 },
  buttonText: { color: "#fff", fontWeight: "600" },
  secondaryButton: { backgroundColor: "#eee", borderRadius: 8, padding: 12, alignItems: "flex-start", marginBottom: 8 },
  secondaryButtonText: { fontWeight: "600", color: "#333" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 24, marginBottom: 8 },
  planRow: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginBottom: 8 },
  planRowActive: { borderColor: "#2d5be3", backgroundColor: "#eef2ff" },
  planName: { fontWeight: "600" },
});
