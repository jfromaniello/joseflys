import { AircraftPerformance } from "./types";

export const PIPER_PA28_140: AircraftPerformance = {
  name: "Piper PA-28-140 Cherokee",
  model: "PA28-140",

  weights: {
    emptyWeight: 1180, // lbs typical for PA-28-140 (4-seat config)
    standardWeight: 2150, // performance tables at MTOW
    maxGrossWeight: 2150, // lbs (4-seat certification)
  },

  climbTable: [
    {
      altitudeFrom: 0,
      altitudeTo: 2000,
      rateOfClimb: 644, // fpm @ SL per POH
      climbTAS: 79, // KTAS (Vy ~ 79 KIAS)
      fuelFlow: 11.5, // gph at climb power
    },
    {
      altitudeFrom: 2000,
      altitudeTo: 4000,
      rateOfClimb: 590,
      climbTAS: 80,
      fuelFlow: 11.0,
    },
    {
      altitudeFrom: 4000,
      altitudeTo: 6000,
      rateOfClimb: 530,
      climbTAS: 81,
      fuelFlow: 10.5,
    },
    {
      altitudeFrom: 6000,
      altitudeTo: 8000,
      rateOfClimb: 465,
      climbTAS: 82,
      fuelFlow: 10.0,
    },
    {
      altitudeFrom: 8000,
      altitudeTo: 10000,
      rateOfClimb: 395,
      climbTAS: 83,
      fuelFlow: 9.5,
    },
    {
      altitudeFrom: 10000,
      altitudeTo: 12000,
      rateOfClimb: 315,
      climbTAS: 84,
      fuelFlow: 9.0,
    },
  ],

  cruiseTable: [
    {
      altitude: 2000,
      rpm: 2500,
      percentPower: 75,
      tas: 109, // KTAS approx at 75%
      fuelFlow: 9.0, // gph
    },
    {
      altitude: 4000,
      rpm: 2500,
      percentPower: 75,
      tas: 111,
      fuelFlow: 9.0,
    },
    {
      altitude: 6000,
      rpm: 2500,
      percentPower: 75,
      tas: 113,
      fuelFlow: 9.0,
    },
    {
      altitude: 8000,
      rpm: 2500,
      percentPower: 75,
      tas: 115,
      fuelFlow: 9.0,
    },
    {
      altitude: 2000,
      rpm: 2350,
      percentPower: 65,
      tas: 102, // KTAS approx at 65%
      fuelFlow: 7.5, // gph
    },
    {
      altitude: 4000,
      rpm: 2350,
      percentPower: 65,
      tas: 104,
      fuelFlow: 7.5,
    },
    {
      altitude: 6000,
      rpm: 2350,
      percentPower: 65,
      tas: 106,
      fuelFlow: 7.5,
    },
    {
      altitude: 8000,
      rpm: 2350,
      percentPower: 65,
      tas: 108,
      fuelFlow: 7.5,
    },
  ],

  engine: {
    type: "Lycoming O-320-E2A",
    maxRPM: 2700,
    ratedHP: 150, // hp
    specificFuelConsumption: 0.42, // lbs/hp/hr typical for O-320
    usableFuelGallons: 48, // gallons (50 total - 2 unusable)
  },

  limits: {
    vne: 147, // KIAS
    vno: 120, // KIAS
    va: 112, // KIAS at 2150 lbs
    vfe: 98, // KIAS (full flaps)
    vs: 55, // KIAS clean
    vs0: 47, // KIAS landing config
    maxCrosswind: 17, // kts demonstrated
    clMaxClean: 1.42, // Clean configuration
    clMaxTakeoff: 1.62, // Takeoff/approach flaps
    clMaxLanding: 1.75, // Full landing flaps
  },

  /** ------------------------------------------------------------------
   *  SERVICE CEILING
   *  Maximum altitude where aircraft can maintain 100 fpm climb
   *  ------------------------------------------------------------------*/
  serviceCeiling: 14300, // ft pressure altitude

  /** ------------------------------------------------------------------
   *  TAKEOFF PERFORMANCE TABLE
   *  Based on Piper PA-28-140 POH data at gross weight (2,150 lbs)
   *  Conditions: Flaps up, full throttle, paved level runway, zero wind
   *  ------------------------------------------------------------------*/
  takeoffTable: [
    // Sea level
    { altitude: 0, oat: 0, groundRoll: 710, over50ft: 1510 },
    { altitude: 0, oat: 10, groundRoll: 755, over50ft: 1605 },
    { altitude: 0, oat: 20, groundRoll: 800, over50ft: 1700 },
    { altitude: 0, oat: 30, groundRoll: 850, over50ft: 1805 },
    { altitude: 0, oat: 40, groundRoll: 905, over50ft: 1925 },

    // 2,000 ft PA
    { altitude: 2000, oat: 0, groundRoll: 820, over50ft: 1745 },
    { altitude: 2000, oat: 10, groundRoll: 875, over50ft: 1865 },
    { altitude: 2000, oat: 20, groundRoll: 935, over50ft: 1990 },
    { altitude: 2000, oat: 30, groundRoll: 1000, over50ft: 2130 },
    { altitude: 2000, oat: 40, groundRoll: 1070, over50ft: 2285 },

    // 4,000 ft PA
    { altitude: 4000, oat: 0, groundRoll: 950, over50ft: 2030 },
    { altitude: 4000, oat: 10, groundRoll: 1020, over50ft: 2180 },
    { altitude: 4000, oat: 20, groundRoll: 1095, over50ft: 2340 },
    { altitude: 4000, oat: 30, groundRoll: 1180, over50ft: 2525 },
    { altitude: 4000, oat: 40, groundRoll: 1275, over50ft: 2730 },

    // 6,000 ft PA
    { altitude: 6000, oat: 0, groundRoll: 1105, over50ft: 2380 },
    { altitude: 6000, oat: 10, groundRoll: 1195, over50ft: 2575 },
    { altitude: 6000, oat: 20, groundRoll: 1295, over50ft: 2795 },
    { altitude: 6000, oat: 30, groundRoll: 1410, over50ft: 3050 },
    { altitude: 6000, oat: 40, groundRoll: 1540, over50ft: 3340 },

    // 8,000 ft PA
    { altitude: 8000, oat: 0, groundRoll: 1300, over50ft: 2825 },
    { altitude: 8000, oat: 10, groundRoll: 1420, over50ft: 3090 },
    { altitude: 8000, oat: 20, groundRoll: 1560, over50ft: 3400 },
    { altitude: 8000, oat: 30, groundRoll: 1720, over50ft: 3755 },
  ],
};
