import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";
import { useGymId } from "../context/AuthContext";
import { recordCheckIn } from "../firestore/checkins";
import { Icon } from "../components/ui";

const READER_ELEMENT_ID = "qr-reader";

export default function ScannerPage() {
  const gymId = useGymId();
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // Ref, not state: the html5-qrcode success callback closes over this value
  // once at start(), so a plain state variable would be stale by the time a
  // frame decodes — this mirrors the mobile app's `scanning` guard, which
  // pauses further check-ins until "Scan Next" without stopping the camera.
  const acceptingScansRef = useRef(true);

  useEffect(() => {
    let scanner: Html5Qrcode | null = null;
    let cancelled = false;

    (async () => {
      // Android's WebView doesn't support getUserMedia() unless the host
      // app already holds the OS-level CAMERA permission — declaring it in
      // AndroidManifest.xml isn't enough, it still has to be granted at
      // runtime. @capacitor/camera is used purely to trigger that OS
      // permission prompt; the actual scanning still goes through
      // html5-qrcode's browser-standard getUserMedia call below. Skipped
      // entirely on web, where the browser's own getUserMedia prompt
      // already handles this.
      if (Capacitor.isNativePlatform()) {
        try {
          const perm = await Camera.requestPermissions({ permissions: ["camera"] });
          if (perm.camera !== "granted") {
            setPermissionError("Camera access is needed to scan check-in codes.");
            return;
          }
        } catch (err) {
          setPermissionError((err as Error).message ?? "Camera access is needed to scan check-in codes.");
          return;
        }
      }
      if (cancelled) return;

      scanner = new Html5Qrcode(READER_ELEMENT_ID);
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            if (!acceptingScansRef.current) return;
            acceptingScansRef.current = false;
            handleScanned(decodedText);
          },
          () => {
            // Per-frame "no QR found" — expected on almost every frame, not an error.
          }
        )
        .catch((err) => setPermissionError(err?.message ?? "Camera access is needed to scan check-in codes."));
    })();

    return () => {
      cancelled = true;
      // Html5Qrcode.stop() throws *synchronously* (not a rejected promise)
      // when called on a scanner that never finished starting — which
      // happens on every mount in React StrictMode's dev-only double-invoke
      // of effects, since the cleanup fires before start()'s promise has
      // settled. Without this try/catch that throw is uncaught and, with no
      // error boundary, unmounts the whole app.
      try {
        scanner
          ?.stop()
          .then(() => scanner?.clear())
          .catch(() => undefined);
      } catch {
        // Scanner was never running — nothing to stop.
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScanned = async (data: string) => {
    try {
      const res = await recordCheckIn(gymId, data);
      setResult({ ok: true, message: `${res.fullName} checked in` });
    } catch (err) {
      setResult({ ok: false, message: (err as Error).message });
    }
  };

  const handleScanNext = () => {
    setResult(null);
    acceptingScansRef.current = true;
  };

  return (
    <div className="relative flex flex-col h-[calc(100svh-176px)] lg:h-[calc(100svh-112px)] overflow-hidden rounded-xl bg-black">
      {permissionError ? (
        <div className="flex flex-1 items-center justify-center px-lg">
          <p className="max-w-xs text-center font-label-md text-label-md text-white">{permissionError}</p>
        </div>
      ) : (
        <>
          <div id={READER_ELEMENT_ID} className="absolute inset-0" />

          {/* Scan frame overlay */}
          {!result && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-64 h-64 md:w-80 md:h-80 relative border-2 border-white/20">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-container" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-container" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-container" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-container" />
                <div className="scan-line absolute top-0 left-0 right-0" />
              </div>
              <div className="mt-lg text-center px-md">
                <h2 className="font-headline text-headline-sm font-bold text-white">Scan member code</h2>
                <p className="text-on-surface-variant font-label-md text-label-md mt-xs">Position the QR code within the frame</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Result — large, colored, unmissable */}
      {result && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-lg text-center bg-black/85">
          <div
            className={`toast-entrance w-24 h-24 rounded-full flex items-center justify-center mb-lg ${
              result.ok ? "bg-primary-container" : "bg-error-container"
            }`}
          >
            <Icon
              name={result.ok ? "check_circle" : "cancel"}
              filled
              className={`!text-5xl ${result.ok ? "text-on-primary" : "text-on-error-container"}`}
            />
          </div>
          <h2 className={`font-headline text-headline-md font-bold ${result.ok ? "text-primary-container" : "text-error"}`}>
            {result.ok ? "Check-in confirmed" : "Check-in failed"}
          </h2>
          <p className="mt-xs font-label-md text-label-md text-white">{result.message}</p>

          <button
            onClick={handleScanNext}
            className="mt-xl bg-primary-container text-on-primary font-label-md text-label-md font-bold uppercase tracking-wide px-xl py-md rounded-lg active:scale-95 transition-all"
          >
            Scan next
          </button>
        </div>
      )}
    </div>
  );
}
