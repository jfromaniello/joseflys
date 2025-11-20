import { AircraftPerformance } from "./types";

export const PIPER_PA28R_200: AircraftPerformance = {
  name: "Piper PA-28R-200 Arrow",
  model: "PA28R-200",

  weights: {
    emptyWeight: 1627, // lbs typical for PA-28R-200 Arrow II
    standardWeight: 2750, // performance tables at MTOW
    maxGrossWeight: 2750, // lbs
  },

  climbTable: [
    {
      altitudeFrom: 0,
      altitudeTo: 2000,
      rateOfClimb: 831, // fpm @ SL per POH
      climbTAS: 95, // KTAS (Vy ~ 95 KIAS)
      fuelFlow: 14.0, // gph at climb power
    },
    {
      altitudeFrom: 2000,
      altitudeTo: 4000,
      rateOfClimb: 765,
      climbTAS: 96,
      fuelFlow: 13.5,
    },
    {
      altitudeFrom: 4000,
      altitudeTo: 6000,
      rateOfClimb: 695,
      climbTAS: 97,
      fuelFlow: 13.0,
    },
    {
      altitudeFrom: 6000,
      altitudeTo: 8000,
      rateOfClimb: 620,
      climbTAS: 98,
      fuelFlow: 12.5,
    },
    {
      altitudeFrom: 8000,
      altitudeTo: 10000,
      rateOfClimb: 540,
      climbTAS: 99,
      fuelFlow: 12.0,
    },
    {
      altitudeFrom: 10000,
      altitudeTo: 12000,
      rateOfClimb: 450,
      climbTAS: 100,
      fuelFlow: 11.5,
    },
  ],

  cruiseTable: [
    {
      altitude: 4000,
      rpm: 2500,
      percentPower: 75,
      tas: 133, // KTAS approx at 75%
      fuelFlow: 10.2, // gph
    },
    {
      altitude: 6000,
      rpm: 2500,
      percentPower: 75,
      tas: 136,
      fuelFlow: 10.2,
    },
    {
      altitude: 8000,
      rpm: 2500,
      percentPower: 75,
      tas: 139,
      fuelFlow: 10.2,
    },
    {
      altitude: 10000,
      rpm: 2500,
      percentPower: 75,
      tas: 141,
      fuelFlow: 10.2,
    },
    {
      altitude: 4000,
      rpm: 2350,
      percentPower: 65,
      tas: 126, // KTAS approx at 65%
      fuelFlow: 9.2, // gph
    },
    {
      altitude: 6000,
      rpm: 2350,
      percentPower: 65,
      tas: 128,
      fuelFlow: 9.2,
    },
    {
      altitude: 8000,
      rpm: 2350,
      percentPower: 65,
      tas: 131,
      fuelFlow: 9.2,
    },
    {
      altitude: 10000,
      rpm: 2350,
      percentPower: 65,
      tas: 133,
      fuelFlow: 9.2,
    },
  ],

  engine: {
    type: "Lycoming IO-360-C1C",
    maxRPM: 2700,
    ratedHP: 200, // hp (fuel injected)
    specificFuelConsumption: 0.42, // lbs/hp/hr typical for IO-360
    usableFuelGallons: 72, // gallons (77 total - 5 unusable)
  },

  limits: {
    vne: 186, // KIAS
    vno: 148, // KIAS
    va: 114, // KIAS at 2750 lbs
    vfe: 103, // KIAS (full flaps)
    vs: 60, // KIAS clean (gear down)
    vs0: 53, // KIAS landing config (gear down, full flaps)
    maxCrosswind: 17, // kts demonstrated
    clMaxClean: 1.42, // Clean configuration
    clMaxTakeoff: 1.62, // Takeoff/approach flaps
    clMaxLanding: 1.75, // Full landing flaps
  },

  /** ------------------------------------------------------------------
   *  SERVICE CEILING
   *  Maximum altitude where aircraft can maintain 100 fpm climb
   *  ------------------------------------------------------------------*/
  serviceCeiling: 16200, // ft pressure altitude

  /** ------------------------------------------------------------------
   *  TAKEOFF PERFORMANCE TABLE
   *  Based on Piper PA-28R-200 Arrow POH data at gross weight (2,750 lbs)
   *  Conditions: Flaps up, full throttle, paved level runway, zero wind
   *  ------------------------------------------------------------------*/
  takeoffTable: [
    // Sea level
    { altitude: 0, oat: 0, groundRoll: 585, over50ft: 1345 },
    { altitude: 0, oat: 10, groundRoll: 625, over50ft: 1430 },
    { altitude: 0, oat: 20, groundRoll: 665, over50ft: 1520 },
    { altitude: 0, oat: 30, groundRoll: 710, over50ft: 1620 },
    { altitude: 0, oat: 40, groundRoll: 760, over50ft: 1735 },

    // 2,000 ft PA
    { altitude: 2000, oat: 0, groundRoll: 680, over50ft: 1565 },
    { altitude: 2000, oat: 10, groundRoll: 730, over50ft: 1675 },
    { altitude: 2000, oat: 20, groundRoll: 780, over50ft: 1790 },
    { altitude: 2000, oat: 30, groundRoll: 840, over50ft: 1925 },
    { altitude: 2000, oat: 40, groundRoll: 905, over50ft: 2075 },

    // 4,000 ft PA
    { altitude: 4000, oat: 0, groundRoll: 795, over50ft: 1835 },
    { altitude: 4000, oat: 10, groundRoll: 855, over50ft: 1970 },
    { altitude: 4000, oat: 20, groundRoll: 925, over50ft: 2125 },
    { altitude: 4000, oat: 30, groundRoll: 1000, over50ft: 2300 },
    { altitude: 4000, oat: 40, groundRoll: 1085, over50ft: 2495 },

    // 6,000 ft PA
    { altitude: 6000, oat: 0, groundRoll: 935, over50ft: 2165 },
    { altitude: 6000, oat: 10, groundRoll: 1015, over50ft: 2345 },
    { altitude: 6000, oat: 20, groundRoll: 1105, over50ft: 2555 },
    { altitude: 6000, oat: 30, groundRoll: 1210, over50ft: 2795 },
    { altitude: 6000, oat: 40, groundRoll: 1330, over50ft: 3075 },

    // 8,000 ft PA
    { altitude: 8000, oat: 0, groundRoll: 1105, over50ft: 2570 },
    { altitude: 8000, oat: 10, groundRoll: 1210, over50ft: 2810 },
    { altitude: 8000, oat: 20, groundRoll: 1330, over50ft: 3090 },
    { altitude: 8000, oat: 30, groundRoll: 1475, over50ft: 3425 },
  ],
};
