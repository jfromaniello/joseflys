import { getRedis } from "@/lib/redis";

export interface TomorrowValues {
  temperature?: number | null;
  temperatureApparent?: number | null;
  humidity?: number | null;
  dewPoint?: number | null;
  windSpeed?: number | null;
  windGust?: number | null;
  windDirection?: number | null;
  pressureSeaLevel?: number | null;
  pressureSurfaceLevel?: number | null;
  visibility?: number | null;
  cloudCover?: number | null;
  cloudBase?: number | null;
  cloudCeiling?: number | null;
  weatherCode?: number | null;
  precipitationProbability?: number | null;
  uvIndex?: number | null;
}

export interface TomorrowTimelineItem {
  time: string;
  values: TomorrowValues;
}

export interface TomorrowResult {
  current: TomorrowValues | null;
  hourly: TomorrowTimelineItem[];
  cachedAt?: string;
}

interface TomorrowForecastResponse {
  timelines: {
    hourly: TomorrowTimelineItem[];
  };
}

interface TomorrowRealtimeResponse {
  data: {
    time: string;
    values: TomorrowValues;
  };
}

interface CachedData {
  current: TomorrowValues;
  hourly: TomorrowTimelineItem[];
  cachedAt: string;
}

const CACHE_TTL_SECONDS = 60 * 60; // 1 hour
const CACHE_KEY_PREFIX = "tomorrow:weather:";

function isAerodromeEnabled(icao: string): boolean {
  const apiKey = process.env.TOMORROW_API_KEY;
  if (!apiKey) {
    return false;
  }

  const envValue = process.env.TOMORROW_ENABLED_AERODROMES || "";
  if (!envValue.trim()) {
    return true;
  }

  const enabledSet = new Set(
    envValue
      .split(",")
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean)
  );

  return enabledSet.has(icao);
}

/**
 * Fetch weather data from Tomorrow.io
 *
 * @param icao - ICAO code (for caching and enable check)
 * @param lat - Latitude
 * @param lon - Longitude
 */
export async function fetchTomorrow(
  icao: string,
  lat: number,
  lon: number
): Promise<TomorrowResult> {
  const normalizedIcao = icao.toUpperCase();

  if (!isAerodromeEnabled(normalizedIcao)) {
    return { current: null, hourly: [] };
  }

  const apiKey = process.env.TOMORROW_API_KEY!;
  const cacheKey = `${CACHE_KEY_PREFIX}${normalizedIcao}`;
  const redis = getRedis();

  // Try cache first
  const cached = await redis.get<CachedData>(cacheKey);
  if (cached) {
    return {
      current: cached.current,
      hourly: cached.hourly,
      cachedAt: cached.cachedAt,
    };
  }

  try {
    // Fetch realtime and forecast in parallel
    const [realtimeRes, forecastRes] = await Promise.all([
      fetch(
        `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&apikey=${apiKey}`,
        { headers: { Accept: "application/json" } }
      ),
      fetch(
        `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lon}&apikey=${apiKey}&timesteps=1h`,
        { headers: { Accept: "application/json" } }
      ),
    ]);

    if (!realtimeRes.ok) {
      console.error("Tomorrow.io realtime API error:", realtimeRes.status);
      return { current: null, hourly: [] };
    }

    const realtimeData: TomorrowRealtimeResponse = await realtimeRes.json();
    const now = new Date().toISOString();

    let hourlyData: TomorrowTimelineItem[] = [];
    if (forecastRes.ok) {
      const forecastData: TomorrowForecastResponse = await forecastRes.json();
      hourlyData = forecastData.timelines?.hourly?.slice(0, 12) || [];
    }

    // Store in cache
    const cacheData: CachedData = {
      current: realtimeData.data.values,
      hourly: hourlyData,
      cachedAt: now,
    };
    await redis.set(cacheKey, cacheData, { ex: CACHE_TTL_SECONDS });

    return {
      current: realtimeData.data.values,
      hourly: hourlyData,
      cachedAt: now,
    };
  } catch (error) {
    console.error("Tomorrow.io fetch error:", error);
    return { current: null, hourly: [] };
  }
}
