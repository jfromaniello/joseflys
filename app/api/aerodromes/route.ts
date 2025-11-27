import { NextRequest, NextResponse } from "next/server";
import argentinaData from "../../../data/ad-lads/argentina.json";

export const runtime = "edge";

interface Aerodrome {
  type: "AD" | "LAD";
  code: string | null;
  shortCode: string | null;
  name: string;
  lat: number;
  lon: number;
  province: string | null;
  fir: string | null;
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

const data = argentinaData as AerodromeData;

/**
 * GET /api/aerodromes
 *
 * Query parameters:
 * - minLat: minimum latitude (required)
 * - maxLat: maximum latitude (required)
 * - minLon: minimum longitude (required)
 * - maxLon: maximum longitude (required)
 * - type: filter by type ("AD", "LAD", or omit for both)
 *
 * Returns all aerodromes/LADs within the bounding box
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const minLat = parseFloat(searchParams.get("minLat") ?? "");
    const maxLat = parseFloat(searchParams.get("maxLat") ?? "");
    const minLon = parseFloat(searchParams.get("minLon") ?? "");
    const maxLon = parseFloat(searchParams.get("maxLon") ?? "");
    const typeFilter = searchParams.get("type") as "AD" | "LAD" | null;

    // Validate required parameters
    if (isNaN(minLat) || isNaN(maxLat) || isNaN(minLon) || isNaN(maxLon)) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid bounding box parameters. Required: minLat, maxLat, minLon, maxLon",
        },
        { status: 400 }
      );
    }

    // Validate bounding box
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

    // Filter by bounding box and type
    const results = data.data.filter((aerodrome) => {
      const inBounds =
        aerodrome.lat >= minLat &&
        aerodrome.lat <= maxLat &&
        aerodrome.lon >= minLon &&
        aerodrome.lon <= maxLon;

      if (!inBounds) return false;

      if (typeFilter && aerodrome.type !== typeFilter) return false;

      return true;
    });

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
