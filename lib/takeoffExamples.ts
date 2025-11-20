/**
 * Takeoff Calculator Example Scenarios
 *
 * Three rotating examples:
 * 1. NO GO - Dangerous conditions that should fail validation
 * 2. Complicated - Challenging but doable conditions
 * 3. Easy - Ideal conditions with plenty of margin
 */

export interface TakeoffExample {
  name: string;
  description: string;
  aircraft: string;
  weight: string;
  pa: string;
  oat: string;
  runway: string;
  surface: "dry-asphalt" | "wet-asphalt" | "dry-grass" | "wet-grass";
  slope: string;
  wind: string;
  obstacle: string;
}

/**
 * Example 1: NO GO - Hot day, marginal runway, tailwind, poor surface
 * This should trigger multiple errors/warnings
 */
export const TAKEOFF_EXAMPLE_NO_GO: TakeoffExample = {
  name: "NO GO Scenario",
  description: "Hot day, marginal runway with tailwind and poor surface - DANGEROUS!",
  aircraft: "C172N",
  weight: "2300", // Max gross weight
  pa: "2000", // Moderate altitude
  oat: "30", // Very hot (ISA +25°C)
  runway: "2400", // Marginal runway length
  surface: "dry-grass", // Poor surface
  slope: "1.5", // Upslope
  wind: "-5", // 5 kt tailwind (negative headwind)
  obstacle: "50", // 50 ft obstacle
};

/**
 * Example 2: Complicated - Challenging but doable
 * Moderate altitude, reasonable runway, some headwind
 */
export const TAKEOFF_EXAMPLE_COMPLICATED: TakeoffExample = {
  name: "Challenging Takeoff",
  description: "Moderate altitude, warm day, adequate runway - requires careful planning",
  aircraft: "C172N",
  weight: "2200", // Near max weight
  pa: "5000", // Moderate altitude
  oat: "20", // Warm (ISA +10°C)
  runway: "2500", // Adequate runway
  surface: "dry-asphalt", // Good surface
  slope: "0.5", // Slight upslope
  wind: "8", // 8 kt headwind
  obstacle: "50", // 50 ft obstacle
};

/**
 * Example 3: Easy - Ideal conditions
 * Low altitude, cool day, long runway, good headwind
 */
export const TAKEOFF_EXAMPLE_EASY: TakeoffExample = {
  name: "Ideal Conditions",
  description: "Sea level, cool day, long runway with strong headwind - plenty of margin",
  aircraft: "C172N",
  weight: "2000", // Below max weight
  pa: "0", // Sea level
  oat: "10", // Cool (ISA -5°C)
  runway: "5000", // Long runway
  surface: "dry-asphalt", // Perfect surface
  slope: "0", // Level runway
  wind: "15", // 15 kt headwind
  obstacle: "50", // 50 ft obstacle
};

/**
 * Array of all examples in rotation order
 */
export const TAKEOFF_EXAMPLES = [
  TAKEOFF_EXAMPLE_EASY,
  TAKEOFF_EXAMPLE_COMPLICATED,
  TAKEOFF_EXAMPLE_NO_GO,
] as const;
