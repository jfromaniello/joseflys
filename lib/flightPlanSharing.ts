/**
 * Flight Plan Sharing
 * CBOR serialization for compact sharing of flight plans
 */

import { encode as cborEncode, decode as cborDecode } from "cbor-x";
import type { FlightPlan, FlightPlanLeg } from "./flightPlanStorage";

/**
 * Helper to parse numeric values that might be strings (from old data)
 * Supports backwards compatibility when deserializing
 */
function parseNumericValue(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

/**
 * Serialize a flight plan to a compact CBOR format
 * Only includes the plane serialization once (from first leg)
 */
export function serializeFlightPlan(flightPlan: FlightPlan): string {
  try {
    // Extract plane from first leg (if exists)
    const plane = flightPlan.legs.length > 0 ? flightPlan.legs[0].plane : "";

    // Compact leg format - omit plane for all legs except first
    const compactLegs = flightPlan.legs.map((leg) => {
      // Convert waypoints to compact array format [name, distance][]
      const waypoints = leg.waypoints
        ? leg.waypoints.map((w) => [w.name, w.distance])
        : undefined;

      return [
        leg.th,
        leg.tas,
        leg.wd ?? null,
        leg.ws ?? null,
        leg.md,
        leg.dist,
        leg.ff,
        leg.fuelUnit,
        leg.prevFuel ?? null,
        leg.depTime || "",
        leg.elapsedMin ?? null,
        leg.climbTas ?? null,
        leg.climbDist ?? null,
        leg.climbFuel ?? null,
        leg.climbWd ?? null,
        leg.climbWs ?? null,
        leg.descentTas ?? null,
        leg.descentDist ?? null,
        leg.descentFuel ?? null,
        leg.descentWd ?? null,
        leg.descentWs ?? null,
        leg.desc || "",
        leg.unit,
        waypoints,
      ];
    });

    // Compact flight plan format
    const compact = [
      flightPlan.name,
      flightPlan.date || "",
      plane, // Plane serialization (only once)
      compactLegs,
    ];

    // Encode to CBOR
    const encoded = cborEncode(compact);

    // Convert to base64url (URL-safe)
    const base64 = Buffer.from(encoded).toString("base64");
    return base64
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  } catch (error) {
    console.error("Failed to serialize flight plan:", error);
    throw new Error("Failed to serialize flight plan");
  }
}

/**
 * Deserialize a flight plan from CBOR format
 */
export function deserializeFlightPlan(serialized: string): Omit<FlightPlan, "id" | "created_at" | "updated_at" | "legs"> & { legs: Omit<FlightPlanLeg, "id" | "index">[] } {
  try {
    // Convert from base64url to buffer
    const base64 = serialized
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    // Add padding if needed
    const padded = base64 + "==".substring(0, (4 - (base64.length % 4)) % 4);
    const buffer = Buffer.from(padded, "base64");

    // Decode CBOR
    const decoded = cborDecode(buffer) as [
      string, // name
      string, // date
      string, // plane
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any[][] // legs
    ];

    const [name, date, plane, compactLegs] = decoded;

    // Reconstruct legs
    const legs = compactLegs.map((compactLeg) => {
      const [
        th,
        tas,
        wd,
        ws,
        md,
        dist,
        ff,
        fuelUnit,
        prevFuel,
        depTime,
        elapsedMin,
        climbTas,
        climbDist,
        climbFuel,
        climbWd,
        climbWs,
        descentTas,
        descentDist,
        descentFuel,
        descentWd,
        descentWs,
        desc,
        unit,
        waypoints,
      ] = compactLeg;

      // Reconstruct waypoints from compact format
      const reconstructedWaypoints = waypoints
        ? waypoints.map(([name, distance]: [string, number]) => ({
            name,
            distance,
          }))
        : undefined;

      // Parse numeric values with backwards compatibility for strings
      const parsedTh = parseNumericValue(th);
      const parsedTas = parseNumericValue(tas);
      const parsedMd = parseNumericValue(md);
      const parsedDist = parseNumericValue(dist);
      const parsedFf = parseNumericValue(ff);

      // Validate required fields
      if (parsedTh === undefined || parsedTas === undefined || parsedMd === undefined || parsedDist === undefined || parsedFf === undefined) {
        throw new Error("Invalid leg data: missing required numeric fields");
      }

      return {
        th: parsedTh,
        tas: parsedTas,
        wd: parseNumericValue(wd),
        ws: parseNumericValue(ws),
        md: parsedMd,
        dist: parsedDist,
        ff: parsedFf,
        fuelUnit,
        prevFuel: parseNumericValue(prevFuel),
        plane, // Use the shared plane serialization
        depTime: depTime || undefined,
        elapsedMin: parseNumericValue(elapsedMin),
        climbTas: parseNumericValue(climbTas),
        climbDist: parseNumericValue(climbDist),
        climbFuel: parseNumericValue(climbFuel),
        climbWd: parseNumericValue(climbWd),
        climbWs: parseNumericValue(climbWs),
        descentTas: parseNumericValue(descentTas),
        descentDist: parseNumericValue(descentDist),
        descentFuel: parseNumericValue(descentFuel),
        descentWd: parseNumericValue(descentWd),
        descentWs: parseNumericValue(descentWs),
        desc: desc || undefined,
        unit,
        waypoints: reconstructedWaypoints,
      };
    });

    return {
      name,
      date: date || undefined,
      legs,
    };
  } catch (error) {
    console.error("Failed to deserialize flight plan:", error);
    throw new Error("Failed to deserialize flight plan");
  }
}

/**
 * Generate a shareable URL for a flight plan
 */
export function generateShareUrl(flightPlan: FlightPlan): string {
  const serialized = serializeFlightPlan(flightPlan);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return `${baseUrl}/flight-plans/import?plan=${serialized}`;
}
