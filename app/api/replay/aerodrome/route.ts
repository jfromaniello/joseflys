import { NextRequest, NextResponse } from "next/server";
import { resolveAerodrome } from "@/lib/replay/resolveAerodrome";

// Not edge: pulls from the large global airports/runways datasets.

/**
 * GET /api/replay/aerodrome?lat=..&lon=..
 *
 * Resolves the aerodrome nearest the given coordinate (ANAC first, global
 * fallback) and returns it normalized for circuit analysis. Returns
 * `{ aerodrome: null }` when nothing usable is within range.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = Number.parseFloat(searchParams.get("lat") ?? "");
    const lon = Number.parseFloat(searchParams.get("lon") ?? "");

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json(
        { error: "Required: lat and lon query parameters" },
        { status: 400 }
      );
    }

    const aerodrome = resolveAerodrome(lat, lon);
    return NextResponse.json(
      { aerodrome },
      { headers: { "Cache-Control": "public, max-age=86400" } }
    );
  } catch (error) {
    console.error("Replay aerodrome API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
