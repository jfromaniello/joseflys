import { describe, it, expect } from "vitest";
import { resolveClimbSpeed } from "../lib/aircraft/utils";
import { calculateTakeoffPerformance, type TakeoffInputs } from "../lib/takeoffCalculations";
import { PRESET_AIRCRAFT } from "../lib/aircraft";
import type { ClimbSpeed, ResolvedAircraftPerformance } from "../lib/aircraft/types";

describe("resolveClimbSpeed", () => {
  it("returns undefined for a missing spec", () => {
    expect(resolveClimbSpeed(undefined, 0)).toBeUndefined();
    expect(resolveClimbSpeed([], 0)).toBeUndefined();
  });

  it("returns a constant value for all altitudes", () => {
    expect(resolveClimbSpeed(56, 0)).toBe(56);
    expect(resolveClimbSpeed(56, 10000)).toBe(56);
  });

  it("interpolates linearly between table points", () => {
    const table: ClimbSpeed = [
      { pressureAltitude: 0, ias: 63 },
      { pressureAltitude: 10000, ias: 57 },
    ];
    // Halfway up should be halfway between the speeds
    expect(resolveClimbSpeed(table, 5000)).toBeCloseTo(60, 5);
    expect(resolveClimbSpeed(table, 2500)).toBeCloseTo(61.5, 5);
  });

  it("clamps below the lowest and above the highest tabulated altitude", () => {
    const table: ClimbSpeed = [
      { pressureAltitude: 0, ias: 63 },
      { pressureAltitude: 10000, ias: 57 },
    ];
    expect(resolveClimbSpeed(table, -2000)).toBe(63);
    expect(resolveClimbSpeed(table, 15000)).toBe(57);
  });

  it("does not require the table to be pre-sorted", () => {
    const table: ClimbSpeed = [
      { pressureAltitude: 10000, ias: 57 },
      { pressureAltitude: 0, ias: 63 },
    ];
    expect(resolveClimbSpeed(table, 5000)).toBeCloseTo(60, 5);
  });
});

describe("Vx/Vy from POH (C150)", () => {
  const c150 = PRESET_AIRCRAFT.find((a) => a.model === "C150")! as ResolvedAircraftPerformance;

  const baseInputs = (overrides: Partial<TakeoffInputs>): TakeoffInputs => ({
    aircraft: c150,
    weight: 1600, // POH climb-data reference weight (gross)
    pressureAltitude: 0,
    densityAltitude: 0,
    oat: 15,
    runwayLength: 3000,
    surfaceType: "PG",
    runwaySlope: 0,
    headwindComponent: 0,
    flapConfiguration: "0",
    obstacleHeight: 50,
    ...overrides,
  });

  it("uses published Vx/Vy at gross weight and sea level", () => {
    const r = calculateTakeoffPerformance(baseInputs({}));
    // 64 mph -> 55.6 kt ; 73 mph -> 63.4 kt
    expect(r.vSpeeds.vxIAS).toBeCloseTo(55.6, 1);
    expect(r.vSpeeds.vyIAS).toBeCloseTo(63.4, 1);
  });

  it("decreases Vy with pressure altitude (per POH table)", () => {
    const sl = calculateTakeoffPerformance(baseInputs({ pressureAltitude: 0 }));
    const high = calculateTakeoffPerformance(
      baseInputs({ pressureAltitude: 10000, densityAltitude: 10000 })
    );
    expect(high.vSpeeds.vyIAS).toBeLessThan(sl.vSpeeds.vyIAS);
    // 65 mph -> 56.5 kt at 10000 ft
    expect(high.vSpeeds.vyIAS).toBeCloseTo(56.5, 1);
  });

  it("weight-corrects Vx/Vy via sqrt(W/refWeight)", () => {
    // 1296 lbs = 1600 * 0.81 -> sqrt factor 0.9
    const light = calculateTakeoffPerformance(baseInputs({ weight: 1296 }));
    expect(light.vSpeeds.vyIAS).toBeCloseTo(63.4 * 0.9, 1);
    expect(light.vSpeeds.vxIAS).toBeCloseTo(55.6 * 0.9, 1);
  });
});
