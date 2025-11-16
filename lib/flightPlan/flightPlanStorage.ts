import { calculateLegResults } from "./flightPlanCalculations";
import { SpeedUnit } from "../speedConversion";

/**
 * Flight Plan Storage
 * Manages persistence of flight plans with multiple legs in localStorage
 */

/**
 * Represents a geographic point with coordinates
 * Used for leg endpoints (from/to) and intermediate waypoints
 */
export interface LegPoint {
  /**
   * Name or identifier of the point
   * @example "KJFK", "VOR ABC", "FIXES", "Mountain Pass"
   */
  name: string;

  /**
   * Latitude in decimal degrees (WGS-84)
   * @example 40.6413 for JFK airport
   */
  lat?: number;

  /**
   * Longitude in decimal degrees (WGS-84)
   * @example -73.7781 for JFK airport
   */
  lon?: number;
}

/**
 * Represents an intermediate waypoint along a flight plan leg
 *
 * Waypoints allow pilots to track progress along a leg by marking specific
 * geographic points and their distances from the leg's starting point.
 *
 * @deprecated - Use LegPoint instead. This interface is kept for backward compatibility.
 */
export interface Waypoint {
  /**
   * Name or identifier of the waypoint
   * @example "VOR ABC", "FIXES", "Mountain Pass"
   */
  name: string;

  /**
   * Cumulative distance from the start of the leg in nautical miles (NM)
   * This represents how far along the leg this waypoint is located
   * @example 15.5 for a waypoint 15.5 NM from the leg start
   */
  distance: number;
}

/**
 * Represents a single leg in a flight plan
 *
 * A leg contains all flight navigation data, fuel calculations, and aircraft information
 * for one segment of a multi-leg flight plan. Legs are ordered sequentially and can include
 * climb and descent phases with their respective performance data.
 */
export interface FlightPlanLeg {
  /**
   * Unique 5-character alphanumeric identifier for this leg
   */
  id: string;

  /**
   * Zero-based position of this leg in the flight plan sequence
   * @example 0 for first leg, 1 for second leg, etc.
   */
  index: number;

  // Flight navigation & wind
  /**
   * True heading in degrees (0-359°)
   */
  th: number;

  /**
   * True airspeed
   */
  tas: number;

  /**
   * Wind direction in degrees (0-359°)
   * Optional - only present when wind is specified
   */
  wd?: number;

  /**
   * Wind speed
   * Optional - only present when wind is specified
   */
  ws?: number;

  /**
   * Magnetic variation in degrees (WMM convention: positive=E, negative=W)
   * PREFERRED - If present, this value takes priority over 'md'
   * Optional - for backward compatibility with existing flight plans
   */
  var?: number;

  /**
   * Magnetic variation in degrees (LEGACY: positive=W, negative=E)
   * DEPRECATED - Use 'var' instead. This field is kept for backward compatibility.
   * If 'var' is present, 'md' is ignored.
   * Used to calculate magnetic course from true course
   */
  md: number;

  // Distance & waypoints
  /**
   * Leg distance in nautical miles (NM)
   */
  dist: number;

  /**
   * Starting point of the leg with coordinates
   * Optional - if not provided, shows "Leg Start" in UI
   * When coordinates are present, True Heading, Distance, and Mag Var can be auto-calculated
   */
  from?: LegPoint;

  /**
   * Ending point of the leg with coordinates
   * Optional - if not provided, shows "Leg End" in UI
   * When coordinates are present, True Heading, Distance, and Mag Var can be auto-calculated
   */
  to?: LegPoint;

  /**
   * Array of checkpoints with coordinates along the route
   * These points are located between start and end of leg
   * Used to calculate the leg timeline with distances, times, and fuel for each checkpoint
   */
  checkpoints?: LegPoint[];

  /**
   * Array of intermediate waypoints along this leg (LEGACY)
   * Each waypoint includes name and cumulative distance from leg start
   * @deprecated - Use from/to/viaPoints instead. Kept for backward compatibility.
   */
  waypoints?: Waypoint[];

  /**
   * Name of the departure city (from route lookup) (LEGACY)
   * Optional - only present when route was looked up by city/airport search
   * @example "Madrid", "KJFK"
   * @deprecated - Use from.name instead
   */
  fromCity?: string;

  /**
   * Name of the destination city (from route lookup) (LEGACY)
   * Optional - only present when route was looked up by city/airport search
   * @example "Barcelona", "EGLL"
   * @deprecated - Use to.name instead
   */
  toCity?: string;

  // Fuel
  /**
   * Fuel flow rate
   */
  ff: number;

  /**
   * Fuel consumption unit
   * @example "gph" (gallons per hour), "lph" (liters per hour), "pph" (pounds per hour), "kgh" (kilograms per hour)
   */
  fuelUnit: string;

  /**
   * Cumulative fuel used from all previous legs
   * Optional - only present for legs after the first
   */
  prevFuel?: number;

  // Aircraft
  /**
   * Serialized aircraft performance data encoded in CBOR format and base64url
   * Contains aircraft-specific performance characteristics
   */
  plane: string;

  // Flight tracking
  /**
   * Departure time in 24-hour format (HHMM)
   * Optional - only present when flight timing is specified
   * @example "1430" for 2:30 PM
   */
  depTime?: string;

  /**
   * Cumulative elapsed time in minutes from flight start to end of this leg
   */
  elapsedMin?: number;

  /**
   * Cumulative distance in nautical miles traveled in all previous legs
   * Optional - only present for legs after the first
   * Used to calculate total distance from departure in waypoint displays
   */
  elapsedDist?: number;

  // Climb data
  /**
   * True airspeed during climb phase
   * Optional - only present when climb performance is specified
   */
  climbTas?: number;

  /**
   * Distance covered during climb phase in nautical miles
   * Optional - only present when climb performance is specified
   */
  climbDist?: number;

  /**
   * Fuel consumed during climb phase
   * Optional - only present when climb performance is specified
   */
  climbFuel?: number;

  /**
   * Wind direction during climb in degrees (0-359°)
   * Optional - only present when climb wind conditions differ from cruise
   */
  climbWd?: number;

  /**
   * Wind speed during climb
   * Optional - only present when climb wind conditions differ from cruise
   */
  climbWs?: number;

  // Descent data
  /**
   * True airspeed during descent phase
   * Optional - only present when descent performance is specified
   */
  descentTas?: number;

  /**
   * Distance covered during descent phase in nautical miles
   * Optional - only present when descent performance is specified
   */
  descentDist?: number;

  /**
   * Fuel consumed during descent phase
   * Optional - only present when descent performance is specified
   */
  descentFuel?: number;

  /**
   * Wind direction during descent in degrees (0-359°)
   * Optional - only present when descent wind conditions differ from cruise
   */
  descentWd?: number;

  /**
   * Wind speed during descent
   * Optional - only present when descent wind conditions differ from cruise
   */
  descentWs?: number;

  // Additional fuel
  /**
   * Additional regulatory fuel in minutes (e.g., for reserves, 30 min holding, etc.)
   * Optional - typically used for alternative legs to add required fuel reserves
   * Calculated as: additionalFuel (minutes) × fuelFlow
   * @example 30 for 30 minutes of reserve fuel
   */
  additionalFuel?: number;

  /**
   * Approach and landing fuel in gallons
   * Optional - only for final legs (legs with descent data)
   * This represents the fuel consumed during approach and landing phases
   * @example 5 for 5 gallons of approach/landing fuel
   */
  approachLandingFuel?: number;

  // Display
  /**
   * User-provided description or name for this leg
   * Optional - typically contains departure/arrival airports or waypoint names
   * @example "KJFK to KBOS"
   */
  desc?: string;

  /**
   * Speed display unit
   * @example "kt" (knots), "kmh" (kilometers per hour), "mph" (miles per hour)
   */
  unit: SpeedUnit;
}

export interface FlightPlan {
  id: string; // 5-character short ID
  name: string; // User-provided name
  date?: string; // Optional flight date (YYYY-MM-DD format)
  created_at: number; // Timestamp (Date.now())
  updated_at: number; // Timestamp (Date.now())
  legs: FlightPlanLeg[]; // Array of legs
}

const STORAGE_KEY = "flight_plans";

/**
 * Helper to parse numeric values that might be strings (from old data)
 * Supports backwards compatibility when loading from localStorage
 */
function parseNumericValue(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

/**
 * Migrate old leg data (with strings) to new format (with numbers)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateLegData(leg: any): FlightPlanLeg {
  const parsedTh = parseNumericValue(leg.th);
  const parsedTas = parseNumericValue(leg.tas);
  const parsedMd = parseNumericValue(leg.md);
  const parsedDist = parseNumericValue(leg.dist);
  const parsedFf = parseNumericValue(leg.ff);

  // If required fields are missing, use defaults (should not happen in valid data)
  return {
    ...leg,
    th: parsedTh ?? 0,
    tas: parsedTas ?? 0,
    wd: parseNumericValue(leg.wd),
    ws: parseNumericValue(leg.ws),
    md: parsedMd ?? 0,
    dist: parsedDist ?? 0,
    ff: parsedFf ?? 0,
    prevFuel: parseNumericValue(leg.prevFuel),
    elapsedMin: parseNumericValue(leg.elapsedMin),
    climbTas: parseNumericValue(leg.climbTas),
    climbDist: parseNumericValue(leg.climbDist),
    climbFuel: parseNumericValue(leg.climbFuel),
    climbWd: parseNumericValue(leg.climbWd),
    climbWs: parseNumericValue(leg.climbWs),
    descentTas: parseNumericValue(leg.descentTas),
    descentDist: parseNumericValue(leg.descentDist),
    descentFuel: parseNumericValue(leg.descentFuel),
    descentWd: parseNumericValue(leg.descentWd),
    descentWs: parseNumericValue(leg.descentWs),
  };
}

/**
 * Generate a 5-character alphanumeric short ID
 * Similar to aircraft IDs but using 5 chars instead of 6
 */
export function generateShortId(): string {
  const timestamp = Date.now();
  const random = Math.random();
  const combined = `${timestamp}${random}`;

  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  // Convert to base36 and take first 5 chars
  return Math.abs(hash).toString(36).substring(0, 5);
}

/**
 * Load all flight plans from localStorage
 */
export function loadFlightPlans(): FlightPlan[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const plans = JSON.parse(stored) as FlightPlan[];

    // Migrate old data (strings) to new format (numbers)
    const migratedPlans = plans.map((plan) => ({
      ...plan,
      legs: plan.legs.map((leg) => migrateLegData(leg)),
    }));

    // Sort by updated_at descending (most recent first)
    return migratedPlans.sort((a, b) => b.updated_at - a.updated_at);
  } catch (error) {
    console.error("Failed to load flight plans:", error);
    return [];
  }
}

/**
 * Save all flight plans to localStorage
 */
function saveFlightPlans(plans: FlightPlan[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  } catch (error) {
    console.error("Failed to save flight plans:", error);
    throw new Error("Failed to save flight plans to localStorage");
  }
}

/**
 * Get a single flight plan by ID
 */
export function getFlightPlanById(id: string): FlightPlan | null {
  const plans = loadFlightPlans();
  return plans.find((p) => p.id === id) || null;
}

/**
 * Create a new flight plan
 */
export function createFlightPlan(
  name: string,
  date?: string
): FlightPlan {
  const plans = loadFlightPlans();
  const id = generateShortId();
  const now = Date.now();

  const newPlan: FlightPlan = {
    id,
    name,
    date,
    created_at: now,
    updated_at: now,
    legs: [],
  };

  plans.push(newPlan);
  saveFlightPlans(plans);

  return newPlan;
}

/**
 * Update an existing flight plan's metadata
 */
export function updateFlightPlan(
  id: string,
  updates: { name?: string; date?: string }
): FlightPlan | null {
  const plans = loadFlightPlans();
  const planIndex = plans.findIndex((p) => p.id === id);

  if (planIndex === -1) return null;

  const plan = plans[planIndex];
  if (updates.name !== undefined) plan.name = updates.name;
  if (updates.date !== undefined) plan.date = updates.date;
  plan.updated_at = Date.now();

  saveFlightPlans(plans);
  return plan;
}

/**
 * Delete a flight plan
 */
export function deleteFlightPlan(id: string): boolean {
  const plans = loadFlightPlans();
  const filtered = plans.filter((p) => p.id !== id);

  if (filtered.length === plans.length) return false; // Not found

  saveFlightPlans(filtered);
  return true;
}

/**
 * Recalculate cumulative values for subsequent legs after an update
 */
function recalculateSubsequentLegs(plan: FlightPlan, fromIndex: number): void {
  if (fromIndex >= plan.legs.length - 1) return; // No subsequent legs


  // Recalculate each leg starting from the next one
  for (let i = fromIndex + 1; i < plan.legs.length; i++) {
    const prevLeg = plan.legs[i - 1];
    const currentLeg = plan.legs[i];

    // Calculate results for previous leg to get cumulative values
    const prevResults = calculateLegResults(prevLeg);

    if (prevResults) {
      // Update current leg with new cumulative values
      currentLeg.elapsedMin = Math.round(prevResults.totalTime * 60);
      currentLeg.elapsedDist = parseFloat(((prevLeg.elapsedDist || 0) + prevLeg.dist).toFixed(1));
      currentLeg.prevFuel = parseFloat(prevResults.totalFuel.toFixed(1));
    }
  }
}

/**
 * Sync common parameters (depTime, fuelUnit, unit) across all legs
 */
function syncCommonParameters(plan: FlightPlan, updatedLeg: FlightPlanLeg): void {
  const { depTime, fuelUnit, unit } = updatedLeg;

  // Apply to all legs in the plan
  plan.legs.forEach((leg) => {
    if (depTime) leg.depTime = depTime;
    leg.fuelUnit = fuelUnit;
    leg.unit = unit;
  });
}

/**
 * Add or update a leg in a flight plan
 * If legId exists, updates that leg
 * If legId is null, creates a new leg
 * Automatically recalculates subsequent legs and syncs common parameters
 */
export function addOrUpdateLeg(
  flightPlanId: string,
  legData: Omit<FlightPlanLeg, "id" | "index">,
  legId?: string
): { flightPlan: FlightPlan; leg: FlightPlanLeg } | null {
  const plans = loadFlightPlans();
  const planIndex = plans.findIndex((p) => p.id === flightPlanId);

  if (planIndex === -1) return null;

  const plan = plans[planIndex];

  if (legId) {
    // Update existing leg
    const legIndex = plan.legs.findIndex((l) => l.id === legId);
    if (legIndex === -1) return null;

    plan.legs[legIndex] = {
      ...legData,
      id: legId,
      index: plan.legs[legIndex].index, // Keep same index
    };

    // Sync common parameters across all legs
    syncCommonParameters(plan, plan.legs[legIndex]);

    // Recalculate subsequent legs if this isn't the last leg
    recalculateSubsequentLegs(plan, legIndex);

    plan.updated_at = Date.now();
    saveFlightPlans(plans);

    return { flightPlan: plan, leg: plan.legs[legIndex] };
  } else {
    // Create new leg
    const newLegId = generateShortId();
    const newIndex = plan.legs.length;

    const newLeg: FlightPlanLeg = {
      ...legData,
      id: newLegId,
      index: newIndex,
    };

    plan.legs.push(newLeg);

    // Sync common parameters across all legs
    syncCommonParameters(plan, newLeg);

    plan.updated_at = Date.now();
    saveFlightPlans(plans);

    return { flightPlan: plan, leg: newLeg };
  }
}

/**
 * Remove a leg from a flight plan and re-index remaining legs
 */
export function removeLeg(
  flightPlanId: string,
  legId: string
): FlightPlan | null {
  const plans = loadFlightPlans();
  const planIndex = plans.findIndex((p) => p.id === flightPlanId);

  if (planIndex === -1) return null;

  const plan = plans[planIndex];
  plan.legs = plan.legs
    .filter((l) => l.id !== legId)
    .map((leg, index) => ({ ...leg, index })); // Re-index

  plan.updated_at = Date.now();
  saveFlightPlans(plans);

  return plan;
}

/**
 * Reorder legs in a flight plan
 */
export function reorderLegs(
  flightPlanId: string,
  legIds: string[]
): FlightPlan | null {
  const plans = loadFlightPlans();
  const planIndex = plans.findIndex((p) => p.id === flightPlanId);

  if (planIndex === -1) return null;

  const plan = plans[planIndex];

  // Create a map of legId to leg
  const legMap = new Map(plan.legs.map((leg) => [leg.id, leg]));

  // Reorder based on legIds array
  const reorderedLegs: FlightPlanLeg[] = [];
  legIds.forEach((id, index) => {
    const leg = legMap.get(id);
    if (leg) {
      reorderedLegs.push({ ...leg, index });
    }
  });

  plan.legs = reorderedLegs;
  plan.updated_at = Date.now();
  saveFlightPlans(plans);

  return plan;
}

/**
 * Get leg by ID from any flight plan
 */
export function getLegById(
  legId: string
): { flightPlan: FlightPlan; leg: FlightPlanLeg } | null {
  const plans = loadFlightPlans();

  for (const plan of plans) {
    const leg = plan.legs.find((l) => l.id === legId);
    if (leg) {
      return { flightPlan: plan, leg };
    }
  }

  return null;
}

/**
 * Find which flight plan contains a leg
 */
export function findFlightPlanByLegId(legId: string): FlightPlan | null {
  const result = getLegById(legId);
  return result?.flightPlan || null;
}
