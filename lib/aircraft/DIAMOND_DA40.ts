import { AircraftPerformance } from "./types";

export const DIAMOND_DA40: AircraftPerformance = {
  name: "Diamond DA40 Star",
  model: "DA40",

  weights: {
    emptyWeight: 1746, // lbs typical for DA40 with IO-360
    standardWeight: 2646, // performance tables at MTOW
    maxGrossWeight: 2646, // lbs
  },

  climbTable: [
    {
      altitudeFrom: 0,
      altitudeTo: 2000,
      rateOfClimb: 1120, // fpm @ SL (DA40 XLS with PowerFlow)
      climbTAS: 85, // KTAS
      fuelFlow: 13.0, // gph at climb power
    },
    {
      altitudeFrom: 2000,
      altitudeTo: 4000,
      rateOfClimb: 1020,
      climbTAS: 86,
      fuelFlow: 12.5,
    },
    {
      altitudeFrom: 4000,
      altitudeTo: 6000,
      rateOfClimb: 915,
      climbTAS: 87,
      fuelFlow: 12.0,
    },
    {
      altitudeFrom: 6000,
      altitudeTo: 8000,
      rateOfClimb: 805,
      climbTAS: 88,
      fuelFlow: 11.5,
    },
    {
      altitudeFrom: 8000,
      altitudeTo: 10000,
      rateOfClimb: 690,
      climbTAS: 89,
      fuelFlow: 11.0,
    },
    {
      altitudeFrom: 10000,
      altitudeTo: 12000,
      rateOfClimb: 565,
      climbTAS: 90,
      fuelFlow: 10.5,
    },
  ],

  cruiseTable: [
    {
      altitude: 3000,
      rpm: 2400,
      percentPower: 75,
      tas: 140, // KTAS approx at 75%
      fuelFlow: 10.0, // gph
    },
    {
      altitude: 5000,
      rpm: 2400,
      percentPower: 75,
      tas: 143,
      fuelFlow: 10.0,
    },
    {
      altitude: 7000,
      rpm: 2400,
      percentPower: 75,
      tas: 146,
      fuelFlow: 10.0,
    },
    {
      altitude: 9000,
      rpm: 2400,
      percentPower: 75,
      tas: 148,
      fuelFlow: 10.0,
    },
    {
      altitude: 3000,
      rpm: 2200,
      percentPower: 65,
      tas: 130, // KTAS approx at 65%
      fuelFlow: 8.5, // gph (best economy)
    },
    {
      altitude: 5000,
      rpm: 2200,
      percentPower: 65,
      tas: 132,
      fuelFlow: 8.5,
    },
    {
      altitude: 7000,
      rpm: 2200,
      percentPower: 65,
      tas: 135,
      fuelFlow: 8.5,
    },
    {
      altitude: 9000,
      rpm: 2200,
      percentPower: 65,
      tas: 137,
      fuelFlow: 8.5,
    },
  ],

  engine: {
    type: "Lycoming IO-360-M1A",
    maxRPM: 2700,
    ratedHP: 180, // hp (fuel injected)
    specificFuelConsumption: 0.42, // lbs/hp/hr typical for IO-360
    usableFuelGallons: 50, // gallons usable
  },

  limits: {
    vne: 178, // KIAS
    vno: 129, // KIAS
    va: 108, // KIAS at max gross weight
    vfe: 108, // KIAS (takeoff flaps), 91 KIAS (landing flaps)
    vs: 55, // KIAS clean
    vs0: 49, // KIAS landing config (full flaps)
    maxCrosswind: 20, // kts demonstrated
    clMaxClean: 1.42, // Clean configuration
    clMaxTakeoff: 1.62, // Takeoff flaps
    clMaxLanding: 1.75, // Landing flaps
  },

  /** ------------------------------------------------------------------
   *  SERVICE CEILING
   *  Maximum altitude where aircraft can maintain 100 fpm climb
   *  ------------------------------------------------------------------*/
  serviceCeiling: 16400, // ft pressure altitude

  /** ------------------------------------------------------------------
   *  TAKEOFF PERFORMANCE TABLE
   *  Based on Diamond DA40 POH data at gross weight (2,646 lbs)
   *  Conditions: Takeoff flaps, full throttle, paved level runway, zero wind
   *  Note: Composite aircraft with excellent climb performance
   *  ------------------------------------------------------------------*/
  takeoffTable: [
    // Sea level
    { altitude: 0, oat: 0, groundRoll: 885, over50ft: 1285 },
    { altitude: 0, oat: 10, groundRoll: 940, over50ft: 1365 },
    { altitude: 0, oat: 20, groundRoll: 1000, over50ft: 1450 },
    { altitude: 0, oat: 30, groundRoll: 1065, over50ft: 1545 },
    { altitude: 0, oat: 40, groundRoll: 1135, over50ft: 1645 },

    // 2,000 ft PA
    { altitude: 2000, oat: 0, groundRoll: 1025, over50ft: 1490 },
    { altitude: 2000, oat: 10, groundRoll: 1095, over50ft: 1590 },
    { altitude: 2000, oat: 20, groundRoll: 1170, over50ft: 1700 },
    { altitude: 2000, oat: 30, groundRoll: 1250, over50ft: 1815 },
    { altitude: 2000, oat: 40, groundRoll: 1340, over50ft: 1945 },

    // 4,000 ft PA
    { altitude: 4000, oat: 0, groundRoll: 1195, over50ft: 1740 },
    { altitude: 4000, oat: 10, groundRoll: 1280, over50ft: 1865 },
    { altitude: 4000, oat: 20, groundRoll: 1375, over50ft: 2000 },
    { altitude: 4000, oat: 30, groundRoll: 1480, over50ft: 2155 },
    { altitude: 4000, oat: 40, groundRoll: 1595, over50ft: 2325 },

    // 6,000 ft PA
    { altitude: 6000, oat: 0, groundRoll: 1405, over50ft: 2050 },
    { altitude: 6000, oat: 10, groundRoll: 1510, over50ft: 2205 },
    { altitude: 6000, oat: 20, groundRoll: 1630, over50ft: 2380 },
    { altitude: 6000, oat: 30, groundRoll: 1765, over50ft: 2575 },
    { altitude: 6000, oat: 40, groundRoll: 1915, over50ft: 2795 },

    // 8,000 ft PA
    { altitude: 8000, oat: 0, groundRoll: 1665, over50ft: 2435 },
    { altitude: 8000, oat: 10, groundRoll: 1805, over50ft: 2640 },
    { altitude: 8000, oat: 20, groundRoll: 1965, over50ft: 2875 },
    { altitude: 8000, oat: 30, groundRoll: 2145, over50ft: 3140 },
  ],
};
