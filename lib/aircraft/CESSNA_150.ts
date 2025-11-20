import type { AircraftPerformance } from "./types";

export const CESSNA_150: AircraftPerformance = {
  name: "Cessna 150",
  model: "C150",

  /** ------------------------------------------------------------------
   *  WEIGHTS
   *  ------------------------------------------------------------------*/
  weights: {
    /**
     * Empty weight (lbs)
     * Typical operational empty weight for a C150.
     */
    emptyWeight: 1100,

    /**
     * Standard weight used for performance tables (lbs)
     * If the POH tables assume a standard weight, set it here.
     */
    standardWeight: 1500,

    /**
     * Maximum gross weight (lbs)
     */
    maxGrossWeight: 1600,
  },

  /** ------------------------------------------------------------------
   *  CLIMB PERFORMANCE TABLE
   *  Rate of climb varies with density altitude.
   *  Values are approximate based on POH tables.
   *  ------------------------------------------------------------------*/
  climbTable: [
    {
      altitudeFrom: 0,
      altitudeTo: 2000,
      rateOfClimb: 670,   // fpm
      climbTAS: 70,       // KTAS (Vy ~ 67 KIAS)
      fuelFlow: 6.0,      // gph
    },
    {
      altitudeFrom: 2000,
      altitudeTo: 4000,
      rateOfClimb: 620,
      climbTAS: 70,
      fuelFlow: 6.0,
    },
    {
      altitudeFrom: 4000,
      altitudeTo: 6000,
      rateOfClimb: 530,
      climbTAS: 71,
      fuelFlow: 6.0,
    },
    {
      altitudeFrom: 6000,
      altitudeTo: 8000,
      rateOfClimb: 430,
      climbTAS: 72,
      fuelFlow: 6.0,
    },
    {
      altitudeFrom: 8000,
      altitudeTo: 10000,
      rateOfClimb: 300,
      climbTAS: 73,
      fuelFlow: 6.0,
    },
  ],

  /** ------------------------------------------------------------------
   *  CRUISE PERFORMANCE TABLE
   *  Based on % power vs altitude at typical cruise settings.
   *  ------------------------------------------------------------------*/
  cruiseTable: [
    {
      altitude: 3000,
      rpm: 2550,
      percentPower: 75,
      tas: 104,      // KTAS
      fuelFlow: 6.4, // gph
    },
    {
      altitude: 5000,
      rpm: 2550,
      percentPower: 75,
      tas: 106,
      fuelFlow: 6.4,
    },
    {
      altitude: 7000,
      rpm: 2550,
      percentPower: 75,
      tas: 107,
      fuelFlow: 6.4,
    },
    {
      altitude: 5000,
      rpm: 2450,
      percentPower: 65,
      tas: 98,
      fuelFlow: 5.8,
    },
    {
      altitude: 7000,
      rpm: 2450,
      percentPower: 65,
      tas: 100,
      fuelFlow: 5.8,
    },
  ],

  /** ------------------------------------------------------------------
   *  ENGINE DATA (Continental O-200-A)
   *  ------------------------------------------------------------------*/
  engine: {
    type: "Continental O-200-A",
    maxRPM: 2750,
    ratedHP: 100,

    /**
     * Fuel consumption model
     * Optional: used if you want a general fallback function
     * when the cruise table does not cover a given combination.
     */
    specificFuelConsumption: 0.065, // lbs/hp/hr (approx)

    usableFuelGallons: 26,
  },

  /** ------------------------------------------------------------------
   *  AIRPLANE LIMITS (V-speeds, max winds, etc.)
   *  ------------------------------------------------------------------*/
  limits: {
    vne: 160,   // KIAS
    vno: 128,
    va: 97,
    vfe: 100,
    vs: 42,
    vs0: 38,

    /**
     * Crosswind demonstrated (not a limit)
     */
    maxCrosswind: 12, // knots

    /**
     * Maximum lift coefficients for stall speed calculations
     * Estimated based on typical C150 aerodynamic characteristics
     */
    clMaxClean: 1.45,      // Clean configuration
    clMaxTakeoff: 1.65,    // Takeoff/approach flaps
    clMaxLanding: 1.80,    // Full landing flaps
  },

  /** ------------------------------------------------------------------
   *  SERVICE CEILING
   *  Maximum altitude where aircraft can maintain 100 fpm climb
   *  ------------------------------------------------------------------*/
  serviceCeiling: 14000, // ft pressure altitude

  /** ------------------------------------------------------------------
   *  TAKEOFF PERFORMANCE TABLE
   *  Based on Cessna 150M POH data at maximum gross weight (1,600 lbs)
   *  Conditions: Flaps up, full throttle prior to brake release,
   *  paved level runway, zero wind
   *  ------------------------------------------------------------------*/
  takeoffTable: [
    // Sea level
    { altitude: 0, oat: 0, groundRoll: 710, over50ft: 1340 },
    { altitude: 0, oat: 10, groundRoll: 735, over50ft: 1385 },
    { altitude: 0, oat: 20, groundRoll: 760, over50ft: 1435 },
    { altitude: 0, oat: 30, groundRoll: 790, over50ft: 1490 },
    { altitude: 0, oat: 40, groundRoll: 825, over50ft: 1555 },

    // 1,000 ft PA
    { altitude: 1000, oat: 0, groundRoll: 745, over50ft: 1410 },
    { altitude: 1000, oat: 10, groundRoll: 775, over50ft: 1465 },
    { altitude: 1000, oat: 20, groundRoll: 805, over50ft: 1520 },
    { altitude: 1000, oat: 30, groundRoll: 840, over50ft: 1590 },
    { altitude: 1000, oat: 40, groundRoll: 875, over50ft: 1660 },

    // 2,500 ft PA
    { altitude: 2500, oat: 0, groundRoll: 805, over50ft: 1540 },
    { altitude: 2500, oat: 10, groundRoll: 840, over50ft: 1605 },
    { altitude: 2500, oat: 20, groundRoll: 875, over50ft: 1675 },
    { altitude: 2500, oat: 30, groundRoll: 915, over50ft: 1750 },
    { altitude: 2500, oat: 40, groundRoll: 960, over50ft: 1835 },

    // 5,000 ft PA
    { altitude: 5000, oat: 0, groundRoll: 920, over50ft: 1785 },
    { altitude: 5000, oat: 10, groundRoll: 965, over50ft: 1870 },
    { altitude: 5000, oat: 20, groundRoll: 1015, over50ft: 1965 },
    { altitude: 5000, oat: 30, groundRoll: 1070, over50ft: 2070 },
    { altitude: 5000, oat: 40, groundRoll: 1130, over50ft: 2190 },

    // 7,500 ft PA
    { altitude: 7500, oat: 0, groundRoll: 1090, over50ft: 2145 },
    { altitude: 7500, oat: 10, groundRoll: 1150, over50ft: 2265 },
    { altitude: 7500, oat: 20, groundRoll: 1220, over50ft: 2405 },
    { altitude: 7500, oat: 30, groundRoll: 1300, over50ft: 2565 },
    { altitude: 7500, oat: 40, groundRoll: 1390, over50ft: 2745 },

    // 10,000 ft PA
    { altitude: 10000, oat: 0, groundRoll: 1330, over50ft: 2650 },
    { altitude: 10000, oat: 10, groundRoll: 1420, over50ft: 2830 },
    { altitude: 10000, oat: 20, groundRoll: 1525, over50ft: 3045 },
  ],
};
