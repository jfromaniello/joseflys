import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

interface CachedMetar {
  metar: MetarData | null;
  source: "direct" | "nearby" | null;
  searchedId?: string;
  distance?: number;
  cachedAt: string;
}

const CACHE_KEY_PREFIX = "metar:";

/**
 * Calculate TTL until next METAR is expected.
 * METARs are typically issued at the top of each hour.
 * We cache until ~5 minutes after the next hour to allow for delays.
 */
function calculateMetarTTL(reportTime: string): number {
  try {
    const reportDate = new Date(reportTime);
    const now = new Date();

    // Next METAR expected at the top of the next hour + 5 min buffer
    const nextMetar = new Date(reportDate);
    nextMetar.setHours(nextMetar.getHours() + 1);
    nextMetar.setMinutes(5, 0, 0);

    const ttlMs = nextMetar.getTime() - now.getTime();
    const ttlSeconds = Math.floor(ttlMs / 1000);

    // Minimum 60 seconds, maximum 70 minutes
    return Math.max(60, Math.min(ttlSeconds, 70 * 60));
  } catch {
    // Fallback: 30 minutes
    return 30 * 60;
  }
}

interface MetarData {
  icaoId: string;
  temp: number | null; // °C
  dewp: number | null; // °C
  wdir: number | null; // degrees
  wspd: number | null; // knots
  wgst: number | null; // knots (gusts)
  altim: number | null; // hPa (QNH)
  elev: number | null; // meters
  visib: string | null;
  rawOb: string;
  reportTime: string;
  lat: number;
  lon: number;
  name: string;
  fltCat: string | null;
}

interface MetarResponse {
  metar: MetarData | null;
  source: "direct" | "nearby" | null;
  searchedId?: string;
  distance?: number; // NM, if nearby
}

const METAR_API_BASE = "https://aviationweather.gov/api/data/metar";

/**
 * GET /api/metar
 *
 * Query parameters:
 * - id: ICAO code (e.g., "SACO")
 * - lat/lon: coordinates to find nearest METAR station
 *
 * Returns METAR data from aviationweather.gov
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
      const cached = await redis.get<CachedMetar>(cacheKey);
      if (cached) {
        console.log(`[METAR] Cache hit for ${searchedId}`);
        return NextResponse.json({
          metar: cached.metar,
          source: cached.source,
          searchedId: cached.searchedId,
          distance: cached.distance,
          cachedAt: cached.cachedAt,
        });
      }
    }

    let metar: MetarData | null = null;
    let source: "direct" | "nearby" | null = null;
    let distance: number | undefined;

    // Try direct ICAO lookup first
    if (searchedId) {
      const url = `${METAR_API_BASE}?ids=${searchedId}&format=json`;
      console.log(`[METAR] Direct lookup: ${url}`);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "JoseFlys/1.0 (Aviation Calculator)",
        },
      });

      console.log(`[METAR] Direct response: ${response.status}`);

      // Handle 204 No Content (no METAR for this station)
      if (response.ok && response.status !== 204) {
        const text = await response.text();
        if (text) {
          const data = JSON.parse(text);
          if (Array.isArray(data) && data.length > 0) {
            metar = data[0];
            source = "direct";
            console.log(`[METAR] Found direct: ${metar?.icaoId}`);
          }
        }
      }
    }

    // If no direct hit or no ID provided, search by bbox
    if (!metar && !isNaN(lat) && !isNaN(lon)) {
      // Search in a ~200 NM radius (roughly 3 degrees)
      const padding = 3;
      const bbox = `${lat - padding},${lon - padding},${lat + padding},${lon + padding}`;
      const url = `${METAR_API_BASE}?bbox=${bbox}&format=json`;
      console.log(`[METAR] Bbox search: ${url}`);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "JoseFlys/1.0 (Aviation Calculator)",
        },
      });

      console.log(`[METAR] Bbox response: ${response.status}`);

      // Handle 204 No Content (no METARs in bbox)
      if (response.ok && response.status !== 204) {
        const text = await response.text();
        if (text) {
          const data = JSON.parse(text);
          console.log(`[METAR] Bbox found ${data.length} stations`);

          if (Array.isArray(data) && data.length > 0) {
            // Find nearest station
            let nearest: MetarData | null = null;
            let minDist = Infinity;

            for (const station of data) {
              const dist = haversineNM(lat, lon, station.lat, station.lon);
              if (dist < minDist) {
                minDist = dist;
                nearest = station;
              }
            }

            if (nearest) {
              metar = nearest;
              source = "nearby";
              distance = Math.round(minDist * 10) / 10;
              console.log(`[METAR] Nearest: ${metar.icaoId} at ${distance} NM`);
            }
          }
        }
      }
    }

    const result: MetarResponse = {
      metar,
      source,
      searchedId,
      distance,
    };

    // Cache the result
    if (metar) {
      const ttl = calculateMetarTTL(metar.reportTime);
      const cacheData: CachedMetar = {
        ...result,
        cachedAt: new Date().toISOString(),
      };

      // Cache under searched ID
      if (cacheKey) {
        await redis.set(cacheKey, cacheData, { ex: ttl });
        console.log(`[METAR] Cached ${searchedId} for ${ttl}s`);
      }

      // Also cache under the METAR station ID if different
      const metarId = metar.icaoId.toUpperCase();
      if (metarId !== searchedId) {
        const metarCacheKey = `${CACHE_KEY_PREFIX}${metarId}`;
        const directCacheData: CachedMetar = {
          metar,
          source: "direct",
          searchedId: metarId,
          cachedAt: new Date().toISOString(),
        };
        await redis.set(metarCacheKey, directCacheData, { ex: ttl });
        console.log(`[METAR] Also cached ${metarId} for ${ttl}s`);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("METAR API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch METAR data" },
      { status: 500 }
    );
  }
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
