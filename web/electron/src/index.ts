import type { CapacitorElectronConfig } from '@capacitor-community/electron';
import { getCapacitorElectronConfig, setupElectronDeepLinking } from '@capacitor-community/electron';
import type { MenuItemConstructorOptions } from 'electron';
import { app, MenuItem, ipcMain } from 'electron';
import electronIsDev from 'electron-is-dev';
import unhandled from 'electron-unhandled';
import * as dotenv from 'dotenv';
import * as nodemailer from 'nodemailer';
import { join } from 'path';

import { ElectronCapacitorApp, setupContentSecurityPolicy, setupReloadWatcher } from './setup';

// Bundled at build time (see electron-builder.config.json's "files" list) —
// this is the gym's own Gmail account, running only on their own machine,
// the same trust model as any desktop email client storing your own
// credentials locally. Never bundle a *shared*/multi-tenant secret this way.
dotenv.config({ path: join(app.getAppPath(), '.env') });

// Graceful handling of unhandled errors.
unhandled();

// Define our menu templates (these are optional)
const trayMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [new MenuItem({ label: 'Quit App', role: 'quit' })];
const appMenuBarMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [
  { role: process.platform === 'darwin' ? 'appMenu' : 'fileMenu' },
  { role: 'viewMenu' },
];

// Get Config options from capacitor.config
const capacitorFileConfig: CapacitorElectronConfig = getCapacitorElectronConfig();

// Initialize our app. You can pass menu templates into the app here.
// const myCapacitorApp = new ElectronCapacitorApp(capacitorFileConfig);
const myCapacitorApp = new ElectronCapacitorApp(capacitorFileConfig, trayMenuTemplate, appMenuBarMenuTemplate);

// If deeplinking is enabled then we will set it up here.
if (capacitorFileConfig.electron?.deepLinkingEnabled) {
  setupElectronDeepLinking(myCapacitorApp, {
    customProtocol: capacitorFileConfig.electron.deepLinkingCustomProtocol ?? 'mycapacitorapp',
  });
}

// If we are in Dev mode, use the file watcher components.
if (electronIsDev) {
  setupReloadWatcher(myCapacitorApp);
}

// Run Application
(async () => {
  // Wait for electron app to be ready.
  await app.whenReady();
  // Security - Set Content-Security-Policy based on whether or not we are in dev mode.
  setupContentSecurityPolicy(myCapacitorApp.getCustomURLScheme());
  // Initialize our app, build windows, and load content.
  await myCapacitorApp.init();
  // No auto-update feed configured (no GitHub Releases / update server for
  // this app) — deliberately not calling autoUpdater.checkForUpdatesAndNotify()
  // here, since without a publish config it throws on every launch.
})();

// Handle when all of our windows are close (platforms have their own expectations).
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// When the dock icon is clicked.
app.on('activate', async function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (myCapacitorApp.getMainWindow().isDestroyed()) {
    await myCapacitorApp.init();
  }
});

// Place all ipc or other electron api calls and custom functionality under this line

interface RegistrationEmailPayload {
  to: string;
  gymName: string;
  memberName: string;
  memberCode: string;
}

let mailTransport: nodemailer.Transporter | null | undefined; // undefined = not yet resolved, null = unavailable

function getMailTransport(): nodemailer.Transporter | null {
  if (mailTransport !== undefined) return mailTransport;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  mailTransport = user && pass ? nodemailer.createTransport({ service: 'gmail', auth: { user, pass } }) : null;
  return mailTransport;
}

// Sends a welcome email from the gym's own Gmail account when a new member
// is registered with an email on file. Renderer-triggered (see
// web/src/lib/electronBridge.ts) right after MemberFormPage saves a member.
// This can only live here — the browser/web build has no safe place to hold
// an SMTP credential — which is also why it's a no-op outside Electron.
ipcMain.handle('send-registration-email', async (_event, payload: RegistrationEmailPayload) => {
  const transport = getMailTransport();
  if (!transport) return { ok: false, error: 'Email not configured on this device' };
  try {
    await transport.sendMail({
      from: process.env.GMAIL_USER,
      to: payload.to,
      subject: `Welcome to ${payload.gymName}!`,
      text: `Hi ${payload.memberName},\n\nWelcome to ${payload.gymName}! Your registration is complete.\n\nYour registration number is ${payload.memberCode}. Use this for the attendance system.\n\nSee you at the gym!`,
      html: `<p>Hi ${payload.memberName},</p><p>Welcome to <b>${payload.gymName}</b>! Your registration is complete.</p><p>Your registration number is <b>${payload.memberCode}</b>. Use this for the attendance system.</p><p>See you at the gym!</p>`,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
});
