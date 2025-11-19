// Aircraft data exports
export { CESSNA_150 } from "./CESSNA_150";
export { CESSNA_170 } from "./CESSNA_170";
export { CESSNA_182 } from "./CESSNA_182";
export { PIPER_PA11 } from "./PIPER_PA11";

// Type exports
export type {
  AircraftPerformance,
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

// Backward compatibility type alias
export type { ClimbPerformance as ClimbPerformanceData } from "./types";
