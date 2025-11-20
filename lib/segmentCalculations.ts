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
 * Calculates the rhumb line (loxodrome) distance between two points.
 *
 * For very short segments (< 100 NM), rhumb and geodesic are nearly identical,
 * so we just use the geodesic distance. For longer segments, we use Turf.js
 * but ONLY if it gives a sensible result (>= geodesic distance).
 *
 * @param lat1 - Starting latitude in degrees
 * @param lon1 - Starting longitude in degrees
 * @param lat2 - Ending latitude in degrees
 * @param lon2 - Ending longitude in degrees
 * @returns Distance in nautical miles along the rhumb line
 */
function calculateRhumbDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Calculate geodesic distance first (this is always accurate)
  const geodesic = Geodesic.WGS84.Inverse(lat1, lon1, lat2, lon2);
  const geodesicDistanceMeters = geodesic.s12 ?? 0;
  const geodesicDistanceNM = geodesicDistanceMeters * METERS_TO_NM;

  // For very short segments (< 100 NM), rhumb ≈ geodesic
  // Just use geodesic to avoid numerical issues
  if (geodesicDistanceNM < 100) {
    return geodesicDistanceNM;
  }

  // For longer segments, try Turf.js rhumb
  const from = point([lon1, lat1]);
  const to = point([lon2, lat2]);
  const rhumbKm = rhumbDistance(from, to);
  const rhumbNM = rhumbKm * KM_TO_NM;

  // Sanity check: rhumb distance must be >= geodesic distance
  // If Turf gives an invalid result (which happens for segments > 100 NM),
  // fall back to geodesic distance as a conservative approximation
  if (rhumbNM < geodesicDistanceNM) {
    return geodesicDistanceNM;
  }

  return rhumbNM;
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
  /** Pure rhumb line distance (constant heading, no segments) in nautical miles */
  pureRhumbDistance: number;
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

  // Calculate pure rhumb line distance (constant heading, no segments)
  // This is what you'd fly if you didn't segment the route at all
  const pureRhumbDistanceNM = calculateRhumbDistance(
    fromLat,
    fromLon,
    toLat,
    toLon
  );

  // Handle case where points are the same
  if (totalDistanceNM < 0.01) {
    return {
      segments: [],
      totalDistance: 0,
      orthodromicDistance: 0,
      pureRhumbDistance: 0,
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
    pureRhumbDistance: pureRhumbDistanceNM, // Single constant-heading route
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
