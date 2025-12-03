import type { AircraftPerformance } from "./types";

export const CESSNA_150: AircraftPerformance = {
  name: "Cessna 150",
  model: "C150",

  description: "The Cessna 150 is a two-seat tricycle gear general aviation airplane produced by Cessna from 1959 to 1977. It was the most popular trainer aircraft in the world and remains widely used for flight training today. Over 23,000 units were built, making it one of the most produced aircraft in history. Known for its forgiving flight characteristics and low operating costs, it's an ideal platform for student pilots.",

  wikipediaUrl: "https://en.wikipedia.org/wiki/Cessna_150",

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
   *  Cumulative from Sea Level, indexed by Pressure Altitude × OAT
   *  Based on Cessna 150 POH Section 5
   *  ------------------------------------------------------------------*/
  climbTable: [
    // 0°C
    { pressureAltitude: 0, oat: 0, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 0, timeFromSL: 3, fuelFromSL: 0.3, distanceFromSL: 3 },
    { pressureAltitude: 4000, oat: 0, timeFromSL: 7, fuelFromSL: 0.7, distanceFromSL: 7 },
    { pressureAltitude: 6000, oat: 0, timeFromSL: 12, fuelFromSL: 1.2, distanceFromSL: 13 },
    { pressureAltitude: 8000, oat: 0, timeFromSL: 19, fuelFromSL: 1.9, distanceFromSL: 21 },
    { pressureAltitude: 10000, oat: 0, timeFromSL: 28, fuelFromSL: 2.8, distanceFromSL: 32 },
    // 20°C
    { pressureAltitude: 0, oat: 20, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 20, timeFromSL: 4, fuelFromSL: 0.4, distanceFromSL: 4 },
    { pressureAltitude: 4000, oat: 20, timeFromSL: 9, fuelFromSL: 0.9, distanceFromSL: 10 },
    { pressureAltitude: 6000, oat: 20, timeFromSL: 15, fuelFromSL: 1.5, distanceFromSL: 17 },
    { pressureAltitude: 8000, oat: 20, timeFromSL: 24, fuelFromSL: 2.4, distanceFromSL: 27 },
    { pressureAltitude: 10000, oat: 20, timeFromSL: 36, fuelFromSL: 3.6, distanceFromSL: 42 },
    // 40°C
    { pressureAltitude: 0, oat: 40, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 40, timeFromSL: 5, fuelFromSL: 0.5, distanceFromSL: 5 },
    { pressureAltitude: 4000, oat: 40, timeFromSL: 12, fuelFromSL: 1.2, distanceFromSL: 13 },
    { pressureAltitude: 6000, oat: 40, timeFromSL: 21, fuelFromSL: 2.1, distanceFromSL: 24 },
    { pressureAltitude: 8000, oat: 40, timeFromSL: 35, fuelFromSL: 3.5, distanceFromSL: 40 },
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
