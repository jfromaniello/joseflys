/**
 * V-Stall (Stall Speed) Calculations
 * Calculates actual stall speeds under various flight conditions
 */

import { calculateTASFromIAS } from "./tasCalculations";

/**
 * Flap configuration options
 */
export type FlapConfiguration = "clean" | "takeoff" | "landing";

/**
 * Input parameters for stall speed calculation
 */
export interface VStallInputs {
  /** Aircraft stall speed at reference weight (KIAS) */
  vsRef: number;

  /** Reference weight used for vsRef (lbs) */
  weightRef: number;

  /** Actual aircraft weight (lbs) */
  weightActual: number;

  /** Bank angle in degrees (0-70) */
  bankAngle?: number;

  /** Density altitude for IAS to TAS conversion (ft) */
  densityAltitude?: number;
}

/**
 * Results from stall speed calculation
 */
export interface VStallResults {
  /** Base stall speed at reference conditions (KIAS) */
  vsRef: number;

  /** Stall speed adjusted for actual weight (KIAS) */
  vsWeight: number;

  /** Stall speed adjusted for bank angle (KIAS) */
  vsBank: number;

  /** Stall speed in TAS (KTAS) */
  vsTAS: number;

  /** Load factor (n) due to bank angle */
  loadFactor: number;

  /** Percentage increase due to weight */
  weightIncreasePercent: number;

  /** Percentage increase due to bank angle */
  bankIncreasePercent: number;

  /** Percentage increase from IAS to TAS due to density altitude */
  tasIncreasePercent: number;
}

/**
 * Validation errors
 */
export interface ValidationError {
  field: string;
  message: string;
  type: "error" | "warning";
}

/**
 * Calculate load factor from bank angle
 * n = 1 / cos(bank)
 */
export function calculateLoadFactor(bankAngleDeg: number): number {
  if (bankAngleDeg === 0) return 1.0;
  const bankRad = (bankAngleDeg * Math.PI) / 180;
  return 1 / Math.cos(bankRad);
}

/**
 * Calculate stall speed adjusted for weight
 * Vs_weight = Vs_ref * sqrt(W_actual / W_ref)
 */
export function calculateVsWeight(vsRef: number, weightActual: number, weightRef: number): number {
  return vsRef * Math.sqrt(weightActual / weightRef);
}

/**
 * Calculate stall speed adjusted for load factor
 * Vs_n = Vs * sqrt(n)
 */
export function calculateVsLoadFactor(vs: number, loadFactor: number): number {
  return vs * Math.sqrt(loadFactor);
}

/**
 * Validate stall calculation inputs
 */
export function validateInputs(
  weightActual: number,
  emptyWeight: number,
  maxGrossWeight: number,
  weightRef: number,
  bankAngle: number,
  densityAltitude?: number,
  pressureAltitude?: number,
  serviceCeiling?: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Weight validations
  if (weightActual < emptyWeight) {
    errors.push({
      field: "weight",
      message: `Weight (${weightActual.toFixed(0)} lbs) is less than empty weight (${emptyWeight.toFixed(0)} lbs)`,
      type: "error",
    });
  }

  if (weightActual > maxGrossWeight) {
    errors.push({
      field: "weight",
      message: `Weight (${weightActual.toFixed(0)} lbs) exceeds maximum gross weight (${maxGrossWeight.toFixed(0)} lbs)`,
      type: "error",
    });
  }

  // Warning for weight significantly below reference
  if (weightActual < weightRef * 0.7) {
    errors.push({
      field: "weight",
      message: `Weight is significantly below reference weight (${weightRef.toFixed(0)} lbs). Results may be less accurate.`,
      type: "warning",
    });
  }

  // Bank angle validations
  if (bankAngle >= 75) {
    errors.push({
      field: "bankAngle",
      message: `Bank angle (${bankAngle.toFixed(0)}°) is too high for safe flight`,
      type: "error",
    });
  }

  if (bankAngle > 45) {
    errors.push({
      field: "bankAngle",
      message: `High bank angle (${bankAngle.toFixed(0)}°) significantly increases stall speed`,
      type: "warning",
    });
  }

  // Density altitude validations
  if (densityAltitude !== undefined && pressureAltitude !== undefined) {
    if (densityAltitude < pressureAltitude - 500) {
      errors.push({
        field: "densityAltitude",
        message: "Density altitude is significantly lower than pressure altitude. This is unusual - please verify.",
        type: "warning",
      });
    }
  }

  // Service ceiling validations (Pressure Altitude)
  if (serviceCeiling !== undefined && pressureAltitude !== undefined) {
    // Calculate threshold (90% of service ceiling)
    const threshold = serviceCeiling * 0.9;

    if (pressureAltitude >= serviceCeiling) {
      errors.push({
        field: "pressureAltitude",
        message: `NO GO: Altitude (${pressureAltitude.toFixed(0)} ft) meets or exceeds aircraft service ceiling (${serviceCeiling.toFixed(0)} ft)`,
        type: "error",
      });
    } else if (pressureAltitude >= threshold) {
      const percentOfCeiling = ((pressureAltitude / serviceCeiling) * 100).toFixed(0);
      errors.push({
        field: "pressureAltitude",
        message: `NO GO: Altitude (${pressureAltitude.toFixed(0)} ft) is at ${percentOfCeiling}% of service ceiling (${serviceCeiling.toFixed(0)} ft). Aircraft performance severely degraded.`,
        type: "error",
      });
    }
  }

  // Service ceiling validations (Density Altitude)
  if (serviceCeiling !== undefined && densityAltitude !== undefined) {
    // Calculate thresholds for density altitude warnings
    const daWarningThreshold = serviceCeiling * 0.85; // 85% threshold

    if (densityAltitude >= serviceCeiling) {
      errors.push({
        field: "densityAltitude",
        message: `Density altitude (${densityAltitude.toFixed(0)} ft) meets or exceeds service ceiling (${serviceCeiling.toFixed(0)} ft). Engine and aircraft performance severely degraded.`,
        type: "warning",
      });
    } else if (densityAltitude >= daWarningThreshold) {
      const percentOfCeiling = ((densityAltitude / serviceCeiling) * 100).toFixed(0);
      errors.push({
        field: "densityAltitude",
        message: `Density altitude (${densityAltitude.toFixed(0)} ft) is at ${percentOfCeiling}% of service ceiling (${serviceCeiling.toFixed(0)} ft). Engine performance significantly reduced.`,
        type: "warning",
      });
    }
  }

  // General high density altitude warning (only if not already warned about service ceiling)
  if (densityAltitude !== undefined && densityAltitude > 8000) {
    // Only add this warning if we haven't already warned about service ceiling
    const hasServiceCeilingWarning = errors.some(e =>
      e.field === "densityAltitude" && e.message.includes("service ceiling")
    );

    if (!hasServiceCeilingWarning) {
      errors.push({
        field: "densityAltitude",
        message: `High density altitude (${densityAltitude.toFixed(0)} ft) will result in significantly higher TAS stall speed`,
        type: "warning",
      });
    }
  }

  return errors;
}

/**
 * Main stall speed calculation function
 */
export function calculateVStall(inputs: VStallInputs): VStallResults {
  const { vsRef, weightRef, weightActual, bankAngle = 0, densityAltitude = 0 } = inputs;

  // Calculate stall speed adjusted for weight
  const vsWeight = calculateVsWeight(vsRef, weightActual, weightRef);

  // Calculate load factor from bank angle
  const loadFactor = calculateLoadFactor(bankAngle);

  // Calculate stall speed adjusted for bank angle
  const vsBank = calculateVsLoadFactor(vsWeight, loadFactor);

  // Calculate TAS
  const vsTAS = calculateTASFromIAS(vsBank, densityAltitude);

  // Calculate percentage increases
  const weightIncreasePercent = ((vsWeight / vsRef) - 1) * 100;
  const bankIncreasePercent = ((vsBank / vsWeight) - 1) * 100;
  const tasIncreasePercent = ((vsTAS / vsBank) - 1) * 100;

  return {
    vsRef,
    vsWeight,
    vsBank,
    vsTAS,
    loadFactor,
    weightIncreasePercent,
    bankIncreasePercent,
    tasIncreasePercent,
  };
}
