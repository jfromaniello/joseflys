import { AircraftPerformance } from "./types";

export const CIRRUS_SR20: AircraftPerformance = {
  name: "Cirrus SR20",
  model: "SR20",

  description: "The Cirrus SR20 is a four-seat composite single-engine aircraft produced since 1999. It revolutionized general aviation with its side-yoke controls, glass cockpit (Garmin Perspective), and the Cirrus Airframe Parachute System (CAPS) as standard equipment. Powered by a Continental IO-360-ES producing 215 HP, it combines modern technology with excellent performance and safety.",

  wikipediaUrl: "https://en.wikipedia.org/wiki/Cirrus_SR20",

  weights: {
    emptyWeight: 2126, // lbs typical for SR20 G3
    standardWeight: 3050, // performance tables at MTOW (G3 model)
    maxGrossWeight: 3050, // lbs (G3 model, G6 is 3150 lbs)
  },

  // Cumulative climb performance from Sea Level (POH-style)
  // Based on Cirrus SR20 POH
  climbTable: [
    // 0°C
    { pressureAltitude: 0, oat: 0, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 0, timeFromSL: 2, fuelFromSL: 0.5, distanceFromSL: 4 },
    { pressureAltitude: 4000, oat: 0, timeFromSL: 5, fuelFromSL: 1.1, distanceFromSL: 8 },
    { pressureAltitude: 6000, oat: 0, timeFromSL: 8, fuelFromSL: 1.8, distanceFromSL: 14 },
    { pressureAltitude: 8000, oat: 0, timeFromSL: 12, fuelFromSL: 2.7, distanceFromSL: 20 },
    { pressureAltitude: 10000, oat: 0, timeFromSL: 17, fuelFromSL: 3.7, distanceFromSL: 29 },
    { pressureAltitude: 12000, oat: 0, timeFromSL: 23, fuelFromSL: 4.9, distanceFromSL: 39 },
    // 20°C
    { pressureAltitude: 0, oat: 20, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 20, timeFromSL: 3, fuelFromSL: 0.7, distanceFromSL: 5 },
    { pressureAltitude: 4000, oat: 20, timeFromSL: 6, fuelFromSL: 1.4, distanceFromSL: 10 },
    { pressureAltitude: 6000, oat: 20, timeFromSL: 10, fuelFromSL: 2.3, distanceFromSL: 17 },
    { pressureAltitude: 8000, oat: 20, timeFromSL: 15, fuelFromSL: 3.4, distanceFromSL: 26 },
    { pressureAltitude: 10000, oat: 20, timeFromSL: 21, fuelFromSL: 4.7, distanceFromSL: 37 },
    { pressureAltitude: 12000, oat: 20, timeFromSL: 29, fuelFromSL: 6.2, distanceFromSL: 50 },
    // 40°C
    { pressureAltitude: 0, oat: 40, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 40, timeFromSL: 4, fuelFromSL: 0.9, distanceFromSL: 6 },
    { pressureAltitude: 4000, oat: 40, timeFromSL: 8, fuelFromSL: 1.9, distanceFromSL: 14 },
    { pressureAltitude: 6000, oat: 40, timeFromSL: 14, fuelFromSL: 3.1, distanceFromSL: 24 },
    { pressureAltitude: 8000, oat: 40, timeFromSL: 21, fuelFromSL: 4.6, distanceFromSL: 36 },
    { pressureAltitude: 10000, oat: 40, timeFromSL: 30, fuelFromSL: 6.4, distanceFromSL: 52 },
  ],

  cruiseTable: [
    {
      altitude: 4000,
      rpm: 2500,
      percentPower: 75,
      tas: 154, // KTAS approx at 75%
      fuelFlow: 11.6, // gph
    },
    {
      altitude: 6000,
      rpm: 2500,
      percentPower: 75,
      tas: 157,
      fuelFlow: 11.6,
    },
    {
      altitude: 8000,
      rpm: 2500,
      percentPower: 75,
      tas: 160,
      fuelFlow: 11.6,
    },
    {
      altitude: 10000,
      rpm: 2500,
      percentPower: 75,
      tas: 162,
      fuelFlow: 11.6,
    },
    {
      altitude: 8000,
      rpm: 2350,
      percentPower: 65,
      tas: 148, // KTAS approx at 65%
      fuelFlow: 10.5, // gph
    },
    {
      altitude: 10000,
      rpm: 2350,
      percentPower: 65,
      tas: 150,
      fuelFlow: 10.5,
    },
    {
      altitude: 12000,
      rpm: 2350,
      percentPower: 65,
      tas: 152,
      fuelFlow: 10.5,
    },
    {
      altitude: 14000,
      rpm: 2200,
      percentPower: 55,
      tas: 144,
      fuelFlow: 8.4,
    },
  ],

  engine: {
    type: "Continental IO-360-ES",
    maxRPM: 2700,
    ratedHP: 200, // hp (fuel injected, later models use IO-390 with 215 hp)
    specificFuelConsumption: 0.42, // lbs/hp/hr typical for IO-360
    usableFuelGallons: 56, // gallons (58.5 total - 2.5 unusable)
  },

  limits: {
    vne: 200, // KIAS
    vno: 165, // KIAS
    va: 120, // KIAS at max gross weight
    vfe: 119, // KIAS (50% flaps), 104 KIAS (100% flaps)
    vs: 65, // KIAS clean (Vs1)
    vs0: 56, // KIAS landing config
    maxCrosswind: 20, // kts demonstrated
    clMaxClean: 1.42, // Clean configuration
    clMaxTakeoff: 1.62, // Takeoff flaps (50%)
    clMaxLanding: 1.75, // Landing flaps (100%)
  },

  /** ------------------------------------------------------------------
   *  SERVICE CEILING
   *  Maximum altitude where aircraft can maintain 100 fpm climb
   *  ------------------------------------------------------------------*/
  serviceCeiling: 17500, // ft pressure altitude

  /** ------------------------------------------------------------------
   *  TAKEOFF PERFORMANCE TABLE
   *  Based on Cirrus SR20 POH data at gross weight (3,050 lbs)
   *  Conditions: 50% flaps, full throttle, paved level runway, zero wind
   *  Note: Composite aircraft with CAPS parachute system
   *  ------------------------------------------------------------------*/
  takeoffTable: [
    // Sea level
    { altitude: 0, oat: 0, groundRoll: 965, over50ft: 1315 },
    { altitude: 0, oat: 10, groundRoll: 1025, over50ft: 1395 },
    { altitude: 0, oat: 20, groundRoll: 1090, over50ft: 1480 },
    { altitude: 0, oat: 30, groundRoll: 1160, over50ft: 1575 },
    { altitude: 0, oat: 40, groundRoll: 1235, over50ft: 1680 },

    // 2,000 ft PA
    { altitude: 2000, oat: 0, groundRoll: 1115, over50ft: 1525 },
    { altitude: 2000, oat: 10, groundRoll: 1190, over50ft: 1625 },
    { altitude: 2000, oat: 20, groundRoll: 1270, over50ft: 1730 },
    { altitude: 2000, oat: 30, groundRoll: 1360, over50ft: 1850 },
    { altitude: 2000, oat: 40, groundRoll: 1460, over50ft: 1985 },

    // 4,000 ft PA
    { altitude: 4000, oat: 0, groundRoll: 1300, over50ft: 1780 },
    { altitude: 4000, oat: 10, groundRoll: 1395, over50ft: 1910 },
    { altitude: 4000, oat: 20, groundRoll: 1500, over50ft: 2055 },
    { altitude: 4000, oat: 30, groundRoll: 1620, over50ft: 2220 },
    { altitude: 4000, oat: 40, groundRoll: 1755, over50ft: 2405 },

    // 6,000 ft PA
    { altitude: 6000, oat: 0, groundRoll: 1535, over50ft: 2110 },
    { altitude: 6000, oat: 10, groundRoll: 1660, over50ft: 2280 },
    { altitude: 6000, oat: 20, groundRoll: 1800, over50ft: 2475 },
    { altitude: 6000, oat: 30, groundRoll: 1960, over50ft: 2695 },
    { altitude: 6000, oat: 40, groundRoll: 2140, over50ft: 2945 },

    // 8,000 ft PA
    { altitude: 8000, oat: 0, groundRoll: 1830, over50ft: 2525 },
    { altitude: 8000, oat: 10, groundRoll: 2000, over50ft: 2760 },
    { altitude: 8000, oat: 20, groundRoll: 2195, over50ft: 3030 },
    { altitude: 8000, oat: 30, groundRoll: 2420, over50ft: 3340 },
  ],
};
