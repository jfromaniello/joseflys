/**
 * Rough aircraft attitude (heading/pitch/roll) estimated from the GPX track, to
 * orient a 3D model. Intentionally approximate — the nose points along the
 * course, pitch follows the climb gradient, and roll banks into turns. All
 * angles in radians.
 */

import { magvar } from "magvar";
import {
  computeMotionHeadingAdaptive,
  computeMotionHeadingRad,
  findIndexAtTime,
  haversineMeters,
  interpolateAtTime,
  sampleField,
} from "./cameraMath";
import type { ReplayPoint } from "./types";

const DEG_TO_RAD = Math.PI / 180;

/**
 * Geographic (true) heading in radians where the aircraft nose points at
 * `timeMs`, from the recorded magnetic heading when the track has it — converted
 * to true with the WMM declination (true = magnetic + declination). This is
 * stable even when stationary, unlike a GPS motion heading. The magnetic heading
 * is circularly interpolated between the bracketing points to avoid 0°/360° jumps.
 * Returns `null` when the track doesn't record heading.
 */
function recordedHeadingRad(points: ReplayPoint[], timeMs: number): number | null {
  const idx = findIndexAtTime(points, timeMs);

  // Nearest points with a recorded heading at/before and after `idx`. Avionics
  // logs leave the magnetic heading blank for the first ~minute while the AHRS
  // aligns; back/forward-filling from the closest valid sample keeps the nose
  // pointing sensibly (e.g. the first known heading) instead of spinning on GPS
  // noise while taxiing.
  let fromIdx = Math.min(idx, points.length - 1);
  while (fromIdx >= 0 && points[fromIdx].headingMagDeg === undefined) fromIdx -= 1;
  let toIdx = idx + 1;
  while (toIdx < points.length && points[toIdx].headingMagDeg === undefined) toIdx += 1;

  const from = fromIdx >= 0 ? points[fromIdx] : null;
  const to = toIdx < points.length ? points[toIdx] : null;
  if (!from && !to) return null;

  let magDeg: number;
  if (from && to && to.timeMs > from.timeMs) {
    const t = Math.max(0, Math.min(1, (timeMs - from.timeMs) / (to.timeMs - from.timeMs)));
    const shortest = (((to.headingMagDeg as number) - (from.headingMagDeg as number) + 540) % 360) - 180;
    magDeg = (from.headingMagDeg as number) + shortest * t;
  } else {
    magDeg = (from ?? to)!.headingMagDeg as number;
  }

  const here = interpolateAtTime(points, timeMs);
  const declination = here ? magvar(here.lat, here.lon, 0) : 0;
  return (magDeg + declination) * DEG_TO_RAD;
}

export interface Attitude {
  /** Course over ground, radians clockwise from north. */
  headingRad: number;
  /** Climb angle, radians (positive = nose up). */
  pitchRad: number;
  /** Bank angle, radians (positive = right wing down). */
  rollRad: number;
}

const PITCH_WINDOW_MS = 6000;
const MAX_PITCH_RAD = (22 * Math.PI) / 180;

const ROLL_HEADING_WINDOW_MS = 8000;
const ROLL_SPAN_MS = 6000;
const MAX_ROLL_RAD = (30 * Math.PI) / 180;
const ROLL_GAIN = 2.2; // maps turn rate (rad/s) → bank; tuned for a gentle look

function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}

/** Shortest signed angular difference b−a, in radians. */
function signedDelta(a: number, b: number): number {
  return ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

/**
 * Estimates attitude at `timeMs`. Prefers the aircraft's recorded heading (so
 * the nose is correct even while taxiing/stationary, where a GPS motion heading
 * is just noise); falls back to the GPS course over ground. Returns `null` only
 * when neither a recorded nor a motion heading can be derived.
 */
export function estimateAttitude(points: ReplayPoint[], timeMs: number): Attitude | null {
  const headingRad = recordedHeadingRad(points, timeMs) ?? computeMotionHeadingAdaptive(points, timeMs, 150, 30000);
  if (headingRad === null) return null;

  // Prefer real recorded attitude (Garmin AHRS) when the track carries it; the
  // GPS-derived estimates below are only a fallback for plain GPX.
  const recordedPitch = sampleField(points, timeMs, "pitchDeg");
  const recordedRoll = sampleField(points, timeMs, "rollDeg");

  let pitchRad: number;
  if (recordedPitch !== null) {
    pitchRad = recordedPitch * DEG_TO_RAD;
  } else {
    // Pitch from climb gradient over a centered window.
    pitchRad = 0;
    const before = interpolateAtTime(points, timeMs - PITCH_WINDOW_MS / 2);
    const after = interpolateAtTime(points, timeMs + PITCH_WINDOW_MS / 2);
    if (before && after) {
      const horiz = haversineMeters(before.lat, before.lon, after.lat, after.lon);
      if (horiz > 1) {
        pitchRad = clamp(Math.atan2(after.ele - before.ele, horiz), MAX_PITCH_RAD);
      }
    }
  }

  let rollRad: number;
  if (recordedRoll !== null) {
    rollRad = recordedRoll * DEG_TO_RAD;
  } else {
    // Roll from turn rate (change in motion heading over time).
    rollRad = 0;
    const hPrev = computeMotionHeadingRad(points, timeMs - ROLL_SPAN_MS / 2, ROLL_HEADING_WINDOW_MS);
    const hNext = computeMotionHeadingRad(points, timeMs + ROLL_SPAN_MS / 2, ROLL_HEADING_WINDOW_MS);
    if (hPrev !== null && hNext !== null) {
      const turnRate = signedDelta(hPrev, hNext) / (ROLL_SPAN_MS / 1000); // rad/s
      rollRad = clamp(turnRate * ROLL_GAIN, MAX_ROLL_RAD);
    }
  }

  return { headingRad, pitchRad, rollRad };
}
