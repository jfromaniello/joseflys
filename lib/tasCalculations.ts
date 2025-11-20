/**
 * TAS (True Airspeed) Calculations
 *
 * This module provides two TAS calculation methods with different accuracy tradeoffs:
 *
 * 1. calculateTAS() - Most accurate, requires CAS and actual OAT
 * 2. calculateTASFromIAS() - Good accuracy, uses IAS and ISA temperature assumptions
 */

// ============================================================================
// ISA Constants (shared by all calculations)
// ============================================================================

/** ISA sea level temperature in Kelvin (15°C) */
const T0 = 288.15;

/** ISA sea level pressure in Pascals */
const P0 = 101325.0;

/** Standard gravity in m/s² */
const g0 = 9.80665;

/** Specific gas constant for dry air in J/(kg·K) */
const R = 287.05287;

/** Temperature lapse rate in troposphere (K/m) */
const L = 0.0065;

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
 * @param hFt - Pressure altitude in feet
 * @returns True Airspeed in knots
 *
 * @example
 * // Calculate TAS at 10,000 ft with 120 KCAS and 5°C OAT
 * const tas = calculateTAS(120, 5, 10000);
 * // Returns approximately 140 knots
 */
export function calculateTAS(casKt: number, oatC: number, hFt: number): number {
  // Unit conversions
  const hM = hFt * 0.3048;
  const tAct = oatC + 273.15; // K

  // ISA pressure at altitude (troposphere)
  const exp = g0 / (R * L);
  const pIsa = P0 * Math.pow(1 - (L * hM) / T0, exp);

  // Densities
  const rho0 = P0 / (R * T0);
  const rho = pIsa / (R * tAct);

  // TAS = CAS × √(ρ₀/ρ)
  const tasKt = casKt * Math.sqrt(rho0 / rho);
  return tasKt;
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
  // Convert DA to meters
  const hM = densityAltitudeFt * 0.3048;

  // Calculate ISA temperature at this altitude
  const tIsa = T0 - L * hM;

  // Calculate ISA pressure at altitude (troposphere)
  const exp = g0 / (R * L);
  const pIsa = P0 * Math.pow(1 - (L * hM) / T0, exp);

  // Densities
  const rho0 = P0 / (R * T0);
  const rho = pIsa / (R * tIsa);

  // TAS = IAS × √(ρ₀/ρ)
  return ias * Math.sqrt(rho0 / rho);
}
