/**
 * Aviation distance and bearing calculations using the Haversine formula
 * and great circle navigation principles.
 */

const EARTH_RADIUS_NM = 3440.065; // Earth's radius in nautical miles

/**
 * Converts degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Converts radians to degrees
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

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
 * Calculates the great circle distance between two points on Earth
 * using the Haversine formula.
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
  // Convert to radians
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  // Haversine formula
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Distance in nautical miles
  const distance = EARTH_RADIUS_NM * c;

  return distance;
}

/**
 * Calculates the initial true bearing (course) from one point to another
 * along a great circle route.
 *
 * This is the true bearing at the departure point. Note that on a great circle
 * route, the bearing changes continuously. For distances under ~1000 NM, this
 * initial bearing is sufficiently accurate for navigation purposes.
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
  // Convert to radians
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δλ = toRadians(lon2 - lon1);

  // Calculate bearing
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);

  // Convert to degrees and normalize to 0-360
  const bearing = normalizeAngle(toDegrees(θ));

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
