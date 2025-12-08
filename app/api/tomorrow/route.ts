import { NextRequest, NextResponse } from "next/server";
import { fetchTomorrow } from "@/lib/clients";

/**
 * GET /api/tomorrow
 *
 * Query parameters:
 * - icao: ICAO code
 * - lat: Latitude
 * - lon: Longitude
 *
 * Returns weather data from Tomorrow.io
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const icao = searchParams.get("icao");
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!icao || !lat || !lon) {
    return NextResponse.json({ data: null });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json({ data: null });
  }

  const result = await fetchTomorrow(icao, latitude, longitude);
  return NextResponse.json(result);
}
