import { NextRequest, NextResponse } from "next/server";
import { fetchTaf } from "@/lib/clients";

/**
 * GET /api/taf
 *
 * Query parameters:
 * - id: ICAO code (e.g., "SACO")
 * - lat/lon: coordinates to find nearest TAF station
 *
 * Returns TAF data from aviationweather.gov
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") ?? undefined;
    const lat = parseFloat(searchParams.get("lat") ?? "");
    const lon = parseFloat(searchParams.get("lon") ?? "");

    if (!id && (isNaN(lat) || isNaN(lon))) {
      return NextResponse.json(
        { error: "Required: id (ICAO code) OR lat/lon coordinates" },
        { status: 400 }
      );
    }

    const result = await fetchTaf(
      id,
      isNaN(lat) ? undefined : lat,
      isNaN(lon) ? undefined : lon
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("TAF API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch TAF data" },
      { status: 500 }
    );
  }
}
