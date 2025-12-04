/**
 * Runway utility functions for takeoff calculations
 */

/**
 * Runway end data
 */
export interface RunwayEnd {
  id: string;
  heading: number | null; // True heading (degrees)
  elevation: number | null; // ft
  displacedThreshold: number; // ft
  lat: number | null;
  lon: number | null;
}

/**
 * Runway data from API
 */
export interface Runway {
  id: string; // Combined ID (e.g., "11/29")
  length: number; // ft
  width: number; // ft
  surface: string; // Surface type code
  surfaceName: string; // Human-readable surface name
  lighted: boolean;
  closed: boolean;
  ends: RunwayEnd[];
}

/**
 * Selected runway end with calculated values
 */
export interface SelectedRunway {
  runwayId: string; // e.g., "11/29"
  endId: string; // e.g., "11" (the threshold being used)
  heading: number; // True heading (degrees)
  length: number; // Available length (ft, after displaced threshold)
  width: number; // ft
  surface: string; // Surface code
  surfaceName: string;
  slope: number; // % (positive = uphill takeoff)
  headwind: number; // kt (positive = headwind, negative = tailwind)
  crosswind: number; // kt (absolute value)
  crosswindDirection: "L" | "R" | null; // L = from left, R = from right
}

/**
 * Calculate wind components for a given heading and wind
 * @param runwayHeading True runway heading (degrees)
 * @param windDir Wind direction (from, degrees)
 * @param windSpeed Wind speed (kt)
 * @returns headwind (positive = headwind) and crosswind (positive = from right)
 */
export function calculateWindComponents(
  runwayHeading: number,
  windDir: number,
  windSpeed: number
): { headwind: number; crosswind: number } {
  const relativeWind = ((windDir - runwayHeading) * Math.PI) / 180;

  // Headwind component (positive = headwind, negative = tailwind)
  const headwind = windSpeed * Math.cos(relativeWind);

  // Crosswind component (positive = wind from right, negative = from left)
  const crosswind = windSpeed * Math.sin(relativeWind);

  return { headwind, crosswind };
}

/**
 * Calculate runway slope percentage
 * @param departureElev Departure threshold elevation (ft)
 * @param oppositeElev Opposite threshold elevation (ft)
 * @param length Runway length (ft)
 * @returns Slope percentage (positive = uphill, negative = downhill)
 */
export function calculateSlope(
  departureElev: number | null,
  oppositeElev: number | null,
  length: number
): number {
  if (departureElev === null || oppositeElev === null || length === 0) {
    return 0;
  }
  // Slope = (end - start) / length * 100
  // Positive slope = uphill (harder takeoff)
  return ((oppositeElev - departureElev) / length) * 100;
}

/**
 * Find the best runway end based on wind direction
 * Selects the end that provides the maximum headwind component
 * @param runways Array of runways
 * @param windDir Wind direction (from, degrees)
 * @param windSpeed Wind speed (kt)
 * @returns Best runway end with calculated values, or null if no valid runway
 */
export function selectBestRunway(
  runways: Runway[],
  windDir: number | null,
  windSpeed: number | null
): SelectedRunway | null {
  if (!runways.length) return null;

  // If no wind data, just return the first runway end
  const effectiveWindDir = windDir ?? 0;
  const effectiveWindSpeed = windSpeed ?? 0;

  let bestOption: SelectedRunway | null = null;
  let maxHeadwind = -Infinity;

  for (const runway of runways) {
    for (let i = 0; i < runway.ends.length; i++) {
      const end = runway.ends[i];
      if (end.heading === null) continue;

      const { headwind, crosswind } = calculateWindComponents(
        end.heading,
        effectiveWindDir,
        effectiveWindSpeed
      );

      // Only consider this option if it has more headwind than current best
      if (headwind > maxHeadwind) {
        maxHeadwind = headwind;

        // Get opposite end for slope calculation
        const oppositeEnd = runway.ends[1 - i];
        const slope = calculateSlope(
          end.elevation,
          oppositeEnd?.elevation ?? null,
          runway.length
        );

        // Calculate available length (subtract displaced threshold)
        const availableLength = runway.length - end.displacedThreshold;

        bestOption = {
          runwayId: runway.id,
          endId: end.id,
          heading: end.heading,
          length: availableLength,
          width: runway.width,
          surface: runway.surface,
          surfaceName: runway.surfaceName,
          slope,
          headwind: Math.round(headwind * 10) / 10,
          crosswind: Math.round(Math.abs(crosswind) * 10) / 10,
          crosswindDirection:
            Math.abs(crosswind) < 0.5 ? null : crosswind > 0 ? "R" : "L",
        };
      }
    }
  }

  return bestOption;
}

/**
 * Get all runway ends as selectable options
 * @param runways Array of runways
 * @param windDir Wind direction (from, degrees)
 * @param windSpeed Wind speed (kt)
 * @returns Array of all runway ends with calculated wind components
 */
export function getAllRunwayOptions(
  runways: Runway[],
  windDir: number | null,
  windSpeed: number | null
): SelectedRunway[] {
  const options: SelectedRunway[] = [];
  const effectiveWindDir = windDir ?? 0;
  const effectiveWindSpeed = windSpeed ?? 0;

  for (const runway of runways) {
    for (let i = 0; i < runway.ends.length; i++) {
      const end = runway.ends[i];
      if (end.heading === null) continue;

      const { headwind, crosswind } = calculateWindComponents(
        end.heading,
        effectiveWindDir,
        effectiveWindSpeed
      );

      const oppositeEnd = runway.ends[1 - i];
      const slope = calculateSlope(
        end.elevation,
        oppositeEnd?.elevation ?? null,
        runway.length
      );

      const availableLength = runway.length - end.displacedThreshold;

      options.push({
        runwayId: runway.id,
        endId: end.id,
        heading: end.heading,
        length: availableLength,
        width: runway.width,
        surface: runway.surface,
        surfaceName: runway.surfaceName,
        slope,
        headwind: Math.round(headwind * 10) / 10,
        crosswind: Math.round(Math.abs(crosswind) * 10) / 10,
        crosswindDirection:
          Math.abs(crosswind) < 0.5 ? null : crosswind > 0 ? "R" : "L",
      });
    }
  }

  // Sort by headwind (best first)
  return options.sort((a, b) => b.headwind - a.headwind);
}

/**
 * Map runway surface code to takeoff calculation surface type
 */
export function surfaceToTakeoffSurface(
  surface: string
): "dry-asphalt" | "wet-asphalt" | "dry-grass" | "wet-grass" {
  const asphaltSurfaces = ["A", "AG", "ASP", "C", "CG", "CON", "PSP", "M"];
  const isAsphalt = asphaltSurfaces.includes(surface);
  // Default to dry - user can change to wet if needed
  return isAsphalt ? "dry-asphalt" : "dry-grass";
}
