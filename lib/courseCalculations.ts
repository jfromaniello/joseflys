/**
 * Result of course calculations including wind correction and fuel consumption
 */
export interface CourseCalculations {
  /** Crosswind component in knots (positive = wind from right, negative = wind from left) */
  crosswind: number;
  /** Headwind component in knots (positive = headwind, negative = tailwind) */
  headwind: number;
  /** Wind correction angle in degrees (angle to compensate for crosswind) */
  windCorrectionAngle: number;
  /** Compass heading in degrees (true heading + WCA + magnetic deviation) */
  compassHeading: number;
  /** Ground speed in knots (TAS adjusted for wind) */
  groundSpeed: number;
  /** Effective True Air Speed in knots (used when WCA > 10°) */
  etas?: number;
  /** Estimated time of arrival in hours (time for this leg only) */
  eta?: number;
  /** Total fuel used in same units as fuel flow (cumulative if previousFuelUsed provided) */
  fuelUsed?: number;
}

/**
 * Waypoint definition for flight planning
 */
export interface Waypoint {
  /** Name of the waypoint (e.g., "Rio Segundo", "KJFK") */
  name: string;
  /** Distance from start of leg in nautical miles */
  distance: number;
}

/**
 * Calculated waypoint information including time and fuel
 */
export interface WaypointResult {
  /** Name of the waypoint */
  name: string;
  /** Distance from start of leg in nautical miles */
  distance: number;
  /** Time since last waypoint in minutes */
  timeSinceLast: number;
  /** Cumulative time from departure in minutes (includes elapsedMinutes if provided) */
  cumulativeTime: number;
  /** Estimated time of arrival in HHMM format (e.g., "1545" for 3:45 PM) */
  eta?: string;
  /** Cumulative fuel used to this waypoint (includes previousFuelUsed if provided) */
  fuelUsed?: number;
}

/**
 * Flight parameters for time and fuel calculations
 */
export interface FlightParameters {
  /** Departure time in HHMM format (e.g., "1430" for 2:30 PM) */
  departureTime?: string;
  /** Minutes already flown before starting this leg (for multi-leg flights) */
  elapsedMinutes?: number;
  /** Fuel already consumed in previous legs (if provided, used instead of calculating from elapsedMinutes) */
  previousFuelUsed?: number;
}

/**
 * Calculate course parameters including wind correction, ground speed, and fuel consumption
 *
 * @param windDir - Wind direction in degrees (direction wind is coming FROM, 0-360)
 * @param windSpeed - Wind speed in knots
 * @param trueHeading - Desired true heading in degrees (0-360)
 * @param tas - True airspeed in knots
 * @param magDev - Magnetic deviation in degrees (negative for East, positive for West)
 * @param distance - Distance to travel in nautical miles (optional, required for ETA and fuel calculations)
 * @param fuelFlow - Fuel flow rate in GPH/LPH/PPH/KGH (optional, required for fuel calculations)
 * @param elapsedMinutes - Minutes already flown before this leg (optional, for multi-leg flights)
 * @param previousFuelUsed - Fuel already consumed in previous legs (optional, overrides elapsedMinutes calculation if provided)
 * @returns CourseCalculations object with wind correction angle, ground speed, compass heading, and fuel used
 */
export function calculateCourse(
  windDir: number,
  windSpeed: number,
  trueHeading: number,
  tas: number,
  magDev: number,
  distance?: number,
  fuelFlow?: number,
  elapsedMinutes?: number,
  previousFuelUsed?: number
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

    // Fuel Used calculation
    if (fuelFlow !== undefined && fuelFlow > 0) {
      if (previousFuelUsed !== undefined) {
        // If previous fuel used is specified, add fuel consumed in this leg only
        fuelUsed = previousFuelUsed + (fuelFlow * eta);
      } else {
        // Otherwise, use the old behavior: fuel flow × total time (elapsed + this leg)
        const elapsedHours = (elapsedMinutes || 0) / 60;
        const totalHours = elapsedHours + eta;
        fuelUsed = fuelFlow * totalHours;
      }
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
 * Calculate waypoint times and fuel consumption for a flight leg
 *
 * @param waypoints - Array of waypoints with names and distances from start of leg
 * @param groundSpeed - Ground speed in knots
 * @param fuelFlow - Fuel flow rate in GPH/LPH/PPH/KGH (optional, required for fuel calculations)
 * @param flightParams - Flight parameters including departure time, elapsed time, and previous fuel used
 * @param totalDistance - Total distance of the leg in nautical miles (optional, adds "Arrival" waypoint if greater than last waypoint)
 * @returns Array of WaypointResult with calculated times, ETAs, and fuel usage for each waypoint
 */
export function calculateWaypoints(
  waypoints: Waypoint[],
  groundSpeed: number,
  fuelFlow?: number,
  flightParams?: FlightParameters,
  totalDistance?: number
): WaypointResult[] {
  if (groundSpeed <= 0) {
    return [];
  }

  // Sort waypoints by distance
  const sortedWaypoints = [...waypoints].sort((a, b) => a.distance - b.distance);

  // If we have a total distance and it's greater than the last waypoint, add "Arrival" waypoint
  if (totalDistance !== undefined && totalDistance > 0) {
    const lastWaypointDistance = sortedWaypoints.length > 0
      ? sortedWaypoints[sortedWaypoints.length - 1].distance
      : 0;

    if (totalDistance > lastWaypointDistance) {
      sortedWaypoints.push({
        name: "Arrival",
        distance: totalDistance
      });
    }
  }

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
      const previousFuel = flightParams?.previousFuelUsed || 0;
      if (previousFuel > 0) {
        // If previous fuel used is specified, add fuel consumed from start of this leg only
        const timeFromLegStartHours = timeFromLegStart / 60;
        fuelUsed = Math.round(previousFuel + (fuelFlow * timeFromLegStartHours));
      } else {
        // Otherwise, use the old behavior: fuel flow × cumulative time
        const totalHours = cumulativeTime / 60;
        fuelUsed = Math.round(fuelFlow * totalHours);
      }
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
