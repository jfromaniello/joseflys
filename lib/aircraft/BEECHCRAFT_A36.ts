import { AircraftPerformance } from "./types";

export const BEECHCRAFT_A36: AircraftPerformance = {
  name: "Beechcraft A36 Bonanza",
  model: "A36",

  weights: {
    emptyWeight: 2437, // lbs typical for A36 with IO-550
    standardWeight: 3650, // performance tables at MTOW (IO-550 models)
    maxGrossWeight: 3650, // lbs (IO-550 models, earlier IO-520 models 3600 lbs)
  },

  climbTable: [
    {
      altitudeFrom: 0,
      altitudeTo: 2000,
      rateOfClimb: 1210, // fpm @ SL per POH
      climbTAS: 100, // KTAS (Vy ~ 96 KIAS)
      fuelFlow: 20.0, // gph at climb power
    },
    {
      altitudeFrom: 2000,
      altitudeTo: 4000,
      rateOfClimb: 1110,
      climbTAS: 101,
      fuelFlow: 19.5,
    },
    {
      altitudeFrom: 4000,
      altitudeTo: 6000,
      rateOfClimb: 1005,
      climbTAS: 102,
      fuelFlow: 19.0,
    },
    {
      altitudeFrom: 6000,
      altitudeTo: 8000,
      rateOfClimb: 895,
      climbTAS: 103,
      fuelFlow: 18.5,
    },
    {
      altitudeFrom: 8000,
      altitudeTo: 10000,
      rateOfClimb: 780,
      climbTAS: 104,
      fuelFlow: 18.0,
    },
    {
      altitudeFrom: 10000,
      altitudeTo: 12000,
      rateOfClimb: 660,
      climbTAS: 105,
      fuelFlow: 17.5,
    },
  ],

  cruiseTable: [
    {
      altitude: 4000,
      rpm: 2500,
      percentPower: 75,
      tas: 165, // KTAS approx at 75%
      fuelFlow: 16.0, // gph
    },
    {
      altitude: 6000,
      rpm: 2500,
      percentPower: 75,
      tas: 168,
      fuelFlow: 16.0,
    },
    {
      altitude: 8000,
      rpm: 2500,
      percentPower: 75,
      tas: 171,
      fuelFlow: 16.0,
    },
    {
      altitude: 10000,
      rpm: 2500,
      percentPower: 75,
      tas: 174,
      fuelFlow: 16.0,
    },
    {
      altitude: 6000,
      rpm: 2350,
      percentPower: 65,
      tas: 159, // KTAS approx at 65%
      fuelFlow: 14.0, // gph
    },
    {
      altitude: 8000,
      rpm: 2350,
      percentPower: 65,
      tas: 162,
      fuelFlow: 14.0,
    },
    {
      altitude: 10000,
      rpm: 2350,
      percentPower: 65,
      tas: 165,
      fuelFlow: 14.0,
    },
    {
      altitude: 12000,
      rpm: 2350,
      percentPower: 65,
      tas: 167,
      fuelFlow: 14.0,
    },
  ],

  engine: {
    type: "Continental IO-550-B",
    maxRPM: 2700,
    ratedHP: 300, // hp (fuel injected, earlier models IO-520 with 285 hp)
    specificFuelConsumption: 0.40, // lbs/hp/hr typical for IO-550
    usableFuelGallons: 74, // gallons (standard extended range)
  },

  limits: {
    vne: 205, // KIAS
    vno: 167, // KIAS
    va: 141, // KIAS at max gross weight
    vfe: 154, // KIAS (approach flaps 12°), 124 KIAS (full flaps 30°)
    vs: 68, // KIAS clean (Vs1)
    vs0: 58, // KIAS landing config
    maxCrosswind: 20, // kts demonstrated
    clMaxClean: 1.42, // Clean configuration
    clMaxTakeoff: 1.62, // Takeoff/approach flaps
    clMaxLanding: 1.75, // Full landing flaps
  },

  /** ------------------------------------------------------------------
   *  SERVICE CEILING
   *  Maximum altitude where aircraft can maintain 100 fpm climb
   *  ------------------------------------------------------------------*/
  serviceCeiling: 16600, // ft pressure altitude

  /** ------------------------------------------------------------------
   *  TAKEOFF PERFORMANCE TABLE
   *  Based on Beechcraft A36 Bonanza POH data at gross weight (3,650 lbs)
   *  Conditions: Flaps up, full throttle, paved level runway, zero wind
   *  Note: High-performance 6-seat aircraft
   *  ------------------------------------------------------------------*/
  takeoffTable: [
    // Sea level
    { altitude: 0, oat: 0, groundRoll: 1070, over50ft: 1700 },
    { altitude: 0, oat: 10, groundRoll: 1135, over50ft: 1805 },
    { altitude: 0, oat: 20, groundRoll: 1205, over50ft: 1915 },
    { altitude: 0, oat: 30, groundRoll: 1280, over50ft: 2035 },
    { altitude: 0, oat: 40, groundRoll: 1365, over50ft: 2170 },

    // 2,000 ft PA
    { altitude: 2000, oat: 0, groundRoll: 1240, over50ft: 1975 },
    { altitude: 2000, oat: 10, groundRoll: 1320, over50ft: 2100 },
    { altitude: 2000, oat: 20, groundRoll: 1410, over50ft: 2240 },
    { altitude: 2000, oat: 30, groundRoll: 1505, over50ft: 2395 },
    { altitude: 2000, oat: 40, groundRoll: 1615, over50ft: 2570 },

    // 4,000 ft PA
    { altitude: 4000, oat: 0, groundRoll: 1455, over50ft: 2320 },
    { altitude: 4000, oat: 10, groundRoll: 1560, over50ft: 2485 },
    { altitude: 4000, oat: 20, groundRoll: 1675, over50ft: 2670 },
    { altitude: 4000, oat: 30, groundRoll: 1805, over50ft: 2880 },
    { altitude: 4000, oat: 40, groundRoll: 1950, over50ft: 3110 },

    // 6,000 ft PA
    { altitude: 6000, oat: 0, groundRoll: 1725, over50ft: 2765 },
    { altitude: 6000, oat: 10, groundRoll: 1860, over50ft: 2980 },
    { altitude: 6000, oat: 20, groundRoll: 2015, over50ft: 3230 },
    { altitude: 6000, oat: 30, groundRoll: 2190, over50ft: 3515 },
    { altitude: 6000, oat: 40, groundRoll: 2385, over50ft: 3835 },

    // 8,000 ft PA
    { altitude: 8000, oat: 0, groundRoll: 2065, over50ft: 3330 },
    { altitude: 8000, oat: 10, groundRoll: 2250, over50ft: 3630 },
    { altitude: 8000, oat: 20, groundRoll: 2465, over50ft: 3980 },
    { altitude: 8000, oat: 30, groundRoll: 2710, over50ft: 4380 },
  ],
};
