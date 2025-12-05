import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

interface TafForecast {
  timeFrom: number;
  timeTo: number;
  fcstChange?: string; // FM, BECMG, TEMPO, PROB
  probability?: number;
  wdir?: number | null;
  wspd?: number | null;
  wgst?: number | null;
  wshearHgt?: number | null;
  wshearDir?: number | null;
  wshearSpd?: number | null;
  visib?: string | null;
  altim?: number | null;
  vertVis?: number | null;
  wxString?: string | null;
  notDecoded?: string | null;
  clouds?: Array<{
    cover: string;
    base: number | null;
    type?: string | null;
  }>;
  icgTurb?: Array<{
    type: string;
    severity: string;
    minAlt: number;
    maxAlt: number;
  }>;
  temp?: Array<{
    validTime: number;
    sfc: number;
    maxOrMin?: string;
  }>;
}

interface TafData {
  icaoId: string;
  lat: number;
  lon: number;
  elev: number;
  name: string;
  rawTAF: string;
  issueTime: string;
  bulletinTime: string;
  validTimeFrom: number;
  validTimeTo: number;
  fcsts: TafForecast[];
  remarks?: string;
}

interface CachedTaf {
  taf: TafData | null;
  source: "direct" | "nearby" | null;
  searchedId?: string;
  distance?: number;
  cachedAt: string;
}

interface TafResponse {
  taf: TafData | null;
  source: "direct" | "nearby" | null;
  searchedId?: string;
  distance?: number;
}

const CACHE_KEY_PREFIX = "taf:";
const TAF_API_BASE = "https://aviationweather.gov/api/data/taf";

/**
 * Calculate TTL until TAF expires.
 * TAFs are typically valid for 24-30 hours.
 */
function calculateTafTTL(validTimeTo: number): number {
  const now = Date.now();
  const expiresAt = validTimeTo * 1000; // Convert to milliseconds
  const ttlMs = expiresAt - now;
  const ttlSeconds = Math.floor(ttlMs / 1000);

  // Minimum 5 minutes, maximum 6 hours (re-check periodically for amendments)
  return Math.max(5 * 60, Math.min(ttlSeconds, 6 * 60 * 60));
}

/**
 * Haversine distance in nautical miles
 */
function haversineNM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3440.065; // Earth radius in NM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
    const id = searchParams.get("id");
    const lat = parseFloat(searchParams.get("lat") ?? "");
    const lon = parseFloat(searchParams.get("lon") ?? "");

    if (!id && (isNaN(lat) || isNaN(lon))) {
      return NextResponse.json(
        { error: "Required: id (ICAO code) OR lat/lon coordinates" },
        { status: 400 }
      );
    }

    const redis = getRedis();
    const searchedId = id?.toUpperCase();
    const cacheKey = searchedId ? `${CACHE_KEY_PREFIX}${searchedId}` : null;

    // Try cache first
    if (cacheKey) {
      const cached = await redis.get<CachedTaf>(cacheKey);
      if (cached) {
        console.log(`[TAF] Cache hit for ${searchedId}`);
        return NextResponse.json({
          taf: cached.taf,
          source: cached.source,
          searchedId: cached.searchedId,
          distance: cached.distance,
          cachedAt: cached.cachedAt,
        });
      }
    }

    let taf: TafData | null = null;
    let source: "direct" | "nearby" | null = null;
    let distance: number | undefined;

    // Try direct ICAO lookup first
    if (searchedId) {
      const url = `${TAF_API_BASE}?ids=${searchedId}&format=json`;
      console.log(`[TAF] Direct lookup: ${url}`);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "JoseFlys/1.0 (Aviation Calculator)",
        },
      });

      console.log(`[TAF] Direct response: ${response.status}`);

      if (response.ok && response.status !== 204) {
        const text = await response.text();
        if (text) {
          const data = JSON.parse(text);
          if (Array.isArray(data) && data.length > 0) {
            taf = data[0];
            source = "direct";
            console.log(`[TAF] Found direct: ${taf?.icaoId}`);
          }
        }
      }
    }

    // If no direct hit, search by bbox
    if (!taf && !isNaN(lat) && !isNaN(lon)) {
      const padding = 3;
      const bbox = `${lat - padding},${lon - padding},${lat + padding},${lon + padding}`;
      const url = `${TAF_API_BASE}?bbox=${bbox}&format=json`;
      console.log(`[TAF] Bbox search: ${url}`);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "JoseFlys/1.0 (Aviation Calculator)",
        },
      });

      console.log(`[TAF] Bbox response: ${response.status}`);

      if (response.ok && response.status !== 204) {
        const text = await response.text();
        if (text) {
          const data = JSON.parse(text);
          console.log(`[TAF] Bbox found ${data.length} stations`);

          if (Array.isArray(data) && data.length > 0) {
            let nearest: TafData | null = null;
            let minDist = Infinity;

            for (const station of data) {
              const dist = haversineNM(lat, lon, station.lat, station.lon);
              if (dist < minDist) {
                minDist = dist;
                nearest = station;
              }
            }

            if (nearest) {
              taf = nearest;
              source = "nearby";
              distance = Math.round(minDist * 10) / 10;
              console.log(`[TAF] Nearest: ${taf.icaoId} at ${distance} NM`);
            }
          }
        }
      }
    }

    const result: TafResponse = {
      taf,
      source,
      searchedId,
      distance,
    };

    // Cache the result
    if (taf) {
      const ttl = calculateTafTTL(taf.validTimeTo);
      const cacheData: CachedTaf = {
        ...result,
        cachedAt: new Date().toISOString(),
      };

      // Cache under searched ID
      if (cacheKey) {
        await redis.set(cacheKey, cacheData, { ex: ttl });
        console.log(`[TAF] Cached ${searchedId} for ${ttl}s`);
      }

      // Also cache under the TAF station ID if different
      const tafId = taf.icaoId.toUpperCase();
      if (tafId !== searchedId) {
        const tafCacheKey = `${CACHE_KEY_PREFIX}${tafId}`;
        const directCacheData: CachedTaf = {
          taf,
          source: "direct",
          searchedId: tafId,
          cachedAt: new Date().toISOString(),
        };
        await redis.set(tafCacheKey, directCacheData, { ex: ttl });
        console.log(`[TAF] Also cached ${tafId} for ${ttl}s`);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("TAF API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch TAF data" },
      { status: 500 }
    );
  }
}
