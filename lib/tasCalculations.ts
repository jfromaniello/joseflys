/**
 * TAS (True Airspeed) Calculations
 *
 * This module provides two TAS calculation methods with different accuracy tradeoffs:
 *
 * 1. calculateTAS() - Most accurate, requires CAS and actual OAT
 * 2. calculateTASFromIAS() - Good accuracy, uses IAS and ISA temperature assumptions
 */

import {
  isaPressure,
  isaTemperatureK,
  airDensity,
  ISA_SEA_LEVEL_DENSITY,
} from "./isaCalculations";

// ============================================================================
// Main TAS Calculation Functions
// ============================================================================

/**
 * Calculate True Airspeed from Calibrated Airspeed using actual OAT.
 *
 * **MOST ACCURATE METHOD** - Recommended for flight planning and navigation.
 *
 * This function uses the full ISA atmospheric model with actual outside air temperature
 * to compute the most accurate TAS. It accounts for:
 * - Pressure altitude (standard atmosphere pressure at altitude)
 * - Actual air temperature (which affects density)
 * - Air density ratio between sea level and altitude
 *
 * @param casKt - Calibrated Airspeed in knots
 * @param oatC - Outside Air Temperature in degrees Celsius (actual, not ISA)
 * @param pressureAltitudeFt - Pressure altitude in feet
 * @returns True Airspeed in knots
 *
 * @example
 * // Calculate TAS at 10,000 ft with 120 KCAS and 5°C OAT
 * const tas = calculateTAS(120, 5, 10000);
 * // Returns approximately 140 knots
 */
export function calculateTAS(casKt: number, oatC: number, pressureAltitudeFt: number): number {
  const pressurePa = isaPressure(pressureAltitudeFt);
  const temperatureK = oatC + 273.15;
  const rho = airDensity(pressurePa, temperatureK);

  // TAS = CAS × √(ρ₀/ρ)
  return casKt * Math.sqrt(ISA_SEA_LEVEL_DENSITY / rho);
}

/**
 * Calculate True Airspeed from Indicated Airspeed using ISA temperature assumptions.
 *
 * **GOOD ACCURACY** - Recommended for calculations where actual OAT is not available.
 *
 * This function uses the full ISA atmospheric model but assumes ISA standard temperature
 * at altitude (15°C - 0.0065°C per meter). It's useful when:
 * - You have IAS (not CAS)
 * - You know density altitude but not actual OAT
 * - You need good accuracy without actual temperature data
 *
 * Note: The difference between IAS and CAS is typically small at normal airspeeds
 * (< 200 KIAS), so this method is acceptable for most GA aircraft calculations.
 *
 * @param ias - Indicated Airspeed in knots
 * @param densityAltitudeFt - Density altitude in feet
 * @returns True Airspeed in knots
 *
 * @example
 * // Calculate TAS at 8,000 ft density altitude with 120 KIAS
 * const tas = calculateTASFromIAS(120, 8000);
 * // Returns approximately 139 knots (assumes ISA temperature)
 */
export function calculateTASFromIAS(ias: number, densityAltitudeFt: number): number {
  const pressurePa = isaPressure(densityAltitudeFt);
  const temperatureK = isaTemperatureK(densityAltitudeFt);
  const rho = airDensity(pressurePa, temperatureK);

  // TAS = IAS × √(ρ₀/ρ)
  return ias * Math.sqrt(ISA_SEA_LEVEL_DENSITY / rho);
}
