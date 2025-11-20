export type SpeedUnit = 'kt' | 'kmh' | 'mph';

/**
 * Convert any speed unit to knots (the standard unit used in calculations)
 */
export function toKnots(value: number, unit: SpeedUnit): number {
  switch (unit) {
    case 'kt':
      return value;
    case 'kmh':
      return value / 1.852; // 1 knot = 1.852 km/h
    case 'mph':
      return value / 1.15078; // 1 knot = 1.15078 mph
  }
}

/**
 * Convert knots to any speed unit
 */
export function fromKnots(valueInKnots: number, targetUnit: SpeedUnit): number {
  switch (targetUnit) {
    case 'kt':
      return valueInKnots;
    case 'kmh':
      return valueInKnots * 1.852;
    case 'mph':
      return valueInKnots * 1.15078;
  }
}

/**
 * Get the label for a speed unit
 */
export function getSpeedUnitLabel(unit: SpeedUnit): string {
  switch (unit) {
    case 'kt':
      return 'KT';
    case 'kmh':
      return 'km/h';
    case 'mph':
      return 'mph';
  }
}

/**
 * Get the full name for a speed unit
 */
export function getSpeedUnitName(unit: SpeedUnit): string {
  switch (unit) {
    case 'kt':
      return 'knots';
    case 'kmh':
      return 'kilometers per hour';
    case 'mph':
      return 'miles per hour';
  }
}

/**
 * Get the corresponding distance unit for a speed unit
 * Returns the symbol used in unitConversions.ts
 */
export function getDistanceUnitForSpeed(speedUnit: SpeedUnit): string {
  switch (speedUnit) {
    case 'kt':
      return 'NM'; // Nautical miles
    case 'kmh':
      return 'KM'; // Kilometers
    case 'mph':
      return 'SM'; // Statute miles
  }
}
