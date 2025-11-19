/**
 * Climb Performance Calculations
 *
 * These functions calculate climb performance based on:
 * - Aircraft performance table
 * - Density Altitude
 * - Target altitude
 * - Current altitude
 * - Ground speed during climb
 */

import { AircraftPerformance, ClimbPerformanceData } from "./aircraft";

export interface ClimbSegment {
  altitudeFrom: number;
  altitudeTo: number;
  rateOfClimb: number; // ft/min
  climbTAS: number; // kt
  fuelFlow: number; // gal/h
  time: number; // minutes
  distance: number; // NM
  fuelUsed: number; // gallons
}

export interface ClimbResults {
  segments: ClimbSegment[];
  totalTime: number; // minutes
  totalDistance: number; // NM
  totalFuel: number; // gallons
  topOfClimbAltitude: number; // ft
  averageROC: number; // ft/min
  averageTAS: number; // kt
}

/**
 * Adjust Rate of Climb for Density Altitude
 * Using a simplified model: for every 1000 ft of DA above PA, reduce ROC by ~7-10%
 */
function adjustROCForDA(baseROC: number, pressureAltitude: number, densityAltitude: number): number {
  const daEffect = densityAltitude - pressureAltitude;
  const reductionFactor = 1 - (daEffect / 1000) * 0.08; // 8% reduction per 1000 ft DA increase
  return baseROC * Math.max(reductionFactor, 0.3); // Minimum 30% of base ROC
}

/**
 * Adjust TAS for altitude
 * TAS increases approximately 2% per 1000 ft
 */
function adjustTASForAltitude(baseTAS: number, altitude: number): number {
  return baseTAS * (1 + (altitude / 1000) * 0.02);
}

/**
 * Find the performance data segment for a given altitude
 */
function findPerformanceSegment(
  climbTable: ClimbPerformanceData[],
  altitude: number
): ClimbPerformanceData | null {
  return climbTable.find(
    (segment) => altitude >= segment.altitudeFrom && altitude < segment.altitudeTo
  ) || null;
}

/**
 * Interpolate ROC between two segments
 */
function interpolateROC(
  lowerSegment: ClimbPerformanceData,
  upperSegment: ClimbPerformanceData,
  altitude: number
): number {
  const altRange = upperSegment.altitudeTo - lowerSegment.altitudeFrom;
  const altPosition = altitude - lowerSegment.altitudeFrom;
  const ratio = altPosition / altRange;

  return lowerSegment.rateOfClimb * (1 - ratio) + upperSegment.rateOfClimb * ratio;
}

/**
 * Calculate climb performance from current altitude to target altitude
 *
 * @param aircraft - Aircraft performance data
 * @param currentAltitude - Current altitude in feet (typically departure elevation)
 * @param targetAltitude - Target cruise altitude in feet
 * @param densityAltitude - Density altitude at departure in feet
 * @param groundSpeed - Ground speed during climb in knots (TAS ± wind component)
 * @param weightRatio - Ratio of current weight to standard weight (1.0 = standard weight)
 * @returns Climb performance results
 */
export function calculateClimbPerformance(
  aircraft: AircraftPerformance,
  currentAltitude: number,
  targetAltitude: number,
  densityAltitude: number,
  groundSpeed: number,
  weightRatio: number = 1.0
): ClimbResults {
  if (targetAltitude <= currentAltitude) {
    return {
      segments: [],
      totalTime: 0,
      totalDistance: 0,
      totalFuel: 0,
      topOfClimbAltitude: currentAltitude,
      averageROC: 0,
      averageTAS: 0,
    };
  }

  // Check if aircraft has climb table
  if (!aircraft.climbTable || aircraft.climbTable.length === 0) {
    console.warn("Aircraft has no climb performance table");
    return {
      segments: [],
      totalTime: 0,
      totalDistance: 0,
      totalFuel: 0,
      topOfClimbAltitude: currentAltitude,
      averageROC: 0,
      averageTAS: 0,
    };
  }

  const segments: ClimbSegment[] = [];
  let currentAlt = currentAltitude;

  // Process each segment of the climb
  while (currentAlt < targetAltitude) {
    const segment = findPerformanceSegment(aircraft.climbTable, currentAlt);

    if (!segment) {
      // If no segment found, we've exceeded the aircraft's climb capability
      console.warn(`No performance data available for altitude ${currentAlt} ft`);
      break;
    }

    // Determine the top of this segment
    const segmentTop = Math.min(segment.altitudeTo, targetAltitude);
    const altitudeGain = segmentTop - currentAlt;

    // Adjust ROC for density altitude and weight
    let adjustedROC = adjustROCForDA(segment.rateOfClimb, currentAlt, densityAltitude);

    // Weight affects ROC: heavier aircraft climb slower
    // Approximation: ROC decreases linearly with weight increase
    adjustedROC = adjustedROC / weightRatio;

    // Calculate time for this segment
    const timeMinutes = altitudeGain / adjustedROC;

    // Calculate distance (using ground speed)
    const distanceNM = (timeMinutes / 60) * groundSpeed;

    // Calculate fuel used
    const fuelUsed = (timeMinutes / 60) * segment.fuelFlow;

    segments.push({
      altitudeFrom: currentAlt,
      altitudeTo: segmentTop,
      rateOfClimb: adjustedROC,
      climbTAS: segment.climbTAS,
      fuelFlow: segment.fuelFlow,
      time: timeMinutes,
      distance: distanceNM,
      fuelUsed: fuelUsed,
    });

    currentAlt = segmentTop;
  }

  // Calculate totals
  const totalTime = segments.reduce((sum, seg) => sum + seg.time, 0);
  const totalDistance = segments.reduce((sum, seg) => sum + seg.distance, 0);
  const totalFuel = segments.reduce((sum, seg) => sum + seg.fuelUsed, 0);
  const totalAltitudeGain = targetAltitude - currentAltitude;
  const averageROC = totalTime > 0 ? totalAltitudeGain / totalTime : 0;

  // Calculate average TAS weighted by time
  const averageTAS = segments.length > 0
    ? segments.reduce((sum, seg) => sum + seg.climbTAS * seg.time, 0) / totalTime
    : 0;

  return {
    segments,
    totalTime,
    totalDistance,
    totalFuel,
    topOfClimbAltitude: currentAlt,
    averageROC,
    averageTAS,
  };
}

/**
 * Calculate Top of Climb position from departure point
 *
 * @param departureLatitude - Departure latitude in degrees
 * @param departureLongitude - Departure longitude in degrees
 * @param trueCourse - True course in degrees
 * @param climbDistance - Distance to climb in NM
 * @returns Top of Climb coordinates
 */
export function calculateTopOfClimbPosition(
  departureLatitude: number,
  departureLongitude: number,
  trueCourse: number,
  climbDistance: number
): { latitude: number; longitude: number } {
  // Convert to radians
  const lat1 = (departureLatitude * Math.PI) / 180;
  const lon1 = (departureLongitude * Math.PI) / 180;
  const bearing = (trueCourse * Math.PI) / 180;

  // Earth radius in nautical miles
  const R = 3440.065;

  // Calculate using great circle navigation
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(climbDistance / R) +
    Math.cos(lat1) * Math.sin(climbDistance / R) * Math.cos(bearing)
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(climbDistance / R) * Math.cos(lat1),
      Math.cos(climbDistance / R) - Math.sin(lat1) * Math.sin(lat2)
    );

  // Convert back to degrees
  return {
    latitude: (lat2 * 180) / Math.PI,
    longitude: (lon2 * 180) / Math.PI,
  };
}

/**
 * Quick estimate of climb performance using simple average ROC
 * Useful when detailed table is not available
 *
 * @param altitudeGain - Altitude to gain in feet
 * @param averageROC - Average rate of climb in ft/min
 * @param groundSpeed - Ground speed in knots
 * @param fuelFlow - Fuel flow in gal/h
 * @returns Quick climb estimates
 */
export function quickClimbEstimate(
  altitudeGain: number,
  averageROC: number,
  groundSpeed: number,
  fuelFlow: number
): {
  time: number; // minutes
  distance: number; // NM
  fuel: number; // gallons
} {
  const time = altitudeGain / averageROC;
  const distance = (time / 60) * groundSpeed;
  const fuel = (time / 60) * fuelFlow;

  return { time, distance, fuel };
}
