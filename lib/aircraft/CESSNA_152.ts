import { AircraftPerformance } from "./types";

export const CESSNA_152: AircraftPerformance = {
  name: "Cessna 152",
  model: "C152",

  description: "The Cessna 152 is a two-seat tricycle gear general aviation airplane produced from 1977 to 1985. It replaced the Cessna 150 and features a Lycoming O-235 engine, improved aerodynamics, and a 28-volt electrical system. With over 7,500 units built, it remains one of the most popular flight training aircraft worldwide, prized for its reliability and economy.",

  wikipediaUrl: "https://en.wikipedia.org/wiki/Cessna_152",

  weights: {
    emptyWeight: 1081, // lbs typical for C152
    standardWeight: 1670, // performance tables at MTOW
    maxGrossWeight: 1670, // lbs (C152 standard)
  },

  // Cumulative climb performance from Sea Level (POH-style)
  // Based on Cessna 152 POH Section 5
  climbTable: [
    // 0°C
    { pressureAltitude: 0, oat: 0, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 0, timeFromSL: 3, fuelFromSL: 0.3, distanceFromSL: 3 },
    { pressureAltitude: 4000, oat: 0, timeFromSL: 6, fuelFromSL: 0.6, distanceFromSL: 6 },
    { pressureAltitude: 6000, oat: 0, timeFromSL: 10, fuelFromSL: 1.0, distanceFromSL: 11 },
    { pressureAltitude: 8000, oat: 0, timeFromSL: 15, fuelFromSL: 1.6, distanceFromSL: 17 },
    { pressureAltitude: 10000, oat: 0, timeFromSL: 22, fuelFromSL: 2.3, distanceFromSL: 25 },
    { pressureAltitude: 12000, oat: 0, timeFromSL: 31, fuelFromSL: 3.3, distanceFromSL: 36 },
    // 20°C
    { pressureAltitude: 0, oat: 20, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 20, timeFromSL: 4, fuelFromSL: 0.4, distanceFromSL: 4 },
    { pressureAltitude: 4000, oat: 20, timeFromSL: 8, fuelFromSL: 0.8, distanceFromSL: 8 },
    { pressureAltitude: 6000, oat: 20, timeFromSL: 13, fuelFromSL: 1.3, distanceFromSL: 14 },
    { pressureAltitude: 8000, oat: 20, timeFromSL: 19, fuelFromSL: 2.0, distanceFromSL: 21 },
    { pressureAltitude: 10000, oat: 20, timeFromSL: 28, fuelFromSL: 2.9, distanceFromSL: 32 },
    { pressureAltitude: 12000, oat: 20, timeFromSL: 40, fuelFromSL: 4.2, distanceFromSL: 47 },
    // 40°C
    { pressureAltitude: 0, oat: 40, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 40, timeFromSL: 5, fuelFromSL: 0.5, distanceFromSL: 5 },
    { pressureAltitude: 4000, oat: 40, timeFromSL: 10, fuelFromSL: 1.0, distanceFromSL: 11 },
    { pressureAltitude: 6000, oat: 40, timeFromSL: 17, fuelFromSL: 1.8, distanceFromSL: 19 },
    { pressureAltitude: 8000, oat: 40, timeFromSL: 26, fuelFromSL: 2.7, distanceFromSL: 30 },
    { pressureAltitude: 10000, oat: 40, timeFromSL: 40, fuelFromSL: 4.2, distanceFromSL: 46 },
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
