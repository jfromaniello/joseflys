import anacMapping from "@/data/anac-mapping.json";
import anacDetails from "@/data/anac-details.json";

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
