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
 * Example 1: NO GO - High altitude, short runway, poor surface, upslope
 * This should trigger multiple errors/warnings
 */
export const TAKEOFF_EXAMPLE_NO_GO: TakeoffExample = {
  name: "NO GO Scenario",
  description: "High altitude, short runway with wet grass and upslope - DANGEROUS!",
  aircraft: "C172N",
  weight: "2300", // Max gross weight
  pa: "6000", // High altitude
  oat: "15", // Standard temp
  runway: "2530", // Short runway
  surface: "wet-grass", // Poor surface
  slope: "2", // Significant upslope
  wind: "0", // No wind
  obstacle: "50", // 50 ft obstacle
};

/**
 * Example 2: Complicated - Challenging but doable (MARGINAL)
 * High altitude, warm day, short runway
 */
export const TAKEOFF_EXAMPLE_COMPLICATED: TakeoffExample = {
  name: "Challenging Takeoff",
  description: "High altitude, warm day, marginal runway - requires careful planning",
  aircraft: "C172N",
  weight: "2250", // Near max weight
  pa: "6000", // High altitude
  oat: "25", // Warm
  runway: "2800", // Marginal runway
  surface: "dry-grass", // Grass surface
  slope: "1", // Slight upslope
  wind: "5", // Light headwind
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
