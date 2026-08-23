export interface RegistrationEmailPayload {
  to: string;
  gymName: string;
  memberName: string;
  memberCode: string;
}

declare global {
  interface Window {
    electronAPI?: {
      sendRegistrationEmail: (payload: RegistrationEmailPayload) => Promise<{ ok: boolean; error?: string }>;
    };
  }
}

/**
 * window.electronAPI only exists when running inside the packaged desktop
 * app (see electron/src/preload.ts) — undefined in the web tab and the
 * Android app, where there's no safe place to hold the SMTP credential
 * this needs. Best-effort: a failed/unavailable email should never block
 * member registration.
 */
export async function sendRegistrationEmailIfAvailable(payload: RegistrationEmailPayload): Promise<void> {
  if (!window.electronAPI?.sendRegistrationEmail) return;
  try {
    await window.electronAPI.sendRegistrationEmail(payload);
  } catch {
    // ignore — see above
  }
}
