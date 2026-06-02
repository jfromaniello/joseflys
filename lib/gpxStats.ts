/**
 * Server-safe GPX track statistics.
 *
 * Unlike the replay client (which relies on the browser's DOMParser), this
 * module parses GPX text with regular expressions so it can run in Node during
 * `generateMetadata` to produce share/OG descriptions.
 */

import { calculateHaversineDistance } from "@/lib/distanceCalculations";
import { isGarminCsv, parseGarminCsv } from "@/app/replay/parseGarminCsv";

const METERS_TO_FEET = 3.28084;

interface GpxTrackPoint {
  lat: number;
  lon: number;
  ele: number;
  timeMs: number;
}

export interface GpxStats {
  /** Total track distance in nautical miles (geodesic, summed over segments). */
  distanceNm: number;
  /** Highest elevation reached in feet. */
  maxAltitudeFt: number;
  /** Track duration in milliseconds (last timestamp minus first). */
  durationMs: number;
  /** Peak ground speed in knots, smoothed over a window to reject GPS spikes. */
  maxSpeedKt: number;
  /** Number of parsed track points. */
  pointCount: number;
  /** Downsampled track coordinates (≤ MAX_PATH_POINTS) for rendering. */
  path: Array<{ lat: number; lon: number }>;
}

const MAX_PATH_POINTS = 240;

/** Evenly downsamples coordinates to at most MAX_PATH_POINTS, keeping endpoints. */
function downsamplePath(points: GpxTrackPoint[]): Array<{ lat: number; lon: number }> {
  if (points.length <= MAX_PATH_POINTS) {
    return points.map((p) => ({ lat: p.lat, lon: p.lon }));
  }
  const step = (points.length - 1) / (MAX_PATH_POINTS - 1);
  const path: Array<{ lat: number; lon: number }> = [];
  for (let i = 0; i < MAX_PATH_POINTS; i += 1) {
    const idx = Math.round(i * step);
    const p = points[Math.min(idx, points.length - 1)];
    path.push({ lat: p.lat, lon: p.lon });
  }
  return path;
}

const TRKPT_REGEX = /<trkpt\b[^>]*?\blat="([^"]+)"[^>]*?\blon="([^"]+)"[^>]*?>([\s\S]*?)<\/trkpt>/gi;
const ELE_REGEX = /<ele>\s*([^<]+?)\s*<\/ele>/i;
const TIME_REGEX = /<time>\s*([^<]+?)\s*<\/time>/i;

function parseTrackPoints(content: string): GpxTrackPoint[] {
  const points: GpxTrackPoint[] = [];

  for (const match of content.matchAll(TRKPT_REGEX)) {
    const lat = Number.parseFloat(match[1]);
    const lon = Number.parseFloat(match[2]);
    const body = match[3];

    const eleText = body.match(ELE_REGEX)?.[1];
    const timeText = body.match(TIME_REGEX)?.[1];

    const ele = eleText ? Number.parseFloat(eleText) : 0;
    const timeMs = timeText ? Date.parse(timeText) : Number.NaN;

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(timeMs)) {
      continue;
    }

    points.push({
      lat,
      lon,
      ele: Number.isFinite(ele) ? ele : 0,
      timeMs,
    });
  }

  points.sort((a, b) => a.timeMs - b.timeMs);
  return points;
}

/** Half-width of the speed-smoothing window (ms). ~10s total span. */
const SPEED_HALF_WINDOW_MS = 5000;

/**
 * Peak ground speed in knots, smoothed over a centered ~10-second window.
 *
 * A single bad GPS fix produces a one-second segment that "teleports" tens of
 * metres, yielding implausible point-to-point speeds (e.g. 170+ kt on a ~90 kt
 * flight). Measuring displacement between the window endpoints instead of
 * summing every micro-segment cancels such out-and-back spikes, so the reported
 * top speed reflects sustained motion rather than GPS jitter.
 */
function computeMaxSpeedKt(points: GpxTrackPoint[]): number {
  let maxSpeedKt = 0;

  for (let i = 0; i < points.length; i += 1) {
    let start = i;
    let end = i;
    while (start > 0 && points[i].timeMs - points[start].timeMs < SPEED_HALF_WINDOW_MS) {
      start -= 1;
    }
    while (end < points.length - 1 && points[end].timeMs - points[i].timeMs < SPEED_HALF_WINDOW_MS) {
      end += 1;
    }
    if (start === end) continue;

    const hours = (points[end].timeMs - points[start].timeMs) / 3_600_000;
    if (hours <= 0) continue;

    const groundNm = calculateHaversineDistance(
      points[start].lat,
      points[start].lon,
      points[end].lat,
      points[end].lon
    );
    const verticalNm = Math.abs(points[end].ele - points[start].ele) / 1852;
    const distanceNm = Math.sqrt(groundNm * groundNm + verticalNm * verticalNm);

    const knots = distanceNm / hours;
    if (knots > maxSpeedKt) maxSpeedKt = knots;
  }

  return maxSpeedKt;
}

/**
 * Computes summary statistics from raw track text (GPX or a Garmin G3X CSV log).
 * Returns `null` if the track does not contain at least two valid, timestamped
 * points.
 */
export function computeGpxStats(content: string): GpxStats | null {
  let points: GpxTrackPoint[];
  if (isGarminCsv(content)) {
    try {
      points = parseGarminCsv(content).map((p) => ({
        lat: p.lat,
        lon: p.lon,
        ele: p.ele,
        timeMs: p.timeMs,
      }));
    } catch {
      return null;
    }
  } else {
    points = parseTrackPoints(content);
  }
  if (points.length < 2) return null;

  let distanceNm = 0;
  let maxAltitudeFt = points[0].ele * METERS_TO_FEET;

  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1];
    const to = points[i];

    distanceNm += calculateHaversineDistance(from.lat, from.lon, to.lat, to.lon);

    const altFt = to.ele * METERS_TO_FEET;
    if (altFt > maxAltitudeFt) maxAltitudeFt = altFt;
  }

  return {
    distanceNm,
    maxAltitudeFt,
    durationMs: Math.max(0, points[points.length - 1].timeMs - points[0].timeMs),
    maxSpeedKt: computeMaxSpeedKt(points),
    pointCount: points.length,
    path: downsamplePath(points),
  };
}

/** Formats a duration in milliseconds as "1h 23min" or "23min". */
export function formatTrackDuration(durationMs: number): string {
  const totalMinutes = Math.round(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}
