/**
 * Utility for building URL parameters for creating the next leg
 * Used by both NewLegButton and Flight Plan's "Add Leg" button
 */

import type { FlightPlanLeg } from "./flightPlanStorage";
import type { LegCalculatedResults } from "./flightPlanCalculations";

export interface NextLegParams {
  magVar?: string; // WMM convention (positive=E, negative=W)
  departureTime: string;
  plane?: string;
  deviationTable?: string;
  fuelFlow: string;
  tas: string;
  speedUnit: string;
  fuelUnit: string;
  windDir: string;
  windSpeed: string;
  elapsedMinutes: number;
  elapsedDistance: number;
  fuelUsed?: number;
  flightPlanId?: string;
}

/**
 * Build URL parameters for the next leg based on the current leg's data
 *
 * @param params - Parameters from the current leg
 * @returns URL search string for /leg page
 */
export function buildNextLegUrl(params: NextLegParams): string {
  const urlParams = new URLSearchParams();

  // Carry over these values (use WMM 'var' parameter)
  if (params.magVar) urlParams.set("var", params.magVar);
  if (params.departureTime) urlParams.set("depTime", params.departureTime);

  // Prioritize plane (includes deviation table) over legacy devTable param
  if (params.plane) {
    urlParams.set("plane", params.plane);
  } else if (params.deviationTable) {
    urlParams.set("devTable", params.deviationTable);
  }

  if (params.fuelFlow) urlParams.set("ff", params.fuelFlow);
  if (params.tas) urlParams.set("tas", params.tas);
  if (params.speedUnit && params.speedUnit !== 'kt') urlParams.set("unit", params.speedUnit);
  if (params.fuelUnit && params.fuelUnit !== 'gph') urlParams.set("funit", params.fuelUnit);

  // Carry over wind parameters (assume wind remains constant)
  if (params.windDir) urlParams.set("wd", params.windDir);
  if (params.windSpeed) urlParams.set("ws", params.windSpeed);

  // Set elapsed minutes
  urlParams.set("elapsedMin", params.elapsedMinutes.toString());

  // Set elapsed distance (total distance traveled in previous legs) - rounded to 1 decimal
  if (params.elapsedDistance > 0) {
    urlParams.set("elapsedDist", params.elapsedDistance.toFixed(1));
  }

  // Set previous fuel used (total fuel used from current leg) - rounded to 1 decimal
  if (params.fuelUsed !== undefined && params.fuelUsed > 0) {
    urlParams.set("prevFuel", params.fuelUsed.toFixed(1));
  }

  // Include flight plan ID if this leg belongs to a flight plan
  if (params.flightPlanId) {
    urlParams.set("fp", params.flightPlanId);
  }

  return `/leg?${urlParams.toString()}`;
}

/**
 * Extract next leg parameters from a FlightPlanLeg and its calculated results
 *
 * @param leg - The flight plan leg
 * @param legResults - The calculated results for the leg
 * @returns NextLegParams object ready for buildNextLegUrl
 */
export function extractNextLegParams(
  leg: FlightPlanLeg,
  legResults: LegCalculatedResults | null,
  flightPlanId?: string
): NextLegParams {
  // Convert legacy md to WMM magVar
  // Legacy: positive=W, negative=E
  // WMM: positive=E, negative=W
  // So: magVar = -md
  const magVar = leg.md ? (-leg.md).toString() : undefined;

  return {
    magVar,
    departureTime: leg.depTime || "",
    plane: leg.plane,
    fuelFlow: leg.ff.toString(),
    tas: leg.tas.toString(),
    speedUnit: leg.unit,
    fuelUnit: leg.fuelUnit,
    windDir: leg.wd !== undefined ? leg.wd.toString() : "",
    windSpeed: leg.ws !== undefined ? leg.ws.toString() : "",
    elapsedMinutes: legResults?.totalTime ? Math.round(legResults.totalTime * 60) : 0,
    elapsedDistance: (leg.elapsedDist || 0) + leg.dist,
    fuelUsed: legResults?.totalFuel,
    flightPlanId,
  };
}
