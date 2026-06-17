import { describe, it, expect } from "vitest";
import { calculateTakeoffPerformance, type TakeoffInputs } from "../lib/takeoffCalculations";
import { PRESET_AIRCRAFT } from "../lib/aircraft";
import type { ResolvedAircraftPerformance } from "../lib/aircraft/types";

describe("available engine power", () => {
  const c150 = PRESET_AIRCRAFT.find((a) => a.model === "C150")! as ResolvedAircraftPerformance;

  const base = (overrides: Partial<TakeoffInputs>): TakeoffInputs => ({
    aircraft: c150,
    weight: 1500,
    flapConfiguration: "0",
    pressureAltitude: 1000,
    densityAltitude: 1500,
    oat: 20,
    runwayLength: 4000,
    surfaceType: "PG",
    runwaySlope: 0,
    headwindComponent: 0,
    obstacleHeight: 50,
    availablePowerPercent: 100,
    ...overrides,
  });

  it("100% power matches the default (no penalty)", () => {
    const explicit = calculateTakeoffPerformance(base({ availablePowerPercent: 100 }));
    const omitted = calculateTakeoffPerformance(base({ availablePowerPercent: undefined }));
    expect(explicit.distances.groundRoll).toBeCloseTo(omitted.distances.groundRoll, 5);
    expect(explicit.rateOfClimb).toBeCloseTo(omitted.rateOfClimb, 5);
  });

  it("reduced power increases ground roll (~1/powerRatio)", () => {
    const full = calculateTakeoffPerformance(base({ availablePowerPercent: 100 }));
    const worn = calculateTakeoffPerformance(base({ availablePowerPercent: 80 }));
    expect(worn.distances.groundRoll).toBeGreaterThan(full.distances.groundRoll);
    // 80% power -> roll ~ /0.8 = 1.25x
    expect(worn.distances.groundRoll / full.distances.groundRoll).toBeCloseTo(1.25, 1);
  });

  it("reduced power cuts climb rate MORE than proportionally", () => {
    const full = calculateTakeoffPerformance(base({ availablePowerPercent: 100 }));
    const worn = calculateTakeoffPerformance(base({ availablePowerPercent: 85 }));

    const powerDrop = 1 - 0.85; // 15%
    const rocDrop = 1 - worn.rateOfClimb / full.rateOfClimb;

    expect(worn.rateOfClimb).toBeLessThan(full.rateOfClimb);
    // The climb-rate hit should clearly exceed the % power lost.
    expect(rocDrop).toBeGreaterThan(powerDrop * 1.5);
  });

  it("severe power loss at heavy/hot/high forces NO-GO (cannot climb out)", () => {
    const result = calculateTakeoffPerformance(
      base({
        weight: 1600,
        pressureAltitude: 8000,
        densityAltitude: 11000,
        oat: 35,
        runwayLength: 8000, // plenty of runway: failure is climb, not distance
        availablePowerPercent: 65,
      })
    );
    expect(result.decision).toBe("NO-GO");
    expect(result.errors.some((e) => e.toLowerCase().includes("rate of climb"))).toBe(true);
  });

  it("warns whenever power is below 100%", () => {
    const worn = calculateTakeoffPerformance(base({ availablePowerPercent: 90 }));
    expect(worn.warnings.some((w) => w.includes("90% available power"))).toBe(true);
  });
});
