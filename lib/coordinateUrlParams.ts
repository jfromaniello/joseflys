/**
 * Utilities for encoding/decoding coordinates in URL query strings
 * Supports both legacy format and compact quantized format
 *
 * TWO FORMATS SUPPORTED:
 *
 * 1. Distance Calculator Format (from + multiple destinations):
 *    from=lat~lon~name&to[0]=lat~lon~name&to[1]=lat~lon~name&s=5
 *    Used in /distance for calculating distance to multiple destinations
 *
 * 2. Leg Planner Format (from + via points + to):
 *    from=lat~lon~name&via[0]=lat~lon~name&via[1]=lat~lon~name&to=lat~lon~name&s=5
 *    Used in /leg for flight planning with intermediate waypoints
 */

const SCALE_DECIMALS = 5;
const SCALE_FACTOR = Math.pow(10, SCALE_DECIMALS);

/**
 * Quantize a coordinate to 5 decimal places and convert to integer
 * Example: 30.710734 → 3071073
 */
export function quantizeCoordinate(coord: number): number {
  return Math.round(coord * SCALE_FACTOR);
}

/**
 * Dequantize an integer back to decimal coordinate
 * Example: 3071073 → 30.71073
 */
export function dequantizeCoordinate(quantized: number): number {
  return quantized / SCALE_FACTOR;
}

/**
 * Location with coordinates and optional name
 */
export interface LocationData {
  lat: number;
  lon: number;
  name?: string;
}

/**
 * Parse a compact coordinate string: "lat~lon~name" or "lat~lon"
 * Supports scale factor for quantized coordinates
 */
function parseCompactCoordinate(
  coordString: string,
  scaleFactor: number
): { lat: string; lon: string; name?: string } | null {
  const parts = coordString.split('~');
  if (parts.length < 2) return null;

  const latQ = parseInt(parts[0], 10);
  const lonQ = parseInt(parts[1], 10);

  if (isNaN(latQ) || isNaN(lonQ)) return null;

  return {
    lat: (latQ / scaleFactor).toFixed(6),
    lon: (lonQ / scaleFactor).toFixed(6),
    name: parts[2] || undefined,
  };
}

/**
 * Serialize a location to compact format: "lat~lon~name" or "lat~lon"
 */
function serializeCompactCoordinate(lat: number, lon: number, name?: string): string {
  let value = `${quantizeCoordinate(lat)}~${quantizeCoordinate(lon)}`;
  if (name) {
    // Only save city name (first part before comma)
    value += `~${name.split(",")[0]}`;
  }
  return value;
}

/**
 * Serialize from location and multiple to locations to compact URL format
 * Returns: from=lat~lng~name&to[0]=lat~lng~name&to[1]=lat~lng~name&s=5
 */
export function serializeMultipleLocationsToUrl(
  from: LocationData,
  toLocations: LocationData[]
): string {
  const params = new URLSearchParams();

  // Serialize from location
  params.set("from", serializeCompactCoordinate(from.lat, from.lon, from.name));
  params.set("s", SCALE_DECIMALS.toString());

  // Serialize all to locations
  toLocations.forEach((to, index) => {
    params.set(`to[${index}]`, serializeCompactCoordinate(to.lat, to.lon, to.name));
  });

  return params.toString();
}

/**
 * Serialize two locations to compact URL format (legacy single destination)
 * Returns: from=lat~lng~name&to=lat~lng~name&s=5
 * Uses ~ separator (no URL encoding needed) instead of , (requires %2C)
 * Name is included as third parameter in the same string
 */
export function serializeLocationsToUrl(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  fromName?: string,
  toName?: string
): string {
  return serializeMultipleLocationsToUrl(
    { lat: fromLat, lon: fromLon, name: fromName },
    [{ lat: toLat, lon: toLon, name: toName }]
  );
}

/**
 * Parsed location parameters for multiple destinations
 */
export interface ParsedMultipleLocationParams {
  fromLat?: string;
  fromLon?: string;
  fromName?: string;
  toLocations: Array<{ lat: string; lon: string; name?: string; isFlyOver?: boolean }>;
}

/**
 * Parse location parameters from URL search params
 * Supports multiple destinations and all legacy formats
 */
export function parseMultipleLocationParams(
  searchParams: URLSearchParams
): ParsedMultipleLocationParams {
  let fromLat: string | undefined;
  let fromLon: string | undefined;
  let fromName: string | undefined;
  const toLocations: Array<{ lat: string; lon: string; name?: string; isFlyOver?: boolean }> = [];

  const fromParam = searchParams.get("from");
  const scaleParam = searchParams.get("s");

  // Parse from location (compact format)
  if (fromParam && scaleParam) {
    const scale = parseInt(scaleParam, 10);
    const scaleFactor = Math.pow(10, scale);
    const parsed = parseCompactCoordinate(fromParam, scaleFactor);
    if (parsed) {
      fromLat = parsed.lat;
      fromLon = parsed.lon;
      fromName = parsed.name || searchParams.get("fromName") || undefined;
    }
  } else {
    // Legacy expanded format
    fromLat = searchParams.get("fromLat") || undefined;
    fromLon = searchParams.get("fromLon") || undefined;
    fromName = searchParams.get("fromName") || undefined;
  }

  // Parse to locations
  if (scaleParam) {
    const scale = parseInt(scaleParam, 10);
    const scaleFactor = Math.pow(10, scale);

    // Find all to[n] parameters
    const toIndices = new Set<number>();
    for (const key of searchParams.keys()) {
      const match = key.match(/^to\[(\d+)\]/);
      if (match) {
        toIndices.add(parseInt(match[1]));
      }
    }

    // Parse indexed to locations (compact format)
    if (toIndices.size > 0) {
      Array.from(toIndices).sort((a, b) => a - b).forEach(index => {
        const coordParam = searchParams.get(`to[${index}]`);
        if (coordParam) {
          const parsed = parseCompactCoordinate(coordParam, scaleFactor);
          if (parsed) {
            // Check for fly-over flag: toFO[i]=1
            const isFlyOver = searchParams.get(`toFO[${index}]`) === '1';
            toLocations.push({
              lat: parsed.lat,
              lon: parsed.lon,
              name: parsed.name,
              isFlyOver
            });
          }
        }
      });
    } else {
      // Legacy single destination format (to=lat~lon~name)
      const toParam = searchParams.get("to");
      if (toParam) {
        const parsed = parseCompactCoordinate(toParam, scaleFactor);
        if (parsed) {
          // Override name with separate param if exists
          parsed.name = parsed.name || searchParams.get("toName") || undefined;
          toLocations.push(parsed);
        }
      }
    }
  } else {
    // Legacy expanded format (toLat/toLon)
    const toLat = searchParams.get("toLat");
    const toLon = searchParams.get("toLon");
    if (toLat && toLon) {
      toLocations.push({
        lat: toLat,
        lon: toLon,
        name: searchParams.get("toName") || undefined,
      });
    }
  }

  return { fromLat, fromLon, fromName, toLocations };
}

/**
 * Parse location coordinates from URL search params (legacy single destination)
 * Supports multiple formats:
 * - New (preferred): from=lat~lng~name&to=lat~lng~name&s=5
 * - New (legacy): from=lat~lng&to=lat~lng&s=5&fromName=name&toName=name
 * - New (legacy): from=lat,lng&to=lat,lng&s=5
 * - Legacy: fromLat=x&fromLon=y&toLat=x&toLon=y
 */
export interface ParsedLocationParams {
  fromLat?: string;
  fromLon?: string;
  toLat?: string;
  toLon?: string;
  fromName?: string;
  toName?: string;
}

export function parseLocationParams(searchParams: URLSearchParams): ParsedLocationParams {
  const parsed = parseMultipleLocationParams(searchParams);

  return {
    fromLat: parsed.fromLat,
    fromLon: parsed.fromLon,
    fromName: parsed.fromName,
    toLat: parsed.toLocations[0]?.lat,
    toLon: parsed.toLocations[0]?.lon,
    toName: parsed.toLocations[0]?.name,
  };
}

/**
 * Parsed leg parameters with from, to, and checkpoints
 * Format: from=lat~lon~name&cp[0]=lat~lon~name&cp[1]=...&to=lat~lon~name&s=5
 */
export interface ParsedLegParams {
  from?: { lat: string; lon: string; name?: string };
  to?: { lat: string; lon: string; name?: string };
  checkpoints: Array<{ lat: string; lon: string; name?: string }>;
}

/**
 * Parse leg parameters from URL (from + checkpoints + to)
 * Format: from=lat~lon~name&cp[0]=lat~lon~name&to=lat~lon~name&s=5
 */
export function parseLegParams(searchParams: URLSearchParams): ParsedLegParams {
  const scaleParam = searchParams.get("s");
  const scaleFactor = scaleParam ? Math.pow(10, parseInt(scaleParam, 10)) : SCALE_FACTOR;

  let from: ParsedLegParams["from"] = undefined;
  let to: ParsedLegParams["to"] = undefined;
  const checkpoints: ParsedLegParams["checkpoints"] = [];

  // Parse from location
  const fromParam = searchParams.get("from");
  if (fromParam) {
    const parsed = parseCompactCoordinate(fromParam, scaleFactor);
    if (parsed) {
      from = {
        lat: parsed.lat,
        lon: parsed.lon,
        name: parsed.name,
      };
    }
  }

  // Parse to location
  const toParam = searchParams.get("to");
  if (toParam) {
    const parsed = parseCompactCoordinate(toParam, scaleFactor);
    if (parsed) {
      to = {
        lat: parsed.lat,
        lon: parsed.lon,
        name: parsed.name,
      };
    }
  }

  // Parse checkpoints (cp[0], cp[1], etc.)
  const cpIndices = new Set<number>();
  for (const key of searchParams.keys()) {
    const match = key.match(/^cp\[(\d+)\]/);
    if (match) {
      cpIndices.add(parseInt(match[1]));
    }
  }

  Array.from(cpIndices)
    .sort((a, b) => a - b)
    .forEach((index) => {
      const cpParam = searchParams.get(`cp[${index}]`);
      if (cpParam) {
        const parsed = parseCompactCoordinate(cpParam, scaleFactor);
        if (parsed) {
          checkpoints.push({
            lat: parsed.lat,
            lon: parsed.lon,
            name: parsed.name,
          });
        }
      }
    });

  return { from, to, checkpoints };
}

/**
 * Serialize leg parameters to URL format
 * Format: from=lat~lon~name&cp[0]=lat~lon~name&to=lat~lon~name&s=5
 */
export function serializeLegParamsToUrl(
  from: LocationData,
  to: LocationData,
  checkpoints: LocationData[] = []
): string {
  const params = new URLSearchParams();

  // Serialize from location
  params.set("from", serializeCompactCoordinate(from.lat, from.lon, from.name));
  params.set("s", SCALE_DECIMALS.toString());

  // Serialize checkpoints
  checkpoints.forEach((cp, index) => {
    params.set(`cp[${index}]`, serializeCompactCoordinate(cp.lat, cp.lon, cp.name));
  });

  // Serialize to location
  params.set("to", serializeCompactCoordinate(to.lat, to.lon, to.name));

  return params.toString();
}
