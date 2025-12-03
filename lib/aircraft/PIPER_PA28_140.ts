import { AircraftPerformance } from "./types";

export const PIPER_PA28_140: AircraftPerformance = {
  name: "Piper PA-28-140 Cherokee",
  model: "PA28-140",

  description: "The Piper PA-28-140 Cherokee is a four-seat light aircraft produced from 1964 to 1977. Part of the highly successful PA-28 family, it features a low-wing design with a Lycoming O-320 engine producing 140 HP. Known for its stable handling and economical operation, it became one of the most popular training and personal aircraft of its era.",

  wikipediaUrl: "https://en.wikipedia.org/wiki/Piper_PA-28_Cherokee",

  weights: {
    emptyWeight: 1180, // lbs typical for PA-28-140 (4-seat config)
    standardWeight: 2150, // performance tables at MTOW
    maxGrossWeight: 2150, // lbs (4-seat certification)
  },

  // Cumulative climb performance from Sea Level (POH-style)
  // Based on Piper PA-28-140 Cherokee POH
  climbTable: [
    // 0°C
    { pressureAltitude: 0, oat: 0, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 0, timeFromSL: 3, fuelFromSL: 0.6, distanceFromSL: 4 },
    { pressureAltitude: 4000, oat: 0, timeFromSL: 7, fuelFromSL: 1.3, distanceFromSL: 9 },
    { pressureAltitude: 6000, oat: 0, timeFromSL: 12, fuelFromSL: 2.1, distanceFromSL: 15 },
    { pressureAltitude: 8000, oat: 0, timeFromSL: 18, fuelFromSL: 3.1, distanceFromSL: 23 },
    { pressureAltitude: 10000, oat: 0, timeFromSL: 26, fuelFromSL: 4.4, distanceFromSL: 34 },
    { pressureAltitude: 12000, oat: 0, timeFromSL: 36, fuelFromSL: 5.9, distanceFromSL: 48 },
    // 20°C
    { pressureAltitude: 0, oat: 20, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 20, timeFromSL: 4, fuelFromSL: 0.7, distanceFromSL: 5 },
    { pressureAltitude: 4000, oat: 20, timeFromSL: 9, fuelFromSL: 1.6, distanceFromSL: 11 },
    { pressureAltitude: 6000, oat: 20, timeFromSL: 15, fuelFromSL: 2.7, distanceFromSL: 19 },
    { pressureAltitude: 8000, oat: 20, timeFromSL: 23, fuelFromSL: 4.0, distanceFromSL: 30 },
    { pressureAltitude: 10000, oat: 20, timeFromSL: 33, fuelFromSL: 5.6, distanceFromSL: 44 },
    { pressureAltitude: 12000, oat: 20, timeFromSL: 47, fuelFromSL: 7.6, distanceFromSL: 63 },
    // 40°C
    { pressureAltitude: 0, oat: 40, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 40, timeFromSL: 5, fuelFromSL: 0.9, distanceFromSL: 6 },
    { pressureAltitude: 4000, oat: 40, timeFromSL: 12, fuelFromSL: 2.1, distanceFromSL: 15 },
    { pressureAltitude: 6000, oat: 40, timeFromSL: 20, fuelFromSL: 3.6, distanceFromSL: 26 },
    { pressureAltitude: 8000, oat: 40, timeFromSL: 32, fuelFromSL: 5.5, distanceFromSL: 42 },
    { pressureAltitude: 10000, oat: 40, timeFromSL: 48, fuelFromSL: 8.0, distanceFromSL: 64 },
  ],

  cruiseTable: [
    {
      altitude: 2000,
      rpm: 2500,
      percentPower: 75,
      tas: 109, // KTAS approx at 75%
      fuelFlow: 9.0, // gph
    },
    {
      altitude: 4000,
      rpm: 2500,
      percentPower: 75,
      tas: 111,
      fuelFlow: 9.0,
    },
    {
      altitude: 6000,
      rpm: 2500,
      percentPower: 75,
      tas: 113,
      fuelFlow: 9.0,
    },
    {
      altitude: 8000,
      rpm: 2500,
      percentPower: 75,
      tas: 115,
      fuelFlow: 9.0,
    },
    {
      altitude: 2000,
      rpm: 2350,
      percentPower: 65,
      tas: 102, // KTAS approx at 65%
      fuelFlow: 7.5, // gph
    },
    {
      altitude: 4000,
      rpm: 2350,
      percentPower: 65,
      tas: 104,
      fuelFlow: 7.5,
    },
    {
      altitude: 6000,
      rpm: 2350,
      percentPower: 65,
      tas: 106,
      fuelFlow: 7.5,
    },
    {
      altitude: 8000,
      rpm: 2350,
      percentPower: 65,
      tas: 108,
      fuelFlow: 7.5,
    },
  ],

  engine: {
    type: "Lycoming O-320-E2A",
    maxRPM: 2700,
    ratedHP: 150, // hp
    specificFuelConsumption: 0.42, // lbs/hp/hr typical for O-320
    usableFuelGallons: 48, // gallons (50 total - 2 unusable)
  },

  limits: {
    vne: 147, // KIAS
    vno: 120, // KIAS
    va: 112, // KIAS at 2150 lbs
    vfe: 98, // KIAS (full flaps)
    vs: 55, // KIAS clean
    vs0: 47, // KIAS landing config
    maxCrosswind: 17, // kts demonstrated
    clMaxClean: 1.42, // Clean configuration
    clMaxTakeoff: 1.62, // Takeoff/approach flaps
    clMaxLanding: 1.75, // Full landing flaps
  },

  /** ------------------------------------------------------------------
   *  SERVICE CEILING
   *  Maximum altitude where aircraft can maintain 100 fpm climb
   *  ------------------------------------------------------------------*/
  serviceCeiling: 14300, // ft pressure altitude

  /** ------------------------------------------------------------------
   *  TAKEOFF PERFORMANCE TABLE
   *  Based on Piper PA-28-140 POH data at gross weight (2,150 lbs)
   *  Conditions: Flaps up, full throttle, paved level runway, zero wind
   *  ------------------------------------------------------------------*/
  takeoffTable: [
    // Sea level
    { altitude: 0, oat: 0, groundRoll: 710, over50ft: 1510 },
    { altitude: 0, oat: 10, groundRoll: 755, over50ft: 1605 },
    { altitude: 0, oat: 20, groundRoll: 800, over50ft: 1700 },
    { altitude: 0, oat: 30, groundRoll: 850, over50ft: 1805 },
    { altitude: 0, oat: 40, groundRoll: 905, over50ft: 1925 },

    // 2,000 ft PA
    { altitude: 2000, oat: 0, groundRoll: 820, over50ft: 1745 },
    { altitude: 2000, oat: 10, groundRoll: 875, over50ft: 1865 },
    { altitude: 2000, oat: 20, groundRoll: 935, over50ft: 1990 },
    { altitude: 2000, oat: 30, groundRoll: 1000, over50ft: 2130 },
    { altitude: 2000, oat: 40, groundRoll: 1070, over50ft: 2285 },

    // 4,000 ft PA
    { altitude: 4000, oat: 0, groundRoll: 950, over50ft: 2030 },
    { altitude: 4000, oat: 10, groundRoll: 1020, over50ft: 2180 },
    { altitude: 4000, oat: 20, groundRoll: 1095, over50ft: 2340 },
    { altitude: 4000, oat: 30, groundRoll: 1180, over50ft: 2525 },
    { altitude: 4000, oat: 40, groundRoll: 1275, over50ft: 2730 },

    // 6,000 ft PA
    { altitude: 6000, oat: 0, groundRoll: 1105, over50ft: 2380 },
    { altitude: 6000, oat: 10, groundRoll: 1195, over50ft: 2575 },
    { altitude: 6000, oat: 20, groundRoll: 1295, over50ft: 2795 },
    { altitude: 6000, oat: 30, groundRoll: 1410, over50ft: 3050 },
    { altitude: 6000, oat: 40, groundRoll: 1540, over50ft: 3340 },

    // 8,000 ft PA
    { altitude: 8000, oat: 0, groundRoll: 1300, over50ft: 2825 },
    { altitude: 8000, oat: 10, groundRoll: 1420, over50ft: 3090 },
    { altitude: 8000, oat: 20, groundRoll: 1560, over50ft: 3400 },
    { altitude: 8000, oat: 30, groundRoll: 1720, over50ft: 3755 },
  ],
};
