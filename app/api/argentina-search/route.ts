import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import argentinaData from "@/data/ad-lads/argentina.json";
import nearbyFeaturesData from "@/data/nearby_features.json";

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

// Types
interface Runway {
  heading1: number;
  heading2: number;
  dimensions: string;
  length: number;
  width: number;
}

interface Aerodrome {
  type: "AD" | "LAD" | "HELIPORT" | "LADH";
  code: string | null;
  name: string;
  lat: number;
  lon: number;
  elevation: number | null;
  province?: string | null;
  surface?: string | null;
  runways?: Runway[];
}

interface NearbyFeature {
  aerodrome_id: number;
  feature_type: string;
  distance_km: number;
}

const FEATURE_TYPES = ["river", "lake", "coast", "highway", "mountain"] as const;
type FeatureType = (typeof FEATURE_TYPES)[number];

// Load data
const aerodromes = (argentinaData as { data: Aerodrome[] }).data;
const nearbyFeatures = nearbyFeaturesData as NearbyFeature[];

// Build aerodrome ID lookup (by lat/lon since argentina.json doesn't have IDs)
const aerodromeIdMap = new Map<string, number>();
aerodromes.forEach((a, idx) => {
  aerodromeIdMap.set(`${a.lat.toFixed(4)},${a.lon.toFixed(4)}`, idx);
});

interface ParsedQuery {
  features: { type: FeatureType; maxDistanceKm: number }[];
  provinceOrRegion?: string;
  aerodromeType?: "AD" | "LAD";
  surface?: string;
  minRunwayLength?: number;
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

Available surface types (runway surfaces):
- ASFALTO: paved/asphalt runways
- TIERRA: dirt/earth runways
- CESPED: grass runways
- GRAVA: gravel runways
- CONCRETO: concrete runways

Respond with JSON only, no markdown:
{
  "features": [
    { "type": "river", "maxDistanceKm": 10 }
  ],
  "provinceOrRegion": null,
  "aerodromeType": null,
  "surface": null,
  "minRunwayLength": null,
  "explanation": "Brief explanation in Spanish"
}

Rules:
- Default maxDistanceKm is 10 if not specified
- provinceOrRegion: use region name (lowercase) or province name (as listed above), or null
- aerodromeType can be "AD" (aeródromo oficial), "LAD" (lugar apto denunciado), or null (both)
- surface: use one of the surface types listed above (ASFALTO, TIERRA, CESPED, GRAVA, CONCRETO), or null
- minRunwayLength: minimum runway length in meters if specified (e.g., 1000 for "pistas de más de 1000 metros"), or null
- If query doesn't match any feature or location, return empty features array and null provinceOrRegion
- Keep explanation brief (max 20 words)

Surface interpretations:
- "asfalto", "pavimentada", "paved", "asfaltada" → surface: "ASFALTO"
- "tierra", "dirt", "natural" → surface: "TIERRA"
- "césped", "pasto", "grass" → surface: "CESPED"
- "grava", "gravel", "ripio" → surface: "GRAVA"
- "concreto", "hormigón", "concrete" → surface: "CONCRETO"

Runway length interpretations:
- "pista larga", "pista grande" → minRunwayLength: 1500
- "pista corta" → no minRunwayLength filter (or max 800)
- "más de X metros" → minRunwayLength: X

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
"pistas de asfalto en la pampa" → provinceOrRegion: "La Pampa", surface: "ASFALTO"
"LADs de tierra en Córdoba" → provinceOrRegion: "Córdoba", aerodromeType: "LAD", surface: "TIERRA"
"pistas largas en Buenos Aires" → provinceOrRegion: "Buenos Aires", minRunwayLength: 1500
"aeródromos pavimentados cerca de lagos" → surface: "ASFALTO", features: [{type: "lake", maxDistanceKm: 10}]
"pistas de más de 2000 metros en la patagonia" → provinceOrRegion: "patagonia", minRunwayLength: 2000`;

const VALID_SURFACES = ["ASFALTO", "TIERRA", "CESPED", "GRAVA", "CONCRETO"];

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

    // Validate surface
    let surface: string | undefined;
    if (parsed.surface && VALID_SURFACES.includes(parsed.surface)) {
      surface = parsed.surface;
    }

    // Validate minRunwayLength
    let minRunwayLength: number | undefined;
    if (typeof parsed.minRunwayLength === "number" && parsed.minRunwayLength > 0) {
      minRunwayLength = parsed.minRunwayLength;
    }

    return {
      features: validFeatures,
      provinceOrRegion,
      aerodromeType: parsed.aerodromeType === "AD" || parsed.aerodromeType === "LAD"
        ? parsed.aerodromeType
        : undefined,
      surface,
      minRunwayLength,
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

// Region mappings
const REGION_PROVINCES: Record<string, string[]> = {
  patagonia: ["Neuquén", "Río Negro", "Chubut", "Santa Cruz", "Tierra del Fuego"],
  cuyo: ["Mendoza", "San Juan", "San Luis"],
  noa: ["Jujuy", "Salta", "Tucumán", "Catamarca", "Santiago del Estero"],
  nea: ["Misiones", "Corrientes", "Chaco", "Formosa"],
  pampeana: ["Buenos Aires", "CABA", "Córdoba", "Santa Fe", "La Pampa", "Entre Ríos"],
  litoral: ["Entre Ríos", "Corrientes", "Misiones", "Santa Fe"],
};

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

    // Start with all aerodromes (only AD and LAD, not heliports)
    let results = aerodromes.filter(a => a.type === "AD" || a.type === "LAD");

    // Filter by aerodrome type
    if (parsed.aerodromeType) {
      results = results.filter(a => a.type === parsed.aerodromeType);
    }

    // Filter by province/region
    if (parsed.provinceOrRegion) {
      const regionKey = parsed.provinceOrRegion.toLowerCase();
      const provinces = REGION_PROVINCES[regionKey];

      if (provinces) {
        results = results.filter(a => a.province && provinces.includes(a.province));
      } else {
        const searchLower = parsed.provinceOrRegion.toLowerCase();
        results = results.filter(a =>
          a.province && a.province.toLowerCase().includes(searchLower)
        );
      }
    }

    // Filter by surface
    if (parsed.surface) {
      results = results.filter(a => a.surface === parsed.surface);
    }

    // Filter by minimum runway length
    if (parsed.minRunwayLength) {
      results = results.filter(a =>
        a.runways && a.runways.some(r => r.length >= parsed.minRunwayLength!)
      );
    }

    // Filter by geographic features (uses nearbyFeatures which references aerodromes.json IDs)
    // We need to match by lat/lon since argentina.json doesn't have IDs
    if (parsed.features.length > 0) {
      // Build a set of aerodrome IDs from nearbyFeatures that match ALL criteria
      const matchingSets = parsed.features.map(f => {
        const ids = new Set<number>();
        for (const nf of nearbyFeatures) {
          if (nf.feature_type === f.type && nf.distance_km <= f.maxDistanceKm) {
            ids.add(nf.aerodrome_id);
          }
        }
        return ids;
      });

      // Intersect all sets
      const matchingIds = matchingSets.reduce((acc, set) => {
        return new Set([...acc].filter(id => set.has(id)));
      });

      // Now we need to match these IDs to our argentina.json data
      // Load aerodromes.json to get lat/lon for matching
      const aerodromesJson = await import("@/data/aerodromes.json");
      const aerodromesById = new Map<number, { lat: number; lon: number }>();
      for (const a of aerodromesJson.default as { id: number; lat: number; lon: number }[]) {
        aerodromesById.set(a.id, { lat: a.lat, lon: a.lon });
      }

      // Filter results to only those whose lat/lon matches a matching ID
      results = results.filter(a => {
        for (const id of matchingIds) {
          const match = aerodromesById.get(id);
          if (match && Math.abs(match.lat - a.lat) < 0.001 && Math.abs(match.lon - a.lon) < 0.001) {
            return true;
          }
        }
        return false;
      });
    }

    return NextResponse.json({
      query,
      parsed: {
        features: parsed.features,
        provinceOrRegion: parsed.provinceOrRegion,
        aerodromeType: parsed.aerodromeType,
        surface: parsed.surface,
        minRunwayLength: parsed.minRunwayLength,
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
