export type FuelUnit = 'gph' | 'lph' | 'pph' | 'kgh';

/**
 * Get the label for a fuel unit
 */
export function getFuelUnitLabel(unit: FuelUnit): string {
  switch (unit) {
    case 'gph':
      return 'GPH'; // Gallons Per Hour
    case 'lph':
      return 'LPH'; // Liters Per Hour
    case 'pph':
      return 'PPH'; // Pounds Per Hour
    case 'kgh':
      return 'KG/H'; // Kilograms Per Hour
  }
}

/**
 * Get the full name for a fuel unit
 */
export function getFuelUnitName(unit: FuelUnit): string {
  switch (unit) {
    case 'gph':
      return 'gallons per hour';
    case 'lph':
      return 'liters per hour';
    case 'pph':
      return 'pounds per hour';
    case 'kgh':
      return 'kilograms per hour';
  }
}

/**
 * Get the result unit (without "per hour") for fuel used display
 */
export function getFuelResultUnit(unit: FuelUnit): string {
  switch (unit) {
    case 'gph':
      return 'GAL';
    case 'lph':
      return 'L';
    case 'pph':
      return 'LB';
    case 'kgh':
      return 'KG';
  }
}
