/**
 * LNAV segment calculations - divides orthodromic routes into loxodromic segments
 * Simulates how Flight Management Systems divide great circle routes into
 * constant-heading segments for LNAV navigation.
 */

import { Geodesic } from "geographiclib-geodesic";
import rhumbDistance from "@turf/rhumb-distance";
import { point } from "@turf/helpers";

// Conversion constants
const METERS_TO_NM = 1 / 1852;
const NM_TO_METERS = 1852;
const KM_TO_NM = 0.539957;

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
 * Calculates the rhumb line (loxodrome) distance between two points using Turf.js,
 * with correction for WGS-84 ellipsoid.
 *
 * Turf uses a spherical Earth model with radius 6371008.8m, but we need to match
 * GeographicLib's WGS-84 ellipsoid for consistency. We apply a latitude-dependent
 * correction factor.
 *
 * @param lat1 - Starting latitude in degrees
 * @param lon1 - Starting longitude in degrees
 * @param lat2 - Ending latitude in degrees
 * @param lon2 - Ending longitude in degrees
 * @returns Distance in nautical miles along the rhumb line on WGS-84 ellipsoid
 */
function calculateRhumbDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const from = point([lon1, lat1]);
  const to = point([lon2, lat2]);

  // Calculate rhumb distance on sphere (returns kilometers)
  const distanceKm = rhumbDistance(from, to);

  // Calculate correction factor for WGS-84 ellipsoid at average latitude
  const avgLat = (lat1 + lat2) / 2;
  const scaleFactor = getWGS84ScaleFactor(avgLat);

  // Apply correction and convert to nautical miles
  return distanceKm * scaleFactor * KM_TO_NM;
}

/**
 * Gets the scale factor to convert from spherical distance (Turf's model)
 * to WGS-84 ellipsoidal distance at a given latitude.
 *
 * This accounts for the fact that Turf uses a sphere with radius 6371008.8m,
 * while WGS-84 is an ellipsoid with varying radius by latitude.
 *
 * @param latitude - Latitude in degrees
 * @returns Scale factor to apply to spherical distances
 */
function getWGS84ScaleFactor(latitude: number): number {
  // WGS-84 parameters
  const a = 6378137.0; // semi-major axis (equatorial radius) in meters
  const f = 1 / 298.257223563; // flattening
  const e2 = 2 * f - f * f; // first eccentricity squared

  // Convert latitude to radians
  const phi = (latitude * Math.PI) / 180;
  const sinPhi = Math.sin(phi);

  // Calculate radius of curvature in meridian and prime vertical
  const denominator = 1 - e2 * sinPhi * sinPhi;
  const N = a / Math.sqrt(denominator); // prime vertical
  const M = (a * (1 - e2)) / Math.pow(denominator, 1.5); // meridian

  // Mean radius of curvature (geometric mean)
  const R_wgs84 = Math.sqrt(N * M);

  // Turf's sphere radius
  const R_turf = 6371008.8;

  // Scale factor
  return R_wgs84 / R_turf;
}

/**
 * Represents a single navigation segment with constant heading
 */
export interface NavigationSegment {
  /** Segment number (1-based) */
  segmentNumber: number;
  /** Starting point latitude */
  startLat: number;
  /** Starting point longitude */
  startLon: number;
  /** Ending point latitude */
  endLat: number;
  /** Ending point longitude */
  endLon: number;
  /** True heading for this segment (0-360°) */
  heading: number;
  /** Segment distance in nautical miles */
  distance: number;
  /** Cumulative distance from origin in nautical miles */
  cumulativeDistance: number;
}

/**
 * Result of segment calculation
 */
export interface SegmentCalculationResult {
  /** Array of navigation segments */
  segments: NavigationSegment[];
  /** Total segmented route distance (sum of all rhumb line segments) in nautical miles */
  totalDistance: number;
  /** Great circle distance (shortest possible path) in nautical miles */
  orthodromicDistance: number;
  /** Initial great circle bearing */
  initialBearing: number;
  /** Final bearing at destination */
  finalBearing: number;
  /** Number of segments created */
  segmentCount: number;
}

/**
 * Calculates navigation segments by dividing an orthodromic route into
 * a specified number of loxodromic (constant heading) segments.
 *
 * This simulates how LNAV systems approximate great circle routes:
 * 1. Calculate the great circle (orthodromic) route
 * 2. Place waypoints at regular intervals along the great circle
 * 3. Fly between waypoints at constant heading (loxodrome/rhumb line)
 * 4. Calculate actual loxodromic distance for each segment
 * 5. Total loxodromic distance > great circle distance
 *
 * Fewer segments = longer loxodromes = more deviation from great circle = longer distance.
 * More segments = shorter loxodromes = closer to great circle = shorter distance.
 *
 * @param fromLat - Starting latitude in degrees
 * @param fromLon - Starting longitude in degrees
 * @param toLat - Destination latitude in degrees
 * @param toLon - Destination longitude in degrees
 * @param numSegments - Number of segments to divide the route into (minimum 1)
 * @returns Segment calculation result with array of segments
 *
 * @example
 * // Divide Madrid to New York into 30 segments
 * const result = calculateNavigationSegments(40.4168, -3.7038, 40.7128, -74.0060, 30);
 * // Result: 30 segments, total loxodromic distance > great circle distance
 */
export function calculateNavigationSegments(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  numSegments: number
): SegmentCalculationResult {
  // Validate inputs
  if (numSegments < 1) {
    throw new Error("Number of segments must be at least 1");
  }

  // Calculate total great circle distance and bearings
  const inverse = Geodesic.WGS84.Inverse(fromLat, fromLon, toLat, toLon);
  const totalDistanceMeters = inverse.s12 ?? 0;
  const totalDistanceNM = totalDistanceMeters * METERS_TO_NM;
  const initialBearing = normalizeAngle(inverse.azi1 ?? 0);
  const finalBearing = normalizeAngle(inverse.azi2 ?? 0);

  // Handle case where points are the same
  if (totalDistanceNM < 0.01) {
    return {
      segments: [],
      totalDistance: 0,
      orthodromicDistance: 0,
      initialBearing: 0,
      finalBearing: 0,
      segmentCount: 0,
    };
  }

  const segments: NavigationSegment[] = [];

  // Create a GeodesicLine for accurate waypoint calculation
  // This properly handles the changing bearing along the great circle
  const line = Geodesic.WGS84.InverseLine(fromLat, fromLon, toLat, toLon);

  // Current position tracking
  let currentLat = fromLat;
  let currentLon = fromLon;
  let cumulativeDistanceNM = 0;

  // Generate segments
  for (let i = 0; i < numSegments; i++) {
    // Calculate next waypoint along great circle using the geodesic line
    // This correctly handles the varying bearing along the great circle
    const fractionComplete = (i + 1) / numSegments;
    const targetDistanceMeters = totalDistanceMeters * fractionComplete;

    // Use the geodesic line to find the waypoint at this distance
    const waypoint = line.Position(targetDistanceMeters);

    const nextLat = waypoint.lat2 ?? currentLat;
    const nextLon = waypoint.lon2 ?? currentLon;

    // Calculate the heading for this segment (initial bearing from current to next)
    const segmentBearing = Geodesic.WGS84.Inverse(
      currentLat,
      currentLon,
      nextLat,
      nextLon
    );
    const segmentHeading = normalizeAngle(segmentBearing.azi1 ?? 0);

    // Calculate the LOXODROMIC (rhumb line) distance for this segment
    // This is the actual distance flown at constant heading
    const thisSegmentDistanceNM = calculateRhumbDistance(
      currentLat,
      currentLon,
      nextLat,
      nextLon
    );

    // Update cumulative distance (sum of rhumb line distances)
    cumulativeDistanceNM += thisSegmentDistanceNM;

    // Create segment
    segments.push({
      segmentNumber: i + 1,
      startLat: currentLat,
      startLon: currentLon,
      endLat: nextLat,
      endLon: nextLon,
      heading: segmentHeading,
      distance: thisSegmentDistanceNM,
      cumulativeDistance: cumulativeDistanceNM,
    });

    // Move to next waypoint
    currentLat = nextLat;
    currentLon = nextLon;
  }

  return {
    segments,
    totalDistance: cumulativeDistanceNM, // Sum of all rhumb line segments
    orthodromicDistance: totalDistanceNM, // Great circle distance (shortest path)
    initialBearing,
    finalBearing,
    segmentCount: numSegments,
  };
}

/**
 * Formats a heading to 3-digit string with degree symbol
 */
export function formatHeading(heading: number): string {
  return `${String(Math.round(heading)).padStart(3, "0")}°`;
}

/**
 * Formats distance with one decimal place
 */
export function formatSegmentDistance(distance: number): string {
  return distance.toFixed(1);
}
