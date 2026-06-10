import { list, put } from "@vercel/blob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Matches the 8-char short ids used for shared replay blobs. */
export const REPLAY_SHORT_ID_PATTERN = /^[0-9A-Za-z]{8}$/;

/**
 * Local-disk stand-in for Vercel Blob, used in development when no blob
 * credentials are configured so sharing works without a Vercel link. Files are
 * stored flat under `.dev-replay-blobs/` (gitignored).
 */
const LOCAL_BLOB_DIR = join(process.cwd(), ".dev-replay-blobs");

function localStoreEnabled(): boolean {
  return !process.env.BLOB_READ_WRITE_TOKEN && process.env.NODE_ENV !== "production";
}

/**
 * Stores a shared replay under `replays/{filename}`. Skips the upload when the
 * blob already exists — the filename is a content hash, so an existing blob is
 * byte-identical and re-sharing a track never creates a new one.
 */
export async function storeSharedReplay(
  filename: string,
  content: string,
  contentType: string
): Promise<void> {
  if (localStoreEnabled()) {
    await mkdir(LOCAL_BLOB_DIR, { recursive: true });
    await writeFile(join(LOCAL_BLOB_DIR, filename), content, "utf-8");
    return;
  }

  const pathname = `replays/${filename}`;
  const { blobs } = await list({ prefix: pathname, limit: 1 });
  if (blobs.some((blob) => blob.pathname === pathname)) return;

  await put(pathname, content, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
  });
}

async function fetchLocalReplay(id: string): Promise<string | null> {
  for (const extension of ["gpx", "csv"]) {
    try {
      return await readFile(join(LOCAL_BLOB_DIR, `${id}.${extension}`), "utf-8");
    } catch {
      // try the next extension
    }
  }
  return null;
}

/**
 * Downloads the raw track text for a shared replay id from blob storage. Shared
 * tracks are stored as either GPX (`.gpx`) or a Garmin CSV log (`.csv`); both
 * extensions are looked up. Returns `null` when the id is malformed or no blob
 * exists.
 */
export async function fetchSharedReplayGpx(id: string): Promise<string | null> {
  if (!REPLAY_SHORT_ID_PATTERN.test(id)) return null;

  if (localStoreEnabled()) {
    return fetchLocalReplay(id);
  }

  const { blobs } = await list({ prefix: `replays/${id}`, limit: 2 });
  const blob =
    blobs.find((b) => b.pathname === `replays/${id}.gpx`) ??
    blobs.find((b) => b.pathname === `replays/${id}.csv`);
  if (!blob) return null;

  const res = await fetch(blob.url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.text();
}
