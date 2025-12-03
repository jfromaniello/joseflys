/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import airportsData from '../../../data/airports.json';

export const runtime = 'edge';

// Airport data structure: [code, lat, lon, name, elevation_ft]
type AirportData = [string, number, number, string, number | null];

interface GeocodeResult {
  name: string;
  lat: number;
  lon: number;
  type: string;
  importance: number;
}

/**
 * Search airports by ICAO code or name
 */
function searchAirports(query: string): GeocodeResult[] {
  const normalizedQuery = query.toLowerCase().trim();
  const airports = airportsData as AirportData[];

  // Match by ICAO code (exact or starts with)
  const codeMatches = airports.filter(([code]) =>
    code.toLowerCase().startsWith(normalizedQuery)
  );

  // Match by name (contains)
  const nameMatches = airports.filter(([_code, _lat, _lon, name]) =>
    name.toLowerCase().includes(normalizedQuery)
  );

  // Combine matches (code matches first, then name matches)
  const allMatches = [...codeMatches, ...nameMatches];

  // Remove duplicates and limit to 5 results
  const uniqueMatches = Array.from(
    new Map(allMatches.map(airport => [airport[0], airport])).values()
  ).slice(0, 5);

  // Transform to geocode result format
  return uniqueMatches.map(([code, lat, lon, name]) => ({
    name: `${code}, ${name}`,
    lat,
    lon,
    type: 'aerodrome',
    importance: 0.9, // High importance for airports
  }));
}

/**
 * Geocoding API route that searches both airports and OpenStreetMap
 * This provides a safe way to query location data without exposing the client
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

    // Search airports first
    const airportResults = searchAirports(query);

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
    const osmResults = data.map((item: any) => ({
      name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type,
      importance: item.importance,
    }));

    // Combine airport results with OSM results
    // Airports first, then OSM results, sorted by importance
    const combinedResults = [...airportResults, ...osmResults]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 10); // Limit to 10 total results

    return NextResponse.json(combinedResults);
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
