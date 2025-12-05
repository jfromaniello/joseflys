import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

interface TomorrowValues {
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

interface TomorrowTimelineItem {
  time: string;
  values: TomorrowValues;
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

// Cache TTL: 1 hour
const CACHE_TTL_SECONDS = 60 * 60;
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const icao = searchParams.get("icao")?.toUpperCase();
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

  if (!isAerodromeEnabled(icao)) {
    return NextResponse.json({ data: null });
  }

  const apiKey = process.env.TOMORROW_API_KEY!;
  const cacheKey = `${CACHE_KEY_PREFIX}${icao}`;

  try {
    const redis = getRedis();

    // Try to get from cache
    const cached = await redis.get<CachedData>(cacheKey);
    if (cached) {
      return NextResponse.json({
        current: cached.current,
        hourly: cached.hourly,
        cachedAt: cached.cachedAt,
      });
    }

    // Fetch realtime and forecast in parallel
    const [realtimeRes, forecastRes] = await Promise.all([
      fetch(
        `https://api.tomorrow.io/v4/weather/realtime?location=${latitude},${longitude}&apikey=${apiKey}`,
        { headers: { Accept: "application/json" } }
      ),
      fetch(
        `https://api.tomorrow.io/v4/weather/forecast?location=${latitude},${longitude}&apikey=${apiKey}&timesteps=1h`,
        { headers: { Accept: "application/json" } }
      ),
    ]);

    if (!realtimeRes.ok) {
      console.error("Tomorrow.io realtime API error:", realtimeRes.status);
      return NextResponse.json({ data: null });
    }

    const realtimeData: TomorrowRealtimeResponse = await realtimeRes.json();
    const now = new Date().toISOString();

    let hourlyData: TomorrowTimelineItem[] = [];
    if (forecastRes.ok) {
      const forecastData: TomorrowForecastResponse = await forecastRes.json();
      // Get next 12 hours
      hourlyData = forecastData.timelines?.hourly?.slice(0, 12) || [];
    }

    // Store in cache
    const cacheData: CachedData = {
      current: realtimeData.data.values,
      hourly: hourlyData,
      cachedAt: now,
    };
    await redis.set(cacheKey, cacheData, { ex: CACHE_TTL_SECONDS });

    return NextResponse.json({
      current: realtimeData.data.values,
      hourly: hourlyData,
      cachedAt: now,
    });
  } catch (error) {
    console.error("Tomorrow.io fetch error:", error);
    return NextResponse.json({ data: null });
  }
}
