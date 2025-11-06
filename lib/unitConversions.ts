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
}

// Distance conversions (base unit: nautical miles)
export const distanceUnits: UnitInfo[] = [
  {
    symbol: 'NM',
    name: 'Nautical Miles',
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  {
    symbol: 'SM',
    name: 'Statute Miles',
    toBase: (v) => v * 0.868976,
    fromBase: (v) => v / 0.868976,
  },
  {
    symbol: 'KM',
    name: 'Kilometers',
    toBase: (v) => v * 0.539957,
    fromBase: (v) => v / 0.539957,
  },
  {
    symbol: 'M',
    name: 'Meters',
    toBase: (v) => v * 0.000539957,
    fromBase: (v) => v / 0.000539957,
  },
  {
    symbol: 'FT',
    name: 'Feet',
    toBase: (v) => v * 0.000164579,
    fromBase: (v) => v / 0.000164579,
  },
];

// Speed conversions (base unit: knots)
export const speedUnits: UnitInfo[] = [
  {
    symbol: 'KT',
    name: 'Knots',
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  {
    symbol: 'MPH',
    name: 'Miles per Hour',
    toBase: (v) => v * 0.868976,
    fromBase: (v) => v / 0.868976,
  },
  {
    symbol: 'KPH',
    name: 'Kilometers per Hour',
    toBase: (v) => v * 0.539957,
    fromBase: (v) => v / 0.539957,
  },
  {
    symbol: 'M/S',
    name: 'Meters per Second',
    toBase: (v) => v * 1.94384,
    fromBase: (v) => v / 1.94384,
  },
  {
    symbol: 'FPM',
    name: 'Feet per Minute',
    toBase: (v) => v * 0.00987473,
    fromBase: (v) => v / 0.00987473,
  },
];

// Fuel/Volume conversions (base unit: US gallons)
export const fuelUnits: UnitInfo[] = [
  {
    symbol: 'US GAL',
    name: 'US Gallons',
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  {
    symbol: 'IMP GAL',
    name: 'Imperial Gallons',
    toBase: (v) => v * 1.20095,
    fromBase: (v) => v / 1.20095,
  },
  {
    symbol: 'L',
    name: 'Liters',
    toBase: (v) => v * 0.264172,
    fromBase: (v) => v / 0.264172,
  },
  {
    symbol: 'QT',
    name: 'Quarts',
    toBase: (v) => v * 0.25,
    fromBase: (v) => v / 0.25,
  },
  {
    symbol: 'PT',
    name: 'Pints',
    toBase: (v) => v * 0.125,
    fromBase: (v) => v / 0.125,
  },
  {
    symbol: 'kg Jet A',
    name: 'Kilograms Jet A/A-1',
    toBase: (v) => v / 3.02833, // Jet A density: 0.80 kg/L × 3.78541 L/gal
    fromBase: (v) => v * 3.02833,
  },
  {
    symbol: 'kg 100LL',
    name: 'Kilograms 100LL',
    toBase: (v) => v / 2.72549, // 100LL density: 0.72 kg/L × 3.78541 L/gal
    fromBase: (v) => v * 2.72549,
  },
];

// Temperature conversions
export const temperatureUnits: UnitInfo[] = [
  {
    symbol: '°C',
    name: 'Celsius',
    toBase: (v) => v, // Base is Celsius
    fromBase: (v) => v,
  },
  {
    symbol: '°F',
    name: 'Fahrenheit',
    toBase: (v) => (v - 32) * 5 / 9,
    fromBase: (v) => (v * 9 / 5) + 32,
  },
  {
    symbol: 'K',
    name: 'Kelvin',
    toBase: (v) => v - 273.15,
    fromBase: (v) => v + 273.15,
  },
];

// Weight conversions (base unit: pounds)
export const weightUnits: UnitInfo[] = [
  {
    symbol: 'LBS',
    name: 'Pounds',
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  {
    symbol: 'KG',
    name: 'Kilograms',
    toBase: (v) => v * 2.20462,
    fromBase: (v) => v / 2.20462,
  },
  {
    symbol: 'OZ',
    name: 'Ounces',
    toBase: (v) => v * 0.0625,
    fromBase: (v) => v / 0.0625,
  },
  {
    symbol: 'TON',
    name: 'US Tons',
    toBase: (v) => v * 2000,
    fromBase: (v) => v / 2000,
  },
  {
    symbol: 'MT',
    name: 'Metric Tons',
    toBase: (v) => v * 2204.62,
    fromBase: (v) => v / 2204.62,
  },
];

// Pressure conversions (base unit: inches of mercury)
export const pressureUnits: UnitInfo[] = [
  {
    symbol: 'inHg',
    name: 'Inches of Mercury',
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  {
    symbol: 'hPa',
    name: 'Hectopascals',
    toBase: (v) => v * 0.0295301,
    fromBase: (v) => v / 0.0295301,
  },
  {
    symbol: 'mb',
    name: 'Millibars',
    toBase: (v) => v * 0.0295301,
    fromBase: (v) => v / 0.0295301,
  },
  {
    symbol: 'PSI',
    name: 'Pounds per Square Inch',
    toBase: (v) => v * 2.03602,
    fromBase: (v) => v / 2.03602,
  },
  {
    symbol: 'kPa',
    name: 'Kilopascals',
    toBase: (v) => v * 0.295301,
    fromBase: (v) => v / 0.295301,
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
