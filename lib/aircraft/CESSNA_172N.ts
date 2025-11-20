import { AircraftPerformance } from "./types";

export const CESSNA_172N: AircraftPerformance = {
  name: "Cessna 172N Skyhawk",
  model: "C172N",

  weights: {
    emptyWeight: 1370, // lbs typical for 172N
    standardWeight: 2300, // performance tables at MTOW
    maxGrossWeight: 2300, // lbs (172N standard)
  },

  climbTable: [
    {
      altitudeFrom: 0,
      altitudeTo: 2000,
      rateOfClimb: 730, // fpm @ SL per POH
      climbTAS: 79, // KTAS (Vy ~ 79 KIAS)
      fuelFlow: 11.0, // gph at climb power
    },
    {
      altitudeFrom: 2000,
      altitudeTo: 4000,
      rateOfClimb: 680,
      climbTAS: 80,
      fuelFlow: 10.5,
    },
    {
      altitudeFrom: 4000,
      altitudeTo: 6000,
      rateOfClimb: 620,
      climbTAS: 81,
      fuelFlow: 10.0,
    },
    {
      altitudeFrom: 6000,
      altitudeTo: 8000,
      rateOfClimb: 560,
      climbTAS: 82,
      fuelFlow: 9.5,
    },
    {
      altitudeFrom: 8000,
      altitudeTo: 10000,
      rateOfClimb: 490,
      climbTAS: 83,
      fuelFlow: 9.0,
    },
    {
      altitudeFrom: 10000,
      altitudeTo: 12000,
      rateOfClimb: 410,
      climbTAS: 84,
      fuelFlow: 8.5,
    },
  ],

  cruiseTable: [
    {
      altitude: 2000,
      rpm: 2400,
      percentPower: 75,
      tas: 106, // KTAS approx at 75%
      fuelFlow: 8.0, // gph
    },
    {
      altitude: 4000,
      rpm: 2400,
      percentPower: 75,
      tas: 108,
      fuelFlow: 8.0,
    },
    {
      altitude: 6000,
      rpm: 2400,
      percentPower: 75,
      tas: 110,
      fuelFlow: 8.0,
    },
    {
      altitude: 8000,
      rpm: 2400,
      percentPower: 75,
      tas: 111,
      fuelFlow: 8.0,
    },
    {
      altitude: 2000,
      rpm: 2300,
      percentPower: 65,
      tas: 101, // KTAS approx at 65%
      fuelFlow: 7.0, // gph
    },
    {
      altitude: 4000,
      rpm: 2300,
      percentPower: 65,
      tas: 103,
      fuelFlow: 7.0,
    },
    {
      altitude: 6000,
      rpm: 2300,
      percentPower: 65,
      tas: 105,
      fuelFlow: 7.0,
    },
    {
      altitude: 8000,
      rpm: 2300,
      percentPower: 65,
      tas: 107,
      fuelFlow: 7.0,
    },
  ],

  engine: {
    type: "Lycoming O-320-H2AD",
    maxRPM: 2700,
    ratedHP: 160, // hp
    specificFuelConsumption: 0.42, // lbs/hp/hr typical for O-320
    usableFuelGallons: 40, // gallons (standard tanks, 56 total - 16 unusable)
  },

  limits: {
    vne: 160, // KIAS
    vno: 128, // KIAS
    va: 97, // KIAS at 2300 lbs
    vfe: 85, // KIAS (full flaps)
    vs: 47, // KIAS clean
    vs0: 41, // KIAS landing config
    maxCrosswind: 15, // kts demonstrated
    clMaxClean: 1.42, // Clean configuration
    clMaxTakeoff: 1.62, // Takeoff/approach flaps
    clMaxLanding: 1.75, // Full landing flaps
  },

  /** ------------------------------------------------------------------
   *  SERVICE CEILING
   *  Maximum altitude where aircraft can maintain 100 fpm climb
   *  ------------------------------------------------------------------*/
  serviceCeiling: 14200, // ft pressure altitude

  /** ------------------------------------------------------------------
   *  TAKEOFF PERFORMANCE TABLE
   *  Based on Cessna 172N POH data at gross weight (2,300 lbs)
   *  Conditions: Flaps up, full throttle, paved level runway, zero wind
   *  ------------------------------------------------------------------*/
  takeoffTable: [
    // Sea level
    { altitude: 0, oat: 0, groundRoll: 715, over50ft: 1280 },
    { altitude: 0, oat: 10, groundRoll: 755, over50ft: 1360 },
    { altitude: 0, oat: 20, groundRoll: 805, over50ft: 1440 },
    { altitude: 0, oat: 30, groundRoll: 855, over50ft: 1530 },
    { altitude: 0, oat: 40, groundRoll: 915, over50ft: 1635 },

    // 2,000 ft PA
    { altitude: 2000, oat: 0, groundRoll: 820, over50ft: 1475 },
    { altitude: 2000, oat: 10, groundRoll: 875, over50ft: 1575 },
    { altitude: 2000, oat: 20, groundRoll: 935, over50ft: 1680 },
    { altitude: 2000, oat: 30, groundRoll: 1000, over50ft: 1800 },
    { altitude: 2000, oat: 40, groundRoll: 1075, over50ft: 1935 },

    // 4,000 ft PA
    { altitude: 4000, oat: 0, groundRoll: 945, over50ft: 1710 },
    { altitude: 4000, oat: 10, groundRoll: 1015, over50ft: 1835 },
    { altitude: 4000, oat: 20, groundRoll: 1090, over50ft: 1975 },
    { altitude: 4000, oat: 30, groundRoll: 1175, over50ft: 2130 },
    { altitude: 4000, oat: 40, groundRoll: 1270, over50ft: 2310 },

    // 6,000 ft PA
    { altitude: 6000, oat: 0, groundRoll: 1095, over50ft: 1995 },
    { altitude: 6000, oat: 10, groundRoll: 1185, over50ft: 2155 },
    { altitude: 6000, oat: 20, groundRoll: 1285, over50ft: 2340 },
    { altitude: 6000, oat: 30, groundRoll: 1395, over50ft: 2545 },
    { altitude: 6000, oat: 40, groundRoll: 1525, over50ft: 2790 },

    // 8,000 ft PA
    { altitude: 8000, oat: 0, groundRoll: 1285, over50ft: 2365 },
    { altitude: 8000, oat: 10, groundRoll: 1400, over50ft: 2580 },
    { altitude: 8000, oat: 20, groundRoll: 1535, over50ft: 2835 },
    { altitude: 8000, oat: 30, groundRoll: 1685, over50ft: 3125 },
  ],
};
