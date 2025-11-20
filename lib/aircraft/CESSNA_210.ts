import { AircraftPerformance } from "./types";

export const CESSNA_210: AircraftPerformance = {
  name: "Cessna 210 Centurion",
  model: "C210",

  weights: {
    emptyWeight: 2305, // lbs typical for 210L
    standardWeight: 3800, // performance tables at MTOW (210L/M)
    maxGrossWeight: 3800, // lbs (210L/M models, earlier models 3400 lbs)
  },

  climbTable: [
    {
      altitudeFrom: 0,
      altitudeTo: 2000,
      rateOfClimb: 950, // fpm @ SL per POH
      climbTAS: 105, // KTAS (Vy ~ 92 KIAS)
      fuelFlow: 21.0, // gph at climb power
    },
    {
      altitudeFrom: 2000,
      altitudeTo: 4000,
      rateOfClimb: 870,
      climbTAS: 106,
      fuelFlow: 20.5,
    },
    {
      altitudeFrom: 4000,
      altitudeTo: 6000,
      rateOfClimb: 785,
      climbTAS: 107,
      fuelFlow: 20.0,
    },
    {
      altitudeFrom: 6000,
      altitudeTo: 8000,
      rateOfClimb: 695,
      climbTAS: 108,
      fuelFlow: 19.5,
    },
    {
      altitudeFrom: 8000,
      altitudeTo: 10000,
      rateOfClimb: 600,
      climbTAS: 109,
      fuelFlow: 19.0,
    },
    {
      altitudeFrom: 10000,
      altitudeTo: 12000,
      rateOfClimb: 500,
      climbTAS: 110,
      fuelFlow: 18.5,
    },
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
