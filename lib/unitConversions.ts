// Unit Conversion Library
// Inspired by the Jeppesen CR-3 calculator

export type Category = 'distance' | 'speed' | 'fuel' | 'temperature' | 'weight' | 'pressure';

export interface ConversionResult {
  value: number;
  unit: string;
  category: Category;
}

export interface CategoryInfo {
  name: string;
  units: UnitInfo[];
}

export interface UnitInfo {
  symbol: string;
  name: string;
  toBase: (value: number) => number;
  fromBase: (value: number) => number;
  conversionFactor?: number; // Factor for simple multiplication/division conversions
  conversionFormula?: string; // Custom formula for complex conversions (e.g., temperature)
}

// Distance conversions (base unit: meters)
export const distanceUnits: UnitInfo[] = [
  {
    symbol: 'M',
    name: 'Meters',
    toBase: (v) => v,
    fromBase: (v) => v,
    conversionFactor: 1,
  },
  {
    symbol: 'FT',
    name: 'Feet',
    toBase: (v) => v * 0.3048, // Exact: 381/1250
    fromBase: (v) => v / 0.3048,
    conversionFactor: 0.3048,
  },
  {
    symbol: 'SM',
    name: 'Statute Miles',
    toBase: (v) => v * 1609.344, // Exact: 201168/125
    fromBase: (v) => v / 1609.344,
    conversionFactor: 1609.344,
  },
  {
    symbol: 'NM',
    name: 'Nautical Miles',
    toBase: (v) => v * 1852, // Exact: 1852/1
    fromBase: (v) => v / 1852,
    conversionFactor: 1852,
  },
  {
    symbol: 'KM',
    name: 'Kilometers',
    toBase: (v) => v * 1000,
    fromBase: (v) => v / 1000,
    conversionFactor: 1000,
  },
];

// Speed conversions (base unit: meters per second)
export const speedUnits: UnitInfo[] = [
  {
    symbol: 'M/S',
    name: 'Meters per Second',
    toBase: (v) => v,
    fromBase: (v) => v,
    conversionFactor: 1,
  },
  {
    symbol: 'KPH',
    name: 'Kilometers per Hour',
    toBase: (v) => v / 3.6, // 1 km/h = 1000m/3600s = 1/3.6 m/s
    fromBase: (v) => v * 3.6,
    conversionFactor: 3.6,
  },
  {
    symbol: 'KT',
    name: 'Knots',
    toBase: (v) => v * 1852 / 3600, // 1 NM/hour = 1852m/3600s ≈ 0.514444 m/s
    fromBase: (v) => v * 3600 / 1852,
    conversionFactor: 3600 / 1852, // ≈ 1.94384 for display
  },
  {
    symbol: 'MPH',
    name: 'Miles per Hour',
    toBase: (v) => v * 1609.344 / 3600, // 1 mi/hour = 1609.344m/3600s ≈ 0.44704 m/s
    fromBase: (v) => v * 3600 / 1609.344,
    conversionFactor: 3600 / 1609.344, // ≈ 2.23694
  },
  {
    symbol: 'FPM',
    name: 'Feet per Minute',
    toBase: (v) => v * 0.3048 / 60, // 1 ft/min = 0.3048m/60s = 0.00508 m/s
    fromBase: (v) => v * 60 / 0.3048,
    conversionFactor: 60 / 0.3048, // ≈ 196.85
  },
];

// Fuel/Volume conversions (base unit: liters)
export const fuelUnits: UnitInfo[] = [
  {
    symbol: 'L',
    name: 'Liters',
    toBase: (v) => v,
    fromBase: (v) => v,
    conversionFactor: 1,
  },
  {
    symbol: 'US GAL',
    name: 'US Gallons',
    toBase: (v) => v * 3.785411784, // Exact definition
    fromBase: (v) => v / 3.785411784,
    conversionFactor: 3.785411784,
  },
  {
    symbol: 'IMP GAL',
    name: 'Imperial Gallons',
    toBase: (v) => v * 4.54609, // Exact: 4.54609 L
    fromBase: (v) => v / 4.54609,
    conversionFactor: 4.54609,
  },
  {
    symbol: 'QT',
    name: 'Quarts',
    toBase: (v) => v * 3.785411784 / 4, // 1/4 US gallon
    fromBase: (v) => v / (3.785411784 / 4),
    conversionFactor: 3.785411784 / 4,
  },
  {
    symbol: 'PT',
    name: 'Pints',
    toBase: (v) => v * 3.785411784 / 8, // 1/8 US gallon
    fromBase: (v) => v / (3.785411784 / 8),
    conversionFactor: 3.785411784 / 8,
  },
  {
    symbol: 'kg Jet A',
    name: 'Kilograms Jet A/A-1',
    toBase: (v) => v / 0.80, // Jet A density: ~0.80 kg/L (approximate, varies with temp)
    fromBase: (v) => v * 0.80,
    conversionFactor: 0.80,
  },
  {
    symbol: 'kg 100LL',
    name: 'Kilograms 100LL',
    toBase: (v) => v / 0.72, // 100LL density: ~0.72 kg/L (approximate, varies with temp)
    fromBase: (v) => v * 0.72,
    conversionFactor: 0.72,
  },
];

// Temperature conversions
export const temperatureUnits: UnitInfo[] = [
  {
    symbol: '°C',
    name: 'Celsius',
    toBase: (v) => v, // Base is Celsius
    fromBase: (v) => v,
    conversionFormula: 'x',
  },
  {
    symbol: '°F',
    name: 'Fahrenheit',
    toBase: (v) => (v - 32) * 5 / 9,
    fromBase: (v) => (v * 9 / 5) + 32,
    conversionFormula: '(x × 9/5) + 32',
  },
  {
    symbol: 'K',
    name: 'Kelvin',
    toBase: (v) => v - 273.15,
    fromBase: (v) => v + 273.15,
    conversionFormula: 'x + 273.15',
  },
];

// Weight conversions (base unit: kilograms)
export const weightUnits: UnitInfo[] = [
  {
    symbol: 'KG',
    name: 'Kilograms',
    toBase: (v) => v,
    fromBase: (v) => v,
    conversionFactor: 1,
  },
  {
    symbol: 'LBS',
    name: 'Pounds',
    toBase: (v) => v * 0.45359237, // Exact: 1 lb = 0.45359237 kg
    fromBase: (v) => v / 0.45359237,
    conversionFactor: 0.45359237,
  },
  {
    symbol: 'OZ',
    name: 'Ounces',
    toBase: (v) => v * 0.45359237 / 16, // 1/16 pound
    fromBase: (v) => v / (0.45359237 / 16),
    conversionFactor: 0.45359237 / 16,
  },
  {
    symbol: 'TON',
    name: 'US Tons',
    toBase: (v) => v * 0.45359237 * 2000, // 2000 pounds
    fromBase: (v) => v / (0.45359237 * 2000),
    conversionFactor: 0.45359237 * 2000,
  },
  {
    symbol: 'MT',
    name: 'Metric Tons',
    toBase: (v) => v * 1000, // 1000 kg
    fromBase: (v) => v / 1000,
    conversionFactor: 1000,
  },
];

// Pressure conversions (base unit: pascals)
export const pressureUnits: UnitInfo[] = [
  {
    symbol: 'hPa',
    name: 'Hectopascals',
    toBase: (v) => v * 100, // 1 hPa = 100 Pa
    fromBase: (v) => v / 100,
    conversionFactor: 100,
  },
  {
    symbol: 'mb',
    name: 'Millibars',
    toBase: (v) => v * 100, // 1 mb = 100 Pa (millibar = hectopascal)
    fromBase: (v) => v / 100,
    conversionFactor: 100,
  },
  {
    symbol: 'kPa',
    name: 'Kilopascals',
    toBase: (v) => v * 1000, // 1 kPa = 1000 Pa
    fromBase: (v) => v / 1000,
    conversionFactor: 1000,
  },
  {
    symbol: 'inHg',
    name: 'Inches of Mercury',
    toBase: (v) => v * 3386.389, // 1 inHg ≈ 3386.389 Pa (at 0°C, standard gravity)
    fromBase: (v) => v / 3386.389,
    conversionFactor: 3386.389,
  },
  {
    symbol: 'PSI',
    name: 'Pounds per Square Inch',
    toBase: (v) => v * 6894.757, // 1 psi ≈ 6894.757 Pa
    fromBase: (v) => v / 6894.757,
    conversionFactor: 6894.757,
  },
];

export const categories: Record<Category, CategoryInfo> = {
  distance: { name: 'Distance', units: distanceUnits },
  speed: { name: 'Speed', units: speedUnits },
  fuel: { name: 'Fuel/Volume', units: fuelUnits },
  temperature: { name: 'Temperature', units: temperatureUnits },
  weight: { name: 'Weight', units: weightUnits },
  pressure: { name: 'Pressure', units: pressureUnits },
};

export function convert(
  value: number,
  fromUnit: string,
  toUnit: string,
  category: Category
): number | null {
  if (isNaN(value)) return null;

  const categoryInfo = categories[category];
  if (!categoryInfo) return null;

  const fromUnitInfo = categoryInfo.units.find(u => u.symbol === fromUnit);
  const toUnitInfo = categoryInfo.units.find(u => u.symbol === toUnit);

  if (!fromUnitInfo || !toUnitInfo) return null;

  // Convert to base unit, then to target unit
  const baseValue = fromUnitInfo.toBase(value);
  return toUnitInfo.fromBase(baseValue);
}

export function getAllConversions(
  value: number,
  fromUnit: string,
  category: Category
): ConversionResult[] {
  if (isNaN(value)) return [];

  const categoryInfo = categories[category];
  if (!categoryInfo) return [];

  const fromUnitInfo = categoryInfo.units.find(u => u.symbol === fromUnit);
  if (!fromUnitInfo) return [];

  const baseValue = fromUnitInfo.toBase(value);

  return categoryInfo.units
    .filter(u => u.symbol !== fromUnit)
    .map(u => ({
      value: u.fromBase(baseValue),
      unit: u.symbol,
      category,
    }));
}

export function getConversionFormula(
  fromUnit: string,
  toUnit: string,
  category: Category
): string {
  const categoryInfo = categories[category];
  if (!categoryInfo) return '';

  const fromUnitInfo = categoryInfo.units.find(u => u.symbol === fromUnit);
  const toUnitInfo = categoryInfo.units.find(u => u.symbol === toUnit);

  if (!fromUnitInfo || !toUnitInfo) return '';

  // If units have custom formulas (like temperature)
  if (toUnitInfo.conversionFormula) {
    return toUnitInfo.conversionFormula;
  }

  // If units have conversion factors (simple multiplication/division)
  if (toUnitInfo.conversionFactor !== undefined && fromUnitInfo.conversionFactor !== undefined) {
    const factor = toUnitInfo.conversionFactor / fromUnitInfo.conversionFactor;

    if (factor === 1) {
      return 'x';
    } else if (factor > 1) {
      return `x × ${factor.toFixed(6).replace(/\.?0+$/, '')}`;
    } else {
      return `x ÷ ${(1 / factor).toFixed(6).replace(/\.?0+$/, '')}`;
    }
  }

  return '';
}
