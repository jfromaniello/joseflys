/**
 * Calculates True Airspeed (TAS) from Calibrated Airspeed (CAS) using ISA atmospheric model.
 * 
 * This function computes TAS by accounting for air density changes with altitude and temperature.
 * It uses the International Standard Atmosphere (ISA) model for tropospheric conditions.
 * 
 * @param casKt - Calibrated Airspeed in knots
 * @param oatC - Outside Air Temperature in degrees Celsius
 * @param hFt - Pressure altitude in feet
 * @returns True Airspeed in knots
 * 
 * @example
 * // Calculate TAS at 10,000 ft with 120 KCAS and 5°C OAT
 * const tas = calculateTAS(120, 5, 10000);
 * // Returns approximately 140 knots
 */
export function calculateTAS(casKt: number, oatC: number, hFt: number): number {
  // ISA Constants
  const T0 = 288.15; // K (15°C)
  const P0 = 101325.0; // Pa
  const g0 = 9.80665; // m/s²
  const R = 287.05287; // J/(kg·K)
  const L = 0.0065; // K/m (lapse rate troposphere)

  // Unit conversions
  const hM = hFt * 0.3048;
  const tAct = oatC + 273.15; // K

  // ISA pressure at altitude (troposphere)
  const exp = g0 / (R * L);
  const pIsa = P0 * Math.pow(1 - (L * hM) / T0, exp);

  // Densities
  const rho0 = P0 / (R * T0);
  const rho = pIsa / (R * tAct);

  // TAS
  const tasKt = casKt * Math.sqrt(rho0 / rho);
  return tasKt;
}
