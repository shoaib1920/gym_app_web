import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/firebaseConfig";

/**
 * Uploads a locally-picked image to Firebase Storage and returns its public
 * download URL, to be saved via PATCH /api/members/:id { profile_photo_url }.
 * Requires Storage security rules that allow authenticated writes to
 * `member-photos/*` — see README.
 */
export async function uploadMemberPhoto(memberId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();

  const photoRef = ref(storage, `member-photos/${memberId}.jpg`);
  await uploadBytes(photoRef, blob, { contentType: "image/jpeg" });

  return getDownloadURL(photoRef);
}
