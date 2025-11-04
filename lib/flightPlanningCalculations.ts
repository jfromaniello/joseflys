// Flight Planning Calculations
// Time-Speed-Distance and Fuel Consumption calculations
// Based on classic E6B / CR-3 calculator functions

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
