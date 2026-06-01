import { describe, it, expect } from "vitest";
import circuitFixture from "./fixtures/sacd-circuit.json";
import { detectFlightPhases } from "../app/replay/analysis";
import type { ReplayPoint } from "../app/replay/types";

const points: ReplayPoint[] = (circuitFixture as [number, number, number, number][]).map(
  ([lat, lon, ele, timeMs]) => ({ lat, lon, ele, timeMs })
);

describe("detectFlightPhases — SACD circuit flight", () => {
  const { phases, markers } = detectFlightPhases(points);

  it("starts with taxi and detects climb/cruise/descent cycles", () => {
    expect(phases.length).toBeGreaterThan(3);
    expect(phases[0].type).toBe("taxi");
    const types = new Set(phases.map((p) => p.type));
    expect(types.has("climb")).toBe(true);
    expect(types.has("descent")).toBe(true);
  });

  it("phases are contiguous and chronological", () => {
    for (let i = 1; i < phases.length; i += 1) {
      expect(phases[i].startMs).toBeGreaterThanOrEqual(phases[i - 1].endMs);
    }
  });

  it("climb phases gain altitude, descent phases lose it", () => {
    for (const p of phases) {
      if (p.type === "climb") expect(p.avgVsFpm).toBeGreaterThan(0);
      if (p.type === "descent") expect(p.avgVsFpm).toBeLessThan(0);
    }
  });

  it("emits a takeoff marker and at least one landing marker", () => {
    const types = markers.map((m) => m.type);
    expect(types).toContain("takeoff");
    expect(types).toContain("landing");
  });

  it("returns nothing for a too-short track", () => {
    expect(detectFlightPhases(points.slice(0, 5)).phases).toHaveLength(0);
  });
});
