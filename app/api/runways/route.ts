import { NextRequest, NextResponse } from "next/server";
import { getRunways } from "@/lib/clients";

// Note: Not using edge runtime due to 2MB size limit (large JSON data)

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
    const icao = searchParams.get("icao");

    if (!icao) {
      return NextResponse.json(
        { error: "Required: icao (ICAO code)" },
        { status: 400 }
      );
    }

    const result = getRunways(icao);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Runways API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
