import { NextRequest, NextResponse } from "next/server";
import { searchAerodromes, getAerodromesByBbox } from "@/lib/clients";

// Note: Not using edge runtime due to 2MB size limit (airports.json is 5MB)

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
      const result = searchAerodromes(query, limit);
      return NextResponse.json(result);
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

    const result = getAerodromesByBbox(
      minLat,
      maxLat,
      minLon,
      maxLon,
      typeFilter ?? undefined
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Aerodromes API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
