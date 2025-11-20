import { AircraftPerformance } from "./types";


export const CESSNA_170: AircraftPerformance = {
  name: "Cessna 170",
  model: "C170",

  weights: {
    emptyWeight: 1205, // lbs :contentReference[oaicite:0]{index=0}
    standardWeight: 2200, // lbs - POH performance usually at max gross
    maxGrossWeight: 2200, // lbs :contentReference[oaicite:1]{index=1}
  },

  climbTable: [
    {
      altitudeFrom: 0,
      altitudeTo: 2000,
      rateOfClimb: 690, // fpm @ SL gross :contentReference[oaicite:2]{index=2}
      climbTAS: 75, // KTAS (Vy ~ 70ish KIAS, redondeado)
      fuelFlow: 10.0, // gph aprox a potencia de ascenso
    },
    {
      altitudeFrom: 2000,
      altitudeTo: 4000,
      rateOfClimb: 600,
      climbTAS: 75,
      fuelFlow: 9.8,
    },
    {
      altitudeFrom: 4000,
      altitudeTo: 6000,
      rateOfClimb: 520,
      climbTAS: 76,
      fuelFlow: 9.6,
    },
    {
      altitudeFrom: 6000,
      altitudeTo: 8000,
      rateOfClimb: 430,
      climbTAS: 77,
      fuelFlow: 9.4,
    },
    {
      altitudeFrom: 8000,
      altitudeTo: 10000,
      rateOfClimb: 340,
      climbTAS: 78,
      fuelFlow: 9.2,
    },
  ],

  cruiseTable: [
    {
      altitude: 3000,
      rpm: 2450,
      percentPower: 65,
      tas: 100, // KTAS aprox
      fuelFlow: 8.8,
    },
    {
      altitude: 5000,
      rpm: 2550,
      percentPower: 75,
      tas: 104, // Best cruise ~104 KIAS @75% :contentReference[oaicite:3]{index=3}
      fuelFlow: 9.6, // gph @75% :contentReference[oaicite:4]{index=4}
    },
    {
      altitude: 7000,
      rpm: 2550,
      percentPower: 75,
      tas: 106,
      fuelFlow: 9.6,
    },
  ],

  engine: {
    type: "Continental C145-2",
    maxRPM: 2700,
    ratedHP: 145, // hp :contentReference[oaicite:5]{index=5}
    specificFuelConsumption: 0.42, // lbs/hp/hr aprox
    usableFuelGallons: 42, // gal (capacidad típica) :contentReference[oaicite:6]{index=6}
  },

  limits: {
    vne: 139, // KIAS (do not exceed) :contentReference[oaicite:7]{index=7}
    vno: 122, // max structural cruise :contentReference[oaicite:8]{index=8}
    va: 97, // aprox (depende de peso; valor típico)
    vfe: 100, // similar a C150, aproximado
    vs: 50, // clean, KIAS :contentReference[oaicite:9]{index=9}
    vs0: 45, // landing config, KIAS :contentReference[oaicite:10]{index=10}
    maxCrosswind: 15, // kts aprox (demostrado, no límite oficial)
    clMaxClean: 1.50,      // Clean configuration
    clMaxTakeoff: 1.70,    // Takeoff/approach flaps
    clMaxLanding: 1.85,    // Full landing flaps
  },

  /** ------------------------------------------------------------------
   *  SERVICE CEILING
   *  Maximum altitude where aircraft can maintain 100 fpm climb
   *  ------------------------------------------------------------------*/
  serviceCeiling: 15500, // ft pressure altitude

  /** ------------------------------------------------------------------
   *  TAKEOFF PERFORMANCE TABLE
   *  Estimated based on Cessna 170 characteristics at gross weight (2,200 lbs)
   *  145 hp Continental C145-2, paved level runway, zero wind
   *  Note: Can operate from runways <1000ft at sea level
   *  ------------------------------------------------------------------*/
  takeoffTable: [
    // Sea level
    { altitude: 0, oat: 0, groundRoll: 640, over50ft: 1250 },
    { altitude: 0, oat: 10, groundRoll: 670, over50ft: 1310 },
    { altitude: 0, oat: 20, groundRoll: 705, over50ft: 1380 },
    { altitude: 0, oat: 30, groundRoll: 745, over50ft: 1460 },
    { altitude: 0, oat: 40, groundRoll: 790, over50ft: 1550 },

    // 1,000 ft PA
    { altitude: 1000, oat: 0, groundRoll: 675, over50ft: 1325 },
    { altitude: 1000, oat: 10, groundRoll: 710, over50ft: 1395 },
    { altitude: 1000, oat: 20, groundRoll: 750, over50ft: 1475 },
    { altitude: 1000, oat: 30, groundRoll: 795, over50ft: 1565 },
    { altitude: 1000, oat: 40, groundRoll: 845, over50ft: 1665 },

    // 2,500 ft PA
    { altitude: 2500, oat: 0, groundRoll: 740, over50ft: 1460 },
    { altitude: 2500, oat: 10, groundRoll: 780, over50ft: 1540 },
    { altitude: 2500, oat: 20, groundRoll: 825, over50ft: 1630 },
    { altitude: 2500, oat: 30, groundRoll: 875, over50ft: 1735 },
    { altitude: 2500, oat: 40, groundRoll: 930, over50ft: 1850 },

    // 5,000 ft PA
    { altitude: 5000, oat: 0, groundRoll: 860, over50ft: 1715 },
    { altitude: 5000, oat: 10, groundRoll: 915, over50ft: 1825 },
    { altitude: 5000, oat: 20, groundRoll: 975, over50ft: 1950 },
    { altitude: 5000, oat: 30, groundRoll: 1040, over50ft: 2085 },
    { altitude: 5000, oat: 40, groundRoll: 1115, over50ft: 2235 },

    // 7,500 ft PA
    { altitude: 7500, oat: 0, groundRoll: 1025, over50ft: 2065 },
    { altitude: 7500, oat: 10, groundRoll: 1095, over50ft: 2205 },
    { altitude: 7500, oat: 20, groundRoll: 1175, over50ft: 2370 },
    { altitude: 7500, oat: 30, groundRoll: 1265, over50ft: 2555 },
    { altitude: 7500, oat: 40, groundRoll: 1365, over50ft: 2760 },

    // 10,000 ft PA
    { altitude: 10000, oat: 0, groundRoll: 1260, over50ft: 2555 },
    { altitude: 10000, oat: 10, groundRoll: 1360, over50ft: 2760 },
    { altitude: 10000, oat: 20, groundRoll: 1475, over50ft: 2995 },
  ],
};
