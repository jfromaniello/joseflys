import type { CameraPose, ViewMode } from "./types";
import { serializeCamera } from "./cameraParams";

/** State of the share-link action, used to drive button feedback. */
export type ShareStatus = "idle" | "loading" | "copied" | "error";

interface ShareOptions {
  /** Current playback position (ms) to deep-link to. */
  elapsedMs: number;
  speed: number;
  viewMode: ViewMode;
  /** Current camera pose, if any, to restore the exact view. */
  camera: CameraPose | null;
  /** Chase camera distance (metres). */
  chaseDistance: number;
}

/**
 * Uploads the raw GPX to the share endpoint and returns a deep-link URL that
 * encodes the current position, speed, view mode, and camera pose.
 *
 * @throws If the upload request fails.
 */
export async function createShareUrl(rawGpx: string, options: ShareOptions): Promise<string> {
  const response = await fetch("/api/replay/share", {
    method: "POST",
    headers: { "Content-Type": "application/gpx+xml" },
    body: rawGpx,
  });

  if (!response.ok) {
    throw new Error(`Share failed: ${response.status}`);
  }

  const data = (await response.json()) as { shortUrl: string };
  const url = new URL(data.shortUrl);
  url.searchParams.set("t", String(Math.round(options.elapsedMs)));
  url.searchParams.set("speed", String(options.speed));
  url.searchParams.set("view", options.viewMode);
  url.searchParams.set("cd", String(Math.round(options.chaseDistance)));
  if (options.camera) {
    url.searchParams.set("cam", serializeCamera(options.camera));
  }
  return url.toString();
}
