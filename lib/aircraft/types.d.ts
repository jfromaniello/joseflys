/**
 * Fully resolved aircraft with all properties defined (no inheritance)
 * This is what you get after calling resolveAircraft()
 */
export interface ResolvedAircraftPerformance {
  name: string;
  model: string;
  isCustom: boolean;
  weights: AircraftWeights;
  climbTable: ClimbPerformance[];
  cruiseTable: CruisePerformance[];
  engine: EngineData;
  limits: AircraftLimits;
  serviceCeiling?: number;
  takeoffTable?: TakeoffPerformance[];
  landingTable?: LandingPerformance[];
  deviationTable?: DeviationEntry[];
  /** Brief description of the aircraft (history, capabilities, etc.) */
  description?: string;
  /** Link to Wikipedia article */
  wikipediaUrl?: string;
}

/**
 * General aircraft performance model for planning, training and automation.
 *
 * When `inherit` is set, all other fields become optional and inherit from the parent preset.
 * When `inherit` is not set, weights/climbTable/cruiseTable/engine/limits are required.
 */
export interface AircraftPerformance {
  /** Aircraft commercial name (e.g., "Cessna 150") */
  name: string;

  /** Short model code (e.g., "C150") */
  model: string;

  /**
   * Inherit from a preset aircraft (model code)
   * When set, all undefined properties are inherited from the preset
   * Only custom overrides are stored, reducing storage size
   * Example: inherit: "C150" - inherits all C150 properties
   */
  inherit?: string;

  /**
   * All relevant aircraft weights
   * Required unless inheriting from a preset
   */
  weights?: AircraftWeights;

  /**
   * Climb performance tables grouped by altitude ranges
   * Required unless inheriting from a preset
   */
  climbTable?: ClimbPerformance[];

  /**
   * Cruise performance tables at different altitudes and power settings
   * Required unless inheriting from a preset
   */
  cruiseTable?: CruisePerformance[];

  /**
   * Engine performance and limits information
   * Required unless inheriting from a preset
   */
  engine?: EngineData;

  /**
   * Airplane operating limitations (V-speeds, max wind, etc.)
   * Required unless inheriting from a preset
   */
  limits?: AircraftLimits;

  /** Service ceiling in feet (pressure altitude) - maximum altitude where aircraft can maintain 100 fpm climb */
  serviceCeiling?: number;

  /** Optional takeoff performance table */
  takeoffTable?: TakeoffPerformance[];

  /** Optional landing performance table */
  landingTable?: LandingPerformance[];

  /** Optional compass deviation table (for user-created aircraft instances) */
  deviationTable?: DeviationEntry[];

  /** Brief description of the aircraft (history, capabilities, etc.) */
  description?: string;

  /** Link to Wikipedia article */
  wikipediaUrl?: string;
}

/* -------------------------------------------------------------------------- */
/*                                WEIGHTS                                     */
/* -------------------------------------------------------------------------- */

/**
 * Weight configuration of the aircraft.
 */
export interface AircraftWeights {
  /** Empty weight (lbs) — airplane without occupants or fuel */
  emptyWeight: number;

  /** Standard weight for which the POH performance tables are valid (lbs) */
  standardWeight?: number;

  /** Maximum gross weight allowed for takeoff (lbs) */
  maxGrossWeight: number;
}

/* -------------------------------------------------------------------------- */
/*                        CLIMB PERFORMANCE TABLE                             */
/* -------------------------------------------------------------------------- */

/**
 * Cumulative climb performance data from Sea Level, indexed by Pressure Altitude × OAT.
 * This matches the standard POH format where data is presented as cumulative values from SL.
 *
 * To calculate climb between two altitudes:
 *   time = timeFromSL(toPA) - timeFromSL(fromPA)
 *   fuel = fuelFromSL(toPA) - fuelFromSL(fromPA)
 *   distance = distanceFromSL(toPA) - distanceFromSL(fromPA)
 */
export interface ClimbPerformance {
  /** Pressure altitude in feet (typical: 0, 2000, 4000, 6000, 8000, 10000, 12000) */
  pressureAltitude: number;

  /** Outside Air Temperature in °C (varies by POH: 0,10,20,30,40 or 0,20,40 etc.) */
  oat: number;

  /** Cumulative time from Sea Level (minutes) */
  timeFromSL: number;

  /** Cumulative fuel from Sea Level (gallons) */
  fuelFromSL: number;

  /** Cumulative distance from Sea Level (NM) */
  distanceFromSL: number;
}

/* -------------------------------------------------------------------------- */
/*                        CRUISE PERFORMANCE TABLE                            */
/* -------------------------------------------------------------------------- */

export interface CruisePerformance {
  /** Pressure altitude (ft) */
  altitude: number;

  /** RPM setting at cruise */
  rpm: number;

  /** Percent of maximum engine power */
  percentPower: number;

  /** True Airspeed at cruise (KTAS) */
  tas: number;

  /** Fuel flow at cruise (gallons per hour) */
  fuelFlow: number;
}

/* -------------------------------------------------------------------------- */
/*                               ENGINE DATA                                  */
/* -------------------------------------------------------------------------- */

/**
 * Engine specifications and optional generic consumption model.
 */
export interface EngineData {
  /** Engine type/model (e.g., "Continental O-200-A") */
  type: string;

  /** Maximum RPM allowed */
  maxRPM: number;

  /** Engine rated horsepower */
  ratedHP: number;

  /**
   * Specific fuel consumption (lbs/hp/hr).
   * Useful for fallback calculations when table data is insufficient.
   */
  specificFuelConsumption?: number;

  /** Usable fuel in gallons */
  usableFuelGallons: number;
}

/* -------------------------------------------------------------------------- */
/*                                LIMITATIONS                                  */
/* -------------------------------------------------------------------------- */

/**
 * Aircraft limitations such as V-speeds.
 */
export interface AircraftLimits {
  /** Never exceed speed (KIAS) */
  vne: number;

  /** Maximum structural cruising speed (KIAS) */
  vno: number;

  /** Maneuvering speed (KIAS) */
  va: number;

  /** Max flap extended speed (KIAS) */
  vfe: number;

  /** Stall speed clean (KIAS) */
  vs: number;

  /** Stall speed landing configuration (KIAS) */
  vs0: number;

  /** Demonstrated crosswind component (kts) — not a limitation */
  maxCrosswind?: number;

  /** Maximum lift coefficient in clean configuration (no flaps) */
  clMaxClean?: number;

  /** Maximum lift coefficient with takeoff/approach flaps */
  clMaxTakeoff?: number;

  /** Maximum lift coefficient with landing flaps */
  clMaxLanding?: number;
}

/* -------------------------------------------------------------------------- */
/*                           TAKEOFF & LANDING TABLES                          */
/* -------------------------------------------------------------------------- */

export interface TakeoffPerformance {
  /** Pressure altitude (ft) */
  altitude: number;

  /** Outside Air Temperature (°C) */
  oat: number;

  /** Ground roll distance (ft) */
  groundRoll: number;

  /** Total distance over 50 ft obstacle (ft) */
  over50ft: number;
}

export interface LandingPerformance {
  /** Pressure altitude (ft) */
  altitude: number;

  /** Outside Air Temperature (°C) */
  oat: number;

  /** Ground roll distance (ft) */
  groundRoll: number;

  /** Total distance over 50 ft obstacle (ft) */
  over50ft: number;
}

/* -------------------------------------------------------------------------- */
/*                         COMPASS DEVIATION TABLE                            */
/* -------------------------------------------------------------------------- */

/**
 * Compass deviation entry for user-created aircraft.
 * Maps magnetic heading to compass heading.
 */
export interface DeviationEntry {
  /** Magnetic heading to fly */
  forHeading: number;

  /** Compass heading to steer */
  steerHeading: number;
}
