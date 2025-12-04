import { Geodesic } from "geographiclib-geodesic";

const geod = Geodesic.WGS84;

export interface Coordinate {
  lat: number;
  lon: number;
}

export interface AerodromeData {
  type: "AD" | "LAD";
  code: string | null;
  name: string;
  lat: number;
  lon: number;
  elevation: number | null;
}

export interface AlternateWithDistance extends AerodromeData {
  distanceFromRoute: number; // NM - perpendicular distance to route
  distanceFromStart: number; // NM - along-track distance from start
  side: "L" | "R"; // Left or Right of route
}

/**
 * Calculate the cross-track (perpendicular) distance from a point to a great circle route
 * Returns distance in NM and the along-track distance from start
 */
function crossTrackDistance(
  start: Coordinate,
  end: Coordinate,
  point: Coordinate
): { crossTrack: number; alongTrack: number; side: "L" | "R" } {
  // Calculate bearing from start to end (route bearing)
  const routeResult = geod.Inverse(start.lat, start.lon, end.lat, end.lon);
  const routeBearing = routeResult.azi1 ?? 0;
  const routeDistance = (routeResult.s12 ?? 0) / 1852; // NM

  // Calculate bearing and distance from start to point
  const pointResult = geod.Inverse(start.lat, start.lon, point.lat, point.lon);
  const pointBearing = pointResult.azi1 ?? 0;
  const pointDistance = (pointResult.s12 ?? 0) / 1852; // NM

  // Angular difference between route and point bearings
  let bearingDiff = pointBearing - routeBearing;
  // Normalize to -180 to 180
  while (bearingDiff > 180) bearingDiff -= 360;
  while (bearingDiff < -180) bearingDiff += 360;

  // Cross-track distance (perpendicular distance from route)
  // Using spherical approximation: XTD = asin(sin(d/R) * sin(θ)) * R
  const bearingDiffRad = (bearingDiff * Math.PI) / 180;
  const crossTrack = Math.abs(
    Math.asin(Math.sin(pointDistance / 3440.065) * Math.sin(bearingDiffRad)) *
      3440.065
  );

  // Along-track distance (distance along route to closest point)
  // ATD = acos(cos(d/R) / cos(XTD/R)) * R
  const alongTrack =
    Math.acos(
      Math.cos(pointDistance / 3440.065) / Math.cos(crossTrack / 3440.065)
    ) * 3440.065;

  // Determine side (L or R) based on bearing difference
  const side: "L" | "R" = bearingDiff < 0 ? "L" : "R";

  return {
    crossTrack,
    alongTrack: Math.min(alongTrack, routeDistance), // Cap at route distance
    side,
  };
}

/**
 * Find aerodromes within a corridor around a route leg
 * @param from Start point of leg
 * @param to End point of leg
 * @param aerodromes List of aerodromes to filter
 * @param corridorWidthNM Width of corridor on each side (default 10 NM)
 * @param extendBeyondNM How far to extend beyond leg endpoints (default 5 NM)
 */
export function findCorridorAlternates(
  from: Coordinate,
  to: Coordinate,
  aerodromes: AerodromeData[],
  corridorWidthNM: number = 10,
  extendBeyondNM: number = 5
): AlternateWithDistance[] {
  // Calculate leg distance
  const legResult = geod.Inverse(from.lat, from.lon, to.lat, to.lon);
  const legDistanceNM = (legResult.s12 ?? 0) / 1852;

  const alternates: AlternateWithDistance[] = [];

  for (const aerodrome of aerodromes) {
    const point: Coordinate = { lat: aerodrome.lat, lon: aerodrome.lon };
    const { crossTrack, alongTrack, side } = crossTrackDistance(from, to, point);

    // Check if within corridor width
    if (crossTrack > corridorWidthNM) continue;

    // Check if within extended leg bounds
    // Allow points slightly before start and slightly after end
    if (alongTrack < -extendBeyondNM || alongTrack > legDistanceNM + extendBeyondNM) {
      continue;
    }

    alternates.push({
      ...aerodrome,
      distanceFromRoute: Math.round(crossTrack * 10) / 10,
      distanceFromStart: Math.round(alongTrack * 10) / 10,
      side,
    });
  }

  // Sort by along-track distance
  return alternates.sort((a, b) => a.distanceFromStart - b.distanceFromStart);
}

/**
 * Calculate bounding box for a leg with padding for corridor search
 */
export function getLegBoundingBox(
  from: Coordinate,
  to: Coordinate,
  paddingNM: number = 15
): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  // Approximate degrees for padding (1 degree ≈ 60 NM at equator)
  const paddingDeg = paddingNM / 60;

  const lats = [from.lat, to.lat];
  const lons = [from.lon, to.lon];

  return {
    minLat: Math.min(...lats) - paddingDeg,
    maxLat: Math.max(...lats) + paddingDeg,
    minLon: Math.min(...lons) - paddingDeg,
    maxLon: Math.max(...lons) + paddingDeg,
  };
}
