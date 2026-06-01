import { list } from "@vercel/blob";

/** Matches the 8-char short ids used for shared replay blobs. */
export const REPLAY_SHORT_ID_PATTERN = /^[0-9A-Za-z]{8}$/;

/**
 * Downloads the raw GPX text for a shared replay id from blob storage.
 * Returns `null` when the id is malformed or the blob does not exist.
 */
export async function fetchSharedReplayGpx(id: string): Promise<string | null> {
  if (!REPLAY_SHORT_ID_PATTERN.test(id)) return null;

  const { blobs } = await list({ prefix: `replays/${id}`, limit: 1 });
  const blob = blobs.find((b) => b.pathname === `replays/${id}.gpx`);
  if (!blob) return null;

  const res = await fetch(blob.url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.text();
}
