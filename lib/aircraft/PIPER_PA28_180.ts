import { AircraftPerformance } from "./types";

export const PIPER_PA28_180: AircraftPerformance = {
  name: "Piper PA-28-180 Cherokee/Archer",
  model: "PA28-180",

  description: "The Piper PA-28-180 is a four-seat single-engine aircraft, part of the Cherokee family. Produced from 1963, it features a Lycoming O-360 engine producing 180 HP. Later versions were marketed as the Archer. Known for its roomy cabin and excellent cross-country capabilities, it remains popular for personal transport and instrument training.",

  wikipediaUrl: "https://en.wikipedia.org/wiki/Piper_PA-28_Cherokee",

  weights: {
    emptyWeight: 1395, // lbs typical for PA-28-180
    standardWeight: 2450, // performance tables at MTOW
    maxGrossWeight: 2450, // lbs (PA-28-180, later Archer II is 2550 lbs)
  },

  // Cumulative climb performance from Sea Level (POH-style)
  // Based on Piper PA-28-180 Cherokee/Archer POH
  climbTable: [
    // 0°C
    { pressureAltitude: 0, oat: 0, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 0, timeFromSL: 3, fuelFromSL: 0.6, distanceFromSL: 4 },
    { pressureAltitude: 4000, oat: 0, timeFromSL: 6, fuelFromSL: 1.3, distanceFromSL: 9 },
    { pressureAltitude: 6000, oat: 0, timeFromSL: 10, fuelFromSL: 2.1, distanceFromSL: 15 },
    { pressureAltitude: 8000, oat: 0, timeFromSL: 15, fuelFromSL: 3.0, distanceFromSL: 22 },
    { pressureAltitude: 10000, oat: 0, timeFromSL: 21, fuelFromSL: 4.1, distanceFromSL: 31 },
    { pressureAltitude: 12000, oat: 0, timeFromSL: 29, fuelFromSL: 5.4, distanceFromSL: 43 },
    // 20°C
    { pressureAltitude: 0, oat: 20, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 20, timeFromSL: 4, fuelFromSL: 0.8, distanceFromSL: 5 },
    { pressureAltitude: 4000, oat: 20, timeFromSL: 8, fuelFromSL: 1.6, distanceFromSL: 11 },
    { pressureAltitude: 6000, oat: 20, timeFromSL: 13, fuelFromSL: 2.6, distanceFromSL: 19 },
    { pressureAltitude: 8000, oat: 20, timeFromSL: 19, fuelFromSL: 3.8, distanceFromSL: 28 },
    { pressureAltitude: 10000, oat: 20, timeFromSL: 27, fuelFromSL: 5.2, distanceFromSL: 40 },
    { pressureAltitude: 12000, oat: 20, timeFromSL: 38, fuelFromSL: 7.0, distanceFromSL: 56 },
    // 40°C
    { pressureAltitude: 0, oat: 40, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 40, timeFromSL: 5, fuelFromSL: 1.0, distanceFromSL: 7 },
    { pressureAltitude: 4000, oat: 40, timeFromSL: 11, fuelFromSL: 2.1, distanceFromSL: 15 },
    { pressureAltitude: 6000, oat: 40, timeFromSL: 18, fuelFromSL: 3.5, distanceFromSL: 26 },
    { pressureAltitude: 8000, oat: 40, timeFromSL: 27, fuelFromSL: 5.2, distanceFromSL: 40 },
    { pressureAltitude: 10000, oat: 40, timeFromSL: 40, fuelFromSL: 7.4, distanceFromSL: 59 },
  ],

  cruiseTable: [
    {
      altitude: 3000,
      rpm: 2500,
      percentPower: 75,
      tas: 122, // KTAS approx at 75%
      fuelFlow: 10.5, // gph
    },
    {
      altitude: 5000,
      rpm: 2500,
      percentPower: 75,
      tas: 125,
      fuelFlow: 10.5,
    },
    {
      altitude: 7000,
      rpm: 2500,
      percentPower: 75,
      tas: 127,
      fuelFlow: 10.5,
    },
    {
      altitude: 9000,
      rpm: 2500,
      percentPower: 75,
      tas: 129,
      fuelFlow: 10.5,
    },
    {
      altitude: 3000,
      rpm: 2350,
      percentPower: 65,
      tas: 115, // KTAS approx at 65%
      fuelFlow: 8.5, // gph
    },
    {
      altitude: 5000,
      rpm: 2350,
      percentPower: 65,
      tas: 117,
      fuelFlow: 8.5,
    },
    {
      altitude: 7000,
      rpm: 2350,
      percentPower: 65,
      tas: 119,
      fuelFlow: 8.5,
    },
    {
      altitude: 9000,
      rpm: 2350,
      percentPower: 65,
      tas: 121,
      fuelFlow: 8.5,
    },
  ],

  engine: {
    type: "Lycoming O-360-A4A",
    maxRPM: 2700,
    ratedHP: 180, // hp
    specificFuelConsumption: 0.42, // lbs/hp/hr typical for O-360
    usableFuelGallons: 48, // gallons (50 total - 2 unusable)
  },

  limits: {
    vne: 154, // KIAS
    vno: 125, // KIAS
    va: 113, // KIAS at 2450 lbs
    vfe: 102, // KIAS (full flaps)
    vs: 57, // KIAS clean
    vs0: 48, // KIAS landing config
    maxCrosswind: 17, // kts demonstrated
    clMaxClean: 1.42, // Clean configuration
    clMaxTakeoff: 1.62, // Takeoff/approach flaps
    clMaxLanding: 1.75, // Full landing flaps
  },

  /** ------------------------------------------------------------------
   *  SERVICE CEILING
   *  Maximum altitude where aircraft can maintain 100 fpm climb
   *  ------------------------------------------------------------------*/
  serviceCeiling: 14150, // ft pressure altitude

  /** ------------------------------------------------------------------
   *  TAKEOFF PERFORMANCE TABLE
   *  Based on Piper PA-28-180 POH data at gross weight (2,450 lbs)
   *  Conditions: Flaps up, full throttle, paved level runway, zero wind
   *  ------------------------------------------------------------------*/
  takeoffTable: [
    // Sea level
    { altitude: 0, oat: 0, groundRoll: 650, over50ft: 1440 },
    { altitude: 0, oat: 10, groundRoll: 690, over50ft: 1530 },
    { altitude: 0, oat: 20, groundRoll: 735, over50ft: 1625 },
    { altitude: 0, oat: 30, groundRoll: 785, over50ft: 1730 },
    { altitude: 0, oat: 40, groundRoll: 835, over50ft: 1850 },

    // 2,000 ft PA
    { altitude: 2000, oat: 0, groundRoll: 755, over50ft: 1670 },
    { altitude: 2000, oat: 10, groundRoll: 805, over50ft: 1785 },
    { altitude: 2000, oat: 20, groundRoll: 860, over50ft: 1905 },
    { altitude: 2000, oat: 30, groundRoll: 920, over50ft: 2040 },
    { altitude: 2000, oat: 40, groundRoll: 985, over50ft: 2190 },

    // 4,000 ft PA
    { altitude: 4000, oat: 0, groundRoll: 880, over50ft: 1955 },
    { altitude: 4000, oat: 10, groundRoll: 945, over50ft: 2100 },
    { altitude: 4000, oat: 20, groundRoll: 1015, over50ft: 2260 },
    { altitude: 4000, oat: 30, groundRoll: 1095, over50ft: 2435 },
    { altitude: 4000, oat: 40, groundRoll: 1185, over50ft: 2635 },

    // 6,000 ft PA
    { altitude: 6000, oat: 0, groundRoll: 1030, over50ft: 2300 },
    { altitude: 6000, oat: 10, groundRoll: 1110, over50ft: 2480 },
    { altitude: 6000, oat: 20, groundRoll: 1200, over50ft: 2685 },
    { altitude: 6000, oat: 30, groundRoll: 1305, over50ft: 2920 },
    { altitude: 6000, oat: 40, groundRoll: 1425, over50ft: 3190 },

    // 8,000 ft PA
    { altitude: 8000, oat: 0, groundRoll: 1215, over50ft: 2730 },
    { altitude: 8000, oat: 10, groundRoll: 1320, over50ft: 2970 },
    { altitude: 8000, oat: 20, groundRoll: 1445, over50ft: 3250 },
    { altitude: 8000, oat: 30, groundRoll: 1590, over50ft: 3575 },
  ],
};
