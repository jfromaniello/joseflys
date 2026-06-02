import type { ReplayPoint, TrackFormat } from "./types";
import { parseGpxText } from "./parseGpx";
import { isGarminCsv, parseGarminCsv } from "./parseGarminCsv";

/** A parsed track plus the source format it was detected as. */
export interface ParsedTrack {
  points: ReplayPoint[];
  format: TrackFormat;
}

/**
 * Detects whether `content` is a GPX document or a Garmin G3X CSV log and parses
 * it into {@link ReplayPoint}s. Garmin logs additionally carry rich telemetry
 * (airspeeds, attitude, wind) on each point.
 *
 * @throws If the content matches neither format, or parsing fails.
 */
export function parseTrack(content: string): ParsedTrack {
  if (isGarminCsv(content)) {
    return { points: parseGarminCsv(content), format: "garmin-csv" };
  }
  if (content.includes("<gpx") || content.includes("<trkpt")) {
    return { points: parseGpxText(content), format: "gpx" };
  }
  throw new Error("Unrecognized file. Drop a GPX track or a Garmin G3X CSV log.");
}
