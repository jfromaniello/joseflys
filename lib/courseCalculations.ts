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
  /** Climb phase calculations (if climb data provided) */
  climbPhase?: {
    /** Distance covered during climb in nautical miles */
    distance: number;
    /** Ground speed during climb in knots */
    groundSpeed: number;
    /** Time spent climbing in hours */
    time: number;
    /** Fuel used during climb (as provided by user) */
    fuelUsed: number;
  };
  /** Cruise phase calculations (if climb data provided) */
  cruisePhase?: {
    /** Distance at cruise speed in nautical miles */
    distance: number;
    /** Time at cruise speed in hours */
    time: number;
    /** Fuel used during cruise */
    fuelUsed: number;
  };
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
 * @param tas - True airspeed in knots (at cruise)
 * @param magDev - Magnetic deviation in degrees (negative for East, positive for West)
 * @param distance - Distance to travel in nautical miles (optional, required for ETA and fuel calculations)
 * @param fuelFlow - Fuel flow rate in GPH/LPH/PPH/KGH (optional, required for fuel calculations)
 * @param elapsedMinutes - Minutes already flown before this leg (optional, for multi-leg flights)
 * @param previousFuelUsed - Fuel already consumed in previous legs (optional, overrides elapsedMinutes calculation if provided)
 * @param climbTas - True airspeed during climb in knots (optional)
 * @param climbDistance - Horizontal distance covered during climb in nautical miles (optional)
 * @param climbFuelUsed - Fuel consumed during climb phase (optional)
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
  previousFuelUsed?: number,
  climbTas?: number,
  climbDistance?: number,
  climbFuelUsed?: number
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
  let climbPhase: CourseCalculations['climbPhase'];
  let cruisePhase: CourseCalculations['cruisePhase'];

  // Check if we have complete climb data
  const hasClimbData =
    climbTas !== undefined &&
    climbTas > 0 &&
    climbDistance !== undefined &&
    climbDistance > 0 &&
    climbFuelUsed !== undefined &&
    climbFuelUsed >= 0;

  if (distance !== undefined && distance > 0) {
    if (hasClimbData) {
      // Calculate climb phase ground speed
      // Use same wind correction logic for climb TAS
      const climbWcaRad = Math.asin((windSpeed * Math.sin(relativeWind)) / climbTas!);
      const climbWca = toDeg(climbWcaRad);

      let climbEffectiveSpeed = climbTas!;
      if (Math.abs(climbWca) > 10) {
        climbEffectiveSpeed = climbTas! * Math.cos(climbWcaRad);
      }

      const climbGsSquared =
        climbEffectiveSpeed * climbEffectiveSpeed +
        windSpeed * windSpeed -
        2 * climbEffectiveSpeed * windSpeed * Math.cos(relativeWind);
      const climbGroundSpeed = Math.sqrt(Math.max(0, climbGsSquared));

      // Climb time in hours
      const climbTime = climbDistance! / climbGroundSpeed;

      // Cruise distance and time
      const cruiseDistance = Math.max(0, distance - climbDistance!);
      const cruiseTime = cruiseDistance / groundSpeed;

      // Total ETA is climb time + cruise time
      eta = climbTime + cruiseTime;

      // Calculate fuel for cruise phase
      let cruiseFuelUsed = 0;
      if (fuelFlow !== undefined && fuelFlow > 0) {
        cruiseFuelUsed = fuelFlow * cruiseTime;
      }

      // Total fuel used - always include climb fuel if provided
      const baseFuel = previousFuelUsed !== undefined
        ? previousFuelUsed
        : (fuelFlow !== undefined && fuelFlow > 0)
          ? fuelFlow * ((elapsedMinutes || 0) / 60)
          : 0;

      // Always sum climb fuel and cruise fuel to the base
      fuelUsed = baseFuel + climbFuelUsed! + cruiseFuelUsed;

      // Store climb and cruise phase details
      climbPhase = {
        distance: climbDistance!,
        groundSpeed: climbGroundSpeed,
        time: climbTime,
        fuelUsed: climbFuelUsed!,
      };

      cruisePhase = {
        distance: cruiseDistance,
        time: cruiseTime,
        fuelUsed: cruiseFuelUsed,
      };
    } else {
      // Original calculation without climb data
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
    climbPhase,
    cruisePhase,
  };
}

/**
 * Calculate waypoint times and fuel consumption for a flight leg
 *
 * @param waypoints - Array of waypoints with names and distances from start of leg
 * @param groundSpeed - Ground speed in knots (at cruise)
 * @param fuelFlow - Fuel flow rate in GPH/LPH/PPH/KGH (optional, required for fuel calculations)
 * @param flightParams - Flight parameters including departure time, elapsed time, and previous fuel used
 * @param totalDistance - Total distance of the leg in nautical miles (optional, adds "Arrival" waypoint if greater than last waypoint)
 * @param climbPhase - Optional climb phase data (if provided, waypoints will account for climb speed)
 * @param cruiseFuelFlow - Fuel flow during cruise (optional, if different from climb)
 * @returns Array of WaypointResult with calculated times, ETAs, and fuel usage for each waypoint
 */
export function calculateWaypoints(
  waypoints: Waypoint[],
  groundSpeed: number,
  fuelFlow?: number,
  flightParams?: FlightParameters,
  totalDistance?: number,
  climbPhase?: CourseCalculations['climbPhase'],
  cruiseFuelFlow?: number
): WaypointResult[] {
  if (groundSpeed <= 0) {
    return [];
  }

  // Sort waypoints by distance
  const sortedWaypoints = [...waypoints].sort((a, b) => a.distance - b.distance);

  // Add "Cruise Altitude Reached" checkpoint if there's climb data
  if (climbPhase && climbPhase.distance > 0) {
    // Insert the cruise altitude checkpoint at the correct position
    sortedWaypoints.unshift({
      name: "Cruise Altitude Reached",
      distance: climbPhase.distance
    });
  }

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
    let timeFromLegStart: number;
    let timeSinceLast: number;
    let waypointFuelFromLegStart: number = 0;

    if (climbPhase) {
      // Calculate time considering climb and cruise phases
      if (waypoint.distance <= climbPhase.distance) {
        // Waypoint is entirely within climb phase
        timeFromLegStart = (waypoint.distance / climbPhase.groundSpeed) * 60;

        // Time since last waypoint
        const distanceSinceLast = waypoint.distance - previousDistance;
        if (previousDistance < climbPhase.distance) {
          // Previous waypoint was also in climb phase
          timeSinceLast = (distanceSinceLast / climbPhase.groundSpeed) * 60;
        } else {
          // This shouldn't happen as waypoints are sorted
          timeSinceLast = (distanceSinceLast / climbPhase.groundSpeed) * 60;
        }

        // Fuel calculation for waypoint in climb phase
        // Proportional fuel based on distance covered in climb
        const climbFuelRate = climbPhase.fuelUsed / climbPhase.distance; // fuel per NM during climb
        waypointFuelFromLegStart = waypoint.distance * climbFuelRate;
      } else {
        // Waypoint is past climb phase - split calculation
        const climbTime = (climbPhase.distance / climbPhase.groundSpeed) * 60;
        const cruiseDistToWaypoint = waypoint.distance - climbPhase.distance;
        const cruiseTime = (cruiseDistToWaypoint / groundSpeed) * 60;
        timeFromLegStart = climbTime + cruiseTime;

        // Time since last waypoint
        const distanceSinceLast = waypoint.distance - previousDistance;
        if (previousDistance >= climbPhase.distance) {
          // Previous waypoint was in cruise, this segment is all cruise
          timeSinceLast = (distanceSinceLast / groundSpeed) * 60;
        } else if (previousDistance < climbPhase.distance) {
          // Previous waypoint was in climb, this segment spans climb and cruise
          const remainingClimbDist = climbPhase.distance - previousDistance;
          const cruiseDist = distanceSinceLast - remainingClimbDist;
          const climbSegmentTime = (remainingClimbDist / climbPhase.groundSpeed) * 60;
          const cruiseSegmentTime = (cruiseDist / groundSpeed) * 60;
          timeSinceLast = climbSegmentTime + cruiseSegmentTime;
        } else {
          timeSinceLast = (distanceSinceLast / groundSpeed) * 60;
        }

        // Fuel calculation: climb fuel + cruise fuel to this waypoint
        const climbFuelRate = climbPhase.fuelUsed / climbPhase.distance;
        const totalClimbFuel = climbPhase.distance * climbFuelRate;

        // Cruise fuel (use cruiseFuelFlow if provided, otherwise fuelFlow)
        const effectiveCruiseFuelFlow = cruiseFuelFlow ?? fuelFlow ?? 0;
        const cruiseFuelForSegment = effectiveCruiseFuelFlow * (cruiseTime / 60);

        waypointFuelFromLegStart = totalClimbFuel + cruiseFuelForSegment;
      }
    } else {
      // No climb data - use original calculation
      const distanceSinceLast = waypoint.distance - previousDistance;
      timeSinceLast = (distanceSinceLast / groundSpeed) * 60;
      timeFromLegStart = (waypoint.distance / groundSpeed) * 60;

      // Fuel from leg start
      if (fuelFlow !== undefined && fuelFlow > 0) {
        waypointFuelFromLegStart = fuelFlow * (timeFromLegStart / 60);
      }
    }

    // Round time values
    timeSinceLast = Math.round(timeSinceLast);
    timeFromLegStart = Math.round(timeFromLegStart);

    const elapsedMinutes = flightParams?.elapsedMinutes || 0;
    const cumulativeTime = elapsedMinutes + timeFromLegStart;

    // Calculate ETA if departure time is provided
    let eta: string | undefined;
    if (flightParams?.departureTime) {
      eta = addMinutesToTime(flightParams.departureTime, cumulativeTime);
    }

    // Calculate cumulative fuel used to this waypoint
    let fuelUsed: number | undefined;
    // Only calculate fuel if we have fuel flow OR climb phase with fuel data
    const hasFuelData = (fuelFlow !== undefined && fuelFlow > 0) || (climbPhase && climbPhase.fuelUsed > 0);

    if (hasFuelData) {
      const previousFuel = flightParams?.previousFuelUsed || 0;
      if (climbPhase && climbPhase.fuelUsed > 0) {
        fuelUsed = Math.round(previousFuel + waypointFuelFromLegStart);
      } else if (fuelFlow !== undefined && fuelFlow > 0) {
        if (previousFuel > 0) {
          // If previous fuel used is specified, add fuel consumed from start of this leg only
          fuelUsed = Math.round(previousFuel + waypointFuelFromLegStart);
        } else {
          // Otherwise, use the old behavior: fuel flow × cumulative time
          const totalHours = cumulativeTime / 60;
          fuelUsed = Math.round((fuelFlow ?? 0) * totalHours);
        }
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
export function addMinutesToTime(timeHHMM: string, minutesToAdd: number): string {
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
