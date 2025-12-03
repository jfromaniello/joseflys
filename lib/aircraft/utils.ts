import type { AircraftPerformance } from "./types";
import { CESSNA_150 } from "./CESSNA_150";
import { CESSNA_152 } from "./CESSNA_152";
import { CESSNA_170 } from "./CESSNA_170";
import { CESSNA_172N } from "./CESSNA_172N";
import { CESSNA_182 } from "./CESSNA_182";
import { CESSNA_210 } from "./CESSNA_210";
import { PIPER_PA11 } from "./PIPER_PA11";
import { PIPER_J3 } from "./PIPER_J3";
import { PIPER_PA28_140 } from "./PIPER_PA28_140";
import { PIPER_PA28_180 } from "./PIPER_PA28_180";
import { PIPER_PA28R_200 } from "./PIPER_PA28R_200";
import { BEECHCRAFT_A36 } from "./BEECHCRAFT_A36";
import { DIAMOND_DA40 } from "./DIAMOND_DA40";
import { CIRRUS_SR20 } from "./CIRRUS_SR20";

/**
 * Array of all preset aircraft
 */
export const PRESET_AIRCRAFT: AircraftPerformance[] = [
  CESSNA_150,
  CESSNA_152,
  CESSNA_170,
  CESSNA_172N,
  CESSNA_182,
  CESSNA_210,
  PIPER_PA11,
  PIPER_J3,
  PIPER_PA28_140,
  PIPER_PA28_180,
  PIPER_PA28R_200,
  BEECHCRAFT_A36,
  DIAMOND_DA40,
  CIRRUS_SR20,
];

/**
 * Get aircraft by model code
 */
export function getAircraftByModel(
  model: string
): AircraftPerformance | undefined {
  return PRESET_AIRCRAFT.find((ac) => ac.model === model);
}

/**
 * Create empty aircraft template
 * Can be used for creating aircraft with just a name, then progressively add data
 */
export function createEmptyAircraft(name?: string): AircraftPerformance {
  return {
    name: name || "Custom Aircraft",
    model: "CUSTOM",
    weights: {
      emptyWeight: 1000,
      maxGrossWeight: 1500,
    },
    climbTable: [],
    cruiseTable: [],
    engine: {
      type: "Unknown",
      maxRPM: 2700,
      ratedHP: 100,
      usableFuelGallons: 20,
    },
    limits: {
      vne: 150,
      vno: 130,
      va: 100,
      vfe: 85,
      vs: 50,
      vs0: 45,
    },
  };
}

/**
 * Create empty aircraft with climb performance template
 */
export function createEmptyAircraftWithClimb(
  name?: string
): AircraftPerformance {
  return {
    name: name || "Custom Aircraft",
    model: "CUSTOM",
    weights: {
      emptyWeight: 1200,
      standardWeight: 2000,
      maxGrossWeight: 2200,
    },
    climbTable: [
      // Minimal POH-style climb table with 3 OAT columns
      { pressureAltitude: 0, oat: 0, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
      { pressureAltitude: 4000, oat: 0, timeFromSL: 8, fuelFromSL: 1.0, distanceFromSL: 8 },
      { pressureAltitude: 8000, oat: 0, timeFromSL: 18, fuelFromSL: 2.2, distanceFromSL: 20 },
      { pressureAltitude: 0, oat: 20, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
      { pressureAltitude: 4000, oat: 20, timeFromSL: 10, fuelFromSL: 1.3, distanceFromSL: 11 },
      { pressureAltitude: 8000, oat: 20, timeFromSL: 22, fuelFromSL: 2.8, distanceFromSL: 26 },
      { pressureAltitude: 0, oat: 40, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
      { pressureAltitude: 4000, oat: 40, timeFromSL: 14, fuelFromSL: 1.8, distanceFromSL: 15 },
      { pressureAltitude: 8000, oat: 40, timeFromSL: 30, fuelFromSL: 3.8, distanceFromSL: 36 },
    ],
    cruiseTable: [
      {
        altitude: 5000,
        rpm: 2400,
        percentPower: 75,
        tas: 100,
        fuelFlow: 8.0,
      },
    ],
    engine: {
      type: "Unknown",
      maxRPM: 2700,
      ratedHP: 100,
      usableFuelGallons: 20,
    },
    limits: {
      vne: 150,
      vno: 130,
      va: 100,
      vfe: 85,
      vs: 50,
      vs0: 45,
    },
  };
}
