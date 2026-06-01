/**
 * Resolves the aerodrome nearest a coordinate for replay circuit analysis,
 * normalizing across data sources into {@link PatternAerodrome}.
 *
 * Source priority:
 *  1. ANAC (Argentina) — field reference, elevation, runways parsed from the AIP
 *     text, and the published circuit turn side parsed from the norms.
 *  2. Global dataset (`airports.json` + `runways.json`) — used as a fallback
 *     outside ANAC coverage; runway headings there are already true.
 *
 * Runs server-side only (the ANAC detail file is ~700 KB); the replay client
 * fetches the small normalized result via an API route.
 */

import { magvar } from "magvar";
import airportsData from "@/data/airports.json";
import runwaysData from "@/data/runways.json";
import anacDetails from "@/data/anac-details.json";
import type { AnacAerodromeDetail } from "@/lib/clients/anac";
import { parseAnacRunways } from "@/lib/clients/anac";
import type { PatternAerodrome, PatternRunwayEnd } from "@/app/replay/patternAnalysis";

const METERS_TO_FEET = 3.28084;
/** Max distance from the query point to still count as "this flight's field". */
const MAX_FIELD_DISTANCE_KM = 5;

const norm360 = (d: number) => ((d % 360) + 360) % 360;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Spanish/English cardinal & intercardinal directions → degrees. */
const DIRECTION_DEGREES: Record<string, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SO: 225,
  SW: 225,
  O: 270,
  W: 270,
  NO: 315,
  NW: 315,
};

/**
 * Parses the published circuit turn direction from the ANAC particular norms,
 * e.g. "Los virajes se efectuarán al NW del RCL 05/23" → 315. Returns null when
 * no such phrasing is found.
 */
export function parsePublishedTurnDirection(norms: string | null): number | null {
  if (!norms) return null;
  const match = norms.match(/viraj\w*[^.]*?\bal\s+(NE|NO|NW|SE|SO|SW|N|S|E|O|W)\b/i);
  if (!match) return null;
  const dir = match[1].toUpperCase();
  return dir in DIRECTION_DEGREES ? DIRECTION_DEGREES[dir] : null;
}

/** Finds the nearest ANAC aerodrome to a point, within the field radius. */
function resolveFromAnac(lat: number, lon: number): PatternAerodrome | null {
  const details = anacDetails as Record<string, AnacAerodromeDetail>;
  let best: AnacAerodromeDetail | null = null;
  let bestKm = MAX_FIELD_DISTANCE_KM;

  for (const detail of Object.values(details)) {
    if (detail.lat == null || detail.lon == null) continue;
    const km = haversineKm(lat, lon, detail.lat, detail.lon);
    if (km < bestKm) {
      bestKm = km;
      best = detail;
    }
  }
  if (!best || best.lat == null || best.lon == null) return null;

  const declination = magvar(best.lat, best.lon, 0);
  const parsed = parseAnacRunways(best);

  const runwayEnds: PatternRunwayEnd[] = [];
  for (const rwy of parsed) {
    for (const end of rwy.ends) {
      if (end.heading == null) continue;
      // ANAC headings are the magnetic designator (×10) → convert to true.
      runwayEnds.push({
        id: end.id,
        headingTrueDeg: norm360(end.heading + declination),
        thresholdLat: null,
        thresholdLon: null,
      });
    }
  }
  if (runwayEnds.length === 0) return null;

  const lengthFt = parsed[0]?.length ?? null;

  return {
    source: "anac",
    code: best.icao ?? best.local,
    name: best.name,
    lat: best.lat,
    lon: best.lon,
    elevationFt: best.elevation != null ? best.elevation * METERS_TO_FEET : 0,
    runwayEnds,
    lengthFt,
    publishedTurnDirectionDeg: parsePublishedTurnDirection(best.norms_particular),
  };
}

type AirportRow = [ident: string, lat: number, lon: number, name: string, elevationFt: number];
interface RawRunwayEnd {
  id: string;
  lat?: number;
  lon?: number;
  elev?: number;
  hdg?: number;
}
interface RawRunway {
  l?: number;
  le?: RawRunwayEnd;
  he?: RawRunwayEnd;
}

/** Fallback: nearest airport in the global dataset (runway headings are true). */
function resolveFromGlobal(lat: number, lon: number): PatternAerodrome | null {
  const airports = airportsData as AirportRow[];
  const runways = runwaysData as Record<string, RawRunway[]>;

  let best: AirportRow | null = null;
  let bestKm = MAX_FIELD_DISTANCE_KM;
  for (const row of airports) {
    const km = haversineKm(lat, lon, row[1], row[2]);
    if (km < bestKm) {
      bestKm = km;
      best = row;
    }
  }
  if (!best) return null;

  const [ident, aLat, aLon, name, elevationFt] = best;
  const rwys = runways[ident];
  if (!rwys || rwys.length === 0) return null;

  const runwayEnds: PatternRunwayEnd[] = [];
  let lengthFt: number | null = null;
  for (const rwy of rwys) {
    if (rwy.l != null) lengthFt = rwy.l;
    for (const end of [rwy.le, rwy.he]) {
      if (!end || end.hdg == null) continue;
      runwayEnds.push({
        id: end.id,
        headingTrueDeg: norm360(end.hdg),
        thresholdLat: end.lat ?? null,
        thresholdLon: end.lon ?? null,
      });
    }
  }
  if (runwayEnds.length === 0) return null;

  return {
    source: "global",
    code: ident,
    name,
    lat: aLat,
    lon: aLon,
    elevationFt,
    runwayEnds,
    lengthFt,
    publishedTurnDirectionDeg: null,
  };
}

/**
 * Resolves the aerodrome nearest `(lat, lon)`, trying ANAC first and falling
 * back to the global dataset. Returns null when nothing is within range or the
 * nearest field has no usable runway data.
 */
export function resolveAerodrome(lat: number, lon: number): PatternAerodrome | null {
  return resolveFromAnac(lat, lon) ?? resolveFromGlobal(lat, lon);
}
