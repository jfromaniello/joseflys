import { z } from "zod";

/**
 * Maximum size for a shared flight plan JSON (30KB)
 * A typical 10-leg flight plan is ~5-10KB
 */
export const MAX_FLIGHT_PLAN_SIZE = 30 * 1024; // 30KB

/**
 * Rate limit: max shares per IP per hour
 */
export const RATE_LIMIT_MAX_REQUESTS = 20;
export const RATE_LIMIT_WINDOW_SECONDS = 3600; // 1 hour

/**
 * Zod schema for LegPoint
 */
const LegPointSchema = z.object({
  name: z.string().max(200),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
});

/**
 * Zod schema for Waypoint (legacy)
 */
const WaypointSchema = z.object({
  name: z.string().max(200),
  distance: z.number().min(0).max(50000),
});

/**
 * Zod schema for FlightPlanLeg
 */
const FlightPlanLegSchema = z.object({
  id: z.string().max(20),
  index: z.number().int().min(0).max(100),

  // Core flight data
  th: z.number().min(0).max(360),
  tas: z.number().min(0).max(2000),
  wd: z.number().min(0).max(360).optional(),
  ws: z.number().min(0).max(500).optional(),
  md: z.number().min(-180).max(180),
  var: z.number().min(-180).max(180).optional(),
  dist: z.number().min(0).max(50000),

  // Fuel
  ff: z.number().min(0).max(10000),
  fuelUnit: z.string().max(10),
  prevFuel: z.number().min(0).max(1000000).optional(),
  additionalFuel: z.number().min(0).max(10000).optional(),
  approachLandingFuel: z.number().min(0).max(10000).optional(),

  // Time
  depTime: z.string().max(10).optional(),
  elapsedMin: z.number().min(0).max(10000).optional(),
  elapsedDist: z.number().min(0).max(50000).optional(),

  // Climb data
  climbTas: z.number().min(0).max(2000).optional(),
  climbDist: z.number().min(0).max(50000).optional(),
  climbFuel: z.number().min(0).max(100000).optional(),
  climbWd: z.number().min(0).max(360).optional(),
  climbWs: z.number().min(0).max(500).optional(),

  // Descent data
  descentTas: z.number().min(0).max(2000).optional(),
  descentDist: z.number().min(0).max(50000).optional(),
  descentFuel: z.number().min(0).max(100000).optional(),
  descentWd: z.number().min(0).max(360).optional(),
  descentWs: z.number().min(0).max(500).optional(),

  // Description and unit
  desc: z.string().max(500).optional(),
  unit: z.string().max(10),
  plane: z.string().max(5000).optional(),

  // Geographic points
  from: LegPointSchema.optional(),
  to: LegPointSchema.optional(),
  checkpoints: z.array(LegPointSchema).max(50).optional(),

  // Legacy
  waypoints: z.array(WaypointSchema).max(100).optional(),
  fromCity: z.string().max(200).optional(),
  toCity: z.string().max(200).optional(),
});

/**
 * Zod schema for FlightPlan
 */
export const FlightPlanSchema = z.object({
  id: z.string().max(20),
  name: z.string().min(1).max(200),
  date: z.string().max(20).optional(),
  created_at: z.number(),
  updated_at: z.number(),
  legs: z.array(FlightPlanLegSchema).min(1).max(100),
});

export type ValidatedFlightPlan = z.infer<typeof FlightPlanSchema>;

/**
 * Validate a flight plan object
 * Returns the validated plan or throws an error
 */
export function validateFlightPlan(data: unknown): ValidatedFlightPlan {
  return FlightPlanSchema.parse(data);
}

/**
 * Safely validate a flight plan, returning null on failure
 */
export function safeValidateFlightPlan(data: unknown): ValidatedFlightPlan | null {
  const result = FlightPlanSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.error("Flight plan validation failed:", result.error.issues);
  return null;
}
