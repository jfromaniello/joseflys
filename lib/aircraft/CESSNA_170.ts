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
  },
  // Puedes agregar luego tablas específicas de despegue/aterrizaje si querés
  // takeoffTable: [...]
  // landingTable: [...]
};
