import { magvar } from "magvar";
import { calculateHaversineDistance } from "@/lib/distanceCalculations";
import { computeMotionHeadingAdaptive, findIndexAtTime, sampleField } from "./cameraMath";
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
 * Magnetic track over ground in degrees [0, 360) at `currentTimeMs`.
 *
 * The raw GPS motion heading (same value that orients the aircraft marker) is a
 * *true* course; it is converted to magnetic using the WMM declination at the
 * current position. Following the project convention (WMM positive = East), the
 * conversion is `magnetic = true - declination` — matching `magneticCourse` in
 * `lib/courseCalculations.ts`. Returns `null` when the heading can't be resolved
 * (e.g. stationary).
 */
export function computeTrackHeadingDeg(
  points: ReplayPoint[],
  currentTimeMs: number
): number | null {
  const headingRad = computeMotionHeadingAdaptive(points, currentTimeMs, 150, 30000);
  if (headingRad === null) return null;

  const trueDeg = (headingRad * 180) / Math.PI;

  const index = findPointIndexByTime(points, currentTimeMs);
  const here = points[Math.max(0, Math.min(index, points.length - 1))];
  const declination = here ? magvar(here.lat, here.lon, 0) : 0;

  const magneticDeg = trueDeg - declination;
  return ((magneticDeg % 360) + 360) % 360;
}

/**
 * Whether any point carries rich avionics telemetry (airspeed, attitude, or
 * wind). Used to decide whether to surface the richer readouts that plain GPX
 * tracks can't provide.
 */
export function hasRichTelemetry(points: ReplayPoint[]): boolean {
  return points.some(
    (p) => p.iasKt !== undefined || p.tasKt !== undefined || p.windSpeedKt !== undefined
  );
}

/** Live avionics readouts sampled at a moment in the track. */
export interface TelemetrySample {
  /** Recorded GPS ground speed (kt), or `null` if the track lacks it. */
  groundSpeedKt: number | null;
  iasKt: number | null;
  tasKt: number | null;
  windDirDeg: number | null;
  windSpeedKt: number | null;
  oatC: number | null;
  /** Recorded vertical speed (fpm), or `null` if the track lacks it. */
  vsFpm: number | null;
  /** Recorded height above ground (ft), or `null` if the track lacks it. */
  aglFt: number | null;
}

/**
 * Samples the recorded avionics fields at `currentTimeMs`. Continuous quantities
 * are linearly interpolated; wind direction is taken from the nearest point to
 * avoid interpolating across the 0°/360° wrap. Every field is `null` when the
 * track does not carry it (e.g. plain GPX).
 */
export function sampleTelemetry(points: ReplayPoint[], currentTimeMs: number): TelemetrySample {
  let windDirDeg: number | null = null;
  if (points.length > 0) {
    const idx = findIndexAtTime(points, currentTimeMs);
    const here = points[idx];
    const next = points[idx + 1];
    // Pick the temporally closer of the two bracketing points for direction.
    const useNext =
      next && currentTimeMs - here.timeMs > next.timeMs - currentTimeMs ? true : false;
    const chosen = useNext && next ? next : here;
    windDirDeg = chosen?.windDirDeg ?? next?.windDirDeg ?? here?.windDirDeg ?? null;
  }

  return {
    groundSpeedKt: sampleField(points, currentTimeMs, "groundSpeedKt"),
    iasKt: sampleField(points, currentTimeMs, "iasKt"),
    tasKt: sampleField(points, currentTimeMs, "tasKt"),
    windDirDeg,
    windSpeedKt: sampleField(points, currentTimeMs, "windSpeedKt"),
    oatC: sampleField(points, currentTimeMs, "oatC"),
    vsFpm: sampleField(points, currentTimeMs, "vsFpm"),
    aglFt: sampleField(points, currentTimeMs, "aglFt"),
  };
}

/** Whether any point carries engine (EIS) data — only Garmin logs with an engine feed do. */
export function hasEngineData(points: ReplayPoint[]): boolean {
  return points.some(
    (p) => p.rpm !== undefined || p.fuelFlowGph !== undefined || p.manifoldInHg !== undefined
  );
}

/** Engine (EIS) readouts sampled at a moment in the track. */
export interface EngineSample {
  rpm: number | null;
  manifoldInHg: number | null;
  fuelFlowGph: number | null;
  fuelPressPsi: number | null;
  oilPressPsi: number | null;
  oilTempF: number | null;
  coolantTempF: number | null;
  egtMaxF: number | null;
  chtMaxF: number | null;
  volts: number | null;
  amps: number | null;
}

/**
 * Samples the recorded engine fields at `currentTimeMs`, linearly interpolated.
 * Every field is `null` when the track does not carry it.
 */
export function sampleEngine(points: ReplayPoint[], currentTimeMs: number): EngineSample {
  return {
    rpm: sampleField(points, currentTimeMs, "rpm"),
    manifoldInHg: sampleField(points, currentTimeMs, "manifoldInHg"),
    fuelFlowGph: sampleField(points, currentTimeMs, "fuelFlowGph"),
    fuelPressPsi: sampleField(points, currentTimeMs, "fuelPressPsi"),
    oilPressPsi: sampleField(points, currentTimeMs, "oilPressPsi"),
    oilTempF: sampleField(points, currentTimeMs, "oilTempF"),
    coolantTempF: sampleField(points, currentTimeMs, "coolantTempF"),
    egtMaxF: sampleField(points, currentTimeMs, "egtMaxF"),
    chtMaxF: sampleField(points, currentTimeMs, "chtMaxF"),
    volts: sampleField(points, currentTimeMs, "volts"),
    amps: sampleField(points, currentTimeMs, "amps"),
  };
}

/** Headwind / crosswind decomposition of the wind relative to the ground track. */
export interface WindComponents {
  /** Positive = headwind, negative = tailwind (kt). */
  headwindKt: number;
  /** Magnitude of the crosswind (kt). */
  crosswindKt: number;
  /** Side the crosswind blows from, relative to the nose. */
  crosswindSide: "L" | "R";
}

/**
 * Decomposes wind into head/tail and crosswind components relative to the
 * ground `trackDeg`. Wind direction is "from", so a wind blowing straight at the
 * aircraft (windDir == track) is a pure headwind. Returns `null` if any input is
 * missing.
 */
export function computeWindComponents(
  windDirDeg: number | null,
  windSpeedKt: number | null,
  trackDeg: number | null
): WindComponents | null {
  if (windDirDeg === null || windSpeedKt === null || trackDeg === null) return null;
  const angleRad = ((windDirDeg - trackDeg) * Math.PI) / 180;
  const headwindKt = windSpeedKt * Math.cos(angleRad);
  const cross = windSpeedKt * Math.sin(angleRad);
  return {
    headwindKt,
    crosswindKt: Math.abs(cross),
    crosswindSide: cross >= 0 ? "R" : "L",
  };
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
