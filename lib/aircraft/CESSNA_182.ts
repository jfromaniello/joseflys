import { AircraftPerformance } from "./types";


export const CESSNA_182: AircraftPerformance = {
  name: "Cessna 182P Skylane",
  model: "C182P",

  description: "The Cessna 182 Skylane is a four-seat single-engine airplane produced since 1956. The 182P model (1972-1980) features a Continental O-470-R engine producing 230 HP. With its higher power and payload capacity compared to the 172, it's popular for cross-country flying, aerial photography, and cargo transport in general aviation.",

  wikipediaUrl: "https://en.wikipedia.org/wiki/Cessna_182_Skylane",

  weights: {
    emptyWeight: 1750, // promedio entre varios 182P :contentReference[oaicite:11]{index=11}
    standardWeight: 2950, // asumimos tablas a MTOW
    maxGrossWeight: 2950, // lbs (182P clásico) :contentReference[oaicite:12]{index=12}
  },

  // Cumulative climb performance from Sea Level (POH-style)
  // Based on Cessna 182P POH Section 5
  climbTable: [
    // 0°C
    { pressureAltitude: 0, oat: 0, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 0, timeFromSL: 2, fuelFromSL: 0.6, distanceFromSL: 3 },
    { pressureAltitude: 4000, oat: 0, timeFromSL: 5, fuelFromSL: 1.3, distanceFromSL: 6 },
    { pressureAltitude: 6000, oat: 0, timeFromSL: 8, fuelFromSL: 2.1, distanceFromSL: 10 },
    { pressureAltitude: 8000, oat: 0, timeFromSL: 12, fuelFromSL: 3.1, distanceFromSL: 16 },
    { pressureAltitude: 10000, oat: 0, timeFromSL: 17, fuelFromSL: 4.2, distanceFromSL: 23 },
    { pressureAltitude: 12000, oat: 0, timeFromSL: 23, fuelFromSL: 5.6, distanceFromSL: 32 },
    // 20°C
    { pressureAltitude: 0, oat: 20, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 20, timeFromSL: 3, fuelFromSL: 0.8, distanceFromSL: 4 },
    { pressureAltitude: 4000, oat: 20, timeFromSL: 6, fuelFromSL: 1.6, distanceFromSL: 8 },
    { pressureAltitude: 6000, oat: 20, timeFromSL: 10, fuelFromSL: 2.6, distanceFromSL: 13 },
    { pressureAltitude: 8000, oat: 20, timeFromSL: 15, fuelFromSL: 3.8, distanceFromSL: 20 },
    { pressureAltitude: 10000, oat: 20, timeFromSL: 21, fuelFromSL: 5.2, distanceFromSL: 29 },
    { pressureAltitude: 12000, oat: 20, timeFromSL: 29, fuelFromSL: 7.0, distanceFromSL: 41 },
    // 40°C
    { pressureAltitude: 0, oat: 40, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 40, timeFromSL: 4, fuelFromSL: 1.0, distanceFromSL: 5 },
    { pressureAltitude: 4000, oat: 40, timeFromSL: 8, fuelFromSL: 2.1, distanceFromSL: 11 },
    { pressureAltitude: 6000, oat: 40, timeFromSL: 13, fuelFromSL: 3.4, distanceFromSL: 18 },
    { pressureAltitude: 8000, oat: 40, timeFromSL: 20, fuelFromSL: 5.0, distanceFromSL: 28 },
    { pressureAltitude: 10000, oat: 40, timeFromSL: 29, fuelFromSL: 7.0, distanceFromSL: 41 },
  ],

  cruiseTable: [
    {
      altitude: 5000,
      rpm: 2300,
      percentPower: 65,
      tas: 135, // KTAS aprox a 65% :contentReference[oaicite:14]{index=14}
      fuelFlow: 11.5, // gph (21"/2300 ~ 11.5-11.8) :contentReference[oaicite:15]{index=15}
    },
    {
      altitude: 7000,
      rpm: 2300,
      percentPower: 65,
      tas: 137, // KTAS @65% :contentReference[oaicite:16]{index=16}
      fuelFlow: 11.0,
    },
    {
      altitude: 6500,
      rpm: 2400,
      percentPower: 75,
      tas: 143, // best cruise ~141–143 KIAS @75% :contentReference[oaicite:17]{index=17}
      fuelFlow: 13.8, // gph @75% :contentReference[oaicite:18]{index=18}
    },
  ],

  engine: {
    type: "Continental O-470-S",
    maxRPM: 2600,
    ratedHP: 230, // hp :contentReference[oaicite:19]{index=19}
    specificFuelConsumption: 0.40, // lbs/hp/hr típico
    usableFuelGallons: 75, // gal (setup típico club, long-range) :contentReference[oaicite:20]{index=20}
  },

  limits: {
    vne: 175, // KIAS (maximum limit speed) :contentReference[oaicite:21]{index=21}
    vno: 150, // aprox "normal operating" (cruise range)
    va: 111, // típico 182 a MTOW (aprox)
    vfe: 95, // flaps full (puede variar por submodelo)
    vs: 50, // KIAS clean :contentReference[oaicite:22]{index=22}
    vs0: 45, // KIAS landing config (48 en algunos POH, redondeado) :contentReference[oaicite:23]{index=23}
    maxCrosswind: 20, // kts, típico demostrado
    clMaxClean: 1.42,      // Clean configuration
    clMaxTakeoff: 1.62,    // Takeoff/approach flaps
    clMaxLanding: 1.75,    // Full landing flaps
  },

  /** ------------------------------------------------------------------
   *  SERVICE CEILING
   *  Maximum altitude where aircraft can maintain 100 fpm climb
   *  ------------------------------------------------------------------*/
  serviceCeiling: 18100, // ft pressure altitude

  /** ------------------------------------------------------------------
   *  TAKEOFF PERFORMANCE TABLE
   *  Based on Cessna 182P/Q POH data at gross weight (2,950 lbs)
   *  Conditions: Flaps up, full throttle, paved level runway, zero wind
   *  ------------------------------------------------------------------*/
  takeoffTable: [
    // Sea level
    { altitude: 0, oat: 0, groundRoll: 680, over50ft: 1335 },
    { altitude: 0, oat: 10, groundRoll: 710, over50ft: 1400 },
    { altitude: 0, oat: 20, groundRoll: 745, over50ft: 1470 },
    { altitude: 0, oat: 30, groundRoll: 785, over50ft: 1550 },
    { altitude: 0, oat: 40, groundRoll: 830, over50ft: 1640 },

    // 1,000 ft PA
    { altitude: 1000, oat: 0, groundRoll: 715, over50ft: 1410 },
    { altitude: 1000, oat: 10, groundRoll: 750, over50ft: 1480 },
    { altitude: 1000, oat: 20, groundRoll: 790, over50ft: 1560 },
    { altitude: 1000, oat: 30, groundRoll: 835, over50ft: 1650 },
    { altitude: 1000, oat: 40, groundRoll: 885, over50ft: 1750 },

    // 2,000 ft PA
    { altitude: 2000, oat: 0, groundRoll: 755, over50ft: 1490 },
    { altitude: 2000, oat: 10, groundRoll: 795, over50ft: 1570 },
    { altitude: 2000, oat: 20, groundRoll: 840, over50ft: 1660 },
    { altitude: 2000, oat: 30, groundRoll: 890, over50ft: 1760 },
    { altitude: 2000, oat: 40, groundRoll: 945, over50ft: 1870 },

    // 5,000 ft PA
    { altitude: 5000, oat: 0, groundRoll: 905, over50ft: 1800 },
    { altitude: 5000, oat: 10, groundRoll: 965, over50ft: 1920 },
    { altitude: 5000, oat: 20, groundRoll: 1030, over50ft: 2050 },
    { altitude: 5000, oat: 30, groundRoll: 1100, over50ft: 2195 },
    { altitude: 5000, oat: 40, groundRoll: 1180, over50ft: 2355 },

    // 7,500 ft PA
    { altitude: 7500, oat: 0, groundRoll: 1095, over50ft: 2200 },
    { altitude: 7500, oat: 10, groundRoll: 1175, over50ft: 2365 },
    { altitude: 7500, oat: 20, groundRoll: 1265, over50ft: 2550 },
    { altitude: 7500, oat: 30, groundRoll: 1365, over50ft: 2755 },
    { altitude: 7500, oat: 40, groundRoll: 1480, over50ft: 2990 },

    // 10,000 ft PA
    { altitude: 10000, oat: 0, groundRoll: 1345, over50ft: 2730 },
    { altitude: 10000, oat: 10, groundRoll: 1460, over50ft: 2970 },
    { altitude: 10000, oat: 20, groundRoll: 1590, over50ft: 3240 },
  ],
};
