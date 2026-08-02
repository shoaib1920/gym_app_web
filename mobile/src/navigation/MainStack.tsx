import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MainStackParamList } from "./types";
import DashboardScreen from "../screens/DashboardScreen";
import MembersListScreen from "../screens/MembersListScreen";
import MemberFormScreen from "../screens/MemberFormScreen";
import MemberDetailScreen from "../screens/MemberDetailScreen";
import MemberQRScreen from "../screens/MemberQRScreen";
import PlansScreen from "../screens/PlansScreen";
import PayersScreen from "../screens/PayersScreen";
import PayerDetailScreen from "../screens/PayerDetailScreen";
import ClassesScreen from "../screens/ClassesScreen";
import ClassFormScreen from "../screens/ClassFormScreen";
import ScannerScreen from "../screens/ScannerScreen";

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Gym Manager" }} />
      <Stack.Screen name="MembersList" component={MembersListScreen} options={{ title: "Members" }} />
      <Stack.Screen name="MemberForm" component={MemberFormScreen} options={{ title: "Add Member" }} />
      <Stack.Screen name="MemberDetail" component={MemberDetailScreen} options={{ title: "Member" }} />
      <Stack.Screen name="MemberQR" component={MemberQRScreen} options={{ title: "Check-in QR" }} />
      <Stack.Screen name="Plans" component={PlansScreen} options={{ title: "Membership Plans" }} />
      <Stack.Screen name="Payers" component={PayersScreen} options={{ title: "Payers & Billing" }} />
      <Stack.Screen name="PayerDetail" component={PayerDetailScreen} options={{ title: "Payer" }} />
      <Stack.Screen name="Classes" component={ClassesScreen} options={{ title: "Classes" }} />
      <Stack.Screen name="ClassForm" component={ClassFormScreen} options={{ title: "New Class" }} />
      <Stack.Screen name="Scanner" component={ScannerScreen} options={{ title: "Front Desk Scanner" }} />
    </Stack.Navigator>
  );
}
