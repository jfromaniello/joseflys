import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getRedis } from "@/lib/redis";

const CACHE_KEY_PREFIX = "aerodrome-description:";
const CACHE_TTL = 60 * 60 * 24 * 60; // 60 days

// Check if OpenAI is configured
const OPENAI_ENABLED = !!process.env.OPENAI_API_KEY;

interface RunwayEnd {
  id: string;
  heading: number | null;
}

interface RunwayData {
  id: string;
  length: number;
  width: number;
  surface: string;
  surfaceName: string;
  lighted: boolean;
  closed: boolean;
  ends: RunwayEnd[];
}

interface DescriptionRequest {
  code: string;
  name: string;
  type: "AD" | "LA" | "LAD";
  lat: number;
  lon: number;
  elevation: number | null;
  runways: RunwayData[];
}

function buildPrompt(data: DescriptionRequest): string {
  const parts: string[] = [];

  parts.push(`Aerodrome: ${data.name} (${data.code})`);
  parts.push(`Type: ${data.type === "AD" ? "Aerodrome" : "Landing Area"}`);
  parts.push(`Coordinates: ${data.lat.toFixed(4)}°, ${data.lon.toFixed(4)}°`);

  if (data.elevation !== null) {
    parts.push(`Elevation: ${data.elevation} ft MSL`);
  }

  if (data.runways.length > 0) {
    parts.push(`\nRunways (${data.runways.length}):`);
    data.runways.forEach((rwy) => {
      const headings = rwy.ends
        .filter(e => e.heading !== null)
        .map(e => `${e.id}: ${Math.round(e.heading!)}°`)
        .join(", ");

      parts.push(`- ${rwy.id}: ${rwy.length.toLocaleString()} x ${rwy.width} ft`);
      parts.push(`  Surface: ${rwy.surfaceName || rwy.surface}`);
      parts.push(`  Headings: ${headings}`);
      if (rwy.lighted) parts.push(`  Lighting: Yes`);
      if (rwy.closed) parts.push(`  Status: CLOSED`);
    });
  } else {
    parts.push(`\nNo runway data available.`);
  }

  return parts.join("\n");
}

const SYSTEM_PROMPT = `You are an aviation expert writing brief, informative descriptions of aerodromes for pilots.

Write a 2-4 paragraph description (max 200 words total) about this aerodrome in English. Include:

1. **Location & Character**: Where it's located, general environment (urban, rural, coastal, mountain, etc.), and what type of operations it typically supports (general aviation, training, recreational, commercial, military, etc.)

2. **Runway Information**: Mention the runway orientation, surface type, length suitability (suitable for light aircraft, capable of handling larger aircraft, etc.). If there are multiple runways, briefly describe the options.

3. **Notable Features**: Any relevant characteristics based on the data - elevation considerations for density altitude, runway alignment with prevailing winds, lighting availability for night operations, etc.

Guidelines:
- Write in a professional but accessible tone
- Be factual based on the data provided
- Don't speculate about things not in the data (like nearby terrain, obstacles, or services)
- Don't include disclaimers or caveats
- Don't mention checking NOTAMs or other sources
- Use aviation terminology appropriately
- If elevation is high (>4000 ft), mention density altitude considerations
- If it's a Landing Area (LA) vs Aerodrome (AD), note it may have limited facilities`;

export async function POST(request: NextRequest) {
  if (!OPENAI_ENABLED) {
    return NextResponse.json(
      { error: "OpenAI not configured" },
      { status: 503 }
    );
  }

  try {
    const data: DescriptionRequest = await request.json();

    if (!data.code) {
      return NextResponse.json(
        { error: "code is required" },
        { status: 400 }
      );
    }

    const redis = getRedis();
    const cacheKey = `${CACHE_KEY_PREFIX}${data.code}`;

    // Check cache first
    const cached = await redis.get<{ description: string; generatedAt: string }>(cacheKey);
    if (cached) {
      console.log(`[Aerodrome Description] Cache hit for ${data.code}`);
      return NextResponse.json({
        description: cached.description,
        generatedAt: cached.generatedAt,
        cached: true,
      });
    }

    // Build the prompt with all available data
    const userPrompt = buildPrompt(data);
    console.log(`[Aerodrome Description] Generating for ${data.code}`);

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
      max_tokens: 400,
      temperature: 0.7,
    });

    const description = completion.choices[0]?.message?.content || "Unable to generate description.";
    const generatedAt = new Date().toISOString();

    // Cache the result for 60 days
    await redis.set(cacheKey, { description, generatedAt }, { ex: CACHE_TTL });
    console.log(`[Aerodrome Description] Cached for ${data.code} (${CACHE_TTL}s = 60 days)`);

    return NextResponse.json({
      description,
      generatedAt,
      cached: false,
    });
  } catch (error) {
    console.error("[Aerodrome Description] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate description" },
      { status: 500 }
    );
  }
}
