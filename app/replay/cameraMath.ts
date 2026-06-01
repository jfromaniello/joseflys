/**
 * Pure geometry and camera-pose helpers for the 3D replay globe.
 *
 * Nothing here touches React or holds state. The Cesium-typed helpers receive
 * the Cesium module as a parameter so this file can be imported without pulling
 * Cesium into the bundle eagerly.
 */

import type { ReplayPoint } from "./types";

/** Cinematic/cockpit camera framing applied during automatic playback. */
export type CamMode =
  | "chase"
  | "side-left"
  | "side-right"
  | "panorama-start"
  | "panorama-end"
  | "cockpit";

/** A scheduled cinematic camera change over a time window. */
export interface CamEvent {
  startMs: number;
  endMs: number;
  mode: CamMode;
}

/** A resolved camera pose in Cesium world coordinates. */
export interface CamPose {
  destination: import("cesium").Cartesian3;
  heading: number;
  pitch: number;
}

/** Degrees → radians. */
export function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

/** Initial great-circle bearing from point 1 to point 2, in radians. */
export function bearingRad(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  return Math.atan2(y, x);
}

/** Signed shortest angular difference b−a in degrees, within (−180, 180]. */
export function signedDegDelta(aDeg: number, bDeg: number): number {
  return ((bDeg - aDeg + 540) % 360) - 180;
}

/** Interpolates between two angles (radians) along the shortest arc. */
export function lerpAngle(from: number, to: number, t: number): number {
  const TWO_PI = Math.PI * 2;
  const diff = ((to - from + Math.PI * 3) % TWO_PI) - Math.PI;
  return from + diff * t;
}

/** Binary-searches the point at/just-before `targetMs`. */
export function findIndexAtTime(points: ReplayPoint[], targetMs: number): number {
  if (points.length === 0) return 0;
  let low = 0;
  let high = points.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const v = points[mid].timeMs;
    if (v === targetMs) return mid;
    if (v < targetMs) low = mid + 1;
    else high = mid - 1;
  }
  return Math.max(0, Math.min(high, points.length - 1));
}

/**
 * Linearly interpolates a point between `clampedIndex` and the next point by
 * time. Returns the base point at the track's end or for degenerate segments.
 */
export function getInterpolatedPoint(
  points: ReplayPoint[],
  clampedIndex: number,
  currentTimeMs: number
): ReplayPoint | null {
  if (points.length === 0) return null;
  const from = points[clampedIndex];
  if (!from) return null;
  if (clampedIndex >= points.length - 1) return from;
  const to = points[clampedIndex + 1];
  if (!to) return from;
  const segmentDuration = to.timeMs - from.timeMs;
  if (segmentDuration <= 0) return from;
  const tRaw = (currentTimeMs - from.timeMs) / segmentDuration;
  const t = Math.max(0, Math.min(1, tRaw));
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lon: from.lon + (to.lon - from.lon) * t,
    ele: from.ele + (to.ele - from.ele) * t,
    timeMs: currentTimeMs,
  };
}

/** Interpolates the track position at an arbitrary timestamp. */
export function interpolateAtTime(points: ReplayPoint[], targetMs: number): ReplayPoint | null {
  if (points.length === 0) return null;
  const idx = findIndexAtTime(points, targetMs);
  return getInterpolatedPoint(points, idx, targetMs);
}

/** Great-circle distance in meters (spherical Earth approximation). */
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dPhi = toRad(lat2 - lat1);
  const dLam = toRad(lon2 - lon1);
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Heading (radians) of motion across a fixed time window centered on
 * `currentTimeMs`. Returns `null` if the window endpoints barely move.
 */
export function computeMotionHeadingRad(
  points: ReplayPoint[],
  currentTimeMs: number,
  windowMs: number
): number | null {
  if (points.length < 2) return null;
  const half = windowMs / 2;
  const start = interpolateAtTime(points, currentTimeMs - half);
  const end = interpolateAtTime(points, currentTimeMs + half);
  if (!start || !end) return null;
  if (Math.abs(end.lat - start.lat) < 1e-7 && Math.abs(end.lon - start.lon) < 1e-7) return null;
  return bearingRad(start.lat, start.lon, end.lat, end.lon);
}

/**
 * Adaptive heading: widens the time window until at least `minDistMeters` of
 * motion is captured, up to `maxWindowMs`. Stabilizes heading at low speed
 * (e.g. taxi).
 */
export function computeMotionHeadingAdaptive(
  points: ReplayPoint[],
  currentTimeMs: number,
  minDistMeters: number,
  maxWindowMs: number
): number | null {
  if (points.length < 2) return null;
  const samples = [3000, 5000, 8000, 12000, 18000, 26000, 36000];
  for (const halfWindow of samples) {
    if (halfWindow * 2 > maxWindowMs) break;
    const before = interpolateAtTime(points, currentTimeMs - halfWindow);
    const after = interpolateAtTime(points, currentTimeMs + halfWindow);
    if (!before || !after) continue;
    const d = haversineMeters(before.lat, before.lon, after.lat, after.lon);
    if (d >= minDistMeters) {
      return bearingRad(before.lat, before.lon, after.lat, after.lon);
    }
  }
  return null;
}

/** Ground speed in meters/second across a centered time window. */
export function speedMpsAt(points: ReplayPoint[], currentTimeMs: number, windowMs: number): number {
  if (points.length < 2) return 0;
  const half = windowMs / 2;
  const before = interpolateAtTime(points, currentTimeMs - half);
  const after = interpolateAtTime(points, currentTimeMs + half);
  if (!before || !after) return 0;
  const d = haversineMeters(before.lat, before.lon, after.lat, after.lon);
  const dt = (after.timeMs - before.timeMs) / 1000;
  if (dt <= 0) return 0;
  return d / dt;
}

/**
 * Builds the cinematic camera timeline: an opening panorama, side-angle cuts on
 * significant turns (above a minimum speed and spacing), and a closing panorama.
 * Returns an empty list for short/sparse tracks.
 */
export function computeCamEvents(points: ReplayPoint[]): CamEvent[] {
  if (points.length < 10) return [];
  const events: CamEvent[] = [];
  const firstMs = points[0].timeMs;
  const lastMs = points[points.length - 1].timeMs;
  const duration = lastMs - firstMs;
  if (duration < 15000) return [];

  events.push({ startMs: firstMs, endMs: firstMs + 4500, mode: "panorama-start" });

  const headingWindowMs = 18000;
  const stepMs = Math.max(8000, Math.min(20000, duration / 25));
  const minSpeedForEventMps = 25;
  const minIntervalMs = 40000;
  let lastEventEndMs = firstMs + 12000;
  let prevHeadingDeg: number | null = null;

  for (let t = firstMs + headingWindowMs; t < lastMs - 12000; t += stepMs) {
    const h = computeMotionHeadingAdaptive(points, t, 200, headingWindowMs);
    if (h === null) {
      prevHeadingDeg = null;
      continue;
    }
    const hDeg = (h * 180) / Math.PI;

    if (prevHeadingDeg !== null && t > lastEventEndMs + minIntervalMs) {
      const delta = signedDegDelta(prevHeadingDeg, hDeg);
      if (Math.abs(delta) > 32) {
        const speed = speedMpsAt(points, t, 8000);
        if (speed >= minSpeedForEventMps) {
          const mode: CamMode = delta > 0 ? "side-right" : "side-left";
          events.push({ startMs: t, endMs: t + 7000, mode });
          lastEventEndMs = t + 7000;
        }
      }
    }
    prevHeadingDeg = hDeg;
  }

  events.push({ startMs: lastMs - 4500, endMs: lastMs, mode: "panorama-end" });
  return events.sort((a, b) => a.startMs - b.startMs);
}

/** Returns the active cinematic mode at `currentMs`, defaulting to "chase". */
export function findActiveCamMode(events: CamEvent[], currentMs: number): CamMode {
  for (const e of events) {
    if (currentMs >= e.startMs && currentMs <= e.endMs) return e.mode;
  }
  return "chase";
}

/**
 * Places the camera at a horizontal range / height offset behind the aircraft,
 * along the given heading, looking down at `pitchRad`.
 */
export function computePoseFromAircraft(
  Cesium: typeof import("cesium"),
  target: import("cesium").Cartesian3,
  cameraHeadingRad: number,
  horizontalRange: number,
  heightOffset: number,
  pitchRad: number
): CamPose {
  const enu = Cesium.Transforms.eastNorthUpToFixedFrame(target);
  const eastOff = -Math.sin(cameraHeadingRad) * horizontalRange;
  const northOff = -Math.cos(cameraHeadingRad) * horizontalRange;
  const offsetENU = new Cesium.Cartesian3(eastOff, northOff, heightOffset);
  const offsetECEF = Cesium.Matrix4.multiplyByPointAsVector(enu, offsetENU, new Cesium.Cartesian3());
  const camPos = Cesium.Cartesian3.add(target, offsetECEF, new Cesium.Cartesian3());
  return { destination: camPos, heading: cameraHeadingRad, pitch: pitchRad };
}

/** First-person cockpit pose, slightly above the aircraft, with optional head-tracking offsets. */
export function computeCockpitPose(
  Cesium: typeof import("cesium"),
  aircraftPos: import("cesium").Cartesian3,
  motionHeadingRad: number,
  headingOffsetRad: number,
  pitchOffsetRad: number
): CamPose {
  const enu = Cesium.Transforms.eastNorthUpToFixedFrame(aircraftPos);
  const offsetENU = new Cesium.Cartesian3(0, 0, 4);
  const offsetECEF = Cesium.Matrix4.multiplyByPointAsVector(enu, offsetENU, new Cesium.Cartesian3());
  const camPos = Cesium.Cartesian3.add(aircraftPos, offsetECEF, new Cesium.Cartesian3());
  return {
    destination: camPos,
    heading: motionHeadingRad + headingOffsetRad,
    pitch: toRad(-2) + pitchOffsetRad,
  };
}

/** Default chase distance (metres behind the aircraft). Height tracks this ratio. */
export const DEFAULT_CHASE_RANGE_M = 500;
const CHASE_HEIGHT_RATIO = 0.35;

/** Resolves the camera pose for a given {@link CamMode}. */
export function computeCameraPose(
  Cesium: typeof import("cesium"),
  mode: CamMode,
  aircraftPos: import("cesium").Cartesian3,
  motionHeadingRad: number,
  sphere: import("cesium").BoundingSphere | null,
  cockpitHeadingOffsetRad = 0,
  cockpitPitchOffsetRad = 0,
  chaseRangeM = DEFAULT_CHASE_RANGE_M
): CamPose {
  switch (mode) {
    case "chase":
      // Close chase: metres behind / above the aircraft (height tracks range to
      // keep the framing angle), look-down pitch.
      return computePoseFromAircraft(
        Cesium,
        aircraftPos,
        motionHeadingRad,
        chaseRangeM,
        chaseRangeM * CHASE_HEIGHT_RATIO,
        toRad(-15)
      );
    case "side-left":
      return computePoseFromAircraft(Cesium, aircraftPos, motionHeadingRad - Math.PI / 2, 2400, 600, toRad(-12));
    case "side-right":
      return computePoseFromAircraft(Cesium, aircraftPos, motionHeadingRad + Math.PI / 2, 2400, 600, toRad(-12));
    case "panorama-start":
    case "panorama-end": {
      const range = sphere ? Math.max(sphere.radius * 1.6, 4500) : 6000;
      const height = sphere ? Math.max(sphere.radius * 1.1, 2800) : 3500;
      return computePoseFromAircraft(Cesium, aircraftPos, motionHeadingRad, range, height, toRad(-38));
    }
    case "cockpit":
      return computeCockpitPose(Cesium, aircraftPos, motionHeadingRad, cockpitHeadingOffsetRad, cockpitPitchOffsetRad);
    default:
      return computePoseFromAircraft(Cesium, aircraftPos, motionHeadingRad, 2500, 900, toRad(-18));
  }
}
