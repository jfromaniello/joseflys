/**
 * Time unit conversion utilities
 */

export type TimeUnit = "hrs" | "min";

/**
 * Get display label for time unit
 */
export function getTimeUnitLabel(unit: TimeUnit): string {
  switch (unit) {
    case "hrs":
      return "HRS";
    case "min":
      return "MIN";
    default:
      return "HRS";
  }
}

/**
 * Convert time from any unit to minutes (base unit)
 */
export function toMinutes(value: number, unit: TimeUnit): number {
  switch (unit) {
    case "hrs":
      return value * 60;
    case "min":
      return value;
    default:
      return value * 60;
  }
}

/**
 * Convert time from minutes (base unit) to any unit
 */
export function fromMinutes(minutes: number, unit: TimeUnit): number {
  switch (unit) {
    case "hrs":
      return minutes / 60;
    case "min":
      return minutes;
    default:
      return minutes / 60;
  }
}
