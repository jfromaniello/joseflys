/**
 * UTM Zone Validation
 *
 * This module validates if a route is suitable for UTM projection.
 * UTM is ideal for local charts (short east-west distances within the same zone).
 * For longer or cross-zone routes, WGS-84 geodesic is more appropriate.
 */

export interface Location {
  lat: number;
  lon: number;
}

export interface UTMValidationResult {
  isValid: boolean;
  reason?: string;
  recommendedAlternative?: string;
  zone?: number;
  hemisphere?: 'N' | 'S';
  epsgCode?: number;
  maxEastWestSpan?: number;
}

// Maximum recommended east-west span in km for UTM projection
const MAX_EAST_WEST_SPAN_KM = 400;

/**
 * Calculate UTM zone from longitude
 * UTM zones are 6° wide, numbered 1-60, starting at 180°W
 */
export function getUTMZone(lon: number): number {
  return Math.floor((lon + 180) / 6) + 1;
}

/**
 * Get hemisphere from latitude
 */
export function getHemisphere(lat: number): 'N' | 'S' {
  return lat >= 0 ? 'N' : 'S';
}

/**
 * Calculate EPSG code for WGS-84 UTM projection
 * 326xx for Northern Hemisphere (where xx is zone number)
 * 327xx for Southern Hemisphere (where xx is zone number)
 */
export function getEPSGCode(zone: number, hemisphere: 'N' | 'S'): number {
  const prefix = hemisphere === 'N' ? 326 : 327;
  return prefix * 100 + zone;
}

/**
 * Calculate approximate east-west span in kilometers
 * Uses simple spherical approximation at average latitude
 */
function calculateEastWestSpan(locations: Location[]): number {
  if (locations.length < 2) return 0;

  const lons = locations.map(loc => loc.lon);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const avgLat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;

  // At latitude φ, 1° longitude ≈ 111.320 km * cos(φ)
  const kmPerDegree = 111.320 * Math.cos(avgLat * Math.PI / 180);
  const spanDegrees = maxLon - minLon;

  return spanDegrees * kmPerDegree;
}

/**
 * Validate if a route is suitable for UTM projection
 *
 * Requirements:
 * 1. All locations must be in the same UTM zone
 * 2. East-west span must be within MAX_EAST_WEST_SPAN_KM
 * 3. Must have at least 2 locations
 */
export function validateUTMRoute(locations: Location[]): UTMValidationResult {
  // Need at least 2 locations
  if (locations.length < 2) {
    return {
      isValid: false,
      reason: "Need at least 2 locations to create a route.",
    };
  }

  // Calculate UTM zones for all locations
  const zones = locations.map(loc => getUTMZone(loc.lon));
  const uniqueZones = [...new Set(zones)];

  // Check if all locations are in the same zone
  if (uniqueZones.length > 1) {
    return {
      isValid: false,
      reason: `Route crosses multiple UTM zones (${uniqueZones.join(', ')}). UTM projection is only accurate within a single zone.`,
      recommendedAlternative: "Use /segments for routes crossing UTM zones or spanning long east-west distances.",
    };
  }

  const zone = uniqueZones[0];
  const hemisphere = getHemisphere(locations[0].lat);

  // Check east-west span
  const eastWestSpan = calculateEastWestSpan(locations);

  if (eastWestSpan > MAX_EAST_WEST_SPAN_KM) {
    return {
      isValid: false,
      reason: `Route spans ${Math.round(eastWestSpan)} km east-west, exceeding the ${MAX_EAST_WEST_SPAN_KM} km limit. UTM projection becomes distorted over large east-west distances.`,
      recommendedAlternative: "Use /segments for wide-area routes.",
      maxEastWestSpan: eastWestSpan,
    };
  }

  // All checks passed
  return {
    isValid: true,
    zone,
    hemisphere,
    epsgCode: getEPSGCode(zone, hemisphere),
    maxEastWestSpan: eastWestSpan,
  };
}

/**
 * Calculate the center point of all locations
 * Used as the reference point for UTM projection
 */
export function calculateCenterPoint(locations: Location[]): Location {
  if (locations.length === 0) {
    return { lat: 0, lon: 0 };
  }

  const avgLat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
  const avgLon = locations.reduce((sum, loc) => sum + loc.lon, 0) / locations.length;

  return { lat: avgLat, lon: avgLon };
}
