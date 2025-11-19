/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * OSM Data Fetching via Overpass API
 *
 * Fetches GeoJSON data from OpenStreetMap for rendering local charts
 */

export interface OSMFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: {
    featureType: 'road' | 'water' | 'wetland' | 'airport' | 'city' | 'railway' | 'boundary' | 'coastline' | 'salt_pond' | 'beach' | 'mud';
    name?: string;
    highway?: string;
    waterway?: string;
    natural?: string;
    wetland?: string; // Subtype of wetland: marsh, reedbed, swamp, etc.
    aeroway?: string;
    place?: string;
    landuse?: string;
    [key: string]: any;
  };
}

export interface OSMData {
  type: 'FeatureCollection';
  features: OSMFeature[];
}

interface BoundingBox {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

/**
 * Calculate bounding box from locations with padding
 */
export function calculateBoundingBox(
  locations: Array<{ lat: number; lon: number }>,
  paddingDegrees: number = 0.1
): BoundingBox {
  const lats = locations.map(l => l.lat);
  const lons = locations.map(l => l.lon);

  return {
    minLat: Math.min(...lats) - paddingDegrees,
    maxLat: Math.max(...lats) + paddingDegrees,
    minLon: Math.min(...lons) - paddingDegrees,
    maxLon: Math.max(...lons) + paddingDegrees,
  };
}

/**
 * Build Overpass QL query for aeronautical chart features
 * Filters by area size to avoid overloading with urban detail
 */
function buildOverpassQuery(bbox: BoundingBox): string {
  const { minLat, minLon, maxLat, maxLon } = bbox;
  const bboxStr = `${minLat},${minLon},${maxLat},${maxLon}`;

  // Overpass QL to get relevant features for aviation
  // More permissive - get all useful features for navigation
  return `
    [out:json][timeout:25];
    (
      // All major roads (no filter, let them all through)
      way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"](${bboxStr});

      // Water bodies - be very permissive
      // Natural water features (lakes, lagoons, reservoirs)
      way["natural"="water"](${bboxStr});
      relation["natural"="water"](${bboxStr});

      // Wetlands (marshes, swamps, etc.)
      way["natural"="wetland"](${bboxStr});
      relation["natural"="wetland"](${bboxStr});

      // Coastlines
      way["natural"="coastline"](${bboxStr});

      // Beaches and mud
      way["natural"="beach"](${bboxStr});
      way["natural"="mud"](${bboxStr});

      // Salt ponds and salt flats
      way["landuse"="salt_pond"](${bboxStr});
      way["natural"="salt_flat"](${bboxStr});

      // Waterways (rivers, streams, canals)
      way["waterway"~"^(river|stream|canal)$"](${bboxStr});

      // Large water bodies by type
      way["water"~"^(lake|lagoon|reservoir|oxbow|pond)$"](${bboxStr});
      relation["water"~"^(lake|lagoon|reservoir)$"](${bboxStr});

      // Airports and aerodromes
      way["aeroway"~"^(aerodrome|runway|taxiway)$"](${bboxStr});
      node["aeroway"="aerodrome"](${bboxStr});
      relation["aeroway"="aerodrome"](${bboxStr});

      // Cities, towns, and villages
      node["place"~"^(city|town|village)$"](${bboxStr});

      // Railways
      way["railway"="rail"](${bboxStr});
    );
    out geom;
  `;
}

/**
 * Try to connect multiple ways into a single ring
 * OSM relations often have ways in arbitrary order that need to be connected
 */
function connectWays(ways: number[][][]): number[][] | null {
  if (ways.length === 0) return null;
  if (ways.length === 1) return ways[0];

  // Start with the first way
  const connected: number[][] = [...ways[0]];
  const remaining = ways.slice(1);

  // Keep trying to connect remaining ways
  let maxIterations = 100; // Prevent infinite loop
  while (remaining.length > 0 && maxIterations > 0) {
    maxIterations--;
    let foundConnection = false;

    for (let i = 0; i < remaining.length; i++) {
      const way = remaining[i];
      const firstConnected = connected[0];
      const lastConnected = connected[connected.length - 1];
      const firstWay = way[0];
      const lastWay = way[way.length - 1];

      // Check if this way connects to the end of our ring
      if (
        lastConnected[0] === firstWay[0] &&
        lastConnected[1] === firstWay[1]
      ) {
        // Connect at end (forward)
        connected.push(...way.slice(1));
        remaining.splice(i, 1);
        foundConnection = true;
        break;
      } else if (
        lastConnected[0] === lastWay[0] &&
        lastConnected[1] === lastWay[1]
      ) {
        // Connect at end (reverse)
        connected.push(...way.slice(0, -1).reverse());
        remaining.splice(i, 1);
        foundConnection = true;
        break;
      } else if (
        firstConnected[0] === lastWay[0] &&
        firstConnected[1] === lastWay[1]
      ) {
        // Connect at beginning (forward)
        connected.unshift(...way.slice(0, -1));
        remaining.splice(i, 1);
        foundConnection = true;
        break;
      } else if (
        firstConnected[0] === firstWay[0] &&
        firstConnected[1] === firstWay[1]
      ) {
        // Connect at beginning (reverse)
        connected.unshift(...way.slice(1).reverse());
        remaining.splice(i, 1);
        foundConnection = true;
        break;
      }
    }

    // If we couldn't find any connection, give up
    if (!foundConnection) {
      console.warn(`Could not connect all ways. ${remaining.length} ways remaining.`);
      break;
    }
  }

  return connected;
}

/**
 * Convert OSM element to GeoJSON feature with proper categorization
 */
function osmToGeoJSON(element: any): OSMFeature | null {
  // Determine feature type
  let featureType: OSMFeature['properties']['featureType'];

  if (element.tags?.highway) {
    featureType = 'road';
  } else if (element.tags?.natural === 'wetland') {
    featureType = 'wetland';
  } else if (element.tags?.natural === 'coastline') {
    featureType = 'coastline';
  } else if (element.tags?.natural === 'beach') {
    featureType = 'beach';
  } else if (element.tags?.natural === 'mud') {
    featureType = 'mud';
  } else if (element.tags?.landuse === 'salt_pond' || element.tags?.natural === 'salt_flat') {
    featureType = 'salt_pond';
  } else if (element.tags?.natural === 'water' || element.tags?.waterway) {
    featureType = 'water';
  } else if (element.tags?.aeroway) {
    featureType = 'airport';
  } else if (element.tags?.place) {
    featureType = 'city';
  } else if (element.tags?.railway) {
    featureType = 'railway';
  } else if (element.tags?.boundary) {
    featureType = 'boundary';
  } else {
    return null; // Skip unknown types
  }

  // Build geometry
  let geometry: any = null;

  if (element.type === 'node') {
    geometry = {
      type: 'Point',
      coordinates: [element.lon, element.lat],
    };
  } else if (element.type === 'way') {
    const coords = element.geometry?.map((n: any) => [n.lon, n.lat]) || [];
    geometry = {
      type: 'LineString',
      coordinates: coords,
    };

    // Check if it's a closed way (polygon)
    if (coords.length > 2 &&
        coords[0][0] === coords[coords.length - 1][0] &&
        coords[0][1] === coords[coords.length - 1][1]) {
      geometry.type = 'Polygon';
      geometry.coordinates = [coords];
    }
  } else if (element.type === 'relation') {
    // Try to extract geometry from relation members
    // Many large water bodies like Mar Chiquita are relations
    if (element.members && element.members.length > 0) {
      // Collect all outer ways
      const outerWays: number[][][] = [];

      element.members.forEach((member: any) => {
        if (member.role === 'outer' && member.geometry) {
          const coords = member.geometry.map((n: any) => [n.lon, n.lat]);
          if (coords.length > 0) {
            outerWays.push(coords);
          }
        }
      });

      if (outerWays.length === 0) {
        return null;
      }

      // Try to connect ways into a single ring
      // OSM relations often have multiple ways that need to be joined
      const connectedRing = connectWays(outerWays);

      if (connectedRing && connectedRing.length > 3) {
        // Close the ring if not already closed
        const first = connectedRing[0];
        const last = connectedRing[connectedRing.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          connectedRing.push([...first]);
        }

        geometry = {
          type: 'Polygon',
          coordinates: [connectedRing],
        };
      } else {
        // Fallback: treat as separate polygons (won't look good but better than nothing)
        return null;
      }
    } else {
      return null;
    }
  }

  if (!geometry) return null;

  return {
    type: 'Feature',
    geometry,
    properties: {
      featureType,
      name: element.tags?.name,
      ...element.tags,
    },
  };
}

/**
 * Generate cache key for bounding box
 */
function getCacheKey(bbox: BoundingBox): string {
  // Round to 2 decimals to create reasonable cache buckets
  const key = `osm_${bbox.minLat.toFixed(2)}_${bbox.minLon.toFixed(2)}_${bbox.maxLat.toFixed(2)}_${bbox.maxLon.toFixed(2)}`;
  return key;
}

/**
 * Get cached OSM data from localStorage
 */
function getCachedData(cacheKey: string): OSMData | null {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const data = JSON.parse(cached);
    // Cache expires after 24 hours
    const age = Date.now() - data.timestamp;
    if (age > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return data.osmData;
  } catch {
    return null;
  }
}

/**
 * Save OSM data to localStorage cache
 */
function setCachedData(cacheKey: string, osmData: OSMData): void {
  try {
    const data = {
      timestamp: Date.now(),
      osmData,
    };
    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to cache OSM data:', error);
  }
}

/**
 * Fetch OSM data from Overpass API (with caching and fallback mirrors)
 */
export async function fetchOSMData(
  locations: Array<{ lat: number; lon: number }>
): Promise<OSMData> {
  const bbox = calculateBoundingBox(locations, 0.08); // ~8-10km padding
  const cacheKey = getCacheKey(bbox);

  // Try cache first
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    console.log('Using cached OSM data');
    return cachedData;
  }

  const query = buildOverpassQuery(bbox);

  // List of Overpass API mirrors (in priority order)
  const mirrors = [
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass-api.de/api/interpreter',
  ];

  let lastError: Error | null = null;

  // Try each mirror in sequence
  for (const mirror of mirrors) {
    try {
      console.log(`Fetching OSM data from ${mirror}...`);
      const response = await fetch(mirror, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }

      const data = await response.json();

      // Convert to GeoJSON
      const features: OSMFeature[] = [];

      for (const element of data.elements || []) {
        const feature = osmToGeoJSON(element);
        if (feature) {
          features.push(feature);
        }
      }

      console.log(`Fetched ${features.length} OSM features from ${mirror}:`, {
        roads: features.filter(f => f.properties.featureType === 'road').length,
        water: features.filter(f => f.properties.featureType === 'water').length,
        wetlands: features.filter(f => f.properties.featureType === 'wetland').length,
        airports: features.filter(f => f.properties.featureType === 'airport').length,
        cities: features.filter(f => f.properties.featureType === 'city').length,
        railways: features.filter(f => f.properties.featureType === 'railway').length,
      });

      const osmData: OSMData = {
        type: 'FeatureCollection',
        features,
      };

      // Cache the data
      setCachedData(cacheKey, osmData);

      return osmData;
    } catch (error) {
      console.warn(`Failed to fetch from ${mirror}:`, error);
      lastError = error as Error;
      // Continue to next mirror
    }
  }

  // All mirrors failed
  console.error('All Overpass API mirrors failed:', lastError);

  // Return empty collection as fallback
  return {
    type: 'FeatureCollection',
    features: [],
  };
}
