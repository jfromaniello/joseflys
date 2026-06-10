/**
 * Pure geometry helpers for the glass-cockpit (PFD) overlay tapes. Kept free of
 * React/DOM so the tick math is unit-testable.
 */

/** A tick mark on a vertical tape (speed / altitude). */
export interface TapeTick {
  /** Value this tick represents, in tape units (kt, ft). */
  value: number;
  /** Vertical pixel position within the tape (0 = top). */
  y: number;
  /** Major ticks are longer and carry a label. */
  major: boolean;
}

/**
 * Ticks visible on a vertical tape centered on `centerValue`. Values increase
 * upward (smaller `y`), like a real airspeed/altitude tape. Ticks below
 * `minValue` (e.g. negative airspeeds) are omitted.
 */
export function computeTapeTicks(
  centerValue: number,
  heightPx: number,
  pxPerUnit: number,
  minorStep: number,
  majorStep: number,
  minValue = -Infinity
): TapeTick[] {
  const halfRange = heightPx / 2 / pxPerUnit;
  const lowest = Math.max(minValue, centerValue - halfRange);
  const highest = centerValue + halfRange;

  const ticks: TapeTick[] = [];
  for (let v = Math.ceil(lowest / minorStep) * minorStep; v <= highest; v += minorStep) {
    // Guard against float drift (e.g. 49.999999) so major detection stays exact.
    const value = Math.round(v / minorStep) * minorStep;
    ticks.push({
      value,
      y: heightPx / 2 - (value - centerValue) * pxPerUnit,
      major: value % majorStep === 0,
    });
  }
  return ticks;
}

/**
 * Label for a compass rose tick: cardinal letters on the cardinals, two-digit
 * tens elsewhere every 30° ("03", "12", "33"), `null` for unlabeled ticks.
 */
export function headingTickLabel(deg: number): string | null {
  const d = ((deg % 360) + 360) % 360;
  if (d === 0) return "N";
  if (d === 90) return "E";
  if (d === 180) return "S";
  if (d === 270) return "W";
  if (d % 30 === 0) return String(d / 10).padStart(2, "0");
  return null;
}
