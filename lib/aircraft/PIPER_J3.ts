import { AircraftPerformance } from "./types";

export const PIPER_J3: AircraftPerformance = {
  name: "Piper J-3 Cub",
  model: "J3",

  description: "The Piper J-3 Cub is one of the most iconic aircraft in aviation history, produced from 1937 to 1947. With its distinctive yellow color and simple, reliable design, over 19,000 were built. It trained thousands of military pilots during World War II and remains a beloved classic among pilots, prized for its pure stick-and-rudder flying experience.",

  wikipediaUrl: "https://en.wikipedia.org/wiki/Piper_J-3_Cub",

  weights: {
    emptyWeight: 680, // lbs typical for J-3C-65
    standardWeight: 1220, // performance tables at MTOW
    maxGrossWeight: 1220, // lbs
  },

  // Cumulative climb performance from Sea Level (POH-style)
  // Based on Piper J-3 Cub with 65 hp A-65 engine
  climbTable: [
    // 0°C
    { pressureAltitude: 0, oat: 0, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 0, timeFromSL: 5, fuelFromSL: 0.4, distanceFromSL: 4 },
    { pressureAltitude: 4000, oat: 0, timeFromSL: 11, fuelFromSL: 0.9, distanceFromSL: 9 },
    { pressureAltitude: 6000, oat: 0, timeFromSL: 18, fuelFromSL: 1.5, distanceFromSL: 16 },
    { pressureAltitude: 8000, oat: 0, timeFromSL: 28, fuelFromSL: 2.3, distanceFromSL: 25 },
    { pressureAltitude: 10000, oat: 0, timeFromSL: 42, fuelFromSL: 3.5, distanceFromSL: 39 },
    // 20°C
    { pressureAltitude: 0, oat: 20, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 20, timeFromSL: 6, fuelFromSL: 0.5, distanceFromSL: 5 },
    { pressureAltitude: 4000, oat: 20, timeFromSL: 14, fuelFromSL: 1.1, distanceFromSL: 12 },
    { pressureAltitude: 6000, oat: 20, timeFromSL: 24, fuelFromSL: 2.0, distanceFromSL: 21 },
    { pressureAltitude: 8000, oat: 20, timeFromSL: 38, fuelFromSL: 3.1, distanceFromSL: 34 },
    // 40°C
    { pressureAltitude: 0, oat: 40, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 40, timeFromSL: 8, fuelFromSL: 0.6, distanceFromSL: 7 },
    { pressureAltitude: 4000, oat: 40, timeFromSL: 19, fuelFromSL: 1.5, distanceFromSL: 17 },
    { pressureAltitude: 6000, oat: 40, timeFromSL: 35, fuelFromSL: 2.8, distanceFromSL: 31 },
  ],

  cruiseTable: [
    {
      altitude: 2000,
      rpm: 2100,
      percentPower: 75,
      tas: 65, // KTAS approx at 75%
      fuelFlow: 4.8, // gph (A-65 engine)
    },
    {
      altitude: 4000,
      rpm: 2100,
      percentPower: 75,
      tas: 66,
      fuelFlow: 4.8,
    },
    {
      altitude: 6000,
      rpm: 2100,
      percentPower: 75,
      tas: 67,
      fuelFlow: 4.8,
    },
    {
      altitude: 8000,
      rpm: 2100,
      percentPower: 75,
      tas: 68,
      fuelFlow: 4.8,
    },
    {
      altitude: 2000,
      rpm: 1950,
      percentPower: 65,
      tas: 60, // KTAS approx at 65%
      fuelFlow: 4.2, // gph
    },
    {
      altitude: 4000,
      rpm: 1950,
      percentPower: 65,
      tas: 61,
      fuelFlow: 4.2,
    },
    {
      altitude: 6000,
      rpm: 1950,
      percentPower: 65,
      tas: 62,
      fuelFlow: 4.2,
    },
  ],

  engine: {
    type: "Continental A-65",
    maxRPM: 2350,
    ratedHP: 65, // hp
    specificFuelConsumption: 0.50, // lbs/hp/hr typical for older engines
    usableFuelGallons: 12, // gallons standard tanks
  },

  limits: {
    vne: 106, // KIAS (122 mph)
    vno: 90, // KIAS (estimated, no published Vno for J-3)
    va: 66, // KIAS (76 mph)
    vfe: 60, // KIAS (no flaps on J-3, using reasonable estimate)
    vs: 33, // KIAS (38 mph clean)
    vs0: 29, // KIAS (33 kts landing config)
    maxCrosswind: 12, // kts demonstrated (estimate for taildragger)
    clMaxClean: 1.50, // Clean configuration (estimate)
    clMaxTakeoff: 1.50, // No flaps on J-3
    clMaxLanding: 1.50, // No flaps on J-3
  },

  /** ------------------------------------------------------------------
   *  SERVICE CEILING
   *  Maximum altitude where aircraft can maintain 100 fpm climb
   *  ------------------------------------------------------------------*/
  serviceCeiling: 11500, // ft pressure altitude (A-65 engine)

  /** ------------------------------------------------------------------
   *  TAKEOFF PERFORMANCE TABLE
   *  Based on Piper J-3 Cub data at gross weight (1,220 lbs)
   *  Conditions: Paved level runway, zero wind
   *  Note: J-3 is a taildragger, performance varies significantly with pilot technique
   *  ------------------------------------------------------------------*/
  takeoffTable: [
    // Sea level
    { altitude: 0, oat: 0, groundRoll: 330, over50ft: 650 },
    { altitude: 0, oat: 10, groundRoll: 350, over50ft: 690 },
    { altitude: 0, oat: 20, groundRoll: 370, over50ft: 730 },
    { altitude: 0, oat: 30, groundRoll: 395, over50ft: 780 },
    { altitude: 0, oat: 40, groundRoll: 420, over50ft: 835 },

    // 2,000 ft PA
    { altitude: 2000, oat: 0, groundRoll: 385, over50ft: 760 },
    { altitude: 2000, oat: 10, groundRoll: 410, over50ft: 810 },
    { altitude: 2000, oat: 20, groundRoll: 440, over50ft: 865 },
    { altitude: 2000, oat: 30, groundRoll: 470, over50ft: 930 },
    { altitude: 2000, oat: 40, groundRoll: 505, over50ft: 1000 },

    // 4,000 ft PA
    { altitude: 4000, oat: 0, groundRoll: 455, over50ft: 900 },
    { altitude: 4000, oat: 10, groundRoll: 490, over50ft: 970 },
    { altitude: 4000, oat: 20, groundRoll: 530, over50ft: 1050 },
    { altitude: 4000, oat: 30, groundRoll: 575, over50ft: 1140 },
    { altitude: 4000, oat: 40, groundRoll: 625, over50ft: 1240 },

    // 6,000 ft PA
    { altitude: 6000, oat: 0, groundRoll: 545, over50ft: 1080 },
    { altitude: 6000, oat: 10, groundRoll: 595, over50ft: 1180 },
    { altitude: 6000, oat: 20, groundRoll: 650, over50ft: 1290 },
    { altitude: 6000, oat: 30, groundRoll: 715, over50ft: 1420 },
    { altitude: 6000, oat: 40, groundRoll: 790, over50ft: 1570 },

    // 8,000 ft PA
    { altitude: 8000, oat: 0, groundRoll: 665, over50ft: 1320 },
    { altitude: 8000, oat: 10, groundRoll: 735, over50ft: 1460 },
    { altitude: 8000, oat: 20, groundRoll: 815, over50ft: 1620 },
    { altitude: 8000, oat: 30, groundRoll: 910, over50ft: 1810 },
  ],
};
