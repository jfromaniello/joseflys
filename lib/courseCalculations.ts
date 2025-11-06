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

export interface Waypoint {
  name: string;
  distance: number; // NM from start of leg
}

export interface WaypointResult {
  name: string;
  distance: number;
  timeSinceLast: number; // minutes
  cumulativeTime: number; // minutes
  eta?: string; // HHMM format
  fuelUsed?: number; // cumulative fuel used to this point
}

export interface FlightParameters {
  departureTime?: string; // HHMM format
  elapsedMinutes?: number; // minutes flown before this leg
}

export function calculateCourse(
  windDir: number,
  windSpeed: number,
  trueHeading: number,
  tas: number,
  magDev: number,
  distance?: number,
  fuelFlow?: number,
  elapsedMinutes?: number
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
    // ETA = Distance / Ground Speed (in hours) - this is just for THIS leg
    eta = distance / groundSpeed;

    // Fuel Used = Fuel Flow × Total Time (including elapsed time from previous legs)
    if (fuelFlow !== undefined && fuelFlow > 0) {
      const elapsedHours = (elapsedMinutes || 0) / 60;
      const totalHours = elapsedHours + eta;
      fuelUsed = fuelFlow * totalHours;
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

/**
 * Calculate waypoint times and fuel consumption
 */
export function calculateWaypoints(
  waypoints: Waypoint[],
  groundSpeed: number,
  fuelFlow?: number,
  flightParams?: FlightParameters
): WaypointResult[] {
  if (waypoints.length === 0 || groundSpeed <= 0) {
    return [];
  }

  // Sort waypoints by distance
  const sortedWaypoints = [...waypoints].sort((a, b) => a.distance - b.distance);

  const results: WaypointResult[] = [];
  let previousDistance = 0;

  sortedWaypoints.forEach((waypoint) => {
    // Time to this waypoint from previous waypoint (in minutes)
    const distanceSinceLast = waypoint.distance - previousDistance;
    const timeSinceLast = Math.round((distanceSinceLast / groundSpeed) * 60);

    // Cumulative time from start of leg + any elapsed time before this leg
    const timeFromLegStart = Math.round((waypoint.distance / groundSpeed) * 60);
    const elapsedMinutes = flightParams?.elapsedMinutes || 0;
    const cumulativeTime = elapsedMinutes + timeFromLegStart;

    // Calculate ETA if departure time is provided
    let eta: string | undefined;
    if (flightParams?.departureTime) {
      eta = addMinutesToTime(flightParams.departureTime, cumulativeTime);
    }

    // Calculate cumulative fuel used to this waypoint
    let fuelUsed: number | undefined;
    if (fuelFlow !== undefined && fuelFlow > 0) {
      const totalHours = cumulativeTime / 60;
      fuelUsed = Math.round(fuelFlow * totalHours);
    }

    results.push({
      name: waypoint.name,
      distance: waypoint.distance,
      timeSinceLast,
      cumulativeTime,
      eta,
      fuelUsed,
    });

    previousDistance = waypoint.distance;
  });

  return results;
}

/**
 * Add minutes to a time in HHMM format
 */
function addMinutesToTime(timeHHMM: string, minutesToAdd: number): string {
  // Parse HHMM
  const hours = parseInt(timeHHMM.substring(0, 2), 10);
  const minutes = parseInt(timeHHMM.substring(2, 4), 10);

  // Calculate total minutes
  const totalMinutes = hours * 60 + minutes + minutesToAdd;

  // Convert back to hours and minutes (24-hour format with wrap-around)
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;

  // Format as HHMM
  return `${String(newHours).padStart(2, '0')}${String(newMinutes).padStart(2, '0')}`;
}
