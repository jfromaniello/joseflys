import { AircraftPerformance } from "./types";


export const PIPER_PA11: AircraftPerformance = {
  name: "Piper PA-11 Cub Special",
  model: "PA-11",

  weights: {
    emptyWeight: 730, // lbs :contentReference[oaicite:24]{index=24}
    standardWeight: 1220, // usamos MTOW como estándar
    maxGrossWeight: 1220, // lbs (~553 kg) :contentReference[oaicite:25]{index=25}
  },

  climbTable: [
    {
      altitudeFrom: 0,
      altitudeTo: 2000,
      rateOfClimb: 800, // fpm típico entre datos de 500–900 fpm :contentReference[oaicite:26]{index=26}
      climbTAS: 50, // KTAS (Vy ~ 55 mph ≈ 48 kt) :contentReference[oaicite:27]{index=27}
      fuelFlow: 6.0, // gph @ full power :contentReference[oaicite:28]{index=28}
    },
    {
      altitudeFrom: 2000,
      altitudeTo: 4000,
      rateOfClimb: 700,
      climbTAS: 51,
      fuelFlow: 5.8,
    },
    {
      altitudeFrom: 4000,
      altitudeTo: 6000,
      rateOfClimb: 600,
      climbTAS: 52,
      fuelFlow: 5.6,
    },
    {
      altitudeFrom: 6000,
      altitudeTo: 8000,
      rateOfClimb: 500,
      climbTAS: 53,
      fuelFlow: 5.4,
    },
  ],

  cruiseTable: [
    {
      altitude: 3000,
      rpm: 2100,
      percentPower: 75,
      tas: 87, // KTAS cruise típico 86–87 kts :contentReference[oaicite:29]{index=29}
      fuelFlow: 5.5,
    },
    {
      altitude: 3500,
      rpm: 2400,
      percentPower: 85,
      tas: 92, // 105 mph IAS ~ 91 kt, aproximado :contentReference[oaicite:30]{index=30}
      fuelFlow: 6.0,
    },
    {
      altitude: 3000,
      rpm: 2000,
      percentPower: 65,
      tas: 80,
      fuelFlow: 5.0,
    },
  ],

  engine: {
    type: "Continental C90-8",
    maxRPM: 2475,
    ratedHP: 90, // hp :contentReference[oaicite:31]{index=31}
    specificFuelConsumption: 0.42,
    usableFuelGallons: 17, // ~62 L ≈ 16.8 US gal, redondeado :contentReference[oaicite:32]{index=32}
  },

  limits: {
    vne: 106, // KIAS (~122 mph "planeo o picada") :contentReference[oaicite:33]{index=33}
    vno: 78, // KIAS (~90 mph "vuelo nivelado o ascenso") :contentReference[oaicite:34]{index=34}
    va: 70, // aprox, por debajo de Vno
    vfe: 0, // no flaps (puedes tratarlo aparte en tu UI)
    vs: 35, // KIAS stall clean (35 kts aprox) :contentReference[oaicite:35]{index=35}



    /**
     * Note: PA-11 has no flaps, so vs0 is set equal to vs for convenience.
     */
    vs0: 35,
    maxCrosswind: 10, // kts aprox
    clMaxClean: 1.55,      // Clean configuration (no flaps on PA-11)
    clMaxTakeoff: 1.55,    // Same as clean (no takeoff flaps)
    clMaxLanding: 1.55,    // Same as clean (no flaps)
  },

  /** ------------------------------------------------------------------
   *  SERVICE CEILING
   *  Maximum altitude where aircraft can maintain 100 fpm climb
   *  ------------------------------------------------------------------*/
  serviceCeiling: 13000, // ft pressure altitude

  /** ------------------------------------------------------------------
   *  TAKEOFF PERFORMANCE TABLE
   *  Based on PA-11 Cub Special with 90 hp Continental C90
   *  At gross weight (1,220 lbs), paved level runway, zero wind
   *  ------------------------------------------------------------------*/
  takeoffTable: [
    // Sea level
    { altitude: 0, oat: 0, groundRoll: 340, over50ft: 675 },
    { altitude: 0, oat: 10, groundRoll: 355, over50ft: 705 },
    { altitude: 0, oat: 20, groundRoll: 370, over50ft: 730 },
    { altitude: 0, oat: 30, groundRoll: 390, over50ft: 765 },
    { altitude: 0, oat: 40, groundRoll: 410, over50ft: 805 },

    // 1,000 ft PA
    { altitude: 1000, oat: 0, groundRoll: 360, over50ft: 715 },
    { altitude: 1000, oat: 10, groundRoll: 375, over50ft: 745 },
    { altitude: 1000, oat: 20, groundRoll: 395, over50ft: 780 },
    { altitude: 1000, oat: 30, groundRoll: 415, over50ft: 820 },
    { altitude: 1000, oat: 40, groundRoll: 440, over50ft: 865 },

    // 2,500 ft PA
    { altitude: 2500, oat: 0, groundRoll: 395, over50ft: 785 },
    { altitude: 2500, oat: 10, groundRoll: 415, over50ft: 825 },
    { altitude: 2500, oat: 20, groundRoll: 435, over50ft: 865 },
    { altitude: 2500, oat: 30, groundRoll: 460, over50ft: 915 },
    { altitude: 2500, oat: 40, groundRoll: 490, over50ft: 970 },

    // 5,000 ft PA
    { altitude: 5000, oat: 0, groundRoll: 455, over50ft: 910 },
    { altitude: 5000, oat: 10, groundRoll: 485, over50ft: 965 },
    { altitude: 5000, oat: 20, groundRoll: 515, over50ft: 1025 },
    { altitude: 5000, oat: 30, groundRoll: 550, over50ft: 1095 },
    { altitude: 5000, oat: 40, groundRoll: 590, over50ft: 1175 },

    // 7,500 ft PA
    { altitude: 7500, oat: 0, groundRoll: 545, over50ft: 1095 },
    { altitude: 7500, oat: 10, groundRoll: 585, over50ft: 1170 },
    { altitude: 7500, oat: 20, groundRoll: 630, over50ft: 1260 },
    { altitude: 7500, oat: 30, groundRoll: 680, over50ft: 1360 },
    { altitude: 7500, oat: 40, groundRoll: 735, over50ft: 1475 },

    // 10,000 ft PA
    { altitude: 10000, oat: 0, groundRoll: 675, over50ft: 1355 },
    { altitude: 10000, oat: 10, groundRoll: 730, over50ft: 1465 },
    { altitude: 10000, oat: 20, groundRoll: 795, over50ft: 1595 },
  ],
};
