import { AircraftPerformance } from "./types";

export const CESSNA_152: AircraftPerformance = {
  name: "Cessna 152",
  model: "C152",

  weights: {
    emptyWeight: 1081, // lbs typical for C152
    standardWeight: 1670, // performance tables at MTOW
    maxGrossWeight: 1670, // lbs (C152 standard)
  },

  climbTable: [
    {
      altitudeFrom: 0,
      altitudeTo: 2000,
      rateOfClimb: 715, // fpm @ SL per POH
      climbTAS: 67, // KTAS (Vy ~ 67 KIAS)
      fuelFlow: 6.5, // gph at climb power
    },
    {
      altitudeFrom: 2000,
      altitudeTo: 4000,
      rateOfClimb: 650,
      climbTAS: 68,
      fuelFlow: 6.5,
    },
    {
      altitudeFrom: 4000,
      altitudeTo: 6000,
      rateOfClimb: 580,
      climbTAS: 69,
      fuelFlow: 6.5,
    },
    {
      altitudeFrom: 6000,
      altitudeTo: 8000,
      rateOfClimb: 500,
      climbTAS: 70,
      fuelFlow: 6.5,
    },
    {
      altitudeFrom: 8000,
      altitudeTo: 10000,
      rateOfClimb: 410,
      climbTAS: 71,
      fuelFlow: 6.5,
    },
    {
      altitudeFrom: 10000,
      altitudeTo: 12000,
      rateOfClimb: 310,
      climbTAS: 72,
      fuelFlow: 6.5,
    },
  ],

  cruiseTable: [
    {
      altitude: 2000,
      rpm: 2550,
      percentPower: 75,
      tas: 101, // KTAS approx at 75%
      fuelFlow: 6.2, // gph
    },
    {
      altitude: 4000,
      rpm: 2550,
      percentPower: 75,
      tas: 103,
      fuelFlow: 6.2,
    },
    {
      altitude: 6000,
      rpm: 2550,
      percentPower: 75,
      tas: 105,
      fuelFlow: 6.2,
    },
    {
      altitude: 8000,
      rpm: 2550,
      percentPower: 75,
      tas: 106,
      fuelFlow: 6.2,
    },
    {
      altitude: 2000,
      rpm: 2400,
      percentPower: 65,
      tas: 95, // KTAS approx at 65%
      fuelFlow: 5.5, // gph
    },
    {
      altitude: 4000,
      rpm: 2400,
      percentPower: 65,
      tas: 97,
      fuelFlow: 5.5,
    },
    {
      altitude: 6000,
      rpm: 2400,
      percentPower: 65,
      tas: 99,
      fuelFlow: 5.5,
    },
    {
      altitude: 8000,
      rpm: 2400,
      percentPower: 65,
      tas: 100,
      fuelFlow: 5.5,
    },
  ],

  engine: {
    type: "Lycoming O-235-L2C",
    maxRPM: 2550,
    ratedHP: 110, // hp (some late models have O-235-N2C with 108 hp)
    specificFuelConsumption: 0.45, // lbs/hp/hr typical for O-235
    usableFuelGallons: 24.5, // gallons (standard tanks, 26 total - 1.5 unusable)
  },

  limits: {
    vne: 149, // KIAS
    vno: 111, // KIAS
    va: 104, // KIAS at 1670 lbs
    vfe: 85, // KIAS (full flaps)
    vs: 40, // KIAS clean
    vs0: 35, // KIAS landing config
    maxCrosswind: 12, // kts demonstrated
    clMaxClean: 1.48, // Clean configuration
    clMaxTakeoff: 1.68, // Takeoff/approach flaps
    clMaxLanding: 1.82, // Full landing flaps
  },

  /** ------------------------------------------------------------------
   *  SERVICE CEILING
   *  Maximum altitude where aircraft can maintain 100 fpm climb
   *  ------------------------------------------------------------------*/
  serviceCeiling: 14700, // ft pressure altitude

  /** ------------------------------------------------------------------
   *  TAKEOFF PERFORMANCE TABLE
   *  Based on Cessna 152 POH data at gross weight (1,670 lbs)
   *  Conditions: Flaps up, full throttle, paved level runway, zero wind
   *  ------------------------------------------------------------------*/
  takeoffTable: [
    // Sea level
    { altitude: 0, oat: 0, groundRoll: 640, over50ft: 1185 },
    { altitude: 0, oat: 10, groundRoll: 680, over50ft: 1260 },
    { altitude: 0, oat: 20, groundRoll: 725, over50ft: 1340 },
    { altitude: 0, oat: 30, groundRoll: 775, over50ft: 1430 },
    { altitude: 0, oat: 40, groundRoll: 830, over50ft: 1535 },

    // 2,000 ft PA
    { altitude: 2000, oat: 0, groundRoll: 740, over50ft: 1375 },
    { altitude: 2000, oat: 10, groundRoll: 790, over50ft: 1470 },
    { altitude: 2000, oat: 20, groundRoll: 845, over50ft: 1570 },
    { altitude: 2000, oat: 30, groundRoll: 910, over50ft: 1690 },
    { altitude: 2000, oat: 40, groundRoll: 980, over50ft: 1825 },

    // 4,000 ft PA
    { altitude: 4000, oat: 0, groundRoll: 860, over50ft: 1610 },
    { altitude: 4000, oat: 10, groundRoll: 925, over50ft: 1735 },
    { altitude: 4000, oat: 20, groundRoll: 1000, over50ft: 1875 },
    { altitude: 4000, oat: 30, groundRoll: 1085, over50ft: 2040 },
    { altitude: 4000, oat: 40, groundRoll: 1180, over50ft: 2225 },

    // 6,000 ft PA
    { altitude: 6000, oat: 0, groundRoll: 1005, over50ft: 1905 },
    { altitude: 6000, oat: 10, groundRoll: 1090, over50ft: 2070 },
    { altitude: 6000, oat: 20, groundRoll: 1185, over50ft: 2255 },
    { altitude: 6000, oat: 30, groundRoll: 1295, over50ft: 2470 },
    { altitude: 6000, oat: 40, groundRoll: 1425, over50ft: 2720 },

    // 8,000 ft PA
    { altitude: 8000, oat: 0, groundRoll: 1190, over50ft: 2285 },
    { altitude: 8000, oat: 10, groundRoll: 1300, over50ft: 2500 },
    { altitude: 8000, oat: 20, groundRoll: 1430, over50ft: 2755 },
    { altitude: 8000, oat: 30, groundRoll: 1580, over50ft: 3050 },
  ],
};
