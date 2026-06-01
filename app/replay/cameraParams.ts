import type { CameraPose } from "./types";

/**
 * Parses a `cam` URL parameter ("lon,lat,alt,hdg,pit") into a {@link CameraPose}.
 * Returns `null` when the value is missing, malformed, or out of range.
 */
export function parseCameraParam(value: string | null): CameraPose | null {
  if (!value) return null;
  const parts = value.split(",").map((p) => Number.parseFloat(p));
  if (parts.length !== 5 || parts.some((n) => !Number.isFinite(n))) return null;
  const [lon, lat, alt, hdg, pit] = parts;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lon, lat, alt, hdg, pit };
}

/**
 * Serializes a {@link CameraPose} into a compact `cam` URL parameter string.
 * Coordinates keep 5 decimals; altitude is rounded; angles keep 1 decimal.
 */
export function serializeCamera(pose: CameraPose): string {
  return [
    pose.lon.toFixed(5),
    pose.lat.toFixed(5),
    Math.round(pose.alt).toString(),
    pose.hdg.toFixed(1),
    pose.pit.toFixed(1),
  ].join(",");
}
