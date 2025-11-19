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
  },
};
