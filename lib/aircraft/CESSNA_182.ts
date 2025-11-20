import { AircraftPerformance } from "./types";


export const CESSNA_182: AircraftPerformance = {
  name: "Cessna 182P Skylane",
  model: "C182P",

  weights: {
    emptyWeight: 1750, // promedio entre varios 182P :contentReference[oaicite:11]{index=11}
    standardWeight: 2950, // asumimos tablas a MTOW
    maxGrossWeight: 2950, // lbs (182P clásico) :contentReference[oaicite:12]{index=12}
  },

  climbTable: [
    {
      altitudeFrom: 0,
      altitudeTo: 2000,
      rateOfClimb: 1000, // fpm @ SL :contentReference[oaicite:13]{index=13}
      climbTAS: 85, // KTAS aprox (Vy ~ 85 KIAS)
      fuelFlow: 18.0, // gph a potencia de despegue/ascenso
    },
    {
      altitudeFrom: 2000,
      altitudeTo: 4000,
      rateOfClimb: 900,
      climbTAS: 86,
      fuelFlow: 17.5,
    },
    {
      altitudeFrom: 4000,
      altitudeTo: 6000,
      rateOfClimb: 800,
      climbTAS: 88,
      fuelFlow: 17.0,
    },
    {
      altitudeFrom: 6000,
      altitudeTo: 8000,
      rateOfClimb: 700,
      climbTAS: 90,
      fuelFlow: 16.5,
    },
    {
      altitudeFrom: 8000,
      altitudeTo: 10000,
      rateOfClimb: 600,
      climbTAS: 92,
      fuelFlow: 16.0,
    },
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
