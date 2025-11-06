export interface CourseCalculations {
  crosswind: number;
  headwind: number;
  windCorrectionAngle: number;
  compassHeading: number;
  groundSpeed: number;
  etas?: number;
  eta?: number; // in hours
  fuelUsed?: number; // in same units as fuel flow
}

export function calculateCourse(
  windDir: number,
  windSpeed: number,
  trueHeading: number,
  tas: number,
  magDev: number,
  distance?: number,
  fuelFlow?: number
): CourseCalculations {
  // Convert to radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  // Normalize angles to 0-360
  const normalize = (angle: number) => ((angle % 360) + 360) % 360;

  windDir = normalize(windDir);
  trueHeading = normalize(trueHeading);

  // Relative wind angle (angle between wind direction and heading)
  const relativeWind = toRad(windDir - trueHeading);

  // Crosswind component (positive = wind from right)
  const crosswind = windSpeed * Math.sin(relativeWind);

  // Headwind component (positive = headwind, negative = tailwind)
  const headwind = -windSpeed * Math.cos(relativeWind);

  // Wind correction angle using arcsin formula
  const wcaRad = Math.asin((windSpeed * Math.sin(relativeWind)) / tas);
  const windCorrectionAngle = toDeg(wcaRad);

  // ETAS (Effective True Air Speed) - used when WCA > 10°
  let etas: number | undefined;
  let effectiveSpeed = tas;
  if (Math.abs(windCorrectionAngle) > 10) {
    etas = tas * Math.cos(wcaRad);
    effectiveSpeed = etas; // Use ETAS for GS calculation when WCA > 10°
  }

  // Ground speed using law of cosines with effective speed
  // GS² = EffectiveSpeed² + WS² - 2·EffectiveSpeed·WS·cos(relative wind angle)
  const gsSquared =
    effectiveSpeed * effectiveSpeed +
    windSpeed * windSpeed -
    2 * effectiveSpeed * windSpeed * Math.cos(relativeWind);
  const groundSpeed = Math.sqrt(Math.max(0, gsSquared));

  // Compass heading = True heading + WCA + Magnetic deviation
  // (East variation is negative, west is positive)
  const compassHeading = normalize(trueHeading + windCorrectionAngle + magDev);

  // Calculate ETA if distance is provided
  let eta: number | undefined;
  let fuelUsed: number | undefined;

  if (distance !== undefined && distance > 0) {
    // ETA = Distance / Ground Speed (in hours)
    eta = distance / groundSpeed;

    // Fuel Used = Fuel Flow × ETA (only if fuel flow is provided)
    if (fuelFlow !== undefined && fuelFlow > 0) {
      fuelUsed = fuelFlow * eta;
    }
  }

  return {
    crosswind,
    headwind,
    windCorrectionAngle,
    compassHeading,
    groundSpeed,
    etas,
    eta,
    fuelUsed,
  };
}
