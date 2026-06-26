/**
 * Flight Plan Reverse
 *
 * Builds a reversed copy of a flight plan: the route is flown in the opposite
 * direction (origin <-> destination), legs are emitted in reverse order with
 * their waypoints and true course reversed, and the climb/descent phases are
 * swapped so the new departure climbs and the new arrival descends.
 *
 * Per the product spec, wind, true airspeed, fuel flow and magnetic variation
 * are kept EXACT (their values are not recomputed, only relocated when a value
 * is tied to a flight phase). Alternates are dropped entirely.
 */

import {
  createFlightPlan,
  addOrUpdateLeg,
  type FlightPlan,
  type FlightPlanLeg,
} from "./flightPlanStorage";
import {
  detectAlternativeLegs,
  hasDescentData,
  calculateLegResults,
} from "./flightPlanCalculations";

type ReversedLegData = Omit<FlightPlanLeg, "id" | "index">;

/**
 * Reverse a true course (or any bearing) by 180°, normalized to [0, 360).
 */
function reverseCourse(course: number): number {
  return (((course + 180) % 360) + 360) % 360;
}

/**
 * Build the reversed leg list for a flight plan (pure — no persistence).
 *
 * - Drops alternative legs (detected via descent-data heuristic).
 * - Reverses leg order, swaps from/to, reverses checkpoints, reverses true course.
 * - Swaps climb <-> descent per leg so the new departure climbs and the new
 *   arrival descends. Wind/TAS/fuel-flow/variation values are preserved exactly.
 * - Moves the destination's reserve fuel (additional + approach/landing) onto the
 *   new arrival leg, clearing it elsewhere.
 * - Recomputes cumulative fields (prevFuel, elapsedMin, elapsedDist) for the new order.
 */
export function buildReversedLegData(plan: FlightPlan): ReversedLegData[] {
  const alternativeIds = detectAlternativeLegs(plan.legs);
  const mainLegs = plan.legs.filter((leg) => !alternativeIds.has(leg.id));

  if (mainLegs.length === 0) return [];

  // Reserve fuel belongs at the destination. After reversal the new arrival leg
  // is the reversed original departure leg, so carry the original destination
  // leg's reserves over to it (keeping the exact values).
  const destinationLeg =
    mainLegs.find((leg) => hasDescentData(leg)) ?? mainLegs[mainLegs.length - 1];
  const arrivalAdditionalFuel = destinationLeg.additionalFuel;
  const arrivalApproachLandingFuel = destinationLeg.approachLandingFuel;

  const reversed: ReversedLegData[] = [...mainLegs]
    .reverse()
    .map((leg, i, arr) => {
      const isNewArrival = i === arr.length - 1;
      const from = leg.to;
      const to = leg.from;
      const checkpoints = leg.checkpoints
        ? [...leg.checkpoints].reverse()
        : undefined;
      const desc =
        from?.name && to?.name ? `${from.name} to ${to.name}` : leg.desc;

      return {
        // Navigation — reverse the course, keep wind/variation exact
        th: reverseCourse(leg.th),
        tas: leg.tas,
        wd: leg.wd,
        ws: leg.ws,
        var: leg.var,
        md: leg.md,

        // Route geometry — swap endpoints, reverse intermediate checkpoints
        dist: leg.dist,
        from,
        to,
        checkpoints,

        // Fuel / aircraft — kept exact
        ff: leg.ff,
        fuelUnit: leg.fuelUnit,
        plane: leg.plane,
        depTime: leg.depTime,

        // Phases — swap climb <-> descent (values preserved, phase reassigned)
        climbTas: leg.descentTas,
        climbDist: leg.descentDist,
        climbFuel: leg.descentFuel,
        climbWd: leg.descentWd,
        climbWs: leg.descentWs,
        descentTas: leg.climbTas,
        descentDist: leg.climbDist,
        descentFuel: leg.climbFuel,
        descentWd: leg.climbWd,
        descentWs: leg.climbWs,

        // Reserve fuel — only on the new arrival leg
        additionalFuel: isNewArrival ? arrivalAdditionalFuel : undefined,
        approachLandingFuel: isNewArrival ? arrivalApproachLandingFuel : undefined,

        // Display
        desc,
        unit: leg.unit,
      };
    });

  // Recompute cumulative values for the new order (mirrors recalculateSubsequentLegs)
  for (let i = 0; i < reversed.length; i++) {
    if (i === 0) {
      reversed[i].prevFuel = undefined;
      reversed[i].elapsedMin = undefined;
      reversed[i].elapsedDist = undefined;
      continue;
    }

    const prev = reversed[i - 1];
    const prevResults = calculateLegResults({
      ...prev,
      id: "",
      index: i - 1,
    } as FlightPlanLeg);

    if (prevResults) {
      reversed[i].elapsedMin = Math.round(prevResults.totalTime * 60);
      reversed[i].elapsedDist = parseFloat(
        ((prev.elapsedDist || 0) + prev.dist).toFixed(1)
      );
      reversed[i].prevFuel = parseFloat(prevResults.totalFuel.toFixed(1));
    }
  }

  return reversed;
}

/**
 * Create and persist a reversed copy of a flight plan.
 *
 * Returns the newly created flight plan, or null if the plan has no reversible
 * (non-alternative) legs.
 */
export function createReverseFlightPlan(plan: FlightPlan): FlightPlan | null {
  const reversedLegs = buildReversedLegData(plan);
  if (reversedLegs.length === 0) return null;

  const newDeparture = reversedLegs[0].from ?? plan.destination;
  const newDestination =
    reversedLegs[reversedLegs.length - 1].to ?? plan.departure;

  const newPlan = createFlightPlan({
    name: `${plan.name} (reverse)`,
    date: plan.date,
    cruiseAltitude: plan.cruiseAltitude,
    cruisePower: plan.cruisePower,
    plane: plan.plane,
    departure: newDeparture,
    destination: newDestination,
    // No alternate on the reversed plan
  });

  let lastResult: { flightPlan: FlightPlan; leg: FlightPlanLeg } | null = null;
  for (const legData of reversedLegs) {
    lastResult = addOrUpdateLeg(newPlan.id, legData);
  }

  return lastResult?.flightPlan ?? newPlan;
}
