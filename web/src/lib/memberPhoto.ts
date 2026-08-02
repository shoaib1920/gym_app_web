import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/firebaseConfig";

/**
 * Uploads a member profile photo picked via a browser <input type="file">
 * and returns its public download URL. Requires Storage security rules
 * that allow authenticated writes to `member-photos/*` — see
 * firebase/storage.rules.
 */
export async function uploadMemberPhoto(memberId: string, file: File): Promise<string> {
  const photoRef = ref(storage, `member-photos/${memberId}.jpg`);
  await uploadBytes(photoRef, file, { contentType: file.type || "image/jpeg" });
  return getDownloadURL(photoRef);
}
