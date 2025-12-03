import { AircraftPerformance } from "./types";

export const DIAMOND_DA40: AircraftPerformance = {
  name: "Diamond DA40 Star",
  model: "DA40",

  description: "The Diamond DA40 Star is a four-seat single-engine aircraft produced since 1997 by Diamond Aircraft. It features an all-composite airframe, excellent visibility with a large canopy, and modern aerodynamics. Available with gasoline (Lycoming IO-360) or diesel (Austro AE300) engines, it's popular with flight schools for its safety features, fuel efficiency, and modern cockpit design.",

  wikipediaUrl: "https://en.wikipedia.org/wiki/Diamond_DA40",

  weights: {
    emptyWeight: 1746, // lbs typical for DA40 with IO-360
    standardWeight: 2646, // performance tables at MTOW
    maxGrossWeight: 2646, // lbs
  },

  // Cumulative climb performance from Sea Level (POH-style)
  // Based on Diamond DA40 POH
  climbTable: [
    // 0°C
    { pressureAltitude: 0, oat: 0, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 0, timeFromSL: 2, fuelFromSL: 0.4, distanceFromSL: 3 },
    { pressureAltitude: 4000, oat: 0, timeFromSL: 4, fuelFromSL: 0.9, distanceFromSL: 6 },
    { pressureAltitude: 6000, oat: 0, timeFromSL: 7, fuelFromSL: 1.5, distanceFromSL: 10 },
    { pressureAltitude: 8000, oat: 0, timeFromSL: 10, fuelFromSL: 2.1, distanceFromSL: 15 },
    { pressureAltitude: 10000, oat: 0, timeFromSL: 14, fuelFromSL: 2.9, distanceFromSL: 21 },
    { pressureAltitude: 12000, oat: 0, timeFromSL: 19, fuelFromSL: 3.9, distanceFromSL: 29 },
    // 20°C
    { pressureAltitude: 0, oat: 20, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 20, timeFromSL: 3, fuelFromSL: 0.5, distanceFromSL: 4 },
    { pressureAltitude: 4000, oat: 20, timeFromSL: 5, fuelFromSL: 1.1, distanceFromSL: 8 },
    { pressureAltitude: 6000, oat: 20, timeFromSL: 9, fuelFromSL: 1.8, distanceFromSL: 13 },
    { pressureAltitude: 8000, oat: 20, timeFromSL: 13, fuelFromSL: 2.6, distanceFromSL: 19 },
    { pressureAltitude: 10000, oat: 20, timeFromSL: 18, fuelFromSL: 3.6, distanceFromSL: 27 },
    { pressureAltitude: 12000, oat: 20, timeFromSL: 24, fuelFromSL: 4.8, distanceFromSL: 37 },
    // 40°C
    { pressureAltitude: 0, oat: 40, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 40, timeFromSL: 4, fuelFromSL: 0.7, distanceFromSL: 5 },
    { pressureAltitude: 4000, oat: 40, timeFromSL: 8, fuelFromSL: 1.5, distanceFromSL: 11 },
    { pressureAltitude: 6000, oat: 40, timeFromSL: 12, fuelFromSL: 2.4, distanceFromSL: 18 },
    { pressureAltitude: 8000, oat: 40, timeFromSL: 18, fuelFromSL: 3.5, distanceFromSL: 27 },
    { pressureAltitude: 10000, oat: 40, timeFromSL: 25, fuelFromSL: 4.9, distanceFromSL: 38 },
  ],

  cruiseTable: [
    {
      altitude: 3000,
      rpm: 2400,
      percentPower: 75,
      tas: 140, // KTAS approx at 75%
      fuelFlow: 10.0, // gph
    },
    {
      altitude: 5000,
      rpm: 2400,
      percentPower: 75,
      tas: 143,
      fuelFlow: 10.0,
    },
    {
      altitude: 7000,
      rpm: 2400,
      percentPower: 75,
      tas: 146,
      fuelFlow: 10.0,
    },
    {
      altitude: 9000,
      rpm: 2400,
      percentPower: 75,
      tas: 148,
      fuelFlow: 10.0,
    },
    {
      altitude: 3000,
      rpm: 2200,
      percentPower: 65,
      tas: 130, // KTAS approx at 65%
      fuelFlow: 8.5, // gph (best economy)
    },
    {
      altitude: 5000,
      rpm: 2200,
      percentPower: 65,
      tas: 132,
      fuelFlow: 8.5,
    },
    {
      altitude: 7000,
      rpm: 2200,
      percentPower: 65,
      tas: 135,
      fuelFlow: 8.5,
    },
    {
      altitude: 9000,
      rpm: 2200,
      percentPower: 65,
      tas: 137,
      fuelFlow: 8.5,
    },
  ],

  engine: {
    type: "Lycoming IO-360-M1A",
    maxRPM: 2700,
    ratedHP: 180, // hp (fuel injected)
    specificFuelConsumption: 0.42, // lbs/hp/hr typical for IO-360
    usableFuelGallons: 50, // gallons usable
  },

  limits: {
    vne: 178, // KIAS
    vno: 129, // KIAS
    va: 108, // KIAS at max gross weight
    vfe: 108, // KIAS (takeoff flaps), 91 KIAS (landing flaps)
    vs: 55, // KIAS clean
    vs0: 49, // KIAS landing config (full flaps)
    maxCrosswind: 20, // kts demonstrated
    clMaxClean: 1.42, // Clean configuration
    clMaxTakeoff: 1.62, // Takeoff flaps
    clMaxLanding: 1.75, // Landing flaps
  },

  /** ------------------------------------------------------------------
   *  SERVICE CEILING
   *  Maximum altitude where aircraft can maintain 100 fpm climb
   *  ------------------------------------------------------------------*/
  serviceCeiling: 16400, // ft pressure altitude

  /** ------------------------------------------------------------------
   *  TAKEOFF PERFORMANCE TABLE
   *  Based on Diamond DA40 POH data at gross weight (2,646 lbs)
   *  Conditions: Takeoff flaps, full throttle, paved level runway, zero wind
   *  Note: Composite aircraft with excellent climb performance
   *  ------------------------------------------------------------------*/
  takeoffTable: [
    // Sea level
    { altitude: 0, oat: 0, groundRoll: 885, over50ft: 1285 },
    { altitude: 0, oat: 10, groundRoll: 940, over50ft: 1365 },
    { altitude: 0, oat: 20, groundRoll: 1000, over50ft: 1450 },
    { altitude: 0, oat: 30, groundRoll: 1065, over50ft: 1545 },
    { altitude: 0, oat: 40, groundRoll: 1135, over50ft: 1645 },

    // 2,000 ft PA
    { altitude: 2000, oat: 0, groundRoll: 1025, over50ft: 1490 },
    { altitude: 2000, oat: 10, groundRoll: 1095, over50ft: 1590 },
    { altitude: 2000, oat: 20, groundRoll: 1170, over50ft: 1700 },
    { altitude: 2000, oat: 30, groundRoll: 1250, over50ft: 1815 },
    { altitude: 2000, oat: 40, groundRoll: 1340, over50ft: 1945 },

    // 4,000 ft PA
    { altitude: 4000, oat: 0, groundRoll: 1195, over50ft: 1740 },
    { altitude: 4000, oat: 10, groundRoll: 1280, over50ft: 1865 },
    { altitude: 4000, oat: 20, groundRoll: 1375, over50ft: 2000 },
    { altitude: 4000, oat: 30, groundRoll: 1480, over50ft: 2155 },
    { altitude: 4000, oat: 40, groundRoll: 1595, over50ft: 2325 },

    // 6,000 ft PA
    { altitude: 6000, oat: 0, groundRoll: 1405, over50ft: 2050 },
    { altitude: 6000, oat: 10, groundRoll: 1510, over50ft: 2205 },
    { altitude: 6000, oat: 20, groundRoll: 1630, over50ft: 2380 },
    { altitude: 6000, oat: 30, groundRoll: 1765, over50ft: 2575 },
    { altitude: 6000, oat: 40, groundRoll: 1915, over50ft: 2795 },

    // 8,000 ft PA
    { altitude: 8000, oat: 0, groundRoll: 1665, over50ft: 2435 },
    { altitude: 8000, oat: 10, groundRoll: 1805, over50ft: 2640 },
    { altitude: 8000, oat: 20, groundRoll: 1965, over50ft: 2875 },
    { altitude: 8000, oat: 30, groundRoll: 2145, over50ft: 3140 },
  ],
};
