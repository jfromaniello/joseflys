import { NextRequest, NextResponse } from "next/server";
import runwaysData from "../../../data/runways.json";

export const runtime = "edge";

/**
 * Runway end data (low-end or high-end threshold)
 */
interface RunwayEnd {
  id: string; // Runway identifier (e.g., "11", "29", "04L")
  lat?: number; // Latitude
  lon?: number; // Longitude
  elev?: number; // Elevation (ft)
  hdg?: number; // True heading (degrees)
  dt?: number; // Displaced threshold (ft)
}

/**
 * Runway data from runways.json (fields can be missing in some records)
 */
interface Runway {
  l?: number; // Length (ft)
  w?: number; // Width (ft)
  s?: string; // Surface type code
  lit?: number; // Lighted (1 = yes)
  cls?: number; // Closed (1 = yes)
  le?: RunwayEnd; // Low-end threshold
  he?: RunwayEnd; // High-end threshold (missing for helipads)
}

/**
 * Formatted runway response
 */
export interface RunwayResponse {
  id: string; // Combined ID (e.g., "11/29")
  length: number; // ft
  width: number; // ft
  surface: string; // Surface type code
  surfaceName: string; // Human-readable surface name
  lighted: boolean;
  closed: boolean;
  ends: {
    id: string;
    heading: number | null; // True heading (degrees)
    elevation: number | null; // ft
    displacedThreshold: number; // ft
    lat: number | null;
    lon: number | null;
  }[];
}

// Surface code to name mapping
const SURFACE_NAMES: Record<string, string> = {
  A: "Asphalt",
  AG: "Asphalt-Graded",
  ASP: "Asphalt",
  C: "Concrete",
  CG: "Concrete-Graded",
  CON: "Concrete",
  T: "Turf",
  TG: "Turf-Graded",
  TF: "Turf-Fair",
  TUR: "Turf",
  G: "Gravel",
  GR: "Grass",
  GRA: "Grass",
  GRV: "Gravel",
  D: "Dirt",
  DIR: "Dirt",
  W: "Water",
  WAT: "Water",
  S: "Sand",
  M: "Mats",
  PSP: "PSP (Metal)",
};

/**
 * Estimate heading from runway ID if not provided
 * Runway IDs are typically heading / 10
 */
function estimateHeading(id: string): number | null {
  // Extract numeric part (handles "04", "22L", "36R", etc.)
  const match = id.match(/^(\d+)/);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  if (num < 1 || num > 36) return null;
  return num * 10;
}

/**
 * GET /api/runways
 *
 * Query parameters:
 * - icao: ICAO code (e.g., "SABE")
 *
 * Returns array of runways for the airport
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const icao = searchParams.get("icao")?.toUpperCase();

    if (!icao) {
      return NextResponse.json(
        { error: "Required: icao (ICAO code)" },
        { status: 400 }
      );
    }

    const data = runwaysData as Record<string, Runway[]>;
    const runways = data[icao];

    if (!runways || runways.length === 0) {
      return NextResponse.json({
        icao,
        count: 0,
        runways: [],
      });
    }

    // Format runways - filter out closed and incomplete records
    const formatted: RunwayResponse[] = runways
      .filter((rwy) => !rwy.cls && rwy.le && rwy.l) // Filter out closed runways and those without essential data
      .map((rwy) => {
        const ends: RunwayResponse["ends"] = [];

        // Add low-end (we know it exists due to filter)
        ends.push({
          id: rwy.le!.id,
          heading: rwy.le!.hdg ?? estimateHeading(rwy.le!.id),
          elevation: rwy.le!.elev ?? null,
          displacedThreshold: rwy.le!.dt ?? 0,
          lat: rwy.le!.lat ?? null,
          lon: rwy.le!.lon ?? null,
        });

        // Add high-end (if exists, not a helipad)
        if (rwy.he) {
          ends.push({
            id: rwy.he.id,
            heading: rwy.he.hdg ?? estimateHeading(rwy.he.id),
            elevation: rwy.he.elev ?? null,
            displacedThreshold: rwy.he.dt ?? 0,
            lat: rwy.he.lat ?? null,
            lon: rwy.he.lon ?? null,
          });
        }

        // Build runway ID (e.g., "11/29" or "H1" for helipads)
        const id =
          ends.length === 2
            ? `${ends[0].id}/${ends[1].id}`
            : ends[0]?.id ?? "Unknown";

        return {
          id,
          length: rwy.l!,
          width: rwy.w ?? 0,
          surface: rwy.s || "UNK",
          surfaceName: rwy.s ? (SURFACE_NAMES[rwy.s] || rwy.s) : "Unknown",
          lighted: rwy.lit === 1,
          closed: rwy.cls === 1,
          ends,
        };
      });

    return NextResponse.json({
      icao,
      count: formatted.length,
      runways: formatted,
    });
  } catch (error) {
    console.error("Runways API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
