import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import InactiveAccountScreen from "../screens/InactiveAccountScreen";
import MainStack from "./MainStack";
import AuthStack from "./AuthStack";

/**
 * The app-access gate. Which subtree renders is driven entirely by
 * AuthContext's state machine, which itself only advances past login after
 * reading the gym's own subscription status from Firestore. See
 * AuthContext.login() — and note this UI gate is a convenience, not the
 * real security boundary: firebase/firestore.rules independently enforces
 * the same check on every read/write, so even a bypassed gate here
 * couldn't reach another gym's data or a suspended gym's own data.
 */
export default function RootNavigator() {
  const { state } = useAuth();

  return (
    <NavigationContainer>
      {state.phase === "accessGranted" ? (
        <MainStack />
      ) : state.phase === "accessDenied" ? (
        <InactiveAccountScreen />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
