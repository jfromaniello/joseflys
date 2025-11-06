import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Geocoding API route that proxies requests to Nominatim OpenStreetMap API
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

    // Call Nominatim API with proper user agent
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
    nominatimUrl.searchParams.set('q', query);
    nominatimUrl.searchParams.set('format', 'json');
    nominatimUrl.searchParams.set('limit', '5');
    nominatimUrl.searchParams.set('addressdetails', '1');

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

    // Transform the data to a simpler format
    const results = data.map((item: any) => ({
      name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type,
      importance: item.importance,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
