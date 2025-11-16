import type { FlightPlanLeg } from "./flightPlan";
import { toKnots } from "./speedConversion";
import { calculateCompassCourse } from "./compassDeviation";
import { loadAircraftFromUrl } from "./aircraftStorage";

/**
 * Input parameters for course calculations
 * Uses same field names as FlightPlanLeg for easy mapping
 *
 * All speeds (tas, climbTas, descentTas) are in the unit specified by 'unit' parameter
 * Conversions to knots are done internally by calculateCourse
 * If unit is not provided, defaults to 'kt' (knots)
 *
 * Magnetic variation: Either 'var' (WMM convention) or 'md' (legacy) must be provided
 * - If 'var' is present, it takes priority (WMM: positive=E, negative=W)
 * - If only 'md' is present, it's converted: var = -md (legacy: positive=W, negative=E)
 */
export type CourseCalculationInput =
  & Required<Pick<FlightPlanLeg, 'th' | 'tas'>>
  & Partial<Pick<FlightPlanLeg,
      'var' | 'md' | 'wd' | 'ws' | 'dist' | 'ff' | 'elapsedMin' | 'prevFuel' |
      'climbTas' | 'climbDist' | 'climbFuel' | 'climbWd' | 'climbWs' |
      'descentTas' | 'descentDist' | 'descentFuel' | 'descentWd' | 'descentWs' |
      'additionalFuel' | 'approachLandingFuel' | 'unit' | 'plane'
    >>;

/**
 * Result of course calculations including wind correction and fuel consumption
 *
 * Fuel calculation breakdown:
 * - baseFuel = fuel from climb + cruise + descent phases (fuelFlow × time)
 * - additionalFuelAmount = (additionalFuel minutes / 60) × fuelFlow
 * - approachLandingFuelAmount = direct gallon amount
 * - legFuelUsed = baseFuel + additionalFuelAmount + approachLandingFuelAmount
 * - fuelUsed = prevFuel + legFuelUsed (total cumulative)
 */
export interface CourseCalculations {
  /** Crosswind component in knots (positive = wind from right, negative = wind from left) */
  crosswind: number;
  /** Headwind component in knots (positive = headwind, negative = tailwind) */
  headwind: number;
  /** Magnetic course in degrees (true course + magnetic variation, before wind correction) */
  magneticCourse: number;
  /** Wind correction angle in degrees (angle to compensate for crosswind) */
  windCorrectionAngle: number;
  /** Magnetic heading in degrees (true course + magnetic variation + WCA) */
  magneticHeading: number;
  /** Compass course in degrees (magnetic heading + compass deviation from deviation table, equals magneticHeading if no table provided) */
  compassCourse: number;
  /** Whether a deviation table was used to calculate compassCourse */
  hasDeviationTable: boolean;
  /** Ground speed in knots (TAS adjusted for wind) */
  groundSpeed: number;
  /** Effective True Air Speed in knots (used when WCA > 10°) */
  etas?: number;
  /**
   * Estimated time of arrival in hours (time for this leg only)
   * Does NOT include elapsedMin - this is just the flight time for this leg
   */
  eta?: number;

  // ===== Fuel Calculations =====
  /**
   * Total cumulative fuel used (includes prevFuel if provided)
   * Formula: prevFuel + legFuelUsed
   * Units: same as fuelFlow input
   */
  fuelUsed?: number;

  /**
   * Fuel used ONLY in this leg (excludes prevFuel, includes all leg fuel)
   * Formula: baseFuel + additionalFuelAmount + approachLandingFuelAmount
   * Units: same as fuelFlow input
   */
  legFuelUsed?: number;

  /**
   * Additional fuel from additionalFuel parameter (converted from minutes)
   * Formula: (additionalFuel / 60) × fuelFlow
   * Units: same as fuelFlow input
   */
  additionalFuelAmount?: number;

  /**
   * Approach and landing fuel (direct amount, not time-based)
   * This is the approachLandingFuel input value as-is
   * Units: gallons (GAL)
   */
  approachLandingFuelAmount?: number;

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
  /** Descent phase calculations (if descent data provided) */
  descentPhase?: {
    /** Distance covered during descent in nautical miles */
    distance: number;
    /** Ground speed during descent in knots */
    groundSpeed: number;
    /** Time spent descending in hours */
    time: number;
    /** Fuel used during descent (as provided by user) */
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
  /** Total distance from departure in nautical miles (includes elapsedDistance if provided) */
  distance: number;
  /** Distance since last waypoint in nautical miles (segment/partial) */
  distanceSinceLast: number;
  /** Time since last waypoint in minutes */
  timeSinceLast: number;
  /** Cumulative time from departure in minutes (includes elapsedMinutes if provided) */
  cumulativeTime: number;
  /** Estimated time of arrival in HHMM format (e.g., "1545" for 3:45 PM) */
  eta?: string;
  /** Cumulative fuel used to this waypoint (includes previousFuelUsed if provided) */
  fuelUsed?: number;
  /** Fuel used since last waypoint (segment/partial) */
  fuelSinceLast?: number;
}

/**
 * Flight parameters for time and fuel calculations
 */
export interface FlightParameters {
  /** Departure time in HHMM format (e.g., "1430" for 2:30 PM) */
  departureTime?: string;
  /** Minutes already flown before starting this leg (for multi-leg flights) */
  elapsedMinutes?: number;
  /** Nautical miles already traveled in previous legs (for multi-leg flights) */
  elapsedDistance?: number;
  /** Fuel already consumed in previous legs (if provided, used instead of calculating from elapsedMinutes) */
  previousFuelUsed?: number;
}

/**
 * Calculate course parameters including wind correction, ground speed, and fuel consumption
 *
 * @param input - Course calculation parameters
 * @returns CourseCalculations object with wind correction angle, ground speed, compass heading, and fuel used
 */
export function calculateCourse(input: CourseCalculationInput): CourseCalculations {
  // Destructure input parameters
  let {
    wd: windDir = 0,
    // eslint-disable-next-line prefer-const
    ws: windSpeed = 0,
    th: trueHeading,
  } = input;

  const {
    tas,
    var: magVar,
    md: magDev,
    dist: distance,
    ff: fuelFlow,
    elapsedMin: elapsedMinutes,
    prevFuel: previousFuelUsed,
    climbTas,
    climbDist: climbDistance,
    climbFuel: climbFuelUsed,
    climbWd: climbWindDir,
    climbWs: climbWindSpeed,
    descentTas,
    descentDist: descentDistance,
    descentFuel: descentFuelUsed,
    descentWd: descentWindDir,
    descentWs: descentWindSpeed,
    additionalFuel,
    approachLandingFuel,
    unit = 'kt', // Default to knots if not specified
    plane,
  } = input;

  // Convert all speeds to knots for internal calculations
  const tasInKnots = toKnots(tas, unit);
  const climbTasInKnots = climbTas !== undefined ? toKnots(climbTas, unit) : undefined;
  const descentTasInKnots = descentTas !== undefined ? toKnots(descentTas, unit) : undefined;

  // Convert to radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  // Normalize angles to 0-360
  const normalize = (angle: number) => ((angle % 360) + 360) % 360;

  windDir = normalize(windDir);
  trueHeading = normalize(trueHeading);

  // Handle magnetic variation: prefer 'var' (WMM), fallback to 'md' (legacy)
  // WMM (var parameter): positive = East, negative = West
  // LEGACY (md parameter): positive = West, negative = East
  // If 'var' is present, use it directly; otherwise convert 'md': var = -md
  const magDevWMM = magVar !== undefined ? magVar : (magDev !== undefined ? -magDev : 0);

  // Relative wind angle (angle between wind direction and heading)
  const relativeWind = toRad(windDir - trueHeading);

  // Crosswind component (positive = wind from right)
  const crosswind = windSpeed * Math.sin(relativeWind);

  // Headwind component (positive = headwind, negative = tailwind)
  const headwind = -windSpeed * Math.cos(relativeWind);

  // Wind correction angle using arcsin formula
  const wcaRad = Math.asin((windSpeed * Math.sin(relativeWind)) / tasInKnots);
  const windCorrectionAngle = toDeg(wcaRad);

  // ETAS (Effective True Air Speed) - used when WCA > 10°
  let etas: number | undefined;
  let effectiveSpeed = tasInKnots;
  if (Math.abs(windCorrectionAngle) > 10) {
    etas = tasInKnots * Math.cos(wcaRad);
    effectiveSpeed = etas; // Use ETAS for GS calculation when WCA > 10°
  }

  // Ground speed using law of cosines with effective speed
  // GS² = EffectiveSpeed² + WS² - 2·EffectiveSpeed·WS·cos(relative wind angle)
  const gsSquared =
    effectiveSpeed * effectiveSpeed +
    windSpeed * windSpeed -
    2 * effectiveSpeed * windSpeed * Math.cos(relativeWind);
  const groundSpeed = Math.sqrt(Math.max(0, gsSquared));

  // Magnetic course (MC) = True course - Magnetic declination (WMM: positive = East means subtract)
  // With WMM convention: If declination is +10°E, then MC = TC - 10°
  const magneticCourse = normalize(trueHeading - magDevWMM);

  // Magnetic heading (MH) = True course + WCA - Magnetic declination (WMM convention)
  const magneticHeading = normalize(trueHeading + windCorrectionAngle - magDevWMM);

  // Compass course (CH) = Magnetic heading + Compass deviation (from deviation table)
  // If no deviation table provided, compassCourse equals magneticHeading
  let compassCourse: number = magneticHeading;
  let hasDeviationTable = false;
  if (plane) {
    const aircraft = loadAircraftFromUrl(plane);
    if (aircraft?.deviationTable && aircraft.deviationTable.length >= 2) {
      const calculated = calculateCompassCourse(magneticHeading, aircraft.deviationTable);
      if (calculated !== null) {
        compassCourse = calculated;
        hasDeviationTable = true;
      }
    }
  }

  // Calculate ETA if distance is provided
  let eta: number | undefined;
  let fuelUsed: number | undefined;
  let climbPhase: CourseCalculations['climbPhase'];
  let cruisePhase: CourseCalculations['cruisePhase'];
  let descentPhase: CourseCalculations['descentPhase'];

  // Check if we have complete climb data
  const hasClimbData =
    climbTasInKnots !== undefined &&
    climbTasInKnots > 0 &&
    climbDistance !== undefined &&
    climbDistance > 0 &&
    climbFuelUsed !== undefined &&
    climbFuelUsed >= 0;

  // Check if we have complete descent data
  const hasDescentData =
    descentTasInKnots !== undefined &&
    descentTasInKnots > 0 &&
    descentDistance !== undefined &&
    descentDistance > 0 &&
    descentFuelUsed !== undefined &&
    descentFuelUsed >= 0;

  if (distance !== undefined && distance > 0) {
    if (hasClimbData || hasDescentData) {
      let climbGroundSpeed = 0;
      let climbTime = 0;
      let descentGroundSpeed = 0;
      let descentTime = 0;
      let actualClimbDist = 0;
      let actualDescentDist = 0;

      // Calculate climb phase if data provided
      if (hasClimbData) {
        // Use climb-specific wind if provided, otherwise use general wind
        const effectiveClimbWindDir = climbWindDir !== undefined ? climbWindDir : windDir;
        const effectiveClimbWindSpeed = climbWindSpeed !== undefined ? climbWindSpeed : windSpeed;

        // Calculate relative wind for climb phase
        const climbRelativeWind = toRad(effectiveClimbWindDir - trueHeading);

        const climbWcaRad = Math.asin((effectiveClimbWindSpeed * Math.sin(climbRelativeWind)) / climbTasInKnots!);
        const climbWca = toDeg(climbWcaRad);

        let climbEffectiveSpeed = climbTasInKnots!;
        if (Math.abs(climbWca) > 10) {
          climbEffectiveSpeed = climbTasInKnots! * Math.cos(climbWcaRad);
        }

        const climbGsSquared =
          climbEffectiveSpeed * climbEffectiveSpeed +
          effectiveClimbWindSpeed * effectiveClimbWindSpeed -
          2 * climbEffectiveSpeed * effectiveClimbWindSpeed * Math.cos(climbRelativeWind);
        climbGroundSpeed = Math.sqrt(Math.max(0, climbGsSquared));

        actualClimbDist = climbDistance!;
        climbTime = actualClimbDist / climbGroundSpeed;

        climbPhase = {
          distance: actualClimbDist,
          groundSpeed: climbGroundSpeed,
          time: climbTime,
          fuelUsed: climbFuelUsed!,
        };
      }

      // Calculate descent phase if data provided
      if (hasDescentData) {
        // Use descent-specific wind if provided, otherwise use general wind
        const effectiveDescentWindDir = descentWindDir !== undefined ? descentWindDir : windDir;
        const effectiveDescentWindSpeed = descentWindSpeed !== undefined ? descentWindSpeed : windSpeed;

        // Calculate relative wind for descent phase
        const descentRelativeWind = toRad(effectiveDescentWindDir - trueHeading);

        const descentWcaRad = Math.asin((effectiveDescentWindSpeed * Math.sin(descentRelativeWind)) / descentTasInKnots!);
        const descentWca = toDeg(descentWcaRad);

        let descentEffectiveSpeed = descentTasInKnots!;
        if (Math.abs(descentWca) > 10) {
          descentEffectiveSpeed = descentTasInKnots! * Math.cos(descentWcaRad);
        }

        const descentGsSquared =
          descentEffectiveSpeed * descentEffectiveSpeed +
          effectiveDescentWindSpeed * effectiveDescentWindSpeed -
          2 * descentEffectiveSpeed * effectiveDescentWindSpeed * Math.cos(descentRelativeWind);
        descentGroundSpeed = Math.sqrt(Math.max(0, descentGsSquared));

        actualDescentDist = descentDistance!;
        descentTime = actualDescentDist / descentGroundSpeed;

        descentPhase = {
          distance: actualDescentDist,
          groundSpeed: descentGroundSpeed,
          time: descentTime,
          fuelUsed: descentFuelUsed!,
        };
      }

      // Calculate cruise distance and time
      const cruiseDistance = Math.max(0, distance - actualClimbDist - actualDescentDist);
      const cruiseTime = cruiseDistance / groundSpeed;

      // Total ETA is sum of all phases
      eta = climbTime + cruiseTime + descentTime;

      // Calculate fuel for cruise phase
      let cruiseFuelUsed = 0;
      if (fuelFlow !== undefined && fuelFlow > 0) {
        cruiseFuelUsed = fuelFlow * cruiseTime;
      }

      // Total fuel used
      const baseFuel = previousFuelUsed !== undefined
        ? previousFuelUsed
        : (fuelFlow !== undefined && fuelFlow > 0)
          ? fuelFlow * ((elapsedMinutes || 0) / 60)
          : 0;

      // Sum all phase fuels to the base
      const climbFuelToAdd = hasClimbData ? climbFuelUsed! : 0;
      const descentFuelToAdd = hasDescentData ? descentFuelUsed! : 0;
      fuelUsed = baseFuel + climbFuelToAdd + cruiseFuelUsed + descentFuelToAdd;

      // Store cruise phase details
      cruisePhase = {
        distance: cruiseDistance,
        time: cruiseTime,
        fuelUsed: cruiseFuelUsed,
      };
    } else {
      // Original calculation without climb or descent data
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

  // Calculate additional fuel components
  let additionalFuelAmount: number | undefined;
  let approachLandingFuelAmount: number | undefined;
  let legFuelUsed: number | undefined;

  // Additional fuel (time-based): minutes × fuel flow
  if (additionalFuel !== undefined && additionalFuel > 0 && fuelFlow !== undefined && fuelFlow > 0) {
    additionalFuelAmount = (additionalFuel / 60) * fuelFlow;
  }

  // Approach & landing fuel (direct amount in gallons)
  if (approachLandingFuel !== undefined && approachLandingFuel > 0) {
    approachLandingFuelAmount = approachLandingFuel;
  }

  // Calculate leg fuel (fuel for THIS leg only, without prevFuel)
  if (fuelUsed !== undefined) {
    // Base fuel is current fuelUsed minus prevFuel (if it was added)
    const baseFuel = previousFuelUsed !== undefined
      ? fuelUsed - previousFuelUsed
      : fuelUsed;

    // Leg fuel = base + additional + approach/landing
    legFuelUsed = baseFuel + (additionalFuelAmount || 0) + (approachLandingFuelAmount || 0);

    // Total cumulative fuel = prevFuel + legFuel
    fuelUsed = (previousFuelUsed || 0) + legFuelUsed;
  }

  return {
    crosswind,
    headwind,
    magneticCourse,
    windCorrectionAngle,
    magneticHeading,
    compassCourse,
    hasDeviationTable,
    groundSpeed,
    etas,
    eta,
    fuelUsed,
    legFuelUsed,
    additionalFuelAmount,
    approachLandingFuelAmount,
    climbPhase,
    cruisePhase,
    descentPhase,
  };
}

/**
 * Calculate waypoint times and fuel consumption for a flight leg
 *
 * @param waypoints - Array of waypoints with names and distances from start of leg
 * @param groundSpeed - Ground speed in knots (at cruise)
 * @param fuelFlow - Fuel flow rate in GPH/LPH/PPH/KGH (optional, required for fuel calculations)
 * @param flightParams - Flight parameters including departure time, elapsed time, and previous fuel used
 * @param totalDistance - Total distance of the leg in nautical miles (optional, adds "Arrival" or "Landed" waypoint if greater than last waypoint)
 * @param climbPhase - Optional climb phase data (if provided, waypoints will account for climb speed)
 * @param cruiseFuelFlow - Fuel flow during cruise (optional, if different from climb)
 * @param descentPhase - Optional descent phase data (if provided, waypoints will account for descent speed)
 * @returns Array of WaypointResult with calculated times, ETAs, and fuel usage for each waypoint
 */
export function calculateWaypoints(
  waypoints: Waypoint[],
  groundSpeed: number,
  fuelFlow?: number,
  flightParams?: FlightParameters,
  totalDistance?: number,
  climbPhase?: CourseCalculations['climbPhase'],
  cruiseFuelFlow?: number,
  descentPhase?: CourseCalculations['descentPhase']
): WaypointResult[] {
  if (groundSpeed <= 0) {
    return [];
  }

  // Sort waypoints by distance
  const sortedWaypoints = [...waypoints].sort((a, b) => a.distance - b.distance);

  // Calculate descent start distance (distance from start of leg where descent begins)
  const descentStartDist = totalDistance && descentPhase && descentPhase.distance > 0
    ? totalDistance - descentPhase.distance
    : undefined;

  // Add "Top of Climb" checkpoint if there's climb data
  if (climbPhase && climbPhase.distance > 0) {
    // Find the correct position to insert based on distance
    const insertIndex = sortedWaypoints.findIndex(wp => wp.distance > climbPhase.distance);
    const cruiseAltitudeCheckpoint = {
      name: "Top of Climb",
      distance: climbPhase.distance
    };

    if (insertIndex === -1) {
      // All waypoints are before climb distance, add at end
      sortedWaypoints.push(cruiseAltitudeCheckpoint);
    } else {
      // Insert at the correct position
      sortedWaypoints.splice(insertIndex, 0, cruiseAltitudeCheckpoint);
    }
  }

  // Add "Descent Started" checkpoint if there's descent data
  if (descentStartDist !== undefined && descentStartDist > 0) {
    const insertIndex = sortedWaypoints.findIndex(wp => wp.distance > descentStartDist);
    const descentStartCheckpoint = {
      name: "Descent Started",
      distance: descentStartDist
    };

    if (insertIndex === -1) {
      // All waypoints are before descent start, add at end
      sortedWaypoints.push(descentStartCheckpoint);
    } else {
      // Insert at the correct position
      sortedWaypoints.splice(insertIndex, 0, descentStartCheckpoint);
    }
  }

  // If we have a total distance and it's greater than the last waypoint, add "Arrival" or "Landed" waypoint
  if (totalDistance !== undefined && totalDistance > 0) {
    const lastWaypointDistance = sortedWaypoints.length > 0
      ? sortedWaypoints[sortedWaypoints.length - 1].distance
      : 0;

    if (totalDistance > lastWaypointDistance) {
      sortedWaypoints.push({
        // Use "Landed" if there's descent data, otherwise "Arrival"
        name: descentPhase && descentPhase.distance > 0 ? "Landed" : "Arrival",
        distance: totalDistance
      });
    }
  }

  const results: WaypointResult[] = [];
  let previousDistance = 0;
  let previousFuelUsed = flightParams?.previousFuelUsed || 0;

  sortedWaypoints.forEach((waypoint) => {
    let timeFromLegStart: number;
    let timeSinceLast: number;
    let waypointFuelFromLegStart: number = 0;

    const climbDist = climbPhase?.distance ?? 0;
    const descentStart = descentStartDist ?? Infinity;

    // Determine which phase this waypoint is in and calculate time accordingly
    if (climbPhase || descentPhase) {
      // We have at least one special phase (climb or descent)
      let cumulativeTime = 0;

      // Phase 1: Climb (if applicable and waypoint is past climb start)
      if (climbPhase && waypoint.distance > 0) {
        const climbDistCovered = Math.min(waypoint.distance, climbDist);
        const climbTimeCovered = (climbDistCovered / climbPhase.groundSpeed) * 60;
        cumulativeTime += climbTimeCovered;
      }

      // Phase 2: Cruise (if waypoint is past climb and before descent)
      const cruiseStart = climbDist;
      const cruiseEnd = descentStart;
      if (waypoint.distance > cruiseStart) {
        const cruiseDistCovered = Math.min(waypoint.distance, cruiseEnd) - cruiseStart;
        if (cruiseDistCovered > 0) {
          const cruiseTimeCovered = (cruiseDistCovered / groundSpeed) * 60;
          cumulativeTime += cruiseTimeCovered;
        }
      }

      // Phase 3: Descent (if applicable and waypoint is past descent start)
      if (descentPhase && waypoint.distance > descentStart) {
        const descentDistCovered = waypoint.distance - descentStart;
        const descentTimeCovered = (descentDistCovered / descentPhase.groundSpeed) * 60;
        cumulativeTime += descentTimeCovered;
      }

      timeFromLegStart = cumulativeTime;

      // Calculate time since last waypoint using similar logic
      let timeSinceLastCalc = 0;
      // const distanceSinceLast = waypoint.distance - previousDistance;

      // Determine which phases the segment spans
      const segmentStart = previousDistance;
      const segmentEnd = waypoint.distance;

      // Climb portion of segment
      if (climbPhase && segmentStart < climbDist && segmentEnd > 0) {
        const climbSegmentStart = Math.max(0, segmentStart);
        const climbSegmentEnd = Math.min(segmentEnd, climbDist);
        const climbSegmentDist = climbSegmentEnd - climbSegmentStart;
        if (climbSegmentDist > 0) {
          timeSinceLastCalc += (climbSegmentDist / climbPhase.groundSpeed) * 60;
        }
      }

      // Cruise portion of segment
      if (segmentStart < descentStart && segmentEnd > cruiseStart) {
        const cruiseSegmentStart = Math.max(cruiseStart, segmentStart);
        const cruiseSegmentEnd = Math.min(segmentEnd, descentStart);
        const cruiseSegmentDist = cruiseSegmentEnd - cruiseSegmentStart;
        if (cruiseSegmentDist > 0) {
          timeSinceLastCalc += (cruiseSegmentDist / groundSpeed) * 60;
        }
      }

      // Descent portion of segment
      if (descentPhase && segmentStart < segmentEnd && segmentEnd > descentStart) {
        const descentSegmentStart = Math.max(descentStart, segmentStart);
        const descentSegmentEnd = segmentEnd;
        const descentSegmentDist = descentSegmentEnd - descentSegmentStart;
        if (descentSegmentDist > 0) {
          timeSinceLastCalc += (descentSegmentDist / descentPhase.groundSpeed) * 60;
        }
      }

      timeSinceLast = timeSinceLastCalc;

      // Fuel calculation considering all phases
      const effectiveCruiseFuelFlow = cruiseFuelFlow ?? fuelFlow ?? 0;

      // Climb fuel (proportional to distance covered in climb)
      if (climbPhase) {
        const climbDistCovered = Math.min(waypoint.distance, climbDist);
        const climbFuelRate = climbPhase.fuelUsed / climbPhase.distance;
        waypointFuelFromLegStart += climbDistCovered * climbFuelRate;
      }

      // Cruise fuel
      const cruiseDistCovered = Math.max(0, Math.min(waypoint.distance, descentStart) - climbDist);
      if (cruiseDistCovered > 0 && effectiveCruiseFuelFlow > 0) {
        const cruiseTime = cruiseDistCovered / groundSpeed; // in hours (NM / knots = hours)
        waypointFuelFromLegStart += effectiveCruiseFuelFlow * cruiseTime;
      }

      // Descent fuel (proportional to distance covered in descent)
      if (descentPhase && waypoint.distance > descentStart) {
        const descentDistCovered = waypoint.distance - descentStart;
        const descentFuelRate = descentPhase.fuelUsed / descentPhase.distance;
        waypointFuelFromLegStart += descentDistCovered * descentFuelRate;
      }
    } else {
      // No climb or descent data - use original calculation
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
        fuelUsed = previousFuel + waypointFuelFromLegStart;
      } else if (fuelFlow !== undefined && fuelFlow > 0) {
        if (previousFuel > 0) {
          // If previous fuel used is specified, add fuel consumed from start of this leg only
          fuelUsed = previousFuel + waypointFuelFromLegStart;
        } else {
          // Otherwise, use the old behavior: fuel flow × cumulative time
          const totalHours = cumulativeTime / 60;
          fuelUsed = (fuelFlow ?? 0) * totalHours;
        }
      }
    }

    // Calculate segment values
    const distanceSinceLast = waypoint.distance - previousDistance;
    const fuelSinceLast = fuelUsed !== undefined ? fuelUsed - previousFuelUsed : undefined;

    // Add elapsed distance from previous legs to get total distance from departure
    const elapsedDist = flightParams?.elapsedDistance || 0;
    const totalDistanceFromDeparture = waypoint.distance + elapsedDist;

    results.push({
      name: waypoint.name,
      distance: totalDistanceFromDeparture,
      distanceSinceLast,
      timeSinceLast,
      cumulativeTime,
      eta,
      fuelUsed,
      fuelSinceLast,
    });

    previousDistance = waypoint.distance;
    previousFuelUsed = fuelUsed ?? 0;
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
