import "dotenv/config";
import admin from "firebase-admin";
import nodemailer from "nodemailer";
import { loadServiceAccount } from "./serviceAccount";

/**
 * Automated fee follow-ups, run daily (see the Windows Task Scheduler setup
 * in admin-scripts/README section below). Two kinds of email, both sent
 * from the gym's own Gmail account via SMTP + an App Password:
 *
 * 1. Renewal reminder — "your fee is due in N days / overdue by N days" —
 *    sent once a member's endingDate is within REMINDER_WINDOW_DAYS, then
 *    at most once per calendar day after that (tracked via
 *    lastReminderEndingDate/lastReminderDate on the member doc) so this
 *    can run daily without re-spamming the same person every run.
 * 2. Renewal confirmation — "thanks, you're paid through <date>" — sent
 *    the next time this script notices a member's endingDate moved
 *    forward from what it saw last (tracked via lastConfirmedEndingDate).
 *    The very first time a member is seen, this just records a baseline
 *    silently — a brand new member already gets a printed receipt at
 *    registration (see web/src/pages/ReceiptPage.tsx), so this isn't
 *    meant to double up on that.
 *
 * This can't live in the browser-facing web app: sending SMTP mail needs
 * the Gmail App Password, which must never reach client-side code. This
 * script — and eventually the desktop app's own Node/Electron main
 * process — are the only trusted places for that.
 *
 * Usage: npm run send-fee-reminders
 */

const REMINDER_WINDOW_DAYS = 3;

function parseDateOnly(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function todayDateOnly(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

function formatCurrency(cents: number | undefined): string {
  if (!cents) return "";
  return `Rs ${(cents / 100).toLocaleString("en-PK")}`;
}

function createTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("Missing GMAIL_USER or GMAIL_APP_PASSWORD in admin-scripts/.env");
  }
  return { transport: nodemailer.createTransport({ service: "gmail", auth: { user, pass } }), from: user };
}

function reminderEmail(gymName: string, memberName: string, daysLeft: number, gymFeeCents: number | undefined) {
  const feeLine = gymFeeCents ? ` (${formatCurrency(gymFeeCents)})` : "";
  const subject =
    daysLeft >= 0
      ? `${gymName}: your membership fee is due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`
      : `${gymName}: your membership fee is overdue by ${-daysLeft} day${-daysLeft === 1 ? "" : "s"}`;
  const status = daysLeft >= 0 ? `due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}` : `overdue by ${-daysLeft} day${-daysLeft === 1 ? "" : "s"}`;
  const text = `Hi ${memberName},\n\nYour gym membership fee${feeLine} is ${status}. Please pay at the front desk to keep your membership active.\n\n— ${gymName}`;
  const html = `<p>Hi ${memberName},</p><p>Your gym membership fee${feeLine} is <b>${status}</b>. Please pay at the front desk to keep your membership active.</p><p>— ${gymName}</p>`;
  return { subject, text, html };
}

function confirmationEmail(gymName: string, memberName: string, endingDate: string, gymFeeCents: number | undefined) {
  const feeLine = gymFeeCents ? ` of ${formatCurrency(gymFeeCents)}` : "";
  const subject = `${gymName}: payment received — you're covered until ${endingDate}`;
  const text = `Hi ${memberName},\n\nThanks for your payment${feeLine}! Your membership is now valid through ${endingDate}.\n\n— ${gymName}`;
  const html = `<p>Hi ${memberName},</p><p>Thanks for your payment${feeLine}! Your membership is now valid through <b>${endingDate}</b>.</p><p>— ${gymName}</p>`;
  return { subject, text, html };
}

async function main() {
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount() as admin.ServiceAccount) });
  }
  const db = admin.firestore();
  const { transport, from } = createTransport();

  const today = todayDateOnly();
  const todayStr = formatDateOnly(today);

  let reminders = 0;
  let confirmations = 0;
  let skippedNoEmail = 0;

  const gymsSnap = await db.collection("gyms").get();

  for (const gymDoc of gymsSnap.docs) {
    const gymName = (gymDoc.data().name as string) ?? "Your Gym";
    const membersSnap = await gymDoc.ref.collection("members").get();

    for (const memberDoc of membersSnap.docs) {
      const m = memberDoc.data();
      const email = m.email as string | undefined;
      const endingDate = m.endingDate as string | undefined;
      const fullName = (m.fullName as string) ?? "there";
      if (!email || !endingDate) {
        if (!email && endingDate) skippedNoEmail++;
        continue;
      }

      const patch: Record<string, unknown> = {};

      // --- Renewal reminder ---
      const daysLeft = daysBetween(today, parseDateOnly(endingDate));
      const alreadyRemindedToday = m.lastReminderEndingDate === endingDate && m.lastReminderDate === todayStr;
      if (daysLeft <= REMINDER_WINDOW_DAYS && !alreadyRemindedToday) {
        const { subject, text, html } = reminderEmail(gymName, fullName, daysLeft, m.gymFeeCents);
        await transport.sendMail({ from, to: email, subject, text, html });
        patch.lastReminderEndingDate = endingDate;
        patch.lastReminderDate = todayStr;
        reminders++;
      }

      // --- Renewal confirmation (fires the run after endingDate moves forward) ---
      if (m.lastConfirmedEndingDate === undefined) {
        patch.lastConfirmedEndingDate = endingDate; // baseline, no email — see comment above
      } else if (m.lastConfirmedEndingDate !== endingDate) {
        const { subject, text, html } = confirmationEmail(gymName, fullName, endingDate, m.gymFeeCents);
        await transport.sendMail({ from, to: email, subject, text, html });
        patch.lastConfirmedEndingDate = endingDate;
        confirmations++;
      }

      if (Object.keys(patch).length > 0) {
        await memberDoc.ref.set(patch, { merge: true });
      }
    }
  }

  console.log(`Sent ${reminders} reminder email(s), ${confirmations} confirmation email(s).`);
  if (skippedNoEmail > 0) {
    console.log(`${skippedNoEmail} member(s) have an ending date but no email on file — skipped.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
