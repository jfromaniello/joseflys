import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getDb, searchCombined, getAllAerodromes, type FeatureType, FEATURE_TYPES, REGION_PROVINCES } from "@/lib/aerodromesDb";

// Lazy initialization to avoid build-time errors
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

interface ParsedQuery {
  features: { type: FeatureType; maxDistanceKm: number }[];
  provinceOrRegion?: string;
  aerodromeType?: "AD" | "LAD";
  explanation: string;
}

const SYSTEM_PROMPT = `You are a query parser for an aerodrome search system in Argentina.

Given a natural language query in Spanish or English, extract the search criteria.

Available feature types to filter by (aerodromes near these):
- river: ríos, arroyos
- lake: lagos, lagunas, embalses
- coast: costa, mar, océano
- highway: rutas, autopistas, caminos principales
- mountain: montañas, cerros, volcanes, picos

Available provinces:
Buenos Aires, CABA, Catamarca, Chaco, Chubut, Córdoba, Corrientes, Entre Ríos, Formosa, Jujuy, La Pampa, La Rioja, Mendoza, Misiones, Neuquén, Río Negro, Salta, San Juan, San Luis, Santa Cruz, Santa Fe, Santiago del Estero, Tierra del Fuego, Tucumán

Available regions (groups of provinces):
- patagonia: Neuquén, Río Negro, Chubut, Santa Cruz, Tierra del Fuego
- cuyo: Mendoza, San Juan, San Luis
- noa (noroeste): Jujuy, Salta, Tucumán, Catamarca, Santiago del Estero
- nea (noreste): Misiones, Corrientes, Chaco, Formosa
- pampeana: Buenos Aires, CABA, Córdoba, Santa Fe, La Pampa, Entre Ríos
- litoral: Entre Ríos, Corrientes, Misiones, Santa Fe

Respond with JSON only, no markdown:
{
  "features": [
    { "type": "river", "maxDistanceKm": 10 }
  ],
  "provinceOrRegion": null,
  "aerodromeType": null,
  "explanation": "Brief explanation in Spanish"
}

Rules:
- Default maxDistanceKm is 10 if not specified
- provinceOrRegion: use region name (lowercase) or province name (as listed above), or null
- aerodromeType can be "AD" (aeródromo oficial), "LAD" (lugar apto denunciado), or null (both)
- If query doesn't match any feature or location, return empty features array and null provinceOrRegion
- Keep explanation brief (max 20 words)

Special interpretations (use your knowledge to infer features):
- "truchas", "pesca de truchas", "fly fishing" → river + mountain (ríos de montaña, típicos de trucha)
- "playa", "vacaciones de playa" → coast + lake (zonas costeras o lacustres)
- "esquí", "nieve", "ski" → mountain (zonas de montaña)
- "navegación", "náutica" → lake + coast (cuerpos de agua navegables)
- "camping", "naturaleza" → river + lake + mountain (zonas naturales)
- "aventura", "trekking" → mountain + river
- Use common sense for other activities - map them to geographic features

Examples:
"pistas cerca de un río" → features: [{type: "river", maxDistanceKm: 10}]
"aeródromos en la Patagonia" → provinceOrRegion: "patagonia", features: []
"pistas en Corrientes cerca de ríos" → provinceOrRegion: "Corrientes", features: [{type: "river", maxDistanceKm: 10}]
"LADs en el NOA" → provinceOrRegion: "noa", aerodromeType: "LAD"
"aeródromos en Mendoza para esquiar" → provinceOrRegion: "Mendoza", features: [{type: "mountain", maxDistanceKm: 15}]
"pistas para pescar truchas en la patagonia" → provinceOrRegion: "patagonia", features: [{type: "river", maxDistanceKm: 10}, {type: "mountain", maxDistanceKm: 15}]`;

async function parseQueryWithLLM(query: string): Promise<ParsedQuery> {
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: query },
    ],
    temperature: 0,
    max_tokens: 200,
  });

  const content = response.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(content);

    // Validate features
    const validFeatures = (parsed.features || []).filter(
      (f: { type: string; maxDistanceKm: number }) =>
        FEATURE_TYPES.includes(f.type as FeatureType) &&
        typeof f.maxDistanceKm === "number" &&
        f.maxDistanceKm > 0 &&
        f.maxDistanceKm <= 50
    );

    // Validate province/region
    let provinceOrRegion: string | undefined;
    if (parsed.provinceOrRegion && typeof parsed.provinceOrRegion === "string") {
      provinceOrRegion = parsed.provinceOrRegion;
    }

    return {
      features: validFeatures,
      provinceOrRegion,
      aerodromeType: parsed.aerodromeType === "AD" || parsed.aerodromeType === "LAD"
        ? parsed.aerodromeType
        : undefined,
      explanation: parsed.explanation || "Búsqueda realizada",
    };
  } catch {
    return {
      features: [],
      aerodromeType: undefined,
      explanation: "No se pudo interpretar la búsqueda",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string" || query.length < 3) {
      return NextResponse.json(
        { error: "Query must be at least 3 characters" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Parse query with LLM
    const parsed = await parseQueryWithLLM(query);

    // Initialize DB
    getDb();

    // Search based on parsed criteria
    let results;
    if (parsed.features.length === 0 && !parsed.provinceOrRegion) {
      // No filters, return all aerodromes (optionally filtered by type)
      results = getAllAerodromes();
      if (parsed.aerodromeType) {
        results = results.filter((a) => a.type === parsed.aerodromeType);
      }
    } else {
      // Use combined search
      results = searchCombined({
        features: parsed.features.length > 0
          ? parsed.features.map((f) => ({
              featureType: f.type,
              maxDistanceKm: f.maxDistanceKm,
            }))
          : undefined,
        provinceOrRegion: parsed.provinceOrRegion,
        aerodromeType: parsed.aerodromeType,
      });
    }

    return NextResponse.json({
      query,
      parsed: {
        features: parsed.features,
        provinceOrRegion: parsed.provinceOrRegion,
        aerodromeType: parsed.aerodromeType,
      },
      explanation: parsed.explanation,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
