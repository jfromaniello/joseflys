import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getRedis } from "@/lib/redis";

const CACHE_KEY_PREFIX = "trip-summary:";
const CACHE_TTL = 60 * 60 * 4; // 4 hours (trips change less frequently)

// Rate limiting
const RATE_LIMIT_KEY_PREFIX = "trip-summary-rate:";
const RATE_LIMIT_WINDOW = 60; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 requests per minute per IP

// Check if OpenAI is configured
const OPENAI_ENABLED = !!process.env.OPENAI_API_KEY;

interface LegSummary {
  index: number;
  description?: string;
  from?: string;
  to?: string;
  checkpoints?: string[];
  trueCourse: number;
  distance: number;
  trueAirspeed: number;
  wind?: { direction: number; speed: number };
  fuelFlow: number;
  fuelUnit: string;
  depTime?: string;
  // Calculated results
  groundSpeed?: number;
  compassCourse?: number | null;
  legDuration?: number;
  fuelUsed?: number;
  arrivalTime?: string | null;
  // Climb/descent data
  hasClimb?: boolean;
  hasDescent?: boolean;
  isAlternative?: boolean;
}

interface TripSummaryRequest {
  tripId: string;
  contentHash: string; // To invalidate cache when content changes
  trip: {
    name: string;
    date?: string;
    cruiseAltitude?: number;
    cruisePower?: number;
    departure?: { name: string; lat?: number; lon?: number };
    destination?: { name: string; lat?: number; lon?: number };
    alternate?: { name: string; lat?: number; lon?: number };
  };
  aircraft?: {
    name: string;
    model?: string;
  };
  legs: LegSummary[];
  totals: {
    distance: number;
    time: number; // hours
    fuel: number;
    fuelUnit: string;
    eta?: string | null;
  };
}

function buildPrompt(data: TripSummaryRequest): string {
  const parts: string[] = [];

  // Trip info
  parts.push(`Flight Plan: ${data.trip.name}`);
  if (data.trip.date) {
    parts.push(`Flight Date: ${data.trip.date}`);
  }

  // Aircraft info
  if (data.aircraft) {
    parts.push(`\nAircraft: ${data.aircraft.name}${data.aircraft.model ? ` (${data.aircraft.model})` : ""}`);
  }

  // Route overview
  if (data.trip.departure && data.trip.destination) {
    let route = `\nRoute: ${data.trip.departure.name} → ${data.trip.destination.name}`;
    if (data.trip.alternate) {
      route += ` (Alternate: ${data.trip.alternate.name})`;
    }
    parts.push(route);
  }

  // Cruise parameters
  if (data.trip.cruiseAltitude) {
    parts.push(`Cruise Altitude: ${data.trip.cruiseAltitude.toLocaleString()} ft`);
  }
  if (data.trip.cruisePower) {
    parts.push(`Cruise Power: ${data.trip.cruisePower}%`);
  }

  // Legs detail
  parts.push(`\n--- Flight Legs (${data.legs.length}) ---`);
  data.legs.forEach((leg, idx) => {
    const legNum = idx + 1;
    const altTag = leg.isAlternative ? " [ALTERNATE]" : "";
    const desc = leg.description || `Leg ${legNum}`;
    parts.push(`\nLeg ${legNum}${altTag}: ${desc}`);

    if (leg.from && leg.to) {
      let routeStr = `  Route: ${leg.from}`;
      if (leg.checkpoints && leg.checkpoints.length > 0) {
        routeStr += ` → ${leg.checkpoints.join(" → ")}`;
      }
      routeStr += ` → ${leg.to}`;
      parts.push(routeStr);
    }

    parts.push(`  True Course: ${Math.round(leg.trueCourse)}°`);
    parts.push(`  Distance: ${leg.distance.toFixed(1)} NM`);
    parts.push(`  TAS: ${leg.trueAirspeed} KT`);

    if (leg.wind) {
      parts.push(`  Wind: ${Math.round(leg.wind.direction)}°/${leg.wind.speed} KT`);
    }

    if (leg.groundSpeed) {
      parts.push(`  Ground Speed: ${Math.round(leg.groundSpeed)} KT`);
    }

    if (leg.compassCourse !== null && leg.compassCourse !== undefined) {
      parts.push(`  Compass Course: ${Math.round(leg.compassCourse)}°`);
    }

    if (leg.legDuration) {
      const mins = Math.round(leg.legDuration * 60);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      parts.push(`  Leg Time: ${h}h ${m}m`);
    }

    if (leg.fuelUsed) {
      parts.push(`  Leg Fuel: ${leg.fuelUsed.toFixed(1)} ${leg.fuelUnit.toUpperCase()}`);
    }

    if (leg.depTime && leg.arrivalTime) {
      const formatTime = (t: string) => `${t.substring(0, 2)}:${t.substring(2, 4)}`;
      parts.push(`  Time: ${formatTime(leg.depTime)} → ${formatTime(leg.arrivalTime)}`);
    }

    if (leg.hasClimb) parts.push(`  (includes climb phase)`);
    if (leg.hasDescent) parts.push(`  (includes descent/approach phase)`);
  });

  // Totals
  parts.push(`\n--- Flight Totals ---`);
  parts.push(`Total Distance: ${data.totals.distance.toFixed(1)} NM`);

  const totalMins = Math.round(data.totals.time * 60);
  const totalH = Math.floor(totalMins / 60);
  const totalM = totalMins % 60;
  parts.push(`Total Flight Time: ${totalH}h ${totalM}m`);

  parts.push(`Total Fuel Required: ${data.totals.fuel.toFixed(1)} ${data.totals.fuelUnit}`);

  if (data.totals.eta) {
    const formatTime = (t: string) => `${t.substring(0, 2)}:${t.substring(2, 4)}`;
    parts.push(`ETA at Destination: ${formatTime(data.totals.eta)}`);
  }

  return parts.join("\n");
}

const SYSTEM_PROMPT = `You are a professional aviation briefer. Create a concise, technical pre-flight summary.

Use second person, formal tone. Standard aviation terminology required.

**Formatting rules:**
- Use **bold** (markdown) for key operational data: headings, speeds, times, fuel figures
- Courses/headings: 3 digits with leading zeros (e.g., **HDG 045°**)
- Speeds: Include units (e.g., **GS 98 KT**)
- Distances: One decimal (e.g., **45.2 NM**)
- Times: 24h format (e.g., **ETD 1430**, **ETA 1615**)
- Wind: Standard format with direction reference (e.g., "270/15")

**Structure (flowing prose, no bullet points):**

1. **Route Overview** (1-2 sentences): Departure, destination, total distance, estimated flight time.

2. **Flight Profile** (2-4 sentences per leg): For each leg describe:
   - Heading to fly and expected ground speed
   - Wind conditions: where the wind is coming from relative to your track (e.g., "wind from the northwest at 15 KT will give you a left quartering headwind", "expect a direct tailwind from the south", "crosswind from your right")
   - Resulting headwind/tailwind component effect on ground speed if significant

3. **Fuel** (1 sentence): Total fuel required for the flight.

**Wind description examples:**
- "With wind from 270° and your track of 180°, expect a right crosswind component"
- "The 320/18 wind will be quartering from your left rear, providing a slight tailwind advantage"
- "Winds from the north will be nearly on the nose, reducing ground speed"

Keep it professional (max 180 words). Bold all operationally critical numbers.

Do NOT:
- Use exclamation marks or enthusiastic language
- Say "exciting", "scenic", "great day for flying"
- Use bullet points
- Add safety disclaimers`;

export async function POST(request: NextRequest) {
  if (!OPENAI_ENABLED) {
    return NextResponse.json(
      { error: "OpenAI not configured" },
      { status: 503 }
    );
  }

  try {
    const data: TripSummaryRequest = await request.json();

    if (!data.tripId || !data.contentHash) {
      return NextResponse.json(
        { error: "tripId and contentHash are required" },
        { status: 400 }
      );
    }

    if (!data.legs || data.legs.length === 0) {
      return NextResponse.json(
        { error: "At least one leg is required" },
        { status: 400 }
      );
    }

    const redis = getRedis();

    // Rate limiting by IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
               request.headers.get("x-real-ip") ||
               "unknown";
    const rateLimitKey = `${RATE_LIMIT_KEY_PREFIX}${ip}`;

    const currentCount = await redis.get<number>(rateLimitKey) || 0;
    if (currentCount >= RATE_LIMIT_MAX) {
      console.log(`[Trip Summary] Rate limited: ${ip}`);
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    // Cache key includes content hash to invalidate on changes
    const cacheKey = `${CACHE_KEY_PREFIX}${data.tripId}:${data.contentHash}`;

    // Check cache first
    const cached = await redis.get<{ summary: string; generatedAt: string }>(cacheKey);
    if (cached) {
      console.log(`[Trip Summary] Cache hit for ${data.tripId}`);
      return NextResponse.json({
        summary: cached.summary,
        generatedAt: cached.generatedAt,
        cached: true,
      });
    }

    // Increment rate limit (only for non-cached requests)
    await redis.set(rateLimitKey, currentCount + 1, { ex: RATE_LIMIT_WINDOW });

    // Build the prompt with all available data
    const userPrompt = buildPrompt(data);
    console.log(`[Trip Summary] Generating for ${data.tripId} (${data.legs.length} legs)`);

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
    console.log(`[Trip Summary] Cached for ${data.tripId} (${CACHE_TTL}s)`);

    return NextResponse.json({
      summary,
      generatedAt,
      cached: false,
    });
  } catch (error) {
    console.error("[Trip Summary] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
