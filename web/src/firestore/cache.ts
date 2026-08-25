import { getDocs, getDocsFromCache, type Query, type DocumentData, type QuerySnapshot } from "firebase/firestore";

/**
 * Firestore's default getDocs() always waits on a live server round trip
 * before resolving, even though persistentLocalCache (see
 * firebase/firebaseConfig.ts) already has the data locally — that's what
 * made the kiosk take several seconds per check-in despite the member list
 * barely ever changing. This tries the local cache first (near-instant,
 * no network) and only falls back to the server if the cache has nothing
 * for this exact query yet (e.g. a brand new device, or a member added on
 * another device that hasn't synced here). Safe for reads where a few
 * seconds of staleness is fine — check-in lookups, fee status — not for
 * anything that must reflect a write from another device immediately.
 */
export async function getDocsPreferCache<T extends DocumentData>(q: Query<T>): Promise<QuerySnapshot<T>> {
  try {
    const cached = await getDocsFromCache(q);
    if (!cached.empty) return cached;
  } catch {
    // no cache yet for this query — fall through to network
  }
  return getDocs(q);
}
