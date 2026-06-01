import { NextRequest, NextResponse } from "next/server";
import { resolveAerodromesNear } from "@/lib/replay/resolveAerodrome";

// Not edge: pulls from the large global airports/runways datasets.

interface RequestBody {
  points?: Array<{ lat: number; lon: number }>;
}

/**
 * POST /api/replay/aerodrome
 * Body: { points: [{ lat, lon }, ...] } — a (downsampled) track.
 *
 * Resolves every aerodrome the track passes near (ANAC first, global fallback),
 * normalized for circuit analysis. Returns `{ aerodromes: [] }` when none.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;
    const points = (body.points ?? []).filter(
      (p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lon)
    );
    if (points.length === 0) {
      return NextResponse.json({ error: "Required: points array" }, { status: 400 });
    }
    const aerodromes = resolveAerodromesNear(points);
    return NextResponse.json({ aerodromes });
  } catch (error) {
    console.error("Replay aerodrome API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
