/**
 * DEPRECATED: This file has been migrated to lib/aircraft/
 *
 * All aircraft data, types, and utilities are now in the lib/aircraft/ module.
 * Please import from "@/lib/aircraft" instead.
 *
 * Migration includes:
 * - All types: AircraftPerformance, ClimbPerformance, DeviationEntry, etc.
 * - All preset aircraft: CESSNA_150, CESSNA_170, CESSNA_182, PIPER_PA11
 * - All utilities: getAircraftByModel, createEmptyAircraft, etc.
 * - PRESET_AIRCRAFT array
 *
 * For backward compatibility, you can import from "@/lib/aircraft" which provides
 * the same exports with enhanced type safety and better organization.
 */

// Re-export everything from the new location for backward compatibility
export * from "./aircraft";
