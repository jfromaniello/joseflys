/**
 * Climb Performance Calculations
 *
 * Uses POH-style cumulative climb tables indexed by Pressure Altitude × OAT.
 * Performs bilinear interpolation for values between table entries.
 */

import { ClimbPerformance } from "./aircraft";

export interface ClimbResult {
  time: number; // minutes
  fuel: number; // gallons
  distance: number; // NM
}

/**
 * Get unique sorted values from climb table
 */
function getUniqueValues(
  climbTable: ClimbPerformance[],
  key: "pressureAltitude" | "oat"
): number[] {
  const values = [...new Set(climbTable.map((p) => p[key]))];
  return values.sort((a, b) => a - b);
}

/**
 * Find bracketing values for interpolation
 * Returns [lower, upper] or [value, value] if exact match
 */
function findBracket(sortedValues: number[], target: number): [number, number] {
  // Clamp to table bounds
  if (target <= sortedValues[0]) {
    return [sortedValues[0], sortedValues[0]];
  }
  if (target >= sortedValues[sortedValues.length - 1]) {
    return [
      sortedValues[sortedValues.length - 1],
      sortedValues[sortedValues.length - 1],
    ];
  }

  // Find bracket
  for (let i = 0; i < sortedValues.length - 1; i++) {
    if (target >= sortedValues[i] && target <= sortedValues[i + 1]) {
      return [sortedValues[i], sortedValues[i + 1]];
    }
  }

  // Fallback (shouldn't happen)
  return [sortedValues[0], sortedValues[sortedValues.length - 1]];
}

/**
 * Get climb table entry for exact PA and OAT
 */
function getEntry(
  climbTable: ClimbPerformance[],
  pa: number,
  oat: number
): ClimbPerformance | undefined {
  return climbTable.find(
    (p) => p.pressureAltitude === pa && p.oat === oat
  );
}

/**
 * Linear interpolation
 */
function lerp(v0: number, v1: number, t: number): number {
  return v0 + t * (v1 - v0);
}

/**
 * Interpolate cumulative values at a specific PA and OAT using bilinear interpolation
 */
function interpolateAtPoint(
  climbTable: ClimbPerformance[],
  pa: number,
  oat: number
): { time: number; fuel: number; distance: number } {
  const altitudes = getUniqueValues(climbTable, "pressureAltitude");
  const temperatures = getUniqueValues(climbTable, "oat");

  const [paLow, paHigh] = findBracket(altitudes, pa);
  const [oatLow, oatHigh] = findBracket(temperatures, oat);

  // Get the four corner points
  const q11 = getEntry(climbTable, paLow, oatLow);
  const q12 = getEntry(climbTable, paLow, oatHigh);
  const q21 = getEntry(climbTable, paHigh, oatLow);
  const q22 = getEntry(climbTable, paHigh, oatHigh);

  // If any corner is missing, try to find best available data
  if (!q11 || !q12 || !q21 || !q22) {
    // Try to find at least one valid entry
    const available = [q11, q12, q21, q22].filter(Boolean) as ClimbPerformance[];
    if (available.length === 0) {
      return { time: 0, fuel: 0, distance: 0 };
    }
    // Use the closest available point
    const closest = available[0];
    return {
      time: closest.timeFromSL,
      fuel: closest.fuelFromSL,
      distance: closest.distanceFromSL,
    };
  }

  // Calculate interpolation factors
  const tPA = paHigh === paLow ? 0 : (pa - paLow) / (paHigh - paLow);
  const tOAT = oatHigh === oatLow ? 0 : (oat - oatLow) / (oatHigh - oatLow);

  // Bilinear interpolation for each value
  const interpolate = (
    v11: number,
    v12: number,
    v21: number,
    v22: number
  ): number => {
    const r1 = lerp(v11, v12, tOAT); // Interpolate along OAT at paLow
    const r2 = lerp(v21, v22, tOAT); // Interpolate along OAT at paHigh
    return lerp(r1, r2, tPA); // Interpolate along PA
  };

  return {
    time: interpolate(
      q11.timeFromSL,
      q12.timeFromSL,
      q21.timeFromSL,
      q22.timeFromSL
    ),
    fuel: interpolate(
      q11.fuelFromSL,
      q12.fuelFromSL,
      q21.fuelFromSL,
      q22.fuelFromSL
    ),
    distance: interpolate(
      q11.distanceFromSL,
      q12.distanceFromSL,
      q21.distanceFromSL,
      q22.distanceFromSL
    ),
  };
}

/**
 * Calculate climb performance between two pressure altitudes at a given OAT
 *
 * @param climbTable - Aircraft climb performance table
 * @param fromPA - Starting pressure altitude (ft)
 * @param toPA - Target pressure altitude (ft)
 * @param oat - Outside Air Temperature (°C)
 * @returns Climb time (min), fuel (gal), and distance (NM)
 */
export function calculateClimbPerformance(
  climbTable: ClimbPerformance[],
  fromPA: number,
  toPA: number,
  oat: number
): ClimbResult {
  // Descending or level flight
  if (toPA <= fromPA) {
    return { time: 0, fuel: 0, distance: 0 };
  }

  // Empty table check
  if (!climbTable || climbTable.length === 0) {
    return { time: 0, fuel: 0, distance: 0 };
  }

  // Get cumulative values at both altitudes
  const atFrom = interpolateAtPoint(climbTable, fromPA, oat);
  const atTo = interpolateAtPoint(climbTable, toPA, oat);

  // Difference gives us the climb segment values
  return {
    time: Math.max(0, atTo.time - atFrom.time),
    fuel: Math.max(0, atTo.fuel - atFrom.fuel),
    distance: Math.max(0, atTo.distance - atFrom.distance),
  };
}

/**
 * Get the available temperature range from a climb table
 */
export function getClimbTableTemperatureRange(
  climbTable: ClimbPerformance[]
): { min: number; max: number } | null {
  if (!climbTable || climbTable.length === 0) {
    return null;
  }
  const temperatures = getUniqueValues(climbTable, "oat");
  return {
    min: temperatures[0],
    max: temperatures[temperatures.length - 1],
  };
}

/**
 * Get the available altitude range from a climb table
 */
export function getClimbTableAltitudeRange(
  climbTable: ClimbPerformance[]
): { min: number; max: number } | null {
  if (!climbTable || climbTable.length === 0) {
    return null;
  }
  const altitudes = getUniqueValues(climbTable, "pressureAltitude");
  return {
    min: altitudes[0],
    max: altitudes[altitudes.length - 1],
  };
}
