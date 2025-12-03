import { AircraftPerformance } from "./types";

export const CESSNA_172N: AircraftPerformance = {
  name: "Cessna 172N Skyhawk",
  model: "C172N",

  description: "The Cessna 172 Skyhawk is the most produced aircraft in history with over 45,000 units built since 1956. The 172N model (1977-1980) features a Lycoming O-320-H2AD engine producing 160 HP. Known for its exceptional stability and forgiving flight characteristics, it's the world's most popular training and personal aircraft.",

  wikipediaUrl: "https://en.wikipedia.org/wiki/Cessna_172",

  weights: {
    emptyWeight: 1370, // lbs typical for 172N
    standardWeight: 2300, // performance tables at MTOW
    maxGrossWeight: 2300, // lbs (172N standard)
  },

  // Cumulative climb performance from Sea Level (POH-style)
  // Based on Cessna 172N POH Section 5, ISA conditions
  climbTable: [
    // 0°C (ISA-15)
    { pressureAltitude: 0, oat: 0, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 0, timeFromSL: 3, fuelFromSL: 0.5, distanceFromSL: 3 },
    { pressureAltitude: 4000, oat: 0, timeFromSL: 6, fuelFromSL: 1.1, distanceFromSL: 7 },
    { pressureAltitude: 6000, oat: 0, timeFromSL: 10, fuelFromSL: 1.8, distanceFromSL: 12 },
    { pressureAltitude: 8000, oat: 0, timeFromSL: 15, fuelFromSL: 2.6, distanceFromSL: 18 },
    { pressureAltitude: 10000, oat: 0, timeFromSL: 21, fuelFromSL: 3.5, distanceFromSL: 26 },
    { pressureAltitude: 12000, oat: 0, timeFromSL: 28, fuelFromSL: 4.6, distanceFromSL: 36 },
    // 20°C (ISA+5)
    { pressureAltitude: 0, oat: 20, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 20, timeFromSL: 4, fuelFromSL: 0.6, distanceFromSL: 4 },
    { pressureAltitude: 4000, oat: 20, timeFromSL: 8, fuelFromSL: 1.3, distanceFromSL: 9 },
    { pressureAltitude: 6000, oat: 20, timeFromSL: 13, fuelFromSL: 2.2, distanceFromSL: 15 },
    { pressureAltitude: 8000, oat: 20, timeFromSL: 19, fuelFromSL: 3.2, distanceFromSL: 23 },
    { pressureAltitude: 10000, oat: 20, timeFromSL: 27, fuelFromSL: 4.4, distanceFromSL: 33 },
    { pressureAltitude: 12000, oat: 20, timeFromSL: 37, fuelFromSL: 5.8, distanceFromSL: 46 },
    // 40°C (ISA+25)
    { pressureAltitude: 0, oat: 40, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 40, timeFromSL: 5, fuelFromSL: 0.8, distanceFromSL: 5 },
    { pressureAltitude: 4000, oat: 40, timeFromSL: 11, fuelFromSL: 1.7, distanceFromSL: 12 },
    { pressureAltitude: 6000, oat: 40, timeFromSL: 18, fuelFromSL: 2.9, distanceFromSL: 21 },
    { pressureAltitude: 8000, oat: 40, timeFromSL: 27, fuelFromSL: 4.3, distanceFromSL: 32 },
    { pressureAltitude: 10000, oat: 40, timeFromSL: 40, fuelFromSL: 6.2, distanceFromSL: 48 },
  ],

  cruiseTable: [
    {
      altitude: 2000,
      rpm: 2400,
      percentPower: 75,
      tas: 106, // KTAS approx at 75%
      fuelFlow: 8.0, // gph
    },
    {
      altitude: 4000,
      rpm: 2400,
      percentPower: 75,
      tas: 108,
      fuelFlow: 8.0,
    },
    {
      altitude: 6000,
      rpm: 2400,
      percentPower: 75,
      tas: 110,
      fuelFlow: 8.0,
    },
    {
      altitude: 8000,
      rpm: 2400,
      percentPower: 75,
      tas: 111,
      fuelFlow: 8.0,
    },
    {
      altitude: 2000,
      rpm: 2300,
      percentPower: 65,
      tas: 101, // KTAS approx at 65%
      fuelFlow: 7.0, // gph
    },
    {
      altitude: 4000,
      rpm: 2300,
      percentPower: 65,
      tas: 103,
      fuelFlow: 7.0,
    },
    {
      altitude: 6000,
      rpm: 2300,
      percentPower: 65,
      tas: 105,
      fuelFlow: 7.0,
    },
    {
      altitude: 8000,
      rpm: 2300,
      percentPower: 65,
      tas: 107,
      fuelFlow: 7.0,
    },
  ],

  engine: {
    type: "Lycoming O-320-H2AD",
    maxRPM: 2700,
    ratedHP: 160, // hp
    specificFuelConsumption: 0.42, // lbs/hp/hr typical for O-320
    usableFuelGallons: 40, // gallons (standard tanks, 56 total - 16 unusable)
  },

  limits: {
    vne: 160, // KIAS
    vno: 128, // KIAS
    va: 97, // KIAS at 2300 lbs
    vfe: 85, // KIAS (full flaps)
    vs: 47, // KIAS clean
    vs0: 41, // KIAS landing config
    maxCrosswind: 15, // kts demonstrated
    clMaxClean: 1.42, // Clean configuration
    clMaxTakeoff: 1.62, // Takeoff/approach flaps
    clMaxLanding: 1.75, // Full landing flaps
  },

  /** ------------------------------------------------------------------
   *  SERVICE CEILING
   *  Maximum altitude where aircraft can maintain 100 fpm climb
   *  ------------------------------------------------------------------*/
  serviceCeiling: 14200, // ft pressure altitude

  /** ------------------------------------------------------------------
   *  TAKEOFF PERFORMANCE TABLE
   *  Based on Cessna 172N POH data at gross weight (2,300 lbs)
   *  Conditions: Flaps up, full throttle, paved level runway, zero wind
   *  ------------------------------------------------------------------*/
  takeoffTable: [
    // Sea level
    { altitude: 0, oat: 0, groundRoll: 715, over50ft: 1280 },
    { altitude: 0, oat: 10, groundRoll: 755, over50ft: 1360 },
    { altitude: 0, oat: 20, groundRoll: 805, over50ft: 1440 },
    { altitude: 0, oat: 30, groundRoll: 855, over50ft: 1530 },
    { altitude: 0, oat: 40, groundRoll: 915, over50ft: 1635 },

    // 2,000 ft PA
    { altitude: 2000, oat: 0, groundRoll: 820, over50ft: 1475 },
    { altitude: 2000, oat: 10, groundRoll: 875, over50ft: 1575 },
    { altitude: 2000, oat: 20, groundRoll: 935, over50ft: 1680 },
    { altitude: 2000, oat: 30, groundRoll: 1000, over50ft: 1800 },
    { altitude: 2000, oat: 40, groundRoll: 1075, over50ft: 1935 },

    // 4,000 ft PA
    { altitude: 4000, oat: 0, groundRoll: 945, over50ft: 1710 },
    { altitude: 4000, oat: 10, groundRoll: 1015, over50ft: 1835 },
    { altitude: 4000, oat: 20, groundRoll: 1090, over50ft: 1975 },
    { altitude: 4000, oat: 30, groundRoll: 1175, over50ft: 2130 },
    { altitude: 4000, oat: 40, groundRoll: 1270, over50ft: 2310 },

    // 6,000 ft PA
    { altitude: 6000, oat: 0, groundRoll: 1095, over50ft: 1995 },
    { altitude: 6000, oat: 10, groundRoll: 1185, over50ft: 2155 },
    { altitude: 6000, oat: 20, groundRoll: 1285, over50ft: 2340 },
    { altitude: 6000, oat: 30, groundRoll: 1395, over50ft: 2545 },
    { altitude: 6000, oat: 40, groundRoll: 1525, over50ft: 2790 },

    // 8,000 ft PA
    { altitude: 8000, oat: 0, groundRoll: 1285, over50ft: 2365 },
    { altitude: 8000, oat: 10, groundRoll: 1400, over50ft: 2580 },
    { altitude: 8000, oat: 20, groundRoll: 1535, over50ft: 2835 },
    { altitude: 8000, oat: 30, groundRoll: 1685, over50ft: 3125 },
  ],
};
