import { AircraftPerformance } from "./types";

export const CIRRUS_SR20: AircraftPerformance = {
  name: "Cirrus SR20",
  model: "SR20",

  weights: {
    emptyWeight: 2126, // lbs typical for SR20 G3
    standardWeight: 3050, // performance tables at MTOW (G3 model)
    maxGrossWeight: 3050, // lbs (G3 model, G6 is 3150 lbs)
  },

  climbTable: [
    {
      altitudeFrom: 0,
      altitudeTo: 2000,
      rateOfClimb: 920, // fpm @ SL per POH
      climbTAS: 100, // KTAS
      fuelFlow: 14.5, // gph at climb power
    },
    {
      altitudeFrom: 2000,
      altitudeTo: 4000,
      rateOfClimb: 850,
      climbTAS: 101,
      fuelFlow: 14.0,
    },
    {
      altitudeFrom: 4000,
      altitudeTo: 6000,
      rateOfClimb: 775,
      climbTAS: 102,
      fuelFlow: 13.5,
    },
    {
      altitudeFrom: 6000,
      altitudeTo: 8000,
      rateOfClimb: 695,
      climbTAS: 103,
      fuelFlow: 13.0,
    },
    {
      altitudeFrom: 8000,
      altitudeTo: 10000,
      rateOfClimb: 610,
      climbTAS: 104,
      fuelFlow: 12.5,
    },
    {
      altitudeFrom: 10000,
      altitudeTo: 12000,
      rateOfClimb: 520,
      climbTAS: 105,
      fuelFlow: 12.0,
    },
  ],

  cruiseTable: [
    {
      altitude: 4000,
      rpm: 2500,
      percentPower: 75,
      tas: 154, // KTAS approx at 75%
      fuelFlow: 11.6, // gph
    },
    {
      altitude: 6000,
      rpm: 2500,
      percentPower: 75,
      tas: 157,
      fuelFlow: 11.6,
    },
    {
      altitude: 8000,
      rpm: 2500,
      percentPower: 75,
      tas: 160,
      fuelFlow: 11.6,
    },
    {
      altitude: 10000,
      rpm: 2500,
      percentPower: 75,
      tas: 162,
      fuelFlow: 11.6,
    },
    {
      altitude: 8000,
      rpm: 2350,
      percentPower: 65,
      tas: 148, // KTAS approx at 65%
      fuelFlow: 10.5, // gph
    },
    {
      altitude: 10000,
      rpm: 2350,
      percentPower: 65,
      tas: 150,
      fuelFlow: 10.5,
    },
    {
      altitude: 12000,
      rpm: 2350,
      percentPower: 65,
      tas: 152,
      fuelFlow: 10.5,
    },
    {
      altitude: 14000,
      rpm: 2200,
      percentPower: 55,
      tas: 144,
      fuelFlow: 8.4,
    },
  ],

  engine: {
    type: "Continental IO-360-ES",
    maxRPM: 2700,
    ratedHP: 200, // hp (fuel injected, later models use IO-390 with 215 hp)
    specificFuelConsumption: 0.42, // lbs/hp/hr typical for IO-360
    usableFuelGallons: 56, // gallons (58.5 total - 2.5 unusable)
  },

  limits: {
    vne: 200, // KIAS
    vno: 165, // KIAS
    va: 120, // KIAS at max gross weight
    vfe: 119, // KIAS (50% flaps), 104 KIAS (100% flaps)
    vs: 65, // KIAS clean (Vs1)
    vs0: 56, // KIAS landing config
    maxCrosswind: 20, // kts demonstrated
    clMaxClean: 1.42, // Clean configuration
    clMaxTakeoff: 1.62, // Takeoff flaps (50%)
    clMaxLanding: 1.75, // Landing flaps (100%)
  },

  /** ------------------------------------------------------------------
   *  SERVICE CEILING
   *  Maximum altitude where aircraft can maintain 100 fpm climb
   *  ------------------------------------------------------------------*/
  serviceCeiling: 17500, // ft pressure altitude

  /** ------------------------------------------------------------------
   *  TAKEOFF PERFORMANCE TABLE
   *  Based on Cirrus SR20 POH data at gross weight (3,050 lbs)
   *  Conditions: 50% flaps, full throttle, paved level runway, zero wind
   *  Note: Composite aircraft with CAPS parachute system
   *  ------------------------------------------------------------------*/
  takeoffTable: [
    // Sea level
    { altitude: 0, oat: 0, groundRoll: 965, over50ft: 1315 },
    { altitude: 0, oat: 10, groundRoll: 1025, over50ft: 1395 },
    { altitude: 0, oat: 20, groundRoll: 1090, over50ft: 1480 },
    { altitude: 0, oat: 30, groundRoll: 1160, over50ft: 1575 },
    { altitude: 0, oat: 40, groundRoll: 1235, over50ft: 1680 },

    // 2,000 ft PA
    { altitude: 2000, oat: 0, groundRoll: 1115, over50ft: 1525 },
    { altitude: 2000, oat: 10, groundRoll: 1190, over50ft: 1625 },
    { altitude: 2000, oat: 20, groundRoll: 1270, over50ft: 1730 },
    { altitude: 2000, oat: 30, groundRoll: 1360, over50ft: 1850 },
    { altitude: 2000, oat: 40, groundRoll: 1460, over50ft: 1985 },

    // 4,000 ft PA
    { altitude: 4000, oat: 0, groundRoll: 1300, over50ft: 1780 },
    { altitude: 4000, oat: 10, groundRoll: 1395, over50ft: 1910 },
    { altitude: 4000, oat: 20, groundRoll: 1500, over50ft: 2055 },
    { altitude: 4000, oat: 30, groundRoll: 1620, over50ft: 2220 },
    { altitude: 4000, oat: 40, groundRoll: 1755, over50ft: 2405 },

    // 6,000 ft PA
    { altitude: 6000, oat: 0, groundRoll: 1535, over50ft: 2110 },
    { altitude: 6000, oat: 10, groundRoll: 1660, over50ft: 2280 },
    { altitude: 6000, oat: 20, groundRoll: 1800, over50ft: 2475 },
    { altitude: 6000, oat: 30, groundRoll: 1960, over50ft: 2695 },
    { altitude: 6000, oat: 40, groundRoll: 2140, over50ft: 2945 },

    // 8,000 ft PA
    { altitude: 8000, oat: 0, groundRoll: 1830, over50ft: 2525 },
    { altitude: 8000, oat: 10, groundRoll: 2000, over50ft: 2760 },
    { altitude: 8000, oat: 20, groundRoll: 2195, over50ft: 3030 },
    { altitude: 8000, oat: 30, groundRoll: 2420, over50ft: 3340 },
  ],
};
