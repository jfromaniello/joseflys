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

      // Convert LegPoints to compact format [name, lat, lon] or [name] (without coords)
      const from = leg.from
        ? [leg.from.name, leg.from.lat ?? null, leg.from.lon ?? null]
        : null;
      const to = leg.to
        ? [leg.to.name, leg.to.lat ?? null, leg.to.lon ?? null]
        : null;
      const checkpoints = leg.checkpoints
        ? leg.checkpoints.map((p) => [p.name, p.lat ?? null, p.lon ?? null])
        : null;

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
        leg.elapsedDist ?? null,
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
        leg.additionalFuel ?? null,
        leg.approachLandingFuel ?? null,
        leg.desc || "",
        leg.unit,
        waypoints,
        leg.fromCity || "",
        leg.toCity || "",
        leg.var ?? null, // Position 29: magnetic variation (WMM convention)
        from, // Position 30: from point [name, lat, lon]
        to, // Position 31: to point [name, lat, lon]
        checkpoints, // Position 32: checkpoints [[name, lat, lon], ...]
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
        elapsedDist,
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
        additionalFuel,
        approachLandingFuel,
        desc,
        unit,
        waypoints,
        fromCity,
        toCity,
        varParam, // Position 29: magnetic variation (WMM convention)
        fromCompact, // Position 30: from point [name, lat, lon]
        toCompact, // Position 31: to point [name, lat, lon]
        checkpointsCompact, // Position 32: checkpoints [[name, lat, lon], ...]
      ] = compactLeg;

      // Reconstruct waypoints from compact format
      const reconstructedWaypoints = waypoints
        ? waypoints.map(([name, distance]: [string, number]) => ({
            name,
            distance,
          }))
        : undefined;

      // Reconstruct LegPoints from compact format [name, lat, lon]
      const from =
        fromCompact && Array.isArray(fromCompact)
          ? {
              name: fromCompact[0] as string,
              lat: fromCompact[1] !== null ? parseNumericValue(fromCompact[1]) : undefined,
              lon: fromCompact[2] !== null ? parseNumericValue(fromCompact[2]) : undefined,
            }
          : undefined;

      const to =
        toCompact && Array.isArray(toCompact)
          ? {
              name: toCompact[0] as string,
              lat: toCompact[1] !== null ? parseNumericValue(toCompact[1]) : undefined,
              lon: toCompact[2] !== null ? parseNumericValue(toCompact[2]) : undefined,
            }
          : undefined;

      const checkpoints =
        checkpointsCompact && Array.isArray(checkpointsCompact)
          ? checkpointsCompact.map((point: unknown[]) => ({
              name: point[0] as string,
              lat: point[1] !== null ? parseNumericValue(point[1]) : undefined,
              lon: point[2] !== null ? parseNumericValue(point[2]) : undefined,
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
        var: parseNumericValue(varParam),
        dist: parsedDist,
        ff: parsedFf,
        fuelUnit,
        prevFuel: parseNumericValue(prevFuel),
        plane, // Use the shared plane serialization
        depTime: depTime || undefined,
        elapsedMin: parseNumericValue(elapsedMin),
        elapsedDist: parseNumericValue(elapsedDist),
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
        additionalFuel: parseNumericValue(additionalFuel),
        approachLandingFuel: parseNumericValue(approachLandingFuel),
        desc: desc || undefined,
        unit,
        waypoints: reconstructedWaypoints,
        fromCity: fromCity || undefined,
        toCity: toCity || undefined,
        from,
        to,
        checkpoints,
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
