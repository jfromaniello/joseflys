/**
 * Takeoff Performance Calculations
 *
 * Computes takeoff ground roll, obstacle clearance distance, and safety margins
 * based on aircraft performance data, atmospheric conditions, runway characteristics,
 * and obstacle height.
 */

import type { ResolvedAircraftPerformance } from "./aircraft/types";
import { calculateTAS } from "./tasCalculations";
import { calculateClimbPerformance } from "./climbCalculations";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Surface type codes matching runways.json categories
 * PG = Pavement Good, PP = Pavement Poor, GG = Grass Good, GF = Grass Fair
 * GV = Gravel, DT = Dirt, SD = Sand, WT = Water (NO-GO)
 */
export type SurfaceType = "PG" | "PP" | "GG" | "GF" | "GV" | "DT" | "SD" | "WT";

export type FlapConfiguration = "0" | "10" | "full";

export type TakeoffDecision = "GO" | "MARGINAL" | "NO-GO";

export interface TakeoffInputs {
  // Aircraft
  aircraft: ResolvedAircraftPerformance;
  weight: number; // lbs
  flapConfiguration: FlapConfiguration; // flap setting for takeoff

  // Atmospheric
  pressureAltitude: number; // ft
  densityAltitude: number; // ft
  oat: number; // °C

  // Runway
  runwayLength: number; // ft
  surfaceType: SurfaceType;
  runwaySlope: number; // % (positive = uphill)
  headwindComponent: number; // kt (positive = headwind, negative = tailwind)

  // Obstacle
  obstacleHeight: number; // ft (default: 50)
  obstacleDistance?: number; // ft from threshold (optional)
}

export interface VSpeedResults {
  // Stall speeds
  vs1IAS: number; // Clean stall, weight-adjusted (kt IAS)
  vs1TAS: number; // Clean stall TAS (kt)

  // Rotation speed
  vrIAS: number; // Rotation speed IAS (kt)
  vrTAS: number; // Rotation speed TAS (kt)

  // Climb speeds
  vxIAS: number; // Best angle of climb IAS (kt)
  vxTAS: number; // Best angle of climb TAS (kt)
  vyIAS: number; // Best rate of climb IAS (kt)
  vyTAS: number; // Best rate of climb TAS (kt)
}

export interface TakeoffDistances {
  groundRoll: number; // ft
  obstacleDistance: number; // ft (total distance to clear obstacle)
  climbDistance: number; // ft (distance from liftoff to obstacle clearance)
}

export interface TakeoffResults {
  decision: TakeoffDecision;
  vSpeeds: VSpeedResults;
  distances: TakeoffDistances;
  safetyMargin: number; // % (can be negative)
  rateOfClimb: number; // ft/min at obstacle clearance
  warnings: string[];
  errors: string[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Surface correction factors
 * groundRoll: multiplier for ground roll distance
 * obstacle: multiplier for obstacle clearance distance (50 ft)
 * Based on POH data and industry standards
 */
const SURFACE_CORRECTIONS: Record<SurfaceType, { groundRoll: number; obstacle: number }> = {
  PG: { groundRoll: 1.00, obstacle: 1.00 },  // Pavement Good - asphalt/concrete in good condition
  PP: { groundRoll: 1.05, obstacle: 1.03 },  // Pavement Poor - PSP, deteriorated
  GG: { groundRoll: 1.20, obstacle: 1.14 },  // Grass Good - short, firm turf
  GF: { groundRoll: 1.38, obstacle: 1.28 },  // Grass Fair - long grass, bumps, wet (avg of 1.35-1.40 / 1.25-1.30)
  GV: { groundRoll: 1.28, obstacle: 1.18 },  // Gravel - (avg of 1.25-1.30 / 1.15-1.20)
  DT: { groundRoll: 1.25, obstacle: 1.15 },  // Dirt - dry earth/clay (soft soil would be ~1.35)
  SD: { groundRoll: 1.60, obstacle: 1.30 },  // Sand - severe performance penalty
  WT: { groundRoll: Infinity, obstacle: Infinity }, // Water - NO-GO for wheeled aircraft
};

/** Wind correction factors
 * POH typically shows ~10% reduction per 9 knots headwind (~1.1% per knot)
 * Tailwind is more penalizing (~10% per 2 knots, or ~5% per knot, but we use 3% conservatively)
 */
const HEADWIND_FACTOR_PER_KT = 0.011; // ~1.1% reduction per kt headwind
const TAILWIND_FACTOR_PER_KT = 0.03;  // ~3% increase per kt tailwind (more penalizing)

/** Slope correction: % increase per 1% uphill slope */
const SLOPE_CORRECTION_FACTOR = 0.10; // 10% per 1% slope

/** Flap configuration corrections
 * Ground roll reduction and climb rate reduction for each flap setting
 * Based on typical POH data (e.g., C172: 10° flaps reduces ground roll ~10%)
 */
const FLAP_CORRECTIONS: Record<FlapConfiguration, { groundRollFactor: number; climbRateFactor: number }> = {
  "0": { groundRollFactor: 1.0, climbRateFactor: 1.0 },      // Baseline (no flaps)
  "10": { groundRollFactor: 0.90, climbRateFactor: 0.95 },   // 10% less ground roll, 5% less climb
  "full": { groundRollFactor: 0.85, climbRateFactor: 0.80 }, // 15% less ground roll, 20% less climb (not recommended)
};

/** Vr is typically 1.2 × VS1 for most GA aircraft */
const VR_MULTIPLIER = 1.2;

/** Safety margin thresholds */
const MARGINAL_THRESHOLD = 0.20; // 20%
const UNSAFE_THRESHOLD = 0.0; // 0%

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate weight-adjusted stall speed
 * VS_actual = VS_ref × √(W_actual / W_ref)
 */
function calculateWeightAdjustedVS(
  vsRef: number,
  weightActual: number,
  weightRef: number
): number {
  return vsRef * Math.sqrt(weightActual / weightRef);
}

/**
 * Interpolate takeoff performance from table
 */
function interpolateTakeoffPerformance(
  takeoffTable: Array<{ altitude: number; oat: number; groundRoll: number; over50ft: number }>,
  pressureAltitude: number,
  oat: number
): { groundRoll: number; over50ft: number } | null {
  if (!takeoffTable || takeoffTable.length === 0) {
    return null;
  }

  // Find closest altitude entries (bracket PA)
  const sortedByAlt = [...takeoffTable].sort((a, b) => a.altitude - b.altitude);

  // Find entries that bracket our PA
  let lowerAlt = sortedByAlt[0];
  let upperAlt = sortedByAlt[sortedByAlt.length - 1];

  for (let i = 0; i < sortedByAlt.length - 1; i++) {
    if (sortedByAlt[i].altitude <= pressureAltitude && sortedByAlt[i + 1].altitude >= pressureAltitude) {
      lowerAlt = sortedByAlt[i];
      upperAlt = sortedByAlt[i + 1];
      break;
    }
  }

  // If we're beyond table limits, use nearest
  if (pressureAltitude < sortedByAlt[0].altitude) {
    lowerAlt = upperAlt = sortedByAlt[0];
  } else if (pressureAltitude > sortedByAlt[sortedByAlt.length - 1].altitude) {
    lowerAlt = upperAlt = sortedByAlt[sortedByAlt.length - 1];
  }

  // Now interpolate by OAT at each altitude, then interpolate between altitudes
  const interpolateByOAT = (entries: typeof takeoffTable) => {
    const sortedByOAT = [...entries].sort((a, b) => a.oat - b.oat);

    if (oat <= sortedByOAT[0].oat) return sortedByOAT[0];
    if (oat >= sortedByOAT[sortedByOAT.length - 1].oat) return sortedByOAT[sortedByOAT.length - 1];

    for (let i = 0; i < sortedByOAT.length - 1; i++) {
      if (sortedByOAT[i].oat <= oat && sortedByOAT[i + 1].oat >= oat) {
        const lower = sortedByOAT[i];
        const upper = sortedByOAT[i + 1];
        const ratio = (oat - lower.oat) / (upper.oat - lower.oat);

        return {
          altitude: lower.altitude,
          oat,
          groundRoll: lower.groundRoll + ratio * (upper.groundRoll - lower.groundRoll),
          over50ft: lower.over50ft + ratio * (upper.over50ft - lower.over50ft),
        };
      }
    }

    return sortedByOAT[0];
  };

  // Get interpolated values at lower and upper altitudes
  const lowerAltEntries = takeoffTable.filter(e => Math.abs(e.altitude - lowerAlt.altitude) < 1);
  const upperAltEntries = takeoffTable.filter(e => Math.abs(e.altitude - upperAlt.altitude) < 1);

  const lowerResult = interpolateByOAT(lowerAltEntries.length > 0 ? lowerAltEntries : [lowerAlt]);
  const upperResult = interpolateByOAT(upperAltEntries.length > 0 ? upperAltEntries : [upperAlt]);

  // Interpolate between altitudes
  if (Math.abs(upperAlt.altitude - lowerAlt.altitude) < 1) {
    return { groundRoll: lowerResult.groundRoll, over50ft: lowerResult.over50ft };
  }

  const altRatio = (pressureAltitude - lowerAlt.altitude) / (upperAlt.altitude - lowerAlt.altitude);

  return {
    groundRoll: lowerResult.groundRoll + altRatio * (upperResult.groundRoll - lowerResult.groundRoll),
    over50ft: lowerResult.over50ft + altRatio * (upperResult.over50ft - lowerResult.over50ft),
  };
}

/**
 * Estimate ground roll using simplified physics-based formula
 * When no takeoff table data is available
 */
function estimateGroundRoll(
  vrTAS: number, // kt TAS
  _weightLbs: number,
  densityAltitudeFt: number
): number {
  // Convert Vr from kt to ft/s
  const vrFtPerSec = vrTAS * 1.68781; // 1 kt = 1.68781 ft/s

  // Typical GA acceleration ~0.15-0.20 g at sea level
  // Reduce with DA: a ≈ a₀ × (1 - DA/40000)
  const baseAcceleration = 0.17 * 32.174; // ft/s² (17% of gravity)
  const daFactor = Math.max(0.5, 1 - densityAltitudeFt / 40000);
  const acceleration = baseAcceleration * daFactor;

  // Distance = v² / (2a)
  const groundRollFt = (vrFtPerSec * vrFtPerSec) / (2 * acceleration);

  return groundRollFt;
}

// ============================================================================
// Main Calculation Function
// ============================================================================

/**
 * Calculate takeoff performance
 */
export function calculateTakeoffPerformance(inputs: TakeoffInputs): TakeoffResults {
  const warnings: string[] = [];
  const errors: string[] = [];

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  if (inputs.weight < inputs.aircraft.weights.emptyWeight) {
    errors.push(`Weight (${inputs.weight} lbs) is below empty weight (${inputs.aircraft.weights.emptyWeight} lbs)`);
  }

  if (inputs.weight > inputs.aircraft.weights.maxGrossWeight) {
    errors.push(`Weight (${inputs.weight} lbs) exceeds MTOW (${inputs.aircraft.weights.maxGrossWeight} lbs)`);
  }

  if (inputs.runwayLength <= 0) {
    errors.push("Runway length must be greater than zero");
  }

  // Note: DA CAN be below PA when temperature is colder than ISA standard
  // This is normal and favorable for performance (denser air)

  if (!inputs.aircraft.limits?.vs) {
    errors.push("Aircraft missing VS (clean stall speed) data");
  }

  // Water surface is NO-GO for wheeled aircraft - return immediately
  if (inputs.surfaceType === "WT") {
    return {
      decision: "NO-GO",
      vSpeeds: {
        vs1IAS: 0,
        vs1TAS: 0,
        vrIAS: 0,
        vrTAS: 0,
        vxIAS: 0,
        vxTAS: 0,
        vyIAS: 0,
        vyTAS: 0,
      },
      distances: {
        groundRoll: 0,
        obstacleDistance: 0,
        climbDistance: 0,
      },
      safetyMargin: -1,
      rateOfClimb: 0,
      warnings: [],
      errors: ["Water surface is not suitable for wheeled aircraft takeoff"],
    };
  }

  // -------------------------------------------------------------------------
  // V-Speeds Calculation
  // -------------------------------------------------------------------------

  const performanceRefWeight = inputs.aircraft.weights.standardWeight || inputs.aircraft.weights.maxGrossWeight;
  const vs1Ref = inputs.aircraft.limits?.vs || 0;

  // Weight-adjusted VS1
  const vs1IAS = calculateWeightAdjustedVS(vs1Ref, inputs.weight, performanceRefWeight);
  const vs1TAS = calculateTAS(vs1IAS, inputs.oat, inputs.pressureAltitude);

  // Vr = 1.2 × VS1
  const vrIAS = vs1IAS * VR_MULTIPLIER;
  const vrTAS = calculateTAS(vrIAS, inputs.oat, inputs.pressureAltitude);

  // VX and VY (estimate based on VS1 since not typically in limits)
  // Typical values: Vx ≈ 1.25-1.3 × VS, Vy ≈ 1.35-1.45 × VS
  const vxIAS = vs1IAS * 1.3;
  const vxTAS = calculateTAS(vxIAS, inputs.oat, inputs.pressureAltitude);

  const vyIAS = vs1IAS * 1.4;
  const vyTAS = calculateTAS(vyIAS, inputs.oat, inputs.pressureAltitude);

  const vSpeeds: VSpeedResults = {
    vs1IAS,
    vs1TAS,
    vrIAS,
    vrTAS,
    vxIAS,
    vxTAS,
    vyIAS,
    vyTAS,
  };

  // -------------------------------------------------------------------------
  // Ground Roll Calculation
  // -------------------------------------------------------------------------

  let baseGroundRoll = 0;

  // Try to use takeoff table data first
  if (inputs.aircraft.takeoffTable && inputs.aircraft.takeoffTable.length > 0) {
    const tableResult = interpolateTakeoffPerformance(
      inputs.aircraft.takeoffTable,
      inputs.pressureAltitude,
      inputs.oat
    );

    if (tableResult) {
      baseGroundRoll = tableResult.groundRoll;

      // Apply weight correction (quadratic relationship)
      const weightRatio = inputs.weight / performanceRefWeight;
      baseGroundRoll *= Math.pow(weightRatio, 1.7);
    }
  }

  // If no table data or interpolation failed, estimate
  if (baseGroundRoll === 0) {
    baseGroundRoll = estimateGroundRoll(vrTAS, inputs.weight, inputs.densityAltitude);
    warnings.push("Using estimated ground roll (no performance table data available)");
  }

  // Apply corrections for conditions BEYOND the aircraft's takeoff table coverage
  // Get actual table limits from aircraft data, or use defaults if no table
  let tableMaxPA = 8000;  // Default
  let tableMaxOAT = 40;   // Default °C

  if (inputs.aircraft.takeoffTable && inputs.aircraft.takeoffTable.length > 0) {
    tableMaxPA = Math.max(...inputs.aircraft.takeoffTable.map(e => e.altitude));
    tableMaxOAT = Math.max(...inputs.aircraft.takeoffTable.map(e => e.oat));
  }

  // Check if we're beyond table limits and need to extrapolate
  let beyondTableCorrection = 1.0;

  // OAT beyond table: ~3% increase per °C above table max (based on DA increase ~120ft/°C)
  if (inputs.oat > tableMaxOAT) {
    const excessOAT = inputs.oat - tableMaxOAT;
    beyondTableCorrection *= 1 + (excessOAT * 0.03);
    warnings.push(`OAT (${Math.round(inputs.oat)}°C) exceeds takeoff table range (max ${tableMaxOAT}°C)`);
  }

  // PA beyond table: ~12% increase per 1000ft above table max
  if (inputs.pressureAltitude > tableMaxPA) {
    const excessPA = inputs.pressureAltitude - tableMaxPA;
    beyondTableCorrection *= 1 + (excessPA / 1000) * 0.12;
    warnings.push(`Pressure altitude (${Math.round(inputs.pressureAltitude)} ft) exceeds takeoff table range (max ${tableMaxPA} ft)`);
  }

  if (beyondTableCorrection > 1.0) {
    baseGroundRoll *= beyondTableCorrection;
  }

  // Apply corrections (calculate base values for good pavement first)
  const surfaceFactors = SURFACE_CORRECTIONS[inputs.surfaceType];

  // Wind correction: headwind decreases ground roll, tailwind increases it
  // Asymmetric correction - tailwind is more penalizing than headwind is helpful
  let windFactor: number;
  if (inputs.headwindComponent >= 0) {
    // Headwind: reduces distance, with limit
    const corr = inputs.headwindComponent * HEADWIND_FACTOR_PER_KT;
    windFactor = Math.max(0.6, 1 - corr); // Max 40% reduction
  } else {
    // Tailwind: increases distance, more penalizing
    const tail = Math.abs(inputs.headwindComponent);
    const corr = tail * TAILWIND_FACTOR_PER_KT;
    windFactor = Math.min(1.6, 1 + corr); // Max 60% increase
  }
  baseGroundRoll *= windFactor;

  // Slope correction (10% per 1% uphill)
  const slopeFactor = 1 + inputs.runwaySlope * SLOPE_CORRECTION_FACTOR;
  baseGroundRoll *= slopeFactor;

  // Flap configuration correction
  const flapCorrection = FLAP_CORRECTIONS[inputs.flapConfiguration];
  baseGroundRoll *= flapCorrection.groundRollFactor;

  // baseGroundRoll now represents ground roll on good pavement with all corrections

  // -------------------------------------------------------------------------
  // Rate of Climb at Obstacle
  // -------------------------------------------------------------------------

  // Find ROC at current DA from climb table
  let rateOfClimb = 0;

  if (inputs.aircraft.climbTable && inputs.aircraft.climbTable.length > 0) {
    // Calculate ROC using POH-style climb table
    // Estimate instantaneous ROC by calculating time to climb 500ft from current PA
    const climbSegment = 500; // ft
    const fromPA = inputs.pressureAltitude;
    const toPA = inputs.pressureAltitude + climbSegment;

    const climbResult = calculateClimbPerformance(
      inputs.aircraft.climbTable,
      fromPA,
      toPA,
      inputs.oat
    );

    if (climbResult.time > 0) {
      // ROC = altitude gained / time (ft/min)
      rateOfClimb = climbSegment / climbResult.time;
    }

    // Weight correction for ROC (linear approximation)
    const weightRatio = inputs.weight / performanceRefWeight;
    rateOfClimb *= (2 - weightRatio); // ROC decreases with weight

    // Flap correction for ROC
    rateOfClimb *= flapCorrection.climbRateFactor;
  }

  if (rateOfClimb <= 0) {
    errors.push("Rate of climb is zero or negative at this density altitude and weight");
    rateOfClimb = 100; // Fallback to avoid division by zero
    warnings.push("Using estimated minimum rate of climb");
  }

  // -------------------------------------------------------------------------
  // Obstacle Clearance Distance
  // -------------------------------------------------------------------------

  // Time to climb to obstacle height (minutes)
  const timeToObstacle = inputs.obstacleHeight / rateOfClimb;

  // Distance covered during climb (using VX speed)
  const vxFtPerMin = vxTAS * 101.269; // kt to ft/min (1 kt = 101.269 ft/min)
  const climbDistance = timeToObstacle * vxFtPerMin;

  // Base obstacle distance (on good pavement)
  const baseObstacleDistance = baseGroundRoll + climbDistance;

  // Apply surface factors to get final distances
  // POH factors are applied to the total distances from the performance tables
  const groundRoll = baseGroundRoll * surfaceFactors.groundRoll;
  const obstacleDistance = baseObstacleDistance * surfaceFactors.obstacle;

  const distances: TakeoffDistances = {
    groundRoll,
    obstacleDistance,
    climbDistance,
  };

  // -------------------------------------------------------------------------
  // Safety Margin & Decision
  // -------------------------------------------------------------------------

  const safetyMargin = (inputs.runwayLength - obstacleDistance) / inputs.runwayLength;

  let decision: TakeoffDecision;
  if (safetyMargin < UNSAFE_THRESHOLD) {
    decision = "NO-GO";
  } else if (safetyMargin < MARGINAL_THRESHOLD) {
    decision = "MARGINAL";
  } else {
    decision = "GO";
  }

  // -------------------------------------------------------------------------
  // Warnings
  // -------------------------------------------------------------------------

  if (inputs.densityAltitude > 6000) {
    warnings.push(`High density altitude (${Math.round(inputs.densityAltitude)} ft) significantly reduces performance`);
  }

  const weightMargin = (inputs.aircraft.weights.maxGrossWeight - inputs.weight) / inputs.aircraft.weights.maxGrossWeight;
  if (weightMargin < 0.05) {
    warnings.push(`Weight is very close to MTOW (${Math.round(weightMargin * 100)}% margin)`);
  }

  if (inputs.headwindComponent < 0) {
    warnings.push(`Tailwind component (${Math.abs(inputs.headwindComponent).toFixed(1)} kt) increases takeoff distance`);
  }

  // Surface warnings
  const surfaceNames: Record<SurfaceType, string> = {
    PG: "Pavement",
    PP: "Poor pavement",
    GG: "Grass",
    GF: "Fair grass",
    GV: "Gravel",
    DT: "Dirt",
    SD: "Sand",
    WT: "Water",
  };
  if (surfaceFactors.groundRoll > 1.0) {
    warnings.push(`${surfaceNames[inputs.surfaceType]} surface increases ground roll by ${Math.round((surfaceFactors.groundRoll - 1) * 100)}%`);
  }
  if (inputs.surfaceType === "SD") {
    warnings.push("Sand surface severely impacts performance - consider abort");
  }

  if (inputs.runwaySlope > 1) {
    warnings.push(`Uphill slope (+${inputs.runwaySlope.toFixed(1)}%) increases takeoff distance by ${Math.round(inputs.runwaySlope * SLOPE_CORRECTION_FACTOR * 100)}%`);
  }

  if (inputs.obstacleHeight > 50 && rateOfClimb < 300) {
    warnings.push(`Low rate of climb (${Math.round(rateOfClimb)} ft/min) with ${inputs.obstacleHeight} ft obstacle`);
  }

  if (inputs.flapConfiguration === "full") {
    warnings.push("Full flaps not recommended for takeoff - significantly reduced climb performance");
  }

  const tasIncrease = ((vrTAS - vrIAS) / vrIAS) * 100;
  if (tasIncrease > 15) {
    warnings.push(`Vr TAS is ${tasIncrease.toFixed(0)}% higher than IAS due to density altitude`);
  }

  // -------------------------------------------------------------------------
  // Return Results
  // -------------------------------------------------------------------------

  return {
    decision,
    vSpeeds,
    distances,
    safetyMargin,
    rateOfClimb,
    warnings,
    errors,
  };
}

/**
 * Validate takeoff inputs
 */
export function validateTakeoffInputs(inputs: Partial<TakeoffInputs>): string[] {
  const errors: string[] = [];

  if (!inputs.aircraft) {
    errors.push("Aircraft is required");
    return errors;
  }

  if (inputs.weight !== undefined) {
    if (inputs.weight <= 0) {
      errors.push("Weight must be greater than zero");
    }
    if (inputs.weight < inputs.aircraft.weights.emptyWeight) {
      errors.push("Weight cannot be below empty weight");
    }
    if (inputs.weight > inputs.aircraft.weights.maxGrossWeight) {
      errors.push("Weight exceeds maximum gross weight");
    }
  }

  if (inputs.runwayLength !== undefined && inputs.runwayLength <= 0) {
    errors.push("Runway length must be greater than zero");
  }

  if (inputs.obstacleHeight !== undefined && inputs.obstacleHeight < 0) {
    errors.push("Obstacle height cannot be negative");
  }

  if (inputs.pressureAltitude !== undefined && inputs.densityAltitude !== undefined) {
    if (inputs.densityAltitude < inputs.pressureAltitude - 1000) {
      errors.push("Density altitude is unusually low compared to pressure altitude");
    }
  }

  return errors;
}
