/**
 * Flight Plan Utility Functions
 * General utilities for working with flight plans
 */

import type { FlightPlan } from "./flightPlanStorage";
import { quantizeCoordinate } from "./coordinateUrlParams";

/**
 * Build URL for viewing flight plan on local chart
 * Uses first leg's "from" as origin and all destinations as waypoints
 * Checkpoints are marked as fly-over (reference points)
 *
 * @param flightPlan - The flight plan to generate URL for
 * @returns Local chart URL or null if flight plan has no coordinate data
 */
export function buildLocalChartUrl(flightPlan: FlightPlan): string | null {
  if (!flightPlan || flightPlan.legs.length === 0) return null;

  // Check if any leg has coordinate data
  const hasCoordinates = flightPlan.legs.some(
    (leg) =>
      leg.from?.lat !== undefined &&
      leg.from?.lon !== undefined &&
      leg.to?.lat !== undefined &&
      leg.to?.lon !== undefined
  );

  if (!hasCoordinates) return null;

  const params = new URLSearchParams();

  // Use first leg's "from" as origin
  const firstLeg = flightPlan.legs[0];
  if (firstLeg.from?.lat !== undefined && firstLeg.from?.lon !== undefined) {
    const fromCompact = `${quantizeCoordinate(firstLeg.from.lat)}~${quantizeCoordinate(firstLeg.from.lon)}~${firstLeg.from.name.split(",")[0]}`;
    params.set("from", fromCompact);
    params.set("s", "5");
  } else {
    return null; // Can't build URL without origin
  }

  // Collect all destinations and checkpoints
  let toIndex = 0;

  flightPlan.legs.forEach((leg) => {
    // Add checkpoints as fly-over reference points
    if (leg.checkpoints && leg.checkpoints.length > 0) {
      leg.checkpoints.forEach((checkpoint) => {
        if (checkpoint.lat !== undefined && checkpoint.lon !== undefined) {
          const cpCompact = `${quantizeCoordinate(checkpoint.lat)}~${quantizeCoordinate(checkpoint.lon)}~${checkpoint.name.split(",")[0]}`;
          params.set(`to[${toIndex}]`, cpCompact);
          params.set(`toFO[${toIndex}]`, "1"); // Mark as fly-over
          toIndex++;
        }
      });
    }

    // Add leg destination as waypoint
    if (leg.to?.lat !== undefined && leg.to?.lon !== undefined) {
      const toCompact = `${quantizeCoordinate(leg.to.lat)}~${quantizeCoordinate(leg.to.lon)}~${leg.to.name.split(",")[0]}`;
      params.set(`to[${toIndex}]`, toCompact);
      // Don't set toFO - this is a route waypoint
      toIndex++;
    }
  });

  return `/local-chart?${params.toString()}`;
}
