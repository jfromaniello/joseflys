import { AircraftPerformance } from "./types";

export const CESSNA_172RG: AircraftPerformance = {
  name: "Cessna 172RG Cutlass",
  model: "C172RG",

  description:
    "The Cessna 172RG Cutlass RG (1980-1985) is the retractable-gear version of the 172, featuring a 180 HP Lycoming O-360-F1A6 engine with constant-speed propeller. With cruise speeds around 140 KTAS and 62 gallons usable fuel, it offers improved performance over the fixed-gear 172 while maintaining the Skyhawk's forgiving handling characteristics. 1,191 were built.",

  wikipediaUrl: "https://en.wikipedia.org/wiki/Cessna_172#172RG_Cutlass_RG",

  weights: {
    emptyWeight: 1627, // lbs typical
    standardWeight: 2650, // performance tables at MTOW
    maxGrossWeight: 2650, // lbs
  },

  // Cumulative climb performance from Sea Level (POH-style)
  // Based on 180 HP, 800 fpm ROC at sea level, Vy = 84 KIAS
  climbTable: [
    // 0°C (ISA-15)
    { pressureAltitude: 0, oat: 0, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 0, timeFromSL: 3, fuelFromSL: 0.6, distanceFromSL: 4 },
    { pressureAltitude: 4000, oat: 0, timeFromSL: 6, fuelFromSL: 1.2, distanceFromSL: 8 },
    { pressureAltitude: 6000, oat: 0, timeFromSL: 9, fuelFromSL: 1.9, distanceFromSL: 13 },
    { pressureAltitude: 8000, oat: 0, timeFromSL: 13, fuelFromSL: 2.7, distanceFromSL: 19 },
    { pressureAltitude: 10000, oat: 0, timeFromSL: 18, fuelFromSL: 3.6, distanceFromSL: 26 },
    { pressureAltitude: 12000, oat: 0, timeFromSL: 24, fuelFromSL: 4.7, distanceFromSL: 35 },
    // 20°C (ISA+5)
    { pressureAltitude: 0, oat: 20, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 20, timeFromSL: 4, fuelFromSL: 0.8, distanceFromSL: 5 },
    { pressureAltitude: 4000, oat: 20, timeFromSL: 7, fuelFromSL: 1.5, distanceFromSL: 10 },
    { pressureAltitude: 6000, oat: 20, timeFromSL: 11, fuelFromSL: 2.3, distanceFromSL: 16 },
    { pressureAltitude: 8000, oat: 20, timeFromSL: 16, fuelFromSL: 3.3, distanceFromSL: 24 },
    { pressureAltitude: 10000, oat: 20, timeFromSL: 22, fuelFromSL: 4.5, distanceFromSL: 33 },
    { pressureAltitude: 12000, oat: 20, timeFromSL: 30, fuelFromSL: 5.9, distanceFromSL: 45 },
    // 40°C (ISA+25)
    { pressureAltitude: 0, oat: 40, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 40, timeFromSL: 5, fuelFromSL: 1.0, distanceFromSL: 6 },
    { pressureAltitude: 4000, oat: 40, timeFromSL: 10, fuelFromSL: 2.0, distanceFromSL: 13 },
    { pressureAltitude: 6000, oat: 40, timeFromSL: 15, fuelFromSL: 3.1, distanceFromSL: 22 },
    { pressureAltitude: 8000, oat: 40, timeFromSL: 22, fuelFromSL: 4.5, distanceFromSL: 33 },
    { pressureAltitude: 10000, oat: 40, timeFromSL: 32, fuelFromSL: 6.3, distanceFromSL: 48 },
  ],

  // Cruise performance with constant-speed propeller
  // 75% power: ~10 gph, 140 KTAS at 9000 ft
  // 65% power: ~8.5 gph, 130 KTAS
  cruiseTable: [
    // 75% power
    {
      altitude: 4000,
      rpm: 2450,
      percentPower: 75,
      tas: 134, // KTAS
      fuelFlow: 10.0, // gph
    },
    {
      altitude: 6000,
      rpm: 2450,
      percentPower: 75,
      tas: 137,
      fuelFlow: 10.0,
    },
    {
      altitude: 8000,
      rpm: 2450,
      percentPower: 75,
      tas: 140,
      fuelFlow: 10.0,
    },
    {
      altitude: 10000,
      rpm: 2450,
      percentPower: 75,
      tas: 142,
      fuelFlow: 10.0,
    },
    // 65% power
    {
      altitude: 4000,
      rpm: 2300,
      percentPower: 65,
      tas: 127, // KTAS
      fuelFlow: 8.5, // gph
    },
    {
      altitude: 6000,
      rpm: 2300,
      percentPower: 65,
      tas: 130,
      fuelFlow: 8.5,
    },
    {
      altitude: 8000,
      rpm: 2300,
      percentPower: 65,
      tas: 133,
      fuelFlow: 8.5,
    },
    {
      altitude: 10000,
      rpm: 2300,
      percentPower: 65,
      tas: 136,
      fuelFlow: 8.5,
    },
    // 55% power (economy cruise)
    {
      altitude: 6000,
      rpm: 2200,
      percentPower: 55,
      tas: 120,
      fuelFlow: 7.2,
    },
    {
      altitude: 8000,
      rpm: 2200,
      percentPower: 55,
      tas: 122,
      fuelFlow: 7.2,
    },
    {
      altitude: 10000,
      rpm: 2200,
      percentPower: 55,
      tas: 125,
      fuelFlow: 7.2,
    },
  ],

  engine: {
    type: "Lycoming O-360-F1A6",
    maxRPM: 2700,
    ratedHP: 180,
    specificFuelConsumption: 0.42, // lbs/hp/hr typical for O-360
    usableFuelGallons: 62, // gallons (66 total - 4 unusable)
  },

  limits: {
    vne: 164, // KIAS
    vno: 145, // KIAS
    va: 106, // KIAS at 2650 lbs
    vfe: 100, // KIAS (10-30° flaps)
    vs: 50, // KIAS clean
    vs0: 42, // KIAS landing config
    maxCrosswind: 15, // kts demonstrated
    clMaxClean: 1.48, // Clean configuration (estimated)
    clMaxTakeoff: 1.68, // Takeoff/approach flaps (estimated)
    clMaxLanding: 1.80, // Full landing flaps (estimated)
  },

  /** ------------------------------------------------------------------
   *  SERVICE CEILING
   *  Maximum altitude where aircraft can maintain 100 fpm climb
   *  ------------------------------------------------------------------*/
  serviceCeiling: 16800, // ft pressure altitude

  /** ------------------------------------------------------------------
   *  TAKEOFF PERFORMANCE TABLE
   *  Based on POH data at gross weight (2,650 lbs)
   *  Conditions: Gear retracted after liftoff, full throttle, paved level runway, zero wind
   *  ------------------------------------------------------------------*/
  takeoffTable: [
    // Sea level
    { altitude: 0, oat: 0, groundRoll: 940, over50ft: 1580 },
    { altitude: 0, oat: 10, groundRoll: 985, over50ft: 1660 },
    { altitude: 0, oat: 20, groundRoll: 1035, over50ft: 1745 },
    { altitude: 0, oat: 30, groundRoll: 1090, over50ft: 1840 },
    { altitude: 0, oat: 40, groundRoll: 1150, over50ft: 1940 },

    // 2,000 ft PA
    { altitude: 2000, oat: 0, groundRoll: 1055, over50ft: 1780 },
    { altitude: 2000, oat: 10, groundRoll: 1110, over50ft: 1875 },
    { altitude: 2000, oat: 20, groundRoll: 1170, over50ft: 1975 },
    { altitude: 2000, oat: 30, groundRoll: 1235, over50ft: 2090 },
    { altitude: 2000, oat: 40, groundRoll: 1310, over50ft: 2220 },

    // 4,000 ft PA
    { altitude: 4000, oat: 0, groundRoll: 1190, over50ft: 2015 },
    { altitude: 4000, oat: 10, groundRoll: 1260, over50ft: 2135 },
    { altitude: 4000, oat: 20, groundRoll: 1335, over50ft: 2265 },
    { altitude: 4000, oat: 30, groundRoll: 1420, over50ft: 2410 },
    { altitude: 4000, oat: 40, groundRoll: 1515, over50ft: 2575 },

    // 6,000 ft PA
    { altitude: 6000, oat: 0, groundRoll: 1355, over50ft: 2300 },
    { altitude: 6000, oat: 10, groundRoll: 1445, over50ft: 2450 },
    { altitude: 6000, oat: 20, groundRoll: 1540, over50ft: 2620 },
    { altitude: 6000, oat: 30, groundRoll: 1650, over50ft: 2810 },
    { altitude: 6000, oat: 40, groundRoll: 1775, over50ft: 3030 },

    // 8,000 ft PA
    { altitude: 8000, oat: 0, groundRoll: 1555, over50ft: 2650 },
    { altitude: 8000, oat: 10, groundRoll: 1665, over50ft: 2845 },
    { altitude: 8000, oat: 20, groundRoll: 1790, over50ft: 3065 },
    { altitude: 8000, oat: 30, groundRoll: 1935, over50ft: 3315 },
  ],

  /** ------------------------------------------------------------------
   *  LANDING PERFORMANCE TABLE
   *  Based on POH data at gross weight (2,650 lbs)
   *  Conditions: Full flaps, power off, paved level runway, zero wind
   *  ------------------------------------------------------------------*/
  landingTable: [
    // Sea level
    { altitude: 0, oat: 0, groundRoll: 590, over50ft: 1260 },
    { altitude: 0, oat: 10, groundRoll: 610, over50ft: 1300 },
    { altitude: 0, oat: 20, groundRoll: 625, over50ft: 1340 },
    { altitude: 0, oat: 30, groundRoll: 645, over50ft: 1380 },
    { altitude: 0, oat: 40, groundRoll: 665, over50ft: 1425 },

    // 2,000 ft PA
    { altitude: 2000, oat: 0, groundRoll: 645, over50ft: 1380 },
    { altitude: 2000, oat: 10, groundRoll: 665, over50ft: 1420 },
    { altitude: 2000, oat: 20, groundRoll: 685, over50ft: 1465 },
    { altitude: 2000, oat: 30, groundRoll: 705, over50ft: 1510 },
    { altitude: 2000, oat: 40, groundRoll: 730, over50ft: 1560 },

    // 4,000 ft PA
    { altitude: 4000, oat: 0, groundRoll: 705, over50ft: 1510 },
    { altitude: 4000, oat: 10, groundRoll: 730, over50ft: 1560 },
    { altitude: 4000, oat: 20, groundRoll: 755, over50ft: 1610 },
    { altitude: 4000, oat: 30, groundRoll: 780, over50ft: 1665 },
    { altitude: 4000, oat: 40, groundRoll: 805, over50ft: 1720 },

    // 6,000 ft PA
    { altitude: 6000, oat: 0, groundRoll: 775, over50ft: 1660 },
    { altitude: 6000, oat: 10, groundRoll: 800, over50ft: 1715 },
    { altitude: 6000, oat: 20, groundRoll: 830, over50ft: 1775 },
    { altitude: 6000, oat: 30, groundRoll: 860, over50ft: 1840 },

    // 8,000 ft PA
    { altitude: 8000, oat: 0, groundRoll: 855, over50ft: 1835 },
    { altitude: 8000, oat: 10, groundRoll: 885, over50ft: 1900 },
    { altitude: 8000, oat: 20, groundRoll: 920, over50ft: 1970 },
  ],
};
