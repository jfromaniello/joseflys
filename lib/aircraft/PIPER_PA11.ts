import { AircraftPerformance } from "./types";


export const PIPER_PA11: AircraftPerformance = {
  name: "Piper PA-11 Cub Special",
  model: "PA-11",

  description: "The Piper PA-11 Cub Special is a two-seat light aircraft produced from 1947 to 1949. It was developed as an improved version of the legendary J-3 Cub with a fully enclosed engine cowling and more powerful Continental or Lycoming engines (90 HP). Over 1,500 units were built and it remains popular among tailwheel enthusiasts and backcountry pilots.",

  wikipediaUrl: "https://en.wikipedia.org/wiki/Piper_PA-11",

  weights: {
    emptyWeight: 730, // lbs :contentReference[oaicite:24]{index=24}
    standardWeight: 1220, // usamos MTOW como estándar
    maxGrossWeight: 1220, // lbs (~553 kg) :contentReference[oaicite:25]{index=25}
  },

  // Cumulative climb performance from Sea Level (POH-style)
  // Based on PA-11 Cub Special characteristics with 90 hp C90 engine
  climbTable: [
    // 0°C
    { pressureAltitude: 0, oat: 0, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 0, timeFromSL: 3, fuelFromSL: 0.3, distanceFromSL: 2 },
    { pressureAltitude: 4000, oat: 0, timeFromSL: 6, fuelFromSL: 0.6, distanceFromSL: 5 },
    { pressureAltitude: 6000, oat: 0, timeFromSL: 10, fuelFromSL: 1.0, distanceFromSL: 8 },
    { pressureAltitude: 8000, oat: 0, timeFromSL: 15, fuelFromSL: 1.4, distanceFromSL: 12 },
    // 20°C
    { pressureAltitude: 0, oat: 20, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 20, timeFromSL: 4, fuelFromSL: 0.4, distanceFromSL: 3 },
    { pressureAltitude: 4000, oat: 20, timeFromSL: 8, fuelFromSL: 0.8, distanceFromSL: 6 },
    { pressureAltitude: 6000, oat: 20, timeFromSL: 13, fuelFromSL: 1.2, distanceFromSL: 10 },
    { pressureAltitude: 8000, oat: 20, timeFromSL: 19, fuelFromSL: 1.8, distanceFromSL: 15 },
    // 40°C
    { pressureAltitude: 0, oat: 40, timeFromSL: 0, fuelFromSL: 0, distanceFromSL: 0 },
    { pressureAltitude: 2000, oat: 40, timeFromSL: 5, fuelFromSL: 0.5, distanceFromSL: 4 },
    { pressureAltitude: 4000, oat: 40, timeFromSL: 11, fuelFromSL: 1.0, distanceFromSL: 9 },
    { pressureAltitude: 6000, oat: 40, timeFromSL: 19, fuelFromSL: 1.8, distanceFromSL: 15 },
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
