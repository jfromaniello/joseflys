/**
 * Rough aircraft attitude (heading/pitch/roll) estimated from the GPX track, to
 * orient a 3D model. Intentionally approximate — the nose points along the
 * course, pitch follows the climb gradient, and roll banks into turns. All
 * angles in radians.
 */

import {
  computeMotionHeadingAdaptive,
  computeMotionHeadingRad,
  haversineMeters,
  interpolateAtTime,
} from "./cameraMath";
import type { ReplayPoint } from "./types";

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
 * Estimates attitude at `timeMs`. Returns `null` when motion heading can't be
 * derived (e.g. fewer than two points or no movement).
 */
export function estimateAttitude(points: ReplayPoint[], timeMs: number): Attitude | null {
  const headingRad = computeMotionHeadingAdaptive(points, timeMs, 150, 30000);
  if (headingRad === null) return null;

  // Pitch from climb gradient over a centered window.
  let pitchRad = 0;
  const before = interpolateAtTime(points, timeMs - PITCH_WINDOW_MS / 2);
  const after = interpolateAtTime(points, timeMs + PITCH_WINDOW_MS / 2);
  if (before && after) {
    const horiz = haversineMeters(before.lat, before.lon, after.lat, after.lon);
    if (horiz > 1) {
      pitchRad = clamp(Math.atan2(after.ele - before.ele, horiz), MAX_PITCH_RAD);
    }
  }

  // Roll from turn rate (change in motion heading over time).
  let rollRad = 0;
  const hPrev = computeMotionHeadingRad(points, timeMs - ROLL_SPAN_MS / 2, ROLL_HEADING_WINDOW_MS);
  const hNext = computeMotionHeadingRad(points, timeMs + ROLL_SPAN_MS / 2, ROLL_HEADING_WINDOW_MS);
  if (hPrev !== null && hNext !== null) {
    const turnRate = signedDelta(hPrev, hNext) / (ROLL_SPAN_MS / 1000); // rad/s
    rollRad = clamp(turnRate * ROLL_GAIN, MAX_ROLL_RAD);
  }

  return { headingRad, pitchRad, rollRad };
}
