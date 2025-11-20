import type { AircraftPerformance, ClimbPerformance } from "./types";

/**
 * Type representing the old aircraft format
 * This is exported to allow type-safe handling of legacy data
 */
export interface LegacyAircraftPerformance {
  name: string;
  model: string;
  standardWeight?: number;
  maxWeight?: number;
  climbTable?: ClimbPerformance[];
  deviationTable?: Array<{
    forHeading: number;
    steerHeading: number;
  }>;
}

/**
 * Checks if an aircraft is in the old format (missing new required fields)
 * Type guard that narrows the type to LegacyAircraftPerformance
 */
export function isLegacyAircraft(
  aircraft: AircraftPerformance | LegacyAircraftPerformance
): aircraft is LegacyAircraftPerformance {
  // If aircraft has inheritance, it's NOT legacy (it inherits missing fields)
  if ('inherit' in aircraft && aircraft.inherit) {
    return false;
  }

  // Check if it's missing any of the new required fields
  return (
    !('weights' in aircraft && aircraft.weights) ||
    !('engine' in aircraft && aircraft.engine) ||
    !('limits' in aircraft && aircraft.limits) ||
    !('cruiseTable' in aircraft && aircraft.cruiseTable)
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
