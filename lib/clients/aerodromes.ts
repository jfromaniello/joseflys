import argentinaData from "@/data/ad-lads/argentina.json";
import airportsData from "@/data/airports.json";

export interface Aerodrome {
  type: "AD" | "LAD";
  code: string | null;
  name: string;
  lat: number;
  lon: number;
  elevation: number | null;
}

interface AerodromeData {
  version: string;
  source: string;
  generatedAt: string;
  count: {
    total: number;
    ad: number;
    lad: number;
  };
  data: Aerodrome[];
}

type AirportEntry = [string, number, number, string, number | null];

const argData = argentinaData as AerodromeData;
const globalAirports = airportsData as AirportEntry[];

export interface SearchAerodromesResult {
  count: number;
  query: string;
  data: Aerodrome[];
}

export interface BboxAerodromesResult {
  count: number;
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  filter: "AD" | "LAD" | null;
  data: Aerodrome[];
}

/**
 * Search aerodromes by code or name
 *
 * @param query - Search query (min 2 chars)
 * @param limit - Max results (default 10)
 */
export function searchAerodromes(query: string, limit = 10): SearchAerodromesResult {
  const normalizedQuery = query.toLowerCase().trim();

  if (normalizedQuery.length < 2) {
    return { count: 0, query, data: [] };
  }

  // Search Argentina data by code or name
  const argMatches = argData.data.filter((aerodrome) => {
    const codeMatch = aerodrome.code?.toLowerCase().startsWith(normalizedQuery);
    const nameMatch = aerodrome.name.toLowerCase().includes(normalizedQuery);
    return codeMatch || nameMatch;
  });

  // Search global airports by code or name
  const globalMatches = globalAirports
    .filter(([code, , , name]) => {
      const codeMatch = code.toLowerCase().startsWith(normalizedQuery);
      const nameMatch = name.toLowerCase().includes(normalizedQuery);
      return codeMatch || nameMatch;
    })
    .map(([code, lat, lon, name, elevation]) => ({
      type: "AD" as const,
      code,
      name,
      lat,
      lon,
      elevation: elevation ?? null,
    }));

  // Combine and dedupe by code (Argentina data takes priority)
  const seenCodes = new Set(argMatches.map((a) => a.code).filter(Boolean));
  const dedupedGlobal = globalMatches.filter(
    (a) => !a.code || !seenCodes.has(a.code)
  );

  // Sort: exact code matches first, then by name length
  const allMatches = [...argMatches, ...dedupedGlobal].sort((a, b) => {
    const aCodeExact = a.code?.toLowerCase() === normalizedQuery ? 0 : 1;
    const bCodeExact = b.code?.toLowerCase() === normalizedQuery ? 0 : 1;
    if (aCodeExact !== bCodeExact) return aCodeExact - bCodeExact;

    const aCodeStart = a.code?.toLowerCase().startsWith(normalizedQuery) ? 0 : 1;
    const bCodeStart = b.code?.toLowerCase().startsWith(normalizedQuery) ? 0 : 1;
    if (aCodeStart !== bCodeStart) return aCodeStart - bCodeStart;

    return a.name.length - b.name.length;
  });

  const results = allMatches.slice(0, limit);

  return {
    count: results.length,
    query,
    data: results,
  };
}

/**
 * Get aerodrome by exact code match
 *
 * @param code - ICAO/local code
 */
export function getAerodromeByCode(code: string): Aerodrome | null {
  const normalizedCode = code.toUpperCase();

  // Check Argentina data first
  const argMatch = argData.data.find(
    (a) => a.code?.toUpperCase() === normalizedCode
  );
  if (argMatch) return argMatch;

  // Check global airports
  const globalMatch = globalAirports.find(
    ([icao]) => icao.toUpperCase() === normalizedCode
  );
  if (globalMatch) {
    const [icao, lat, lon, name, elevation] = globalMatch;
    return {
      type: "AD",
      code: icao,
      name,
      lat,
      lon,
      elevation: elevation ?? null,
    };
  }

  return null;
}

/**
 * Get aerodromes in a bounding box
 */
export function getAerodromesByBbox(
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number,
  typeFilter?: "AD" | "LAD"
): BboxAerodromesResult {
  // Filter Argentina data
  const argResults = argData.data.filter((aerodrome) => {
    const inBounds =
      aerodrome.lat >= minLat &&
      aerodrome.lat <= maxLat &&
      aerodrome.lon >= minLon &&
      aerodrome.lon <= maxLon;

    if (!inBounds) return false;
    if (typeFilter && aerodrome.type !== typeFilter) return false;

    return true;
  });

  // Filter global airports
  const globalResults: Aerodrome[] =
    typeFilter === "LAD"
      ? []
      : globalAirports
          .filter(
            ([, lat, lon]) =>
              lat >= minLat &&
              lat <= maxLat &&
              lon >= minLon &&
              lon <= maxLon
          )
          .map(([code, lat, lon, name, elevation]) => ({
            type: "AD" as const,
            code,
            name,
            lat,
            lon,
            elevation: elevation ?? null,
          }));

  const results = [...argResults, ...globalResults];

  return {
    count: results.length,
    bounds: { minLat, maxLat, minLon, maxLon },
    filter: typeFilter ?? null,
    data: results,
  };
}
