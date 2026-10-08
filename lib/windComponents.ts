/**
 * Wind component helpers for the Wind Components utility.
 *
 * Components are relative to a reference direction: the aircraft heading in
 * flight, or the runway heading for takeoff/landing.
 * The trigonometry lives in `calculateWindComponents` (lib/runwayUtils.ts).
 */

import { calculateWindComponents } from "./runwayUtils";

export interface WindComponentsResult {
  /** Angle between wind and reference direction, 0-180° (side-agnostic) */
  angle: number;
  /** Positive = headwind, negative = tailwind (kt) */
  headwind: number;
  /** Crosswind magnitude (kt, always >= 0) */
  crosswind: number;
  /** Side the wind comes from, null when unknown (relative angle input) or no crosswind */
  crosswindFrom: "L" | "R" | null;
}

/**
 * Parse a runway designator into its heading.
 * "11" → 110°, "09" / "9" → 90°, "29L" → 290°, "RWY 36" → 360°.
 * Returns null when the input isn't a valid designator (01-36).
 */
export function parseRunwayDesignator(input: string): number | null {
  const match = input.trim().match(/^(?:rwy\s*)?(\d{1,2})\s*[lrc]?$/i);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  return value >= 1 && value <= 36 ? value * 10 : null;
}

/**
 * Wind components relative to a heading (aircraft heading or runway heading).
 * @param heading Reference direction in degrees
 * @param windDir Direction the wind blows from, in degrees
 * @param windSpeed Wind speed (kt)
 */
export function getHeadingWindComponents(
  heading: number,
  windDir: number,
  windSpeed: number
): WindComponentsResult {
  const { headwind, crosswind } = calculateWindComponents(heading, windDir, windSpeed);
  const diff = (((windDir - heading) % 360) + 360) % 360;
  const angle = diff > 180 ? 360 - diff : diff;
  const crosswindFrom = Math.abs(crosswind) < 1e-9 ? null : crosswind > 0 ? "R" : "L";
  return { angle, headwind, crosswind: Math.abs(crosswind), crosswindFrom };
}

/**
 * Wind components from the relative wind angle (chart style).
 * @param angle Angle between wind and reference direction, 0-180°
 * @param windSpeed Wind speed (kt)
 */
export function getRelativeWindComponents(angle: number, windSpeed: number): WindComponentsResult {
  const { headwind, crosswind } = calculateWindComponents(0, angle, windSpeed);
  return { angle, headwind, crosswind: Math.abs(crosswind), crosswindFrom: null };
}
