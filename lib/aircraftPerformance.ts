/**
 * Aircraft Performance Data Types and Presets
 * Used for climb calculations
 */

export interface ClimbPerformanceData {
  // Altitude range in feet
  altitudeFrom: number;
  altitudeTo: number;
  // Rate of climb in ft/min
  rateOfClimb: number;
  // True Airspeed during climb in knots
  climbTAS: number;
  // Fuel consumption rate in gallons per hour
  fuelFlow: number;
  // Optional: time to climb this segment in minutes (if provided by POH)
  timeToClimb?: number;
  // Optional: distance to climb this segment in NM (if provided by POH)
  distanceToClimb?: number;
}

export interface DeviationEntry {
  forHeading: number;
  steerHeading: number;
}

export interface AircraftPerformance {
  name: string;
  model: string;
  // Climb performance table (usually at standard weight, ISA conditions)
  // Optional - user may only have deviation table initially
  climbTable?: ClimbPerformanceData[];
  // Standard weight for which the table is valid (lbs)
  // Optional - may not be set yet
  standardWeight?: number;
  // Max gross weight (lbs)
  // Optional - may not be set yet
  maxWeight?: number;
  // Compass deviation table
  // Optional - user may add this separately
  deviationTable?: DeviationEntry[];
}

/**
 * Cessna 150 Climb Performance
 * Based on typical C150 POH data at standard weight
 */
export const CESSNA_150: AircraftPerformance = {
  name: "Cessna 150",
  model: "C150",
  standardWeight: 1500,
  maxWeight: 1600,
  climbTable: [
    {
      altitudeFrom: 0,
      altitudeTo: 2000,
      rateOfClimb: 670,
      climbTAS: 70,
      fuelFlow: 6.0,
    },
    {
      altitudeFrom: 2000,
      altitudeTo: 4000,
      rateOfClimb: 580,
      climbTAS: 68,
      fuelFlow: 5.8,
    },
    {
      altitudeFrom: 4000,
      altitudeTo: 6000,
      rateOfClimb: 490,
      climbTAS: 66,
      fuelFlow: 5.6,
    },
    {
      altitudeFrom: 6000,
      altitudeTo: 8000,
      rateOfClimb: 400,
      climbTAS: 64,
      fuelFlow: 5.4,
    },
    {
      altitudeFrom: 8000,
      altitudeTo: 10000,
      rateOfClimb: 310,
      climbTAS: 62,
      fuelFlow: 5.2,
    },
  ],
};

/**
 * Cessna 170 Climb Performance
 * Based on typical C170B POH data
 */
export const CESSNA_170: AircraftPerformance = {
  name: "Cessna 170",
  model: "C170",
  standardWeight: 2100,
  maxWeight: 2200,
  climbTable: [
    {
      altitudeFrom: 0,
      altitudeTo: 2000,
      rateOfClimb: 690,
      climbTAS: 75,
      fuelFlow: 8.5,
    },
    {
      altitudeFrom: 2000,
      altitudeTo: 4000,
      rateOfClimb: 610,
      climbTAS: 73,
      fuelFlow: 8.3,
    },
    {
      altitudeFrom: 4000,
      altitudeTo: 6000,
      rateOfClimb: 530,
      climbTAS: 71,
      fuelFlow: 8.0,
    },
    {
      altitudeFrom: 6000,
      altitudeTo: 8000,
      rateOfClimb: 440,
      climbTAS: 69,
      fuelFlow: 7.8,
    },
    {
      altitudeFrom: 8000,
      altitudeTo: 10000,
      rateOfClimb: 350,
      climbTAS: 67,
      fuelFlow: 7.5,
    },
  ],
};

/**
 * Cessna 182 Climb Performance
 * Based on typical C182 POH data
 */
export const CESSNA_182: AircraftPerformance = {
  name: "Cessna 182",
  model: "C182",
  standardWeight: 2800,
  maxWeight: 3100,
  climbTable: [
    {
      altitudeFrom: 0,
      altitudeTo: 2000,
      rateOfClimb: 920,
      climbTAS: 90,
      fuelFlow: 14.0,
    },
    {
      altitudeFrom: 2000,
      altitudeTo: 4000,
      rateOfClimb: 835,
      climbTAS: 88,
      fuelFlow: 13.5,
    },
    {
      altitudeFrom: 4000,
      altitudeTo: 6000,
      rateOfClimb: 750,
      climbTAS: 86,
      fuelFlow: 13.0,
    },
    {
      altitudeFrom: 6000,
      altitudeTo: 8000,
      rateOfClimb: 665,
      climbTAS: 84,
      fuelFlow: 12.5,
    },
    {
      altitudeFrom: 8000,
      altitudeTo: 10000,
      rateOfClimb: 580,
      climbTAS: 82,
      fuelFlow: 12.0,
    },
    {
      altitudeFrom: 10000,
      altitudeTo: 12000,
      rateOfClimb: 495,
      climbTAS: 80,
      fuelFlow: 11.5,
    },
  ],
};

/**
 * Piper PA-11 Cub Special Climb Performance
 * Based on typical PA-11 data
 */
export const PIPER_PA11: AircraftPerformance = {
  name: "Piper PA-11 Cub Special",
  model: "PA11",
  standardWeight: 1200,
  maxWeight: 1220,
  climbTable: [
    {
      altitudeFrom: 0,
      altitudeTo: 2000,
      rateOfClimb: 500,
      climbTAS: 60,
      fuelFlow: 5.5,
    },
    {
      altitudeFrom: 2000,
      altitudeTo: 4000,
      rateOfClimb: 430,
      climbTAS: 58,
      fuelFlow: 5.3,
    },
    {
      altitudeFrom: 4000,
      altitudeTo: 6000,
      rateOfClimb: 360,
      climbTAS: 56,
      fuelFlow: 5.0,
    },
    {
      altitudeFrom: 6000,
      altitudeTo: 8000,
      rateOfClimb: 290,
      climbTAS: 54,
      fuelFlow: 4.8,
    },
    {
      altitudeFrom: 8000,
      altitudeTo: 10000,
      rateOfClimb: 220,
      climbTAS: 52,
      fuelFlow: 4.5,
    },
  ],
};

/**
 * All preset aircraft
 */
export const PRESET_AIRCRAFT: AircraftPerformance[] = [
  CESSNA_150,
  CESSNA_170,
  CESSNA_182,
  PIPER_PA11,
];

/**
 * Get aircraft by model code
 */
export function getAircraftByModel(model: string): AircraftPerformance | undefined {
  return PRESET_AIRCRAFT.find((ac) => ac.model === model);
}

/**
 * Create empty aircraft template
 * Can be used for creating aircraft with just a name, then progressively add data
 */
export function createEmptyAircraft(name?: string): AircraftPerformance {
  return {
    name: name || "Custom Aircraft",
    model: "CUSTOM",
  };
}

/**
 * Create empty aircraft with climb performance template
 */
export function createEmptyAircraftWithClimb(name?: string): AircraftPerformance {
  return {
    name: name || "Custom Aircraft",
    model: "CUSTOM",
    standardWeight: 2000,
    maxWeight: 2200,
    climbTable: [
      {
        altitudeFrom: 0,
        altitudeTo: 2000,
        rateOfClimb: 500,
        climbTAS: 70,
        fuelFlow: 8.0,
      },
    ],
  };
}
