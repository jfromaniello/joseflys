/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { searchAerodromes, type Aerodrome } from '@/lib/clients';

// Note: Not using edge runtime due to 2MB size limit (airports.json is 5MB)

interface GeocodeResult {
  name: string;
  lat: number;
  lon: number;
  type: string;
  importance: number;
}

const TYPE_LABEL: Record<Aerodrome["type"], string> = {
  AD: "AD",
  LAD: "LAD",
  HELIPORT: "HEL",
  LADH: "LADH",
};

const TYPE_IMPORTANCE: Record<Aerodrome["type"], number> = {
  AD: 0.95,
  HELIPORT: 0.9,
  LAD: 0.88,
  LADH: 0.85,
};

/**
 * Format aerodrome for LocationSearchInput.
 * AD keeps the legacy "CODE, name" format so selection shows the ICAO code.
 * LAD/LADH/HELIPORT use a dash separator (no comma) so the full label is kept
 * after the input's `split(",")[0]` selection trim.
 */
function formatAerodromeName(a: Aerodrome): string {
  if (a.type === "AD") {
    return a.code ? `${a.code}, ${a.name}` : a.name;
  }
  const tag = TYPE_LABEL[a.type];
  const prefix = a.code ? `${tag} ${a.code}` : tag;
  return `${prefix} - ${a.name}`;
}

function aerodromesToGeocode(query: string, limit: number): GeocodeResult[] {
  const { data } = searchAerodromes(query, limit);
  return data.map((a) => ({
    name: formatAerodromeName(a),
    lat: a.lat,
    lon: a.lon,
    type: a.type === "AD" ? "aerodrome" : a.type.toLowerCase(),
    importance: TYPE_IMPORTANCE[a.type] ?? 0.85,
  }));
}

/**
 * Geocoding API route that searches aerodromes (AD/LAD/LADH/HELIPORT) and OpenStreetMap.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    // Search aerodromes (Argentina AD/LAD/LADH/HELIPORT + global ADs)
    const aerodromeResults = aerodromesToGeocode(query, 8);

    // Call Nominatim API with proper user agent
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
    nominatimUrl.searchParams.set('q', query);
    nominatimUrl.searchParams.set('format', 'json');
    nominatimUrl.searchParams.set('limit', '5');
    nominatimUrl.searchParams.set('addressdetails', '1');
    nominatimUrl.searchParams.set('accept-language', 'en');

    const response = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': 'TAS-Calculator/1.0 (Aviation Calculator; https://github.com/jfroma/tas-calculator)',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch geocoding data' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform OSM data to a simpler format
    const osmResults: GeocodeResult[] = data.map((item: any) => ({
      name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type,
      importance: item.importance,
    }));

    // Aerodromes first (already well-sorted by searchAerodromes), then OSM by importance
    const sortedOsm = osmResults.sort((a, b) => b.importance - a.importance);
    const combinedResults = [...aerodromeResults, ...sortedOsm].slice(0, 10);

    return NextResponse.json(combinedResults);
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
