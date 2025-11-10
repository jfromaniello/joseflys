/**
 * Flight Plan Calculations
 * Recalculate leg results for display purposes
 */

import { calculateCourse, calculateWaypoints, type Waypoint } from "./courseCalculations";
import { calculateCompassCourse } from "./compassDeviation";
import { toKnots } from "./speedConversion";
import { loadAircraftFromUrl } from "./aircraftStorage";
import type { FlightPlanLeg } from "./flightPlanStorage";

export interface LegCalculatedResults {
  groundSpeed: number; // knots
  compassCourse: number | null; // degrees
  eta: number; // hours
  fuelUsed: number; // based on fuel unit
  totalDistance: number; // NM
  totalTime: number; // hours (including elapsed)
  totalFuel: number; // cumulative fuel used
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
    const tasInKnots = toKnots(tasVal, leg.unit as any);

    // Parse climb data if exists
    const climbTasVal = leg.climbTas ? parseFloat(leg.climbTas) : undefined;
    const climbTasInKnots = climbTasVal ? toKnots(climbTasVal, leg.unit as any) : undefined;
    const climbDist = leg.climbDist ? parseFloat(leg.climbDist) : undefined;
    const climbFuel = leg.climbFuel ? parseFloat(leg.climbFuel) : undefined;

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
      climbFuel
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

    return {
      groundSpeed: results.groundSpeed,
      compassCourse,
      eta: results.eta || 0,
      fuelUsed: results.fuelUsed || 0,
      totalDistance: dist,
      totalTime: ((elapsedMins || 0) / 60) + (results.eta || 0),
      totalFuel: (prevFuel || 0) + (results.fuelUsed || 0),
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
): any[] {
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

    const tasInKnots = toKnots(tasVal, leg.unit as any);

    const climbTasVal = leg.climbTas ? parseFloat(leg.climbTas) : undefined;
    const climbTasInKnots = climbTasVal ? toKnots(climbTasVal, leg.unit as any) : undefined;
    const climbDist = leg.climbDist ? parseFloat(leg.climbDist) : undefined;
    const climbFuel = leg.climbFuel ? parseFloat(leg.climbFuel) : undefined;

    const elapsedMins = leg.elapsedMin ? parseInt(leg.elapsedMin) : undefined;
    const prevFuel = leg.prevFuel ? parseFloat(leg.prevFuel) : undefined;

    const { calculateCourse } = require("./courseCalculations");
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
      climbFuel
    );

    return calculateWaypoints(
      leg.waypoints,
      legResults.groundSpeed,
      ff,
      flightParams,
      dist,
      results?.climbPhase,
      ff
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
 * Format fuel with appropriate unit label
 */
export function formatFuel(fuel: number, unit: string): string {
  return `${fuel.toFixed(1)} ${unit.toUpperCase()}`;
}
