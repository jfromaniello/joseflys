import runwaysData from "@/data/runways.json";

interface RunwayEnd {
  id: string;
  lat?: number;
  lon?: number;
  elev?: number;
  hdg?: number;
  dt?: number;
}

interface RawRunway {
  l?: number;
  w?: number;
  s?: string;
  lit?: number;
  cls?: number;
  le?: RunwayEnd;
  he?: RunwayEnd;
}

export interface RunwayResponse {
  id: string;
  length: number;
  width: number;
  surface: string;
  surfaceName: string;
  lighted: boolean;
  closed: boolean;
  ends: {
    id: string;
    heading: number | null;
    elevation: number | null;
    displacedThreshold: number;
    lat: number | null;
    lon: number | null;
  }[];
}

export interface RunwaysResult {
  icao: string;
  count: number;
  runways: RunwayResponse[];
}

const SURFACE_NAMES: Record<string, string> = {
  PG: "Pavement",
  PP: "Pavement (Poor)",
  GG: "Grass",
  GF: "Grass (Fair)",
  GV: "Gravel",
  DT: "Dirt",
  SD: "Sand",
  WT: "Water",
};

/**
 * Estimate heading from runway ID if not provided
 */
function estimateHeading(id: string): number | null {
  const match = id.match(/^(\d+)/);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  if (num < 1 || num > 36) return null;
  return num * 10;
}

/**
 * Get runways for an airport
 *
 * @param icao - ICAO code (e.g., "SABE")
 */
export function getRunways(icao: string): RunwaysResult {
  const normalizedIcao = icao.toUpperCase();
  const data = runwaysData as Record<string, RawRunway[]>;
  const runways = data[normalizedIcao];

  if (!runways || runways.length === 0) {
    return {
      icao: normalizedIcao,
      count: 0,
      runways: [],
    };
  }

  const formatted: RunwayResponse[] = runways
    .filter((rwy) => !rwy.cls && rwy.le && rwy.l)
    .map((rwy) => {
      const ends: RunwayResponse["ends"] = [];

      ends.push({
        id: rwy.le!.id,
        heading: rwy.le!.hdg ?? estimateHeading(rwy.le!.id),
        elevation: rwy.le!.elev ?? null,
        displacedThreshold: rwy.le!.dt ?? 0,
        lat: rwy.le!.lat ?? null,
        lon: rwy.le!.lon ?? null,
      });

      if (rwy.he) {
        ends.push({
          id: rwy.he.id,
          heading: rwy.he.hdg ?? estimateHeading(rwy.he.id),
          elevation: rwy.he.elev ?? null,
          displacedThreshold: rwy.he.dt ?? 0,
          lat: rwy.he.lat ?? null,
          lon: rwy.he.lon ?? null,
        });
      }

      const id =
        ends.length === 2
          ? `${ends[0].id}/${ends[1].id}`
          : ends[0]?.id ?? "Unknown";

      return {
        id,
        length: rwy.l!,
        width: rwy.w ?? 0,
        surface: rwy.s || "UNK",
        surfaceName: rwy.s ? (SURFACE_NAMES[rwy.s] || rwy.s) : "Unknown",
        lighted: rwy.lit === 1,
        closed: rwy.cls === 1,
        ends,
      };
    });

  return {
    icao: normalizedIcao,
    count: formatted.length,
    runways: formatted,
  };
}
