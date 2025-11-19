import type { AircraftPerformance } from "./types";

/**
 * Type representing the old aircraft format
 */
interface LegacyAircraftPerformance {
  name: string;
  model: string;
  standardWeight?: number;
  maxWeight?: number;
  climbTable?: any[];
  deviationTable?: Array<{
    forHeading: number;
    steerHeading: number;
  }>;
}

/**
 * Checks if an aircraft is in the old format (missing new required fields)
 */
export function isLegacyAircraft(aircraft: any): boolean {
  // Check if it's missing any of the new required fields
  return (
    !aircraft.weights ||
    !aircraft.engine ||
    !aircraft.limits ||
    !aircraft.cruiseTable
  );
}

/**
 * Migrates an old-format aircraft to the new format
 * Preserves all existing data and provides sensible defaults for new required fields
 */
export function migrateAircraftToNewFormat(
  legacy: LegacyAircraftPerformance
): AircraftPerformance {
  // If it's already in the new format, return as-is
  if (!isLegacyAircraft(legacy)) {
    return legacy as AircraftPerformance;
  }

  // Calculate defaults based on old data
  const standardWeight = legacy.standardWeight || 2000;
  const maxWeight = legacy.maxWeight || standardWeight + 200;
  const emptyWeight = Math.round(standardWeight * 0.6); // Rough estimate

  return {
    name: legacy.name,
    model: legacy.model,

    // Migrate weights from old top-level fields
    weights: {
      emptyWeight,
      standardWeight: legacy.standardWeight,
      maxGrossWeight: maxWeight,
    },

    // Preserve climb table or default to empty
    climbTable: legacy.climbTable || [],

    // New required field: cruise table (empty by default)
    cruiseTable: [],

    // New required field: engine with generic defaults
    engine: {
      type: "Unknown",
      maxRPM: 2700,
      ratedHP: 100,
      usableFuelGallons: 20,
    },

    // New required field: limits with conservative defaults
    limits: {
      vne: 150,
      vno: 130,
      va: 100,
      vfe: 85,
      vs: 50,
      vs0: 45,
    },

    // Preserve deviation table if it exists (user-created aircraft)
    deviationTable: legacy.deviationTable,
  };
}

/**
 * Migrates an array of aircraft, handling both old and new formats
 */
export function migrateAircraftArray(
  aircraft: LegacyAircraftPerformance[]
): AircraftPerformance[] {
  return aircraft.map(migrateAircraftToNewFormat);
}
