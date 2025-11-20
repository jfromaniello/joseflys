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
      {
        altitudeFrom: 0,
        altitudeTo: 2000,
        rateOfClimb: 500,
        climbTAS: 70,
        fuelFlow: 8.0,
      },
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
