/**
 * Utilities for encoding/decoding coordinates in URL query strings
 * Supports both legacy format and compact quantized format
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
 * Serialize two locations to compact URL format
 * Returns: from=lat~lng&to=lat~lng&s=5&fromName=name&toName=name
 * Uses ~ separator (no URL encoding needed) instead of , (requires %2C)
 */
export function serializeLocationsToUrl(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  fromName?: string,
  toName?: string
): string {
  const params = new URLSearchParams();

  // Quantized coordinates with ~ separator
  params.set("from", `${quantizeCoordinate(fromLat)}~${quantizeCoordinate(fromLon)}`);
  params.set("to", `${quantizeCoordinate(toLat)}~${quantizeCoordinate(toLon)}`);
  params.set("s", SCALE_DECIMALS.toString());

  // Optional names (short form)
  if (fromName) {
    params.set("fromName", fromName.split(",")[0]);
  }
  if (toName) {
    params.set("toName", toName.split(",")[0]);
  }

  return params.toString();
}

/**
 * Parse location coordinates from URL search params
 * Supports multiple formats:
 * - New (preferred): from=lat~lng&to=lat~lng&s=5
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
  // Try new format first
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const scaleParam = searchParams.get("s");

  if (fromParam && toParam && scaleParam) {
    // New compact format - support both ~ and , separators
    const scale = parseInt(scaleParam, 10);
    const scaleFactor = Math.pow(10, scale);

    // Split by ~ first (preferred), fall back to , for backward compatibility
    const fromSeparator = fromParam.includes("~") ? "~" : ",";
    const toSeparator = toParam.includes("~") ? "~" : ",";

    const [fromLatQ, fromLonQ] = fromParam.split(fromSeparator).map(n => parseInt(n, 10));
    const [toLatQ, toLonQ] = toParam.split(toSeparator).map(n => parseInt(n, 10));

    return {
      fromLat: (fromLatQ / scaleFactor).toFixed(6),
      fromLon: (fromLonQ / scaleFactor).toFixed(6),
      toLat: (toLatQ / scaleFactor).toFixed(6),
      toLon: (toLonQ / scaleFactor).toFixed(6),
      fromName: searchParams.get("fromName") || undefined,
      toName: searchParams.get("toName") || undefined,
    };
  }

  // Fall back to legacy format
  return {
    fromLat: searchParams.get("fromLat") || undefined,
    fromLon: searchParams.get("fromLon") || undefined,
    toLat: searchParams.get("toLat") || undefined,
    toLon: searchParams.get("toLon") || undefined,
    fromName: searchParams.get("fromName") || undefined,
    toName: searchParams.get("toName") || undefined,
  };
}
