/**
 * ISA (International Standard Atmosphere) Calculations
 * Reusable functions for ISA, Pressure Altitude, and Density Altitude calculations
 *
 * Uses the real ISA atmospheric model (not linear approximations) for accurate
 * pressure altitude calculations matching standard atmosphere tables (FAA Figure 8).
 */

// ============================================================================
// ISA Constants - Single source of truth for all atmospheric calculations
// ============================================================================

/** ISA sea level temperature in Kelvin (15°C) */
export const ISA_T0 = 288.15;

/** ISA sea level pressure in Pascals (1013.25 hPa) */
export const ISA_P0 = 101325.0;

/** Standard gravity in m/s² */
export const ISA_G0 = 9.80665;

/** Specific gas constant for dry air in J/(kg·K) */
export const ISA_R = 287.05287;

/** Temperature lapse rate in troposphere (K/m) */
export const ISA_L = 0.0065;

/** Exponent for barometric formula: g0 / (R * L) ≈ 5.2559 */
export const ISA_EXP = ISA_G0 / (ISA_R * ISA_L);

/** Conversion: feet to meters */
export const FT_TO_M = 0.3048;

/** Conversion: hPa to Pascals */
export const HPA_TO_PA = 100;

/** Conversion: inHg to Pascals (1 inHg = 3386.39 Pa) */
export const INHG_TO_PA = 3386.39;

// ============================================================================
// Primitive ISA Functions
// ============================================================================

/**
 * Calculate ISA pressure at a given altitude (standard atmosphere)
 * @param altitudeFt - Altitude in feet
 * @returns Pressure in Pascals
 */
export function isaPressure(altitudeFt: number): number {
  const hM = altitudeFt * FT_TO_M;
  return ISA_P0 * Math.pow(1 - (ISA_L * hM) / ISA_T0, ISA_EXP);
}

/**
 * Calculate ISA temperature at a given altitude in Kelvin
 * @param altitudeFt - Altitude in feet
 * @returns Temperature in Kelvin
 */
export function isaTemperatureK(altitudeFt: number): number {
  const hM = altitudeFt * FT_TO_M;
  return ISA_T0 - ISA_L * hM;
}

/**
 * Calculate air density given pressure and temperature
 * @param pressurePa - Pressure in Pascals
 * @param temperatureK - Temperature in Kelvin
 * @returns Density in kg/m³
 */
export function airDensity(pressurePa: number, temperatureK: number): number {
  return pressurePa / (ISA_R * temperatureK);
}

/** Sea level air density in kg/m³ (ISA conditions) */
export const ISA_SEA_LEVEL_DENSITY = ISA_P0 / (ISA_R * ISA_T0);

// Internal aliases for backward compatibility within this file
const T0 = ISA_T0;
const P0 = ISA_P0;
const L = ISA_L;
const EXP = ISA_EXP;

// ============================================================================
// QNH Validation
// ============================================================================

/**
 * Valid QNH ranges
 * These ranges cover typical to extreme atmospheric conditions
 * hPa: 900 (severe cyclone) to 1050 (strong anticyclone)
 * inHg: 26.58 to 31.00 (equivalent range)
 */
const QNH_RANGE_HPA = { min: 900, max: 1050 };
const QNH_RANGE_INHG = { min: 26.5, max: 31.5 };

/**
 * Detect if QNH is in inHg format
 * Values between 25-35 are assumed to be inHg
 * Values < 870 are also assumed to be inHg (since hPa cannot be that low in normal conditions)
 */
export function isInHg(qnh: number): boolean {
  return (qnh >= 25 && qnh <= 35) || qnh < 870;
}

/**
 * Validate if QNH value is within realistic range
 * @param qnh - QNH value in either hPa or inHg (auto-detected)
 * @returns true if QNH is within valid range
 */
export function isValidQNH(qnh: number): boolean {
  if (isNaN(qnh)) return false;

  if (isInHg(qnh)) {
    return qnh >= QNH_RANGE_INHG.min && qnh <= QNH_RANGE_INHG.max;
  } else {
    return qnh >= QNH_RANGE_HPA.min && qnh <= QNH_RANGE_HPA.max;
  }
}

/**
 * Get expected QNH range based on format
 */
export function getQNHRange(qnh: number): { min: number; max: number; unit: string } {
  if (isInHg(qnh)) {
    return { ...QNH_RANGE_INHG, unit: "inHg" };
  } else {
    return { ...QNH_RANGE_HPA, unit: "hPa" };
  }
}

/**
 * Calculate ISA temperature at given elevation
 * ISA standard: 15°C at sea level, decreasing 1.98°C per 1000 ft
 */
export function calculateISATemp(elevationFt: number): number {
  return 15 - 1.98 * (elevationFt / 1000);
}

/**
 * Calculate Pressure Altitude using the real ISA atmospheric model.
 *
 * This uses the barometric formula from the International Standard Atmosphere
 * rather than linear approximations (like 1 inHg ≈ 1000 ft or 1 hPa ≈ 27 ft).
 *
 * The calculation:
 * 1. Convert QNH to Pascals
 * 2. Calculate actual pressure at indicated altitude: P = QNH × (1 - L×h/T₀)^exp
 * 3. Find the altitude in ISA where pressure equals actual: PA = (T₀/L) × (1 - (P/P₀)^(1/exp))
 *
 * @param indicatedAltitudeFt - Indicated altitude in feet (with altimeter set to QNH)
 * @param qnh - QNH in hPa or inHg (auto-detected)
 * @returns Pressure altitude in feet
 */
export function calculatePA(indicatedAltitudeFt: number, qnh: number): number {
  // Convert QNH to Pascals
  const qnhPa = isInHg(qnh) ? qnh * INHG_TO_PA : qnh * HPA_TO_PA;

  // Convert indicated altitude to meters
  const hM = indicatedAltitudeFt * FT_TO_M;

  // Calculate actual pressure at indicated altitude using barometric formula
  // P = QNH × (1 - L×h/T₀)^exp
  const pressurePa = qnhPa * Math.pow(1 - (L * hM) / T0, EXP);

  // Calculate pressure altitude by inverting the ISA formula
  // PA = (T₀/L) × (1 - (P/P₀)^(1/exp))
  const paM = (T0 / L) * (1 - Math.pow(pressurePa / P0, 1 / EXP));

  // Convert back to feet
  return paM / FT_TO_M;
}

/**
 * Calculate Density Altitude
 * @param pa - Pressure altitude in feet
 * @param tempC - Actual temperature in Celsius
 * @param isaTemp - ISA temperature at this altitude in Celsius
 */
export function calculateDA(pa: number, tempC: number, isaTemp: number): number {
  return pa + 118.8 * (tempC - isaTemp);
}

/**
 * Complete ISA calculation from elevation, QNH, and temperature
 * Returns all relevant values
 */
export function calculateISA(elevationFt: number, qnh: number, tempC: number) {
  const isaTemp = calculateISATemp(elevationFt);
  const pa = calculatePA(elevationFt, qnh);
  const da = calculateDA(pa, tempC, isaTemp);

  return {
    isaTemp,
    pressureAltitude: pa,
    densityAltitude: da,
    qnhFormat: isInHg(qnh) ? "inHg" : "hPa",
  };
}
