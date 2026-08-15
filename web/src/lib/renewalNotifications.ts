import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { listMembers } from "../firestore/members";
import { listDueMembers } from "./renewals";

const NOTIFICATION_ID = 1001;
const WITHIN_DAYS = 7;

/**
 * Fired once per app launch from App.tsx. Only runs inside the installed
 * desktop/Android shells (Capacitor.isNativePlatform()) — a plain browser
 * tab has no OS notification tray to post to, and popping a browser
 * permission prompt for it on the live Vercel site would be unwelcome.
 * Reads through the same listMembers() the rest of the app uses, so this
 * works offline too once Firestore's local cache has the member list.
 */
export async function checkAndNotifyRenewals(gymId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const members = await listMembers(gymId);
  const due = listDueMembers(members, WITHIN_DAYS);
  if (due.length === 0) return;

  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") {
    const requested = await LocalNotifications.requestPermissions();
    if (requested.display !== "granted") return;
  }

  const names = due.slice(0, 3).map((d) => d.member.fullName).join(", ");
  const body = due.length > 3 ? `${names} and ${due.length - 3} more` : names;

  await LocalNotifications.schedule({
    notifications: [
      {
        id: NOTIFICATION_ID,
        title: `${due.length} membership${due.length === 1 ? "" : "s"} due for renewal`,
        body,
      },
    ],
  });
}
