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

export type SurfaceType = "dry-asphalt" | "wet-asphalt" | "dry-grass" | "wet-grass";

export type TakeoffDecision = "GO" | "MARGINAL" | "NO-GO";

export interface TakeoffInputs {
  // Aircraft
  aircraft: ResolvedAircraftPerformance;
  weight: number; // lbs

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

/** Surface correction factors (multiplier for ground roll) */
const SURFACE_CORRECTIONS: Record<SurfaceType, number> = {
  "dry-asphalt": 1.0,
  "wet-asphalt": 1.15,
  "dry-grass": 1.20,
  "wet-grass": 1.30,
};

/** Wind correction factors
 * POH typically shows ~10% reduction per 9 knots headwind (~1.1% per knot)
 * Tailwind is more penalizing (~10% per 2 knots, or ~5% per knot, but we use 3% conservatively)
 */
const HEADWIND_FACTOR_PER_KT = 0.011; // ~1.1% reduction per kt headwind
const TAILWIND_FACTOR_PER_KT = 0.03;  // ~3% increase per kt tailwind (more penalizing)

/** Slope correction: % increase per 1% uphill slope */
const SLOPE_CORRECTION_FACTOR = 0.10; // 10% per 1% slope

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

  // Apply corrections
  let groundRoll = baseGroundRoll;

  // Surface correction
  const surfaceFactor = SURFACE_CORRECTIONS[inputs.surfaceType];
  groundRoll *= surfaceFactor;

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
  groundRoll *= windFactor;

  // Slope correction (10% per 1% uphill)
  const slopeFactor = 1 + inputs.runwaySlope * SLOPE_CORRECTION_FACTOR;
  groundRoll *= slopeFactor;

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

  // Total obstacle clearance distance
  const obstacleDistance = groundRoll + climbDistance;

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

  if (inputs.surfaceType === "wet-asphalt" || inputs.surfaceType === "wet-grass") {
    warnings.push(`Wet ${inputs.surfaceType.includes("grass") ? "grass" : "runway"} increases ground roll by ${Math.round((surfaceFactor - 1) * 100)}%`);
  } else if (inputs.surfaceType.includes("grass")) {
    warnings.push(`Grass surface increases ground roll by ${Math.round((surfaceFactor - 1) * 100)}%`);
  }

  if (inputs.runwaySlope > 1) {
    warnings.push(`Uphill slope (+${inputs.runwaySlope.toFixed(1)}%) increases takeoff distance by ${Math.round(inputs.runwaySlope * SLOPE_CORRECTION_FACTOR * 100)}%`);
  }

  if (inputs.obstacleHeight > 50 && rateOfClimb < 300) {
    warnings.push(`Low rate of climb (${Math.round(rateOfClimb)} ft/min) with ${inputs.obstacleHeight} ft obstacle`);
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
