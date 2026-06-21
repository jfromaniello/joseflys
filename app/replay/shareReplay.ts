import type { CameraPose, ViewMode } from "./types";
import { serializeCamera } from "./cameraParams";

/** State of the share-link action, used to drive modal feedback. */
export type ShareStatus = "idle" | "loading" | "error";

export interface ShareOptions {
  /** Current playback position (ms) to deep-link to. */
  elapsedMs: number;
  speed: number;
  viewMode: ViewMode;
  /** Current camera pose, if any, to restore the exact view. */
  camera: CameraPose | null;
  /** Chase camera distance (metres). */
  chaseDistance: number;
  /** Whether the altitude wall overlay is on. */
  showWall: boolean;
  /** Whether the cyan track polyline is on. */
  showTrack: boolean;
}

/**
 * Uploads the raw track to the share endpoint and returns its short URL. The
 * blob id is a content hash, so re-uploading the same content always yields
 * the same URL.
 *
 * @throws If the upload request fails.
 */
export async function uploadReplay(content: string): Promise<string> {
  const response = await fetch("/api/replay/share", {
    method: "POST",
    headers: { "Content-Type": "application/gpx+xml" },
    body: content,
  });

  if (!response.ok) {
    throw new Error(`Share failed: ${response.status}`);
  }

  const data = (await response.json()) as { shortUrl: string };
  return data.shortUrl;
}

/**
 * Builds a deep-link URL from a short share URL by encoding the current
 * position, speed, view mode, and camera pose as query params.
 */
export function buildShareUrl(shortUrl: string, options: ShareOptions): string {
  const url = new URL(shortUrl);
  url.searchParams.set("t", String(Math.round(options.elapsedMs)));
  url.searchParams.set("speed", String(options.speed));
  url.searchParams.set("view", options.viewMode);
  url.searchParams.set("cd", String(Math.round(options.chaseDistance)));
  url.searchParams.set("wall", options.showWall ? "1" : "0");
  url.searchParams.set("track", options.showTrack ? "1" : "0");
  if (options.camera) {
    url.searchParams.set("cam", serializeCamera(options.camera));
  }
  return url.toString();
}
