import { getDocs, getDocsFromCache, type Query, type DocumentData, type QuerySnapshot } from "firebase/firestore";

/**
 * Plain getDocs() always waits on a live server round trip, which can take
 * many seconds on the gym's weaker connections. Preferring the local cache
 * outright (an earlier version of this function) fixed that but went stale
 * the moment a second device — the owner's laptop, say — wrote data this
 * device's cache didn't know about, since nothing here holds an active
 * listener to receive that push (e.g. a member added on the laptop never
 * showing up in the gym PC's member list).
 *
 * This races the network call against a short timeout instead: a normal
 * online read still returns fresh, cross-device-correct data almost every
 * time, and only a genuinely slow/offline connection falls back to the
 * (possibly stale) local cache rather than hanging for 10+ seconds. The
 * network call keeps running in the background even after the timeout, so
 * the cache is warmed for next time and is used as the final answer if it
 * finishes before the cache lookup does.
 */
export async function getDocsPreferCache<T extends DocumentData>(q: Query<T>): Promise<QuerySnapshot<T>> {
  const network = getDocs(q);
  const timeout = new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 3000));

  let result: QuerySnapshot<T> | "timeout";
  try {
    result = await Promise.race([network, timeout]);
  } catch {
    result = "timeout";
  }
  if (result !== "timeout") return result;

  network.catch(() => {});
  try {
    const cached = await getDocsFromCache(q);
    if (!cached.empty) return cached;
  } catch {
    // no cache yet either — wait out the original network call
  }
  return network;
}
