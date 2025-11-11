/**
 * Flight Plan Calculations
 * Recalculate leg results for display purposes
 */

import { calculateCourse, calculateWaypoints, WaypointResult } from "./courseCalculations";
import { calculateCompassCourse } from "./compassDeviation";
import { toKnots } from "./speedConversion";
import { loadAircraftFromUrl } from "./aircraftStorage";
import { getFuelResultUnit, type FuelUnit } from "./fuelConversion";
import type { FlightPlanLeg } from "./flightPlanStorage";

export interface LegCalculatedResults {
  groundSpeed: number; // knots
  compassCourse: number | null; // degrees
  legDuration: number; // hours (just this leg, without elapsed)
  climbTime: number | null; // hours (time in climb phase)
  cruiseTime: number | null; // hours (time in cruise phase)
  descentTime: number | null; // hours (time in descent phase)
  fuelUsed: number; // based on fuel unit (just this leg)
  climbFuelUsed: number | null; // fuel used in climb
  cruiseFuelUsed: number | null; // fuel used in cruise
  descentFuelUsed: number | null; // fuel used in descent
  totalDistance: number; // NM (cumulative)
  totalTime: number; // hours (including elapsed)
  totalFuel: number; // cumulative fuel used
  startTime: string | null; // HHMM format (depTime + elapsed)
  arrivalTime: string | null; // HHMM format (startTime + legDuration)
}

/**
 * Add minutes to a time in HHMM format
 */
function addMinutesToTime(timeHHMM: string, minutes: number): string {
  if (!timeHHMM || timeHHMM.length !== 4) return "";

  const hours = parseInt(timeHHMM.substring(0, 2));
  const mins = parseInt(timeHHMM.substring(2, 4));

  if (isNaN(hours) || isNaN(mins)) return "";

  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24; // Wrap around at 24 hours
  const newMins = totalMinutes % 60;

  return `${newHours.toString().padStart(2, "0")}${newMins.toString().padStart(2, "0")}`;
}

/**
 * Calculate results for a single leg
 */
export function calculateLegResults(leg: FlightPlanLeg): LegCalculatedResults | null {
  try {
    const th = parseFloat(leg.th);
    const tasVal = parseFloat(leg.tas);
    const wd = leg.wd ? parseFloat(leg.wd) : 0;
    const ws = leg.ws ? parseFloat(leg.ws) : 0;
    const md = parseFloat(leg.md) || 0;
    const dist = parseFloat(leg.dist);
    const ff = parseFloat(leg.ff);

    // Convert TAS to knots
    const tasInKnots = toKnots(tasVal, leg.unit);

    // Parse climb data if exists
    const climbTasVal = leg.climbTas ? parseFloat(leg.climbTas) : undefined;
    const climbTasInKnots = climbTasVal ? toKnots(climbTasVal, leg.unit) : undefined;
    const climbDist = leg.climbDist ? parseFloat(leg.climbDist) : undefined;
    const climbFuel = leg.climbFuel ? parseFloat(leg.climbFuel) : undefined;

    // Parse descent data if exists
    const descentTasVal = leg.descentTas ? parseFloat(leg.descentTas) : undefined;
    const descentTasInKnots = descentTasVal ? toKnots(descentTasVal, leg.unit) : undefined;
    const descentDist = leg.descentDist ? parseFloat(leg.descentDist) : undefined;
    const descentFuel = leg.descentFuel ? parseFloat(leg.descentFuel) : undefined;

    // Parse climb wind if exists
    const climbWindDir = leg.climbWd ? parseFloat(leg.climbWd) : undefined;
    const climbWindSpeed = leg.climbWs ? parseFloat(leg.climbWs) : undefined;

    // Parse descent wind if exists
    const descentWindDir = leg.descentWd ? parseFloat(leg.descentWd) : undefined;
    const descentWindSpeed = leg.descentWs ? parseFloat(leg.descentWs) : undefined;

    // Parse previous values
    const elapsedMins = leg.elapsedMin ? parseInt(leg.elapsedMin) : undefined;
    const prevFuel = leg.prevFuel ? parseFloat(leg.prevFuel) : undefined;

    if (isNaN(th) || isNaN(tasInKnots) || tasInKnots <= 0 || isNaN(dist) || isNaN(ff)) {
      return null;
    }

    // Calculate course
    const results = calculateCourse(
      wd,
      ws,
      th,
      tasInKnots,
      md,
      dist,
      ff,
      elapsedMins,
      prevFuel,
      climbTasInKnots,
      climbDist,
      climbFuel,
      descentTasInKnots,
      descentDist,
      descentFuel,
      climbWindDir,
      climbWindSpeed,
      descentWindDir,
      descentWindSpeed
    );

    if (!results) return null;

    // Calculate compass course if aircraft with deviation table exists
    let compassCourse: number | null = null;
    if (leg.plane) {
      const aircraft = loadAircraftFromUrl(leg.plane);
      if (aircraft?.deviationTable && aircraft.deviationTable.length >= 2) {
        compassCourse = calculateCompassCourse(results.compassHeading, aircraft.deviationTable);
      }
    }

    // Extract climb, cruise, and descent times
    const climbTime = results.climbPhase ? results.climbPhase.time : null;
    const cruiseTime = results.cruisePhase ? results.cruisePhase.time : null;
    const descentTime = results.descentPhase ? results.descentPhase.time : null;
    const climbFuelUsed = results.climbPhase ? results.climbPhase.fuelUsed : null;
    const cruiseFuelUsed = results.cruisePhase ? results.cruisePhase.fuelUsed : null;
    const descentFuelUsed = results.descentPhase ? results.descentPhase.fuelUsed : null;

    const legDuration = results.eta || 0;

    // Calculate start time (depTime + elapsed)
    let startTime: string | null = null;
    if (leg.depTime && leg.depTime.length === 4) {
      startTime = addMinutesToTime(leg.depTime, elapsedMins || 0);
    }

    // Calculate arrival time (startTime + legDuration)
    let arrivalTime: string | null = null;
    if (startTime) {
      const legDurationMinutes = Math.round(legDuration * 60);
      arrivalTime = addMinutesToTime(startTime, legDurationMinutes);
    }

    // results.fuelUsed from calculateCourse already includes prevFuel if it was provided
    // So totalFuel should just be results.fuelUsed
    const totalFuelAccumulated = results.fuelUsed || 0;

    // Fuel used in just this leg (excluding previous fuel)
    const legFuelOnly = totalFuelAccumulated - (prevFuel || 0);

    return {
      groundSpeed: results.groundSpeed,
      compassCourse,
      legDuration,
      climbTime,
      cruiseTime,
      descentTime,
      fuelUsed: legFuelOnly,
      climbFuelUsed,
      cruiseFuelUsed,
      descentFuelUsed,
      totalDistance: dist,
      totalTime: ((elapsedMins || 0) / 60) + legDuration,
      totalFuel: totalFuelAccumulated,
      startTime,
      arrivalTime,
    };
  } catch (error) {
    console.error("Error calculating leg results:", error);
    return null;
  }
}

/**
 * Calculate waypoint results for a leg
 */
export function calculateLegWaypoints(
  leg: FlightPlanLeg,
  legResults: LegCalculatedResults
): WaypointResult[] {
  if (!leg.waypoints || leg.waypoints.length === 0) return [];

  try {
    const ff = parseFloat(leg.ff);
    const dist = parseFloat(leg.dist);

    const flightParams = {
      departureTime: leg.depTime,
      elapsedMinutes: leg.elapsedMin ? parseInt(leg.elapsedMin) : undefined,
      previousFuelUsed: leg.prevFuel ? parseFloat(leg.prevFuel) : undefined,
    };

    // Get climb phase from leg results
    // We need to recalculate to get the full results including climbPhase
    const th = parseFloat(leg.th);
    const tasVal = parseFloat(leg.tas);
    const wd = leg.wd ? parseFloat(leg.wd) : 0;
    const ws = leg.ws ? parseFloat(leg.ws) : 0;
    const md = parseFloat(leg.md) || 0;

    const tasInKnots = toKnots(tasVal, leg.unit);

    const climbTasVal = leg.climbTas ? parseFloat(leg.climbTas) : undefined;
    const climbTasInKnots = climbTasVal ? toKnots(climbTasVal, leg.unit as any) : undefined;
    const climbDist = leg.climbDist ? parseFloat(leg.climbDist) : undefined;
    const climbFuel = leg.climbFuel ? parseFloat(leg.climbFuel) : undefined;

    const descentTasVal = leg.descentTas ? parseFloat(leg.descentTas) : undefined;
    const descentTasInKnots = descentTasVal ? toKnots(descentTasVal, leg.unit as any) : undefined;
    const descentDist = leg.descentDist ? parseFloat(leg.descentDist) : undefined;
    const descentFuel = leg.descentFuel ? parseFloat(leg.descentFuel) : undefined;

    // Parse climb wind if exists
    const climbWindDir = leg.climbWd ? parseFloat(leg.climbWd) : undefined;
    const climbWindSpeed = leg.climbWs ? parseFloat(leg.climbWs) : undefined;

    // Parse descent wind if exists
    const descentWindDir = leg.descentWd ? parseFloat(leg.descentWd) : undefined;
    const descentWindSpeed = leg.descentWs ? parseFloat(leg.descentWs) : undefined;

    const elapsedMins = leg.elapsedMin ? parseInt(leg.elapsedMin) : undefined;
    const prevFuel = leg.prevFuel ? parseFloat(leg.prevFuel) : undefined;

    const results = calculateCourse(
      wd,
      ws,
      th,
      tasInKnots,
      md,
      dist,
      ff,
      elapsedMins,
      prevFuel,
      climbTasInKnots,
      climbDist,
      climbFuel,
      descentTasInKnots,
      descentDist,
      descentFuel,
      climbWindDir,
      climbWindSpeed,
      descentWindDir,
      descentWindSpeed
    );

    return calculateWaypoints(
      leg.waypoints,
      legResults.groundSpeed,
      ff,
      flightParams,
      dist,
      results?.climbPhase,
      ff,
      results?.descentPhase
    );
  } catch (error) {
    console.error("Error calculating waypoints:", error);
    return [];
  }
}

/**
 * Format time in hours to HH:MM format
 */
export function formatHoursToTime(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Format time in HHMM format to HH:MM format
 */
export function formatTimeHHMM(timeHHMM: string): string {
  if (!timeHHMM || timeHHMM.length !== 4) return "N/A";
  return `${timeHHMM.substring(0, 2)}:${timeHHMM.substring(2, 4)}`;
}

/**
 * Format fuel with appropriate unit label
 */
export function formatFuel(fuel: number, fuelFlowUnit: string): string {
  const consumptionUnit = getFuelResultUnit(fuelFlowUnit as FuelUnit);
  return `${fuel.toFixed(1)} ${consumptionUnit}`;
}

/**
 * Check if a leg has descent data
 */
export function hasDescentData(leg: FlightPlanLeg): boolean {
  return !!(
    leg.descentTas &&
    leg.descentDist &&
    leg.descentFuel &&
    parseFloat(leg.descentTas) > 0 &&
    parseFloat(leg.descentDist) > 0 &&
    parseFloat(leg.descentFuel) >= 0
  );
}

/**
 * Detect alternative legs in a flight plan
 * The FIRST leg with descent data is the main destination
 * Any legs AFTER the first leg with descent data that also have descent data are alternatives
 */
export function detectAlternativeLegs(legs: FlightPlanLeg[]): Set<string> {
  const alternativeIds = new Set<string>();

  // Find the index of the first leg with descent data
  let firstDescentIndex = -1;
  for (let i = 0; i < legs.length; i++) {
    if (hasDescentData(legs[i])) {
      firstDescentIndex = i;
      break;
    }
  }

  // If no legs have descent data, there are no alternatives
  if (firstDescentIndex === -1) {
    return alternativeIds;
  }

  // Mark all legs AFTER the first descent leg that also have descent data as alternatives
  for (let i = firstDescentIndex + 1; i < legs.length; i++) {
    if (hasDescentData(legs[i])) {
      alternativeIds.add(legs[i].id);
    }
  }

  return alternativeIds;
}

/**
 * Calculate totals for the main route (excluding alternative legs)
 */
export function calculateMainRouteTotals(
  legs: FlightPlanLeg[],
  legResults: Map<string, LegCalculatedResults>,
  alternativeIds: Set<string>
): {
  distance: number;
  time: number;
  fuel: number;
  eta: string | null;
} {
  if (legs.length === 0) {
    return { distance: 0, time: 0, fuel: 0, eta: null };
  }

  // Find the last non-alternative leg
  let lastMainLeg: FlightPlanLeg | null = null;
  for (let i = legs.length - 1; i >= 0; i--) {
    if (!alternativeIds.has(legs[i].id)) {
      lastMainLeg = legs[i];
      break;
    }
  }

  if (!lastMainLeg) {
    return { distance: 0, time: 0, fuel: 0, eta: null };
  }

  const lastResult = legResults.get(lastMainLeg.id);
  if (!lastResult) {
    return { distance: 0, time: 0, fuel: 0, eta: null };
  }

  return {
    distance: lastResult.totalDistance,
    time: lastResult.totalTime,
    fuel: lastResult.totalFuel,
    eta: lastResult.arrivalTime,
  };
}

/**
 * Calculate totals including alternative legs (for fuel calculation)
 */
export function calculateTotalFuelWithAlternatives(
  legs: FlightPlanLeg[],
  legResults: Map<string, LegCalculatedResults>
): number {
  if (legs.length === 0) return 0;

  const lastLeg = legs[legs.length - 1];
  const lastResult = legResults.get(lastLeg.id);

  if (!lastResult) return 0;

  return lastResult.totalFuel;
}
