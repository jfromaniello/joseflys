// Flight Planning Calculations
// Time-Speed-Distance and Fuel Consumption calculations
// Based on classic E6B / CR-3 calculator functions
// This is used in /planning to solve common Time-Speed-Distance/Fuel problems.

export interface TimeSpeedDistanceResult {
  groundSpeed?: number; // knots
  distance?: number; // nautical miles
  time?: number; // minutes
}

export interface FuelConsumptionResult {
  fuelFlow?: number; // gallons per hour or pounds per hour
  fuelUsed?: number; // gallons or pounds
  time?: number; // minutes
  endurance?: number; // minutes (how long fuel will last)
}

/**
 * Solves Time-Speed-Distance problems
 * Given any 2 of the 3 values, calculates the third
 */
export function calculateTimeSpeedDistance(
  groundSpeed?: number,
  distance?: number,
  timeMinutes?: number
): TimeSpeedDistanceResult {
  // Case 1: Given Speed and Distance, find Time
  if (groundSpeed && distance && !timeMinutes) {
    const time = (distance / groundSpeed) * 60; // Convert hours to minutes
    return { groundSpeed, distance, time };
  }

  // Case 2: Given Distance and Time, find Speed
  if (distance && timeMinutes && !groundSpeed) {
    const timeHours = timeMinutes / 60;
    const speed = distance / timeHours;
    return { groundSpeed: speed, distance, time: timeMinutes };
  }

  // Case 3: Given Speed and Time, find Distance
  if (groundSpeed && timeMinutes && !distance) {
    const timeHours = timeMinutes / 60;
    const dist = groundSpeed * timeHours;
    return { groundSpeed, distance: dist, time: timeMinutes };
  }

  // Return whatever was provided
  return { groundSpeed, distance, time: timeMinutes };
}

/**
 * Solves Fuel Consumption problems
 * Given any 2 of the 3 values, calculates the third
 * Also calculates endurance when fuel flow and fuel available are known
 */
export function calculateFuelConsumption(
  fuelFlow?: number, // GPH or PPH
  fuelUsed?: number, // Gallons or Pounds
  timeMinutes?: number,
  fuelAvailable?: number // For endurance calculations
): FuelConsumptionResult {
  // Case 1: Given Fuel Used and Time, find Fuel Flow
  if (fuelUsed && timeMinutes && !fuelFlow) {
    const timeHours = timeMinutes / 60;
    const flow = fuelUsed / timeHours;
    return { fuelFlow: flow, fuelUsed, time: timeMinutes };
  }

  // Case 2: Given Fuel Flow and Time, find Fuel Used
  if (fuelFlow && timeMinutes && !fuelUsed) {
    const timeHours = timeMinutes / 60;
    const used = fuelFlow * timeHours;
    return { fuelFlow, fuelUsed: used, time: timeMinutes };
  }

  // Case 3: Given Fuel Flow and Fuel Used, find Time
  if (fuelFlow && fuelUsed && !timeMinutes) {
    const timeHours = fuelUsed / fuelFlow;
    const time = timeHours * 60; // Convert to minutes
    return { fuelFlow, fuelUsed, time };
  }

  // Calculate endurance if fuel flow and available fuel are provided
  let endurance: number | undefined;
  if (fuelFlow && fuelAvailable) {
    endurance = (fuelAvailable / fuelFlow) * 60; // Convert hours to minutes
  }

  return { fuelFlow, fuelUsed, time: timeMinutes, endurance };
}

/**
 * Converts time in minutes to hours and minutes format
 */
export function minutesToHoursMinutes(minutes: number): { hours: number; mins: number } {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return { hours, mins };
}

/**
 * Converts hours:minutes to total minutes
 */
export function hoursMinutesToMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

/**
 * Format time in minutes as HH:MM
 */
export function formatTime(minutes: number): string {
  const { hours, mins } = minutesToHoursMinutes(minutes);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Cruise performance result from interpolation
 */
export interface CruisePerformanceResult {
  tas: number; // True Airspeed (KTAS)
  fuelFlow: number; // Fuel flow (gallons per hour)
  percentPower: number; // Actual power setting used
  altitude: number; // Actual altitude used
}

/**
 * Cruise performance entry from aircraft tables
 */
interface CruiseEntry {
  altitude: number;
  percentPower: number;
  tas: number;
  fuelFlow: number;
}

/**
 * Interpolate cruise performance from aircraft cruise tables
 * Finds the closest match for given altitude and power setting
 * Uses bilinear interpolation when between table values
 *
 * @param cruiseTable - Array of cruise performance entries from aircraft
 * @param targetAltitude - Desired cruise altitude in feet
 * @param targetPower - Desired power setting as percentage (e.g., 65 for 65%)
 * @returns Interpolated cruise performance or null if table is empty
 */
export function getCruisePerformance(
  cruiseTable: CruiseEntry[],
  targetAltitude: number,
  targetPower: number
): CruisePerformanceResult | null {
  if (!cruiseTable || cruiseTable.length === 0) {
    return null;
  }

  // Get unique altitudes and power settings from table
  const altitudes = [...new Set(cruiseTable.map((e) => e.altitude))].sort((a, b) => a - b);
  const powerSettings = [...new Set(cruiseTable.map((e) => e.percentPower))].sort((a, b) => a - b);

  // Find bounding values for altitude
  let altLow = altitudes[0];
  let altHigh = altitudes[altitudes.length - 1];
  for (let i = 0; i < altitudes.length - 1; i++) {
    if (targetAltitude >= altitudes[i] && targetAltitude <= altitudes[i + 1]) {
      altLow = altitudes[i];
      altHigh = altitudes[i + 1];
      break;
    }
  }
  // Clamp to table bounds
  const clampedAlt = Math.max(altitudes[0], Math.min(altitudes[altitudes.length - 1], targetAltitude));

  // Find bounding values for power
  let pwrLow = powerSettings[0];
  let pwrHigh = powerSettings[powerSettings.length - 1];
  for (let i = 0; i < powerSettings.length - 1; i++) {
    if (targetPower >= powerSettings[i] && targetPower <= powerSettings[i + 1]) {
      pwrLow = powerSettings[i];
      pwrHigh = powerSettings[i + 1];
      break;
    }
  }
  // Clamp to table bounds
  const clampedPwr = Math.max(powerSettings[0], Math.min(powerSettings[powerSettings.length - 1], targetPower));

  // Helper to find entry at specific altitude and power
  const findEntry = (alt: number, pwr: number): CruiseEntry | undefined => {
    return cruiseTable.find((e) => e.altitude === alt && e.percentPower === pwr);
  };

  // Get the 4 corner entries for bilinear interpolation
  const e00 = findEntry(altLow, pwrLow);
  const e01 = findEntry(altLow, pwrHigh);
  const e10 = findEntry(altHigh, pwrLow);
  const e11 = findEntry(altHigh, pwrHigh);

  // If we can't find all corners, fall back to nearest match
  if (!e00 || !e01 || !e10 || !e11) {
    // Find the closest entry
    let closest = cruiseTable[0];
    let minDist = Infinity;
    for (const entry of cruiseTable) {
      const altDist = Math.abs(entry.altitude - targetAltitude) / 1000; // Normalize altitude
      const pwrDist = Math.abs(entry.percentPower - targetPower);
      const dist = altDist + pwrDist;
      if (dist < minDist) {
        minDist = dist;
        closest = entry;
      }
    }
    return {
      tas: closest.tas,
      fuelFlow: closest.fuelFlow,
      percentPower: closest.percentPower,
      altitude: closest.altitude,
    };
  }

  // Bilinear interpolation
  const altFrac = altHigh !== altLow ? (clampedAlt - altLow) / (altHigh - altLow) : 0;
  const pwrFrac = pwrHigh !== pwrLow ? (clampedPwr - pwrLow) / (pwrHigh - pwrLow) : 0;

  // Interpolate TAS
  const tas0 = e00.tas + (e01.tas - e00.tas) * pwrFrac;
  const tas1 = e10.tas + (e11.tas - e10.tas) * pwrFrac;
  const tas = tas0 + (tas1 - tas0) * altFrac;

  // Interpolate fuel flow
  const ff0 = e00.fuelFlow + (e01.fuelFlow - e00.fuelFlow) * pwrFrac;
  const ff1 = e10.fuelFlow + (e11.fuelFlow - e10.fuelFlow) * pwrFrac;
  const fuelFlow = ff0 + (ff1 - ff0) * altFrac;

  return {
    tas: Math.round(tas),
    fuelFlow: Math.round(fuelFlow * 10) / 10, // Round to 1 decimal
    percentPower: clampedPwr,
    altitude: clampedAlt,
  };
}
