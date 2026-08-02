import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Requests notification permission and returns the device's native FCM
 * registration token (Android), which gets saved to gyms/{gymId}.fcmToken
 * for whatever eventually sends notifications (a future Cloud Function or
 * admin script, via firebase-admin's messaging().send()). iOS needs
 * additional native FCM SDK wiring (APNs token -> FCM token exchange, e.g.
 * via @react-native-firebase/messaging + GoogleService-Info.plist) that
 * isn't included here — this returns null on iOS until that's set up.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  if (Platform.OS !== "android") {
    console.warn("Native FCM token retrieval on iOS requires additional setup — see README.");
    return null;
  }

  const token = await Notifications.getDevicePushTokenAsync();
  return token.data;
}
