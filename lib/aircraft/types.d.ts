/**
 * General aircraft performance model for planning, training and automation.
 */
export interface AircraftPerformance {
  /** Aircraft commercial name (e.g., "Cessna 150") */
  name: string;

  /** Short model code (e.g., "C150") */
  model: string;

  /** All relevant aircraft weights */
  weights: AircraftWeights;

  /** Climb performance tables grouped by altitude ranges */
  climbTable: ClimbPerformance[];

  /** Cruise performance tables at different altitudes and power settings */
  cruiseTable: CruisePerformance[];

  /** Engine performance and limits information */
  engine: EngineData;

  /** Airplane operating limitations (V-speeds, max wind, etc.) */
  limits: AircraftLimits;

  /** Optional takeoff performance table */
  takeoffTable?: TakeoffPerformance[];

  /** Optional landing performance table */
  landingTable?: LandingPerformance[];

  /** Optional compass deviation table (for user-created aircraft instances) */
  deviationTable?: DeviationEntry[];
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
 * Performance values for climb at a given altitude range.
 */
export interface ClimbPerformance {
  /** Altitude range start (ft) */
  altitudeFrom: number;

  /** Altitude range end (ft) */
  altitudeTo: number;

  /** Rate of climb in feet per minute */
  rateOfClimb: number;

  /** True Airspeed during climb (KTAS) */
  climbTAS: number;

  /** Fuel flow during climb (gallons per hour) */
  fuelFlow: number;
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
