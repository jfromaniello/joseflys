import { calculateHaversineDistance } from "@/lib/distanceCalculations";
import type { ReplayPoint } from "./types";

const METERS_PER_NM = 1852;
const METERS_TO_FEET = 3.28084;
const KNOTS_TO_MPH = 1.15078;

/** Ground speed at a moment, expressed in both knots and mph. */
export interface GroundSpeed {
  knots: number | null;
  mph: number | null;
}

/** Start/end timestamps and total duration (ms) of a track. */
export interface Timeline {
  startMs: number;
  endMs: number;
  durationMs: number;
}

/**
 * Binary-searches the point whose timestamp is closest to (but not after)
 * `targetTimeMs`. Returns 0 for empty/single-point tracks.
 */
export function findPointIndexByTime(points: ReplayPoint[], targetTimeMs: number): number {
  if (points.length <= 1) return 0;
  let low = 0;
  let high = points.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = points[mid].timeMs;

    if (value === targetTimeMs) return mid;
    if (value < targetTimeMs) low = mid + 1;
    else high = mid - 1;
  }

  return Math.max(0, Math.min(high, points.length - 1));
}

/** Computes the start/end/duration timeline for a track. */
export function computeTimeline(points: ReplayPoint[]): Timeline {
  if (points.length === 0) {
    return { startMs: 0, endMs: 0, durationMs: 0 };
  }
  const startMs = points[0].timeMs;
  const endMs = points[points.length - 1].timeMs;
  return { startMs, endMs, durationMs: Math.max(0, endMs - startMs) };
}

/** Total track distance in nautical miles (geodesic, summed over segments). */
export function computeTotalDistanceNm(points: ReplayPoint[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += calculateHaversineDistance(
      points[i - 1].lat,
      points[i - 1].lon,
      points[i].lat,
      points[i].lon
    );
  }
  return total;
}

/**
 * Ground speed at `currentIndex`, derived from the 3D distance to the next point
 * divided by the timestamp delta. Returns `null` values when it cannot be
 * computed (too few points, zero/negative time delta).
 */
export function computeGroundSpeed(points: ReplayPoint[], currentIndex: number): GroundSpeed {
  if (points.length < 2) return { knots: null, mph: null };

  const i = Math.max(0, Math.min(currentIndex, points.length - 2));
  const from = points[i];
  const to = points[i + 1];

  const dtMs = to.timeMs - from.timeMs;
  if (dtMs <= 0) return { knots: null, mph: null };

  const groundNm = calculateHaversineDistance(from.lat, from.lon, to.lat, to.lon);
  const verticalNm = Math.abs(to.ele - from.ele) / METERS_PER_NM;
  const segmentDistanceNm = Math.sqrt(groundNm * groundNm + verticalNm * verticalNm);

  const hours = dtMs / 3_600_000;
  if (hours <= 0) return { knots: null, mph: null };

  const knots = segmentDistanceNm / hours;
  return { knots, mph: knots * KNOTS_TO_MPH };
}

/**
 * Altitude in feet at `currentTimeMs`, linearly interpolated between the current
 * point and the next by time. Returns `null` for an empty track.
 */
export function computeAltitudeFt(
  points: ReplayPoint[],
  currentIndex: number,
  currentTimeMs: number
): number | null {
  if (points.length === 0) return null;
  if (points.length === 1) return points[0].ele * METERS_TO_FEET;

  const i = Math.max(0, Math.min(currentIndex, points.length - 2));
  const from = points[i];
  const to = points[i + 1];
  const segmentDuration = to.timeMs - from.timeMs;

  if (segmentDuration <= 0) return from.ele * METERS_TO_FEET;

  const tRaw = (currentTimeMs - from.timeMs) / segmentDuration;
  const t = Math.max(0, Math.min(1, tRaw));
  const eleM = from.ele + (to.ele - from.ele) * t;
  return eleM * METERS_TO_FEET;
}

/**
 * Vertical speed in feet per minute at `currentTimeMs`, smoothed over a centered
 * ~5-second window so GPS altitude noise doesn't dominate. Returns `null` when
 * the window collapses or has no time span.
 */
export function computeVerticalSpeedFpm(
  points: ReplayPoint[],
  currentIndex: number,
  currentTimeMs: number
): number | null {
  if (points.length < 2) return null;

  const HALF_WINDOW_MS = 2500;
  let startIdx = currentIndex;
  let endIdx = currentIndex;
  while (startIdx > 0 && currentTimeMs - points[startIdx].timeMs < HALF_WINDOW_MS) {
    startIdx -= 1;
  }
  while (endIdx < points.length - 1 && points[endIdx].timeMs - currentTimeMs < HALF_WINDOW_MS) {
    endIdx += 1;
  }
  if (startIdx === endIdx) return null;

  const dtMs = points[endIdx].timeMs - points[startIdx].timeMs;
  if (dtMs <= 0) return null;

  const deltaEleM = points[endIdx].ele - points[startIdx].ele;
  return (deltaEleM * METERS_TO_FEET) / (dtMs / 60000);
}
