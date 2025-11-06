/**
 * Aviation distance and bearing calculations using GeographicLib's
 * WGS-84 geodesic algorithms (Karney's method) for high-precision
 * calculations on an ellipsoidal Earth model.
 */

import { Geodesic } from "geographiclib-geodesic";

// Conversion constant: meters to nautical miles
const METERS_TO_NM = 1 / 1852;

/**
 * Normalizes an angle to the range [0, 360)
 */
function normalizeAngle(degrees: number): number {
  let normalized = degrees % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  return normalized;
}

/**
 * Calculates the geodesic distance between two points on Earth
 * using the WGS-84 ellipsoid model (Karney's method via GeographicLib).
 *
 * This method is more accurate than Haversine as it accounts for Earth's
 * ellipsoidal shape rather than assuming a perfect sphere.
 *
 * @param lat1 - Latitude of the first point in degrees
 * @param lon1 - Longitude of the first point in degrees
 * @param lat2 - Latitude of the second point in degrees
 * @param lon2 - Longitude of the second point in degrees
 * @returns Distance in nautical miles
 *
 * @example
 * // Distance from Madrid to Barcelona
 * const distance = calculateHaversineDistance(40.4168, -3.7038, 41.3874, 2.1686);
 * console.log(distance); // ~263 NM
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Use WGS-84 geodesic inverse problem to calculate distance
  const result = Geodesic.WGS84.Inverse(lat1, lon1, lat2, lon2);

  // Convert meters to nautical miles
  const distanceNM = (result.s12 ?? 0) * METERS_TO_NM;

  return distanceNM;
}

/**
 * Calculates the initial true bearing (course) from one point to another
 * along a geodesic route using the WGS-84 ellipsoid model.
 *
 * This is the true bearing (azimuth) at the departure point. Note that on a geodesic
 * route, the bearing changes continuously. The WGS-84 calculation provides more
 * accurate bearings than spherical approximations, especially over longer distances.
 *
 * @param lat1 - Latitude of the departure point in degrees
 * @param lon1 - Longitude of the departure point in degrees
 * @param lat2 - Latitude of the destination point in degrees
 * @param lon2 - Longitude of the destination point in degrees
 * @returns Initial true bearing in degrees (0-360, where 0/360 is North)
 *
 * @example
 * // Bearing from Madrid to Barcelona
 * const bearing = calculateInitialBearing(40.4168, -3.7038, 41.3874, 2.1686);
 * console.log(bearing); // ~66° (ENE)
 */
export function calculateInitialBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Use WGS-84 geodesic inverse problem to calculate initial azimuth
  const result = Geodesic.WGS84.Inverse(lat1, lon1, lat2, lon2);

  // azi1 is the initial azimuth (bearing) in degrees
  // Normalize to 0-360 range
  const bearing = normalizeAngle(result.azi1 ?? 0);

  return bearing;
}

/**
 * Validates if a coordinate pair is within valid ranges
 */
export function validateCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * Maximum recommended distance for using initial bearing
 * For distances beyond this, the bearing change along the route becomes significant
 */
export const MAX_RECOMMENDED_DISTANCE_NM = 1000;

/**
 * Checks if a distance is within the recommended range for initial bearing calculation
 */
export function isDistanceWithinRecommendedRange(distanceNM: number): boolean {
  return distanceNM <= MAX_RECOMMENDED_DISTANCE_NM;
}
