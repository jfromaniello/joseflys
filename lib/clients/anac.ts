import anacMapping from "@/data/anac-mapping.json";
import anacDetails from "@/data/anac-details.json";
import type { RunwayResponse } from "./runways";

export interface AnacAerodromeDetail {
  local: string;
  icao: string | null;
  iata: string | null;
  name: string;
  type: string;
  lat: number | null;
  lon: number | null;
  elevation: number | null;
  city: string | null;
  province: string | null;
  region: string | null;
  fir: string | null;
  control: string | null;
  condition: string | null;
  traffic: string | null;
  runways: string[];
  telephone: string[];
  fuel: string | null;
  atz: string | null;
  service_schedule: string | null;
  norms_general: string | null;
  norms_particular: string | null;
}

/**
 * Map ICAO code to local ANAC code
 */
export function getLocalCodeFromIcao(icao: string): string | null {
  const normalized = icao.toUpperCase();
  return (anacMapping as Record<string, string>)[normalized] || null;
}

/**
 * Get ANAC aerodrome details by local code
 */
export function getAnacDetails(localCode: string): AnacAerodromeDetail | null {
  const normalized = localCode.toUpperCase();
  const detail = (anacDetails as Record<string, AnacAerodromeDetail>)[normalized];
  return detail || null;
}

/**
 * Get ANAC aerodrome details by any code (ICAO or local)
 * Returns the local code and details
 */
export function resolveAnacAerodrome(
  code: string
): { localCode: string; details: AnacAerodromeDetail } | null {
  const normalized = code.toUpperCase();

  // First try as local code
  let localCode: string | null = normalized;
  let details = getAnacDetails(localCode);

  // If not found, try as ICAO
  if (!details) {
    localCode = getLocalCodeFromIcao(normalized);
    if (localCode) {
      details = getAnacDetails(localCode);
    }
  }

  if (!details || !localCode) {
    return null;
  }

  return { localCode, details };
}

/**
 * Search ANAC aerodromes by name or code
 */
export function searchAnacAerodromes(query: string): AnacAerodromeDetail[] {
  const normalized = query.toLowerCase().trim();
  if (normalized.length < 2) return [];

  const details = anacDetails as Record<string, AnacAerodromeDetail>;
  const results: AnacAerodromeDetail[] = [];

  for (const detail of Object.values(details)) {
    const nameMatch = detail.name.toLowerCase().includes(normalized);
    const localMatch = detail.local.toLowerCase().includes(normalized);
    const icaoMatch = detail.icao?.toLowerCase().includes(normalized);
    const iataMatch = detail.iata?.toLowerCase().includes(normalized);

    if (nameMatch || localMatch || icaoMatch || iataMatch) {
      results.push(detail);
    }
  }

  return results.slice(0, 10);
}

/**
 * Parse ANAC runway strings into RunwayResponse format
 *
 * ANAC format: "15/33 1076x29 M - Tierra."
 *  - Runway numbers: 15/33
 *  - Length: 1076 meters
 *  - Width: 29 meters
 *  - Surface: Tierra (Dirt)
 */
export function parseAnacRunways(detail: AnacAerodromeDetail): RunwayResponse[] {
  const runways: RunwayResponse[] = [];

  const SURFACE_MAP: Record<string, string> = {
    "Tierra": "DT",
    "ASPH": "PG",
    "CONC": "PG",
  };

  for (const rwyString of detail.runways) {
    // Match standard format: NN/NN LLLxWWW M - Surface
    let match = rwyString.match(
      /^(\d{2})\/(\d{2})\s+(\d+)x(\d+)\s+M\s+-\s+(.+?)$/i
    );

    if (!match) {
      // Try alternate format without M: NN/NN LLLxWWW - Surface
      match = rwyString.match(
        /^(\d{2})\/(\d{2})\s+(\d+)x(\d+)\s+-\s+(.+?)$/i
      );
      if (!match) continue;
    }

    const [, end1, end2, lengthM, widthM, surfaceRaw] = match;

    // Check if closed
    const closed = /\(CLSD\)|Cerrada|Cerrado/i.test(rwyString);

    // Clean surface name
    const surfaceClean = surfaceRaw
      .replace(/\(CLSD\)/gi, "")
      .replace(/Cerrada/gi, "")
      .replace(/Cerrado/gi, "")
      .replace(/\s*-\s*.*$/, "") // Remove AUW/PCN info
      .trim();

    const surfaceCode = SURFACE_MAP[surfaceClean] || "UNK";

    // Convert meters to feet
    const length = Math.round(parseInt(lengthM, 10) * 3.28084);
    const width = Math.round(parseInt(widthM, 10) * 3.28084);

    // Calculate headings from runway numbers
    const heading1 = parseInt(end1, 10) * 10;
    const heading2 = parseInt(end2, 10) * 10;

    runways.push({
      id: `${end1}/${end2}`,
      length,
      width,
      surface: surfaceCode,
      surfaceName: surfaceClean,
      lighted: false,
      closed,
      ends: [
        {
          id: end1,
          heading: heading1,
          elevation: detail.elevation,
          displacedThreshold: 0,
          lat: detail.lat,
          lon: detail.lon,
        },
        {
          id: end2,
          heading: heading2,
          elevation: detail.elevation,
          displacedThreshold: 0,
          lat: detail.lat,
          lon: detail.lon,
        },
      ],
    });
  }

  return runways;
}
