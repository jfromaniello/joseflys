/**
 * Consolidated Formatting Functions
 *
 * This module provides standardized formatting functions for aviation-related
 * values used throughout the application. These formatters ensure consistency
 * across UI displays, PDF exports, Excel exports, and other outputs.
 */

/**
 * Format a course or heading to 3-digit format with degree symbol
 * Examples: 5° → 005°, 20° → 020°, 350° → 350°
 *
 * @param degrees - The course/heading in degrees (0-360)
 * @returns Formatted string like "005°" or "-" if invalid
 */
export function formatCourse(degrees: number | null | undefined): string {
  if (degrees === null || degrees === undefined || isNaN(degrees)) {
    return "-";
  }
  return `${Math.round(degrees).toString().padStart(3, "0")}°`;
}

/**
 * Format wind correction angle with E/W suffix
 * E (East) means turn left (negative WCA), W (West) means turn right (positive WCA)
 * Examples: -2° → 2°E, 2° → 2°W, 0° → 0°
 *
 * @param wca - Wind correction angle in degrees
 * @returns Formatted string like "2°E" or "5°W"
 */
export function formatWCA(wca: number | null | undefined): string {
  if (wca === null || wca === undefined || isNaN(wca)) {
    return "-";
  }

  const absWca = Math.abs(Math.round(wca));

  // If WCA is zero, just return "0°"
  if (absWca === 0) {
    return "0°";
  }

  // Negative WCA = East (turn left), Positive WCA = West (turn right)
  const direction = wca < 0 ? "E" : "W";
  return `${absWca}°${direction}`;
}

/**
 * Format magnetic declination/deviation with E/W suffix
 * Positive = West, Negative = East (standard aviation convention)
 * Examples: 5° → 5°W, -3° → 3°E
 *
 * @param deviation - Magnetic declination/deviation in degrees
 * @returns Formatted string like "5°W" or "3°E"
 */
export function formatDeviation(deviation: number | null | undefined): string {
  if (deviation === null || deviation === undefined || isNaN(deviation)) {
    return "-";
  }

  const absDeviation = Math.abs(Math.round(deviation));

  if (absDeviation === 0) {
    return "0°";
  }

  // Positive = West, Negative = East (aviation convention)
  const direction = deviation >= 0 ? "W" : "E";
  return `${absDeviation}°${direction}`;
}

/**
 * Format wind as direction/speed
 * Examples: 020° / 12 KT
 *
 * @param windDir - Wind direction in degrees (0-360)
 * @param windSpeed - Wind speed in knots
 * @param includeUnit - Whether to include "KT" unit (default: true)
 * @returns Formatted string like "020° / 12 KT" or "-" if invalid
 */
export function formatWind(
  windDir?: number | null,
  windSpeed?: number | null,
  includeUnit: boolean = true
): string {
  if (
    windDir === null ||
    windDir === undefined ||
    windSpeed === null ||
    windSpeed === undefined ||
    isNaN(windDir) ||
    isNaN(windSpeed) ||
    windSpeed === 0
  ) {
    return "-";
  }

  const formattedDir = Math.round(windDir).toString().padStart(3, "0");
  const formattedSpeed = Math.round(windSpeed);

  if (includeUnit) {
    return `${formattedDir}° / ${formattedSpeed} KT`;
  }

  return `${formattedDir}° / ${formattedSpeed}`;
}

/**
 * Format a simple degree value (without 3-digit padding)
 * Examples: 5° → 5°, 350° → 350°
 *
 * @param degrees - Angle in degrees
 * @returns Formatted string like "5°" or "-" if invalid
 */
export function formatDegrees(degrees: number | null | undefined): string {
  if (degrees === null || degrees === undefined || isNaN(degrees)) {
    return "-";
  }
  return `${Math.round(degrees)}°`;
}

/**
 * Format time as hours:minutes
 * Examples: 1.5 hours → "1:30", 0.25 hours → "0:15"
 *
 * @param hours - Time in decimal hours
 * @returns Formatted string like "1:30"
 */
export function formatTime(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || isNaN(hours)) {
    return "-";
  }

  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

/**
 * Format fuel value with unit
 * Examples: 12.5 GAL → "12.5 GAL"
 *
 * @param fuel - Fuel quantity
 * @param unit - Fuel unit (GAL, L, etc.)
 * @returns Formatted string like "12.5 GAL"
 */
export function formatFuel(fuel: number | null | undefined, unit: string): string {
  if (fuel === null || fuel === undefined || isNaN(fuel)) {
    return "-";
  }
  return `${fuel.toFixed(1)} ${unit}`;
}

/**
 * Format speed value
 *
 * @param speed - Speed value
 * @param decimals - Number of decimal places (default: 0 for whole number)
 * @returns Formatted string or "-" if invalid
 */
export function formatSpeed(speed: number | null | undefined, decimals: number = 0): string {
  if (speed === null || speed === undefined || isNaN(speed)) {
    return "-";
  }
  return decimals > 0 ? speed.toFixed(decimals) : Math.round(speed).toString();
}

/**
 * Format distance value
 *
 * @param distance - Distance value
 * @param decimals - Number of decimal places (default: 0 for whole numbers)
 * @returns Formatted string or "-" if invalid
 */
export function formatDistance(distance: number | null | undefined, decimals: number = 0): string {
  if (distance === null || distance === undefined || isNaN(distance)) {
    return "-";
  }
  return decimals > 0 ? distance.toFixed(decimals) : Math.round(distance).toString();
}
