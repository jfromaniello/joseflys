import { NextRequest, NextResponse } from "next/server";
import argentinaData from "../../../data/ad-lads/argentina.json";
import airportsData from "../../../data/airports.json";

export const runtime = "edge";

interface Aerodrome {
  type: "AD" | "LAD";
  code: string | null;
  name: string;
  lat: number;
  lon: number;
  elevation: number | null;
}

interface AerodromeData {
  version: string;
  source: string;
  generatedAt: string;
  count: {
    total: number;
    ad: number;
    lad: number;
  };
  data: Aerodrome[];
}

// Argentina AD/LAD data
const argData = argentinaData as AerodromeData;

// Global airports: [code, lat, lon, name, elevation]
type AirportEntry = [string, number, number, string, number | null];
const globalAirports = airportsData as AirportEntry[];

/**
 * GET /api/aerodromes
 *
 * Search mode (text search):
 * - q: search query (searches code and name)
 * - limit: max results (default 10)
 *
 * Bounding box mode:
 * - minLat, maxLat, minLon, maxLon: bounding box coordinates
 * - type: filter by type ("AD", "LAD", or omit for both)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    // Text search mode
    if (query) {
      const limit = parseInt(searchParams.get("limit") ?? "10", 10);
      const normalizedQuery = query.toLowerCase().trim();

      if (normalizedQuery.length < 2) {
        return NextResponse.json({ count: 0, data: [] });
      }

      // Search Argentina data by code or name
      const argMatches = argData.data.filter((aerodrome) => {
        const codeMatch = aerodrome.code?.toLowerCase().startsWith(normalizedQuery);
        const nameMatch = aerodrome.name.toLowerCase().includes(normalizedQuery);
        return codeMatch || nameMatch;
      });

      // Search global airports by code or name
      const globalMatches = globalAirports
        .filter(([code, , , name]) => {
          const codeMatch = code.toLowerCase().startsWith(normalizedQuery);
          const nameMatch = name.toLowerCase().includes(normalizedQuery);
          return codeMatch || nameMatch;
        })
        .map(([code, lat, lon, name, elevation]) => ({
          type: "AD" as const,
          code,
          name,
          lat,
          lon,
          elevation: elevation ?? null,
        }));

      // Combine and dedupe by code (Argentina data takes priority)
      const seenCodes = new Set(argMatches.map((a) => a.code).filter(Boolean));
      const dedupedGlobal = globalMatches.filter(
        (a) => !a.code || !seenCodes.has(a.code)
      );

      // Sort: exact code matches first, then by name length
      const allMatches = [...argMatches, ...dedupedGlobal].sort((a, b) => {
        const aCodeExact = a.code?.toLowerCase() === normalizedQuery ? 0 : 1;
        const bCodeExact = b.code?.toLowerCase() === normalizedQuery ? 0 : 1;
        if (aCodeExact !== bCodeExact) return aCodeExact - bCodeExact;

        const aCodeStart = a.code?.toLowerCase().startsWith(normalizedQuery) ? 0 : 1;
        const bCodeStart = b.code?.toLowerCase().startsWith(normalizedQuery) ? 0 : 1;
        if (aCodeStart !== bCodeStart) return aCodeStart - bCodeStart;

        return a.name.length - b.name.length;
      });

      const results = allMatches.slice(0, limit);

      return NextResponse.json({
        count: results.length,
        query,
        data: results,
      });
    }

    // Bounding box mode
    const minLat = parseFloat(searchParams.get("minLat") ?? "");
    const maxLat = parseFloat(searchParams.get("maxLat") ?? "");
    const minLon = parseFloat(searchParams.get("minLon") ?? "");
    const maxLon = parseFloat(searchParams.get("maxLon") ?? "");
    const typeFilter = searchParams.get("type") as "AD" | "LAD" | null;

    if (isNaN(minLat) || isNaN(maxLat) || isNaN(minLon) || isNaN(maxLon)) {
      return NextResponse.json(
        {
          error:
            "Required: q (search query) OR bounding box (minLat, maxLat, minLon, maxLon)",
        },
        { status: 400 }
      );
    }

    if (minLat > maxLat) {
      return NextResponse.json(
        { error: "minLat must be less than or equal to maxLat" },
        { status: 400 }
      );
    }
    if (minLon > maxLon) {
      return NextResponse.json(
        { error: "minLon must be less than or equal to maxLon" },
        { status: 400 }
      );
    }

    // Filter Argentina data by bounding box and type
    const argResults = argData.data.filter((aerodrome) => {
      const inBounds =
        aerodrome.lat >= minLat &&
        aerodrome.lat <= maxLat &&
        aerodrome.lon >= minLon &&
        aerodrome.lon <= maxLon;

      if (!inBounds) return false;
      if (typeFilter && aerodrome.type !== typeFilter) return false;

      return true;
    });

    // Filter global airports by bounding box (only if type is AD or not filtered)
    const globalResults: Aerodrome[] =
      typeFilter === "LAD"
        ? []
        : globalAirports
            .filter(
              ([, lat, lon]) =>
                lat >= minLat &&
                lat <= maxLat &&
                lon >= minLon &&
                lon <= maxLon
            )
            .map(([code, lat, lon, name, elevation]) => ({
              type: "AD" as const,
              code,
              name,
              lat,
              lon,
              elevation: elevation ?? null,
            }));

    // Combine results (Argentina data first, then global airports)
    const results = [...argResults, ...globalResults];

    return NextResponse.json({
      count: results.length,
      bounds: { minLat, maxLat, minLon, maxLon },
      filter: typeFilter,
      data: results,
    });
  } catch (error) {
    console.error("Aerodromes API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
