import { getRedis } from "@/lib/redis";

export interface MetarData {
  icaoId: string;
  temp: number | null;
  dewp: number | null;
  wdir: number | null;
  wspd: number | null;
  wgst: number | null;
  altim: number | null;
  elev: number | null;
  visib: string | null;
  rawOb: string;
  reportTime: string;
  lat: number;
  lon: number;
  name: string;
  fltCat: string | null;
}

export interface MetarResult {
  metar: MetarData | null;
  source: "direct" | "nearby" | null;
  searchedId?: string;
  distance?: number;
  cachedAt?: string;
}

interface CachedMetar extends MetarResult {
  cachedAt: string;
}

const CACHE_KEY_PREFIX = "metar:";
const METAR_API_BASE = "https://aviationweather.gov/api/data/metar";

/**
 * Calculate TTL until next METAR is expected.
 * METARs are typically issued at the top of each hour.
 * We cache until ~5 minutes after the next hour to allow for delays.
 */
function calculateMetarTTL(reportTime: string): number {
  try {
    const reportDate = new Date(reportTime);
    const now = new Date();

    const nextMetar = new Date(reportDate);
    nextMetar.setHours(nextMetar.getHours() + 1);
    nextMetar.setMinutes(5, 0, 0);

    const ttlMs = nextMetar.getTime() - now.getTime();
    const ttlSeconds = Math.floor(ttlMs / 1000);

    // Minimum 60 seconds, maximum 70 minutes
    return Math.max(60, Math.min(ttlSeconds, 70 * 60));
  } catch {
    return 30 * 60;
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
  const R = 3440.065;
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
 * Fetch METAR data for an aerodrome
 *
 * @param id - ICAO code (e.g., "SACO")
 * @param lat - Optional latitude for nearby search
 * @param lon - Optional longitude for nearby search
 */
export async function fetchMetar(
  id?: string,
  lat?: number,
  lon?: number
): Promise<MetarResult> {
  const redis = getRedis();
  const searchedId = id?.toUpperCase();
  const cacheKey = searchedId ? `${CACHE_KEY_PREFIX}${searchedId}` : null;

  // Try cache first
  if (cacheKey) {
    const cached = await redis.get<CachedMetar>(cacheKey);
    if (cached) {
      console.log(`[METAR] Cache hit for ${searchedId}`);
      return {
        metar: cached.metar,
        source: cached.source,
        searchedId: cached.searchedId,
        distance: cached.distance,
        cachedAt: cached.cachedAt,
      };
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

  // If no direct hit, search by bbox
  if (!metar && lat !== undefined && lon !== undefined && !isNaN(lat) && !isNaN(lon)) {
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

    if (response.ok && response.status !== 204) {
      const text = await response.text();
      if (text) {
        const data = JSON.parse(text);
        console.log(`[METAR] Bbox found ${data.length} stations`);

        if (Array.isArray(data) && data.length > 0) {
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

  const result: MetarResult = {
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

    if (cacheKey) {
      await redis.set(cacheKey, cacheData, { ex: ttl });
      console.log(`[METAR] Cached ${searchedId} for ${ttl}s`);
    }

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

  return result;
}
