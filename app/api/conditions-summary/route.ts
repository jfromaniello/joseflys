import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getRedis } from "@/lib/redis";

const CACHE_KEY_PREFIX = "conditions-summary:";
const CACHE_TTL = 60 * 60; // 1 hour

// Check if OpenAI is configured
const OPENAI_ENABLED = !!process.env.OPENAI_API_KEY;

interface SummaryRequest {
  aerodromeCode: string;
  aerodrome?: {
    name: string;
    type: string;
    elevation: number | null;
    lat: number;
    lon: number;
  } | null;
  metar?: {
    rawOb: string;
    temp: number | null;
    dewp: number | null;
    wdir: number | null;
    wspd: number | null;
    wgst: number | null;
    altim: number | null;
    visib: string | null;
    fltCat: string | null;
  } | null;
  taf?: {
    rawTAF: string;
  } | null;
  runways?: Array<{
    id: string;
    length: number;
    width: number;
    surface: string;
    lighted: boolean;
    closed: boolean;
  }>;
  recommendedRunway?: {
    endId: string;
    headwind: number;
    crosswind: number;
  } | null;
  notams?: Array<{
    keyword: string;
    traditionalMessageFrom4thWord: string;
  }>;
  weather?: {
    temperature?: number;
    humidity?: number;
    windSpeed?: number;
    windDirection?: number;
    cloudCover?: number;
    visibility?: number;
  } | null;
  sunTimes?: {
    civilDawn: string;
    sunrise: string;
    sunset: string;
    civilDusk: string;
    isVfrLegal: boolean;
    phase: "night" | "civil-twilight" | "day";
  } | null;
}

function buildPrompt(data: SummaryRequest): string {
  const parts: string[] = [];

  // Airport info
  if (data.aerodrome) {
    parts.push(`Airport: ${data.aerodrome.name} (${data.aerodromeCode})`);
    parts.push(`Type: ${data.aerodrome.type === "AD" ? "Aerodrome" : "Landing Area"}`);
    if (data.aerodrome.elevation !== null) {
      parts.push(`Elevation: ${data.aerodrome.elevation} ft`);
    }
  } else {
    parts.push(`Airport: ${data.aerodromeCode}`);
  }

  // METAR
  if (data.metar) {
    parts.push(`\nCurrent METAR:\n${data.metar.rawOb}`);
    parts.push(`Flight Category: ${data.metar.fltCat || "Unknown"}`);
  }

  // TAF
  if (data.taf) {
    parts.push(`\nTAF Forecast:\n${data.taf.rawTAF}`);
  }

  // Runways
  if (data.runways && data.runways.length > 0) {
    parts.push(`\nRunways:`);
    data.runways.forEach((rwy) => {
      const status = rwy.closed ? " (CLOSED)" : "";
      parts.push(`- ${rwy.id}: ${rwy.length}x${rwy.width} ft, ${rwy.surface}${rwy.lighted ? ", lighted" : ""}${status}`);
    });
  }

  // Recommended runway
  if (data.recommendedRunway) {
    parts.push(`\nRecommended Runway: ${data.recommendedRunway.endId}`);
    parts.push(`- Headwind: ${data.recommendedRunway.headwind} kt`);
    parts.push(`- Crosswind: ${data.recommendedRunway.crosswind} kt`);
  }

  // NOTAMs
  if (data.notams && data.notams.length > 0) {
    parts.push(`\nActive NOTAMs (${data.notams.length}):`);
    data.notams.slice(0, 10).forEach((notam) => {
      parts.push(`- [${notam.keyword}] ${notam.traditionalMessageFrom4thWord?.substring(0, 100)}...`);
    });
    if (data.notams.length > 10) {
      parts.push(`... and ${data.notams.length - 10} more`);
    }
  }

  // Additional weather
  if (data.weather) {
    parts.push(`\nForecast Weather:`);
    if (data.weather.temperature !== undefined) parts.push(`- Temperature: ${data.weather.temperature}°C`);
    if (data.weather.humidity !== undefined) parts.push(`- Humidity: ${data.weather.humidity}%`);
    if (data.weather.cloudCover !== undefined) parts.push(`- Cloud Cover: ${data.weather.cloudCover}%`);
    if (data.weather.visibility !== undefined) parts.push(`- Visibility: ${data.weather.visibility} km`);
  }

  // Sun times and VFR legality
  if (data.sunTimes) {
    const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    parts.push(`\nSun Times (Local):`);
    parts.push(`- Civil Dawn: ${formatTime(data.sunTimes.civilDawn)} (VFR begins)`);
    parts.push(`- Sunrise: ${formatTime(data.sunTimes.sunrise)}`);
    parts.push(`- Sunset: ${formatTime(data.sunTimes.sunset)}`);
    parts.push(`- Civil Dusk: ${formatTime(data.sunTimes.civilDusk)} (VFR ends)`);
    parts.push(`- Current Phase: ${data.sunTimes.phase}`);
    parts.push(`- VFR Legal: ${data.sunTimes.isVfrLegal ? "Yes" : "No (night operations)"}`);
  }

  return parts.join("\n");
}

const SYSTEM_PROMPT = `You are an experienced flight instructor and aviation weather briefer. Your task is to provide a concise, pilot-focused briefing based on the airport conditions data provided.

Structure your response in these sections:
1. **Weather Summary** - Current conditions in plain language (flight category, visibility, ceiling, winds)
2. **Key Concerns** - Any weather hazards, NOTAMs affecting operations, runway closures, or night/twilight considerations
3. **Recommendation** - Brief operational advice (best runway, suggested approach, any cautions)

Guidelines:
- Be concise and actionable (max 150 words total)
- Use aviation terminology appropriately but remain accessible
- Highlight any safety-critical information first
- If it's night or civil twilight, prominently mention VFR restrictions and when VFR operations can resume/must end
- If the runway is not lighted but it's dark, warn about this
- If conditions are VFR during daytime with no significant concerns, keep it brief
- If there are IFR conditions, crosswind concerns, night operations, or active NOTAMs, provide more detail
- End with a short, encouraging note if conditions are good

Do NOT include:
- Technical METAR/TAF decoding (the pilot can read the raw data)
- Repetition of exact numbers already shown in the data
- Disclaimers about checking official sources (assumed)`;

export async function POST(request: NextRequest) {
  if (!OPENAI_ENABLED) {
    return NextResponse.json(
      { error: "OpenAI not configured" },
      { status: 503 }
    );
  }

  try {
    const data: SummaryRequest = await request.json();

    if (!data.aerodromeCode) {
      return NextResponse.json(
        { error: "aerodromeCode is required" },
        { status: 400 }
      );
    }

    const redis = getRedis();
    const cacheKey = `${CACHE_KEY_PREFIX}${data.aerodromeCode}`;

    // Check cache first
    const cached = await redis.get<{ summary: string; generatedAt: string }>(cacheKey);
    if (cached) {
      console.log(`[AI Summary] Cache hit for ${data.aerodromeCode}`);
      return NextResponse.json({
        summary: cached.summary,
        generatedAt: cached.generatedAt,
        cached: true,
      });
    }

    // Build the prompt with all available data
    const userPrompt = buildPrompt(data);
    console.log(`[AI Summary] Generating for ${data.aerodromeCode}`);

    // Call OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const summary = completion.choices[0]?.message?.content || "Unable to generate summary.";
    const generatedAt = new Date().toISOString();

    // Cache the result
    await redis.set(cacheKey, { summary, generatedAt }, { ex: CACHE_TTL });
    console.log(`[AI Summary] Cached for ${data.aerodromeCode} (${CACHE_TTL}s)`);

    return NextResponse.json({
      summary,
      generatedAt,
      cached: false,
    });
  } catch (error) {
    console.error("[AI Summary] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
