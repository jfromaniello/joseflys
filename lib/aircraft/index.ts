// Aircraft data exports
export { CESSNA_150 } from "./CESSNA_150";
export { CESSNA_152 } from "./CESSNA_152";
export { CESSNA_170 } from "./CESSNA_170";
export { CESSNA_172N } from "./CESSNA_172N";
export { CESSNA_182 } from "./CESSNA_182";
export { CESSNA_210 } from "./CESSNA_210";
export { PIPER_PA11 } from "./PIPER_PA11";
export { PIPER_J3 } from "./PIPER_J3";
export { PIPER_PA28_140 } from "./PIPER_PA28_140";
export { PIPER_PA28_180 } from "./PIPER_PA28_180";
export { PIPER_PA28R_200 } from "./PIPER_PA28R_200";
export { BEECHCRAFT_A36 } from "./BEECHCRAFT_A36";
export { DIAMOND_DA40 } from "./DIAMOND_DA40";
export { CIRRUS_SR20 } from "./CIRRUS_SR20";

// Type exports
export type {
  AircraftPerformance,
  ResolvedAircraftPerformance,
  AircraftWeights,
  ClimbPerformance,
  CruisePerformance,
  EngineData,
  AircraftLimits,
  TakeoffPerformance,
  LandingPerformance,
  DeviationEntry,
} from "./types";

// Utility exports
export {
  PRESET_AIRCRAFT,
  getAircraftByModel,
  createEmptyAircraft,
  createEmptyAircraftWithClimb,
} from "./utils";

// Migration exports
export {
  isLegacyAircraft,
  migrateAircraftToNewFormat,
  migrateAircraftArray,
} from "./migration";

export type { LegacyAircraftPerformance } from "./migration";

// Backward compatibility type alias
export type { ClimbPerformance as ClimbPerformanceData } from "./types";
