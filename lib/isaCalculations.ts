/**
 * ISA (International Standard Atmosphere) Calculations
 * Reusable functions for ISA, Pressure Altitude, and Density Altitude calculations
 */

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
 * Calculate Pressure Altitude
 * @param elevationFt - Field elevation in feet
 * @param qnh - QNH in hPa or inHg (auto-detected)
 */
export function calculatePA(elevationFt: number, qnh: number): number {
  if (isInHg(qnh)) {
    // QNH in inHg
    return elevationFt + (29.92 - qnh) * 1000;
  } else {
    // QNH in hPa
    return elevationFt + (1013 - qnh) * 27;
  }
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
