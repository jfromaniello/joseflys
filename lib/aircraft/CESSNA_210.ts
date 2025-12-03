import { AircraftPerformance } from "./types";

export const CESSNA_210: AircraftPerformance = {
  name: "Cessna 210 Centurion",
  model: "C210",

  description: "The Cessna 210 Centurion is a six-seat high-performance single-engine aircraft produced from 1960 to 1986. It was Cessna's first single-engine airplane with retractable landing gear. Known for its speed, range, and load-carrying capability, it became popular for business travel and is often considered a step-up aircraft for pilots transitioning to high-performance flying.",

  wikipediaUrl: "https://en.wikipedia.org/wiki/Cessna_210",

  weights: {
    emptyWeight: 2305, // lbs typical for 210L
    standardWeight: 3800, // performance tables at MTOW (210L/M)
    maxGrossWeight: 3800, // lbs (210L/M models, earlier models 3400 lbs)
  },

  // Cumulative climb performance from Sea Level (POH-style)
  // Based on Cessna 210L POH Section 5
  climbTable: [
    // 0°C
    { pressureAltitude: 0, oat: 0, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 0, timeFromSL: 2, fuelFromSL: 0.7, distanceFromSL: 4 },
    { pressureAltitude: 4000, oat: 0, timeFromSL: 5, fuelFromSL: 1.5, distanceFromSL: 8 },
    { pressureAltitude: 6000, oat: 0, timeFromSL: 8, fuelFromSL: 2.5, distanceFromSL: 13 },
    { pressureAltitude: 8000, oat: 0, timeFromSL: 12, fuelFromSL: 3.6, distanceFromSL: 19 },
    { pressureAltitude: 10000, oat: 0, timeFromSL: 17, fuelFromSL: 5.0, distanceFromSL: 27 },
    { pressureAltitude: 12000, oat: 0, timeFromSL: 23, fuelFromSL: 6.6, distanceFromSL: 37 },
    // 20°C
    { pressureAltitude: 0, oat: 20, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 20, timeFromSL: 3, fuelFromSL: 0.9, distanceFromSL: 5 },
    { pressureAltitude: 4000, oat: 20, timeFromSL: 6, fuelFromSL: 1.9, distanceFromSL: 10 },
    { pressureAltitude: 6000, oat: 20, timeFromSL: 10, fuelFromSL: 3.1, distanceFromSL: 17 },
    { pressureAltitude: 8000, oat: 20, timeFromSL: 15, fuelFromSL: 4.6, distanceFromSL: 25 },
    { pressureAltitude: 10000, oat: 20, timeFromSL: 21, fuelFromSL: 6.3, distanceFromSL: 35 },
    { pressureAltitude: 12000, oat: 20, timeFromSL: 29, fuelFromSL: 8.4, distanceFromSL: 48 },
    // 40°C
    { pressureAltitude: 0, oat: 40, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 40, timeFromSL: 4, fuelFromSL: 1.2, distanceFromSL: 6 },
    { pressureAltitude: 4000, oat: 40, timeFromSL: 8, fuelFromSL: 2.5, distanceFromSL: 14 },
    { pressureAltitude: 6000, oat: 40, timeFromSL: 14, fuelFromSL: 4.2, distanceFromSL: 23 },
    { pressureAltitude: 8000, oat: 40, timeFromSL: 21, fuelFromSL: 6.3, distanceFromSL: 35 },
    { pressureAltitude: 10000, oat: 40, timeFromSL: 31, fuelFromSL: 9.0, distanceFromSL: 51 },
  ],

  cruiseTable: [
    {
      altitude: 4000,
      rpm: 2500,
      percentPower: 75,
      tas: 163, // KTAS approx at 75%
      fuelFlow: 16.5, // gph
    },
    {
      altitude: 6000,
      rpm: 2500,
      percentPower: 75,
      tas: 166,
      fuelFlow: 16.5,
    },
    {
      altitude: 8000,
      rpm: 2500,
      percentPower: 75,
      tas: 169,
      fuelFlow: 16.5,
    },
    {
      altitude: 10000,
      rpm: 2500,
      percentPower: 75,
      tas: 172,
      fuelFlow: 16.5,
    },
    {
      altitude: 6000,
      rpm: 2350,
      percentPower: 65,
      tas: 157, // KTAS approx at 65%
      fuelFlow: 14.3, // gph
    },
    {
      altitude: 8000,
      rpm: 2350,
      percentPower: 65,
      tas: 160,
      fuelFlow: 14.3,
    },
    {
      altitude: 10000,
      rpm: 2350,
      percentPower: 65,
      tas: 163,
      fuelFlow: 14.3,
    },
    {
      altitude: 12000,
      rpm: 2350,
      percentPower: 65,
      tas: 165,
      fuelFlow: 14.3,
    },
  ],

  engine: {
    type: "Continental IO-520-L",
    maxRPM: 2850,
    ratedHP: 300, // hp (fuel injected)
    specificFuelConsumption: 0.40, // lbs/hp/hr typical for IO-520
    usableFuelGallons: 90, // gallons (standard long-range tanks)
  },

  limits: {
    vne: 203, // KIAS (210L model)
    vno: 175, // KIAS
    va: 126, // KIAS at max gross weight
    vfe: 140, // KIAS (approach flaps 10°), 100 KIAS (full flaps 30°)
    vs: 65, // KIAS clean
    vs0: 57, // KIAS landing config
    maxCrosswind: 20, // kts demonstrated
    clMaxClean: 1.42, // Clean configuration
    clMaxTakeoff: 1.62, // Takeoff/approach flaps
    clMaxLanding: 1.75, // Full landing flaps
  },

  /** ------------------------------------------------------------------
   *  SERVICE CEILING
   *  Maximum altitude where aircraft can maintain 100 fpm climb
   *  ------------------------------------------------------------------*/
  serviceCeiling: 17300, // ft pressure altitude (normally aspirated)

  /** ------------------------------------------------------------------
   *  TAKEOFF PERFORMANCE TABLE
   *  Based on Cessna 210L POH data at gross weight (3,800 lbs)
   *  Conditions: Flaps 10°, full throttle, paved level runway, zero wind
   *  Note: High-performance retractable gear 6-seat aircraft
   *  ------------------------------------------------------------------*/
  takeoffTable: [
    // Sea level
    { altitude: 0, oat: 0, groundRoll: 1035, over50ft: 1800 },
    { altitude: 0, oat: 10, groundRoll: 1100, over50ft: 1910 },
    { altitude: 0, oat: 20, groundRoll: 1170, over50ft: 2030 },
    { altitude: 0, oat: 30, groundRoll: 1245, over50ft: 2160 },
    { altitude: 0, oat: 40, groundRoll: 1325, over50ft: 2305 },

    // 2,000 ft PA
    { altitude: 2000, oat: 0, groundRoll: 1200, over50ft: 2090 },
    { altitude: 2000, oat: 10, groundRoll: 1280, over50ft: 2225 },
    { altitude: 2000, oat: 20, groundRoll: 1365, over50ft: 2375 },
    { altitude: 2000, oat: 30, groundRoll: 1460, over50ft: 2540 },
    { altitude: 2000, oat: 40, groundRoll: 1565, over50ft: 2725 },

    // 4,000 ft PA
    { altitude: 4000, oat: 0, groundRoll: 1405, over50ft: 2455 },
    { altitude: 4000, oat: 10, groundRoll: 1505, over50ft: 2625 },
    { altitude: 4000, oat: 20, groundRoll: 1615, over50ft: 2820 },
    { altitude: 4000, oat: 30, groundRoll: 1740, over50ft: 3040 },
    { altitude: 4000, oat: 40, groundRoll: 1880, over50ft: 3290 },

    // 6,000 ft PA
    { altitude: 6000, oat: 0, groundRoll: 1665, over50ft: 2920 },
    { altitude: 6000, oat: 10, groundRoll: 1795, over50ft: 3145 },
    { altitude: 6000, oat: 20, groundRoll: 1945, over50ft: 3410 },
    { altitude: 6000, oat: 30, groundRoll: 2115, over50ft: 3715 },
    { altitude: 6000, oat: 40, groundRoll: 2310, over50ft: 4060 },

    // 8,000 ft PA
    { altitude: 8000, oat: 0, groundRoll: 2000, over50ft: 3520 },
    { altitude: 8000, oat: 10, groundRoll: 2180, over50ft: 3840 },
    { altitude: 8000, oat: 20, groundRoll: 2390, over50ft: 4210 },
    { altitude: 8000, oat: 30, groundRoll: 2630, over50ft: 4640 },
  ],
};
