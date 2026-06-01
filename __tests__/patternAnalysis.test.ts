import { describe, it, expect } from "vitest";
import circuitFixture from "./fixtures/sacd-circuit.json";
import {
  analyzeCircuit,
  type CircuitPhase,
  type PatternAerodrome,
} from "../app/replay/patternAnalysis";
import type { ReplayPoint } from "../app/replay/types";

/**
 * Real flight fixture: repeated traffic-pattern work at SACD (Coronel Olmedo,
 * Córdoba), downsampled to ~3s. The aircraft departs RWY 05, flies several
 * left-hand circuits, and does touch-and-goes / low passes.
 */
const points: ReplayPoint[] = (circuitFixture as [number, number, number, number][]).map(
  ([lat, lon, ele, timeMs]) => ({ lat, lon, ele, timeMs })
);

// SACD — RWY 05/23 (true 42.9° / 222.9°), field 432 m AMSL.
// AIP: "Los virajes se efectuarán al NW del RCL 05/23" → NW = 315°.
const sacd: PatternAerodrome = {
  source: "anac",
  code: "SACD",
  name: "CORONEL OLMEDO",
  lat: -31.48679,
  lon: -64.14083,
  elevationFt: 432 * 3.28084,
  runwayEnds: [
    { id: "05", headingTrueDeg: 42.9 },
    { id: "23", headingTrueDeg: 222.9 },
  ],
  lengthFt: Math.round(1292 * 3.28084),
  publishedTurnDirectionDeg: 315,
};

describe("analyzeCircuit — SACD real flight", () => {
  const analysis = analyzeCircuit(points, sacd);

  it("produces an analysis", () => {
    expect(analysis).not.toBeNull();
  });

  it("detects RWY 05 as the runway in use", () => {
    expect(analysis?.activeRunway.id).toBe("05");
  });

  it("detects a left-hand pattern matching the published side", () => {
    expect(analysis?.flownSide).toBe("left");
    expect(analysis?.publishedSide).toBe("left");
  });

  it("estimates a sane (low) pattern altitude", () => {
    const alt = analysis?.patternAltitudeFtAgl;
    expect(alt).not.toBeNull();
    expect(alt as number).toBeGreaterThan(400);
    expect(alt as number).toBeLessThan(900);
  });

  it("measures the downwind separation from the runway (~500–700 m)", () => {
    const sep = analysis?.downwindSeparationM;
    expect(sep).not.toBeNull();
    expect(sep as number).toBeGreaterThan(400);
    expect(sep as number).toBeLessThan(900);
  });

  it("computes per-pass downwind metrics that vary between passes", () => {
    const downwind = analysis!.segments.filter((s) => s.phase === "downwind");
    expect(downwind.length).toBeGreaterThanOrEqual(4);
    for (const seg of downwind) {
      expect(seg.separationM).not.toBeNull();
      // Real circuit downwinds stay within the runway corridor (not en-route).
      expect(seg.separationM as number).toBeLessThan(2500);
    }
    const seps = downwind.map((s) => s.separationM as number);
    // Passes should not all be identical (the flight flew tighter/wider ones).
    expect(Math.max(...seps) - Math.min(...seps)).toBeGreaterThan(50);
  });

  it("identifies all circuit legs across the repeated patterns", () => {
    const phases = new Set<CircuitPhase>(analysis?.segments.map((s) => s.phase));
    for (const leg of ["upwind", "crosswind", "downwind", "base", "final"] as const) {
      expect(phases).toContain(leg);
    }
  });

  it("orders downwind → base → final within each circuit", () => {
    // Find a downwind segment and confirm base then final follow soon after.
    const segs = analysis!.segments;
    const dwIndex = segs.findIndex((s) => s.phase === "downwind");
    expect(dwIndex).toBeGreaterThanOrEqual(0);
    const after = segs.slice(dwIndex + 1, dwIndex + 4).map((s) => s.phase);
    expect(after).toContain("base");
    expect(after).toContain("final");
  });

  it("produces one landing per touch-and-go, each with circuit metrics", () => {
    const landings = analysis!.landings;
    // The flight flew several full touch-and-go circuits.
    expect(landings.length).toBeGreaterThanOrEqual(5);
    expect(landings.length).toBeLessThanOrEqual(8);
    for (const l of landings) {
      // All these were full circuits, so downwind metrics are present.
      expect(l.separationM).not.toBeNull();
      expect(l.altitudeFtAgl).not.toBeNull();
      expect(l.speedsKt.final).not.toBeNull();
    }
    // Landings are chronological.
    for (let i = 1; i < landings.length; i += 1) {
      expect(landings[i].timeMs).toBeGreaterThanOrEqual(landings[i - 1].timeMs);
    }
  });

  it("excludes stray low points with no final-approach leg", () => {
    // Every landing has an actual final leg (no rollout/taxi false positives).
    for (const l of analysis!.landings) {
      expect(l.speedsKt.final).not.toBeNull();
    }
  });

  it("detects multiple approaches with realistic glide angles and speeds", () => {
    const approaches = analysis!.approaches;
    expect(approaches.length).toBeGreaterThanOrEqual(5);
    for (const ap of approaches) {
      expect(ap.glideAngleDeg).not.toBeNull();
      expect(ap.glideAngleDeg as number).toBeGreaterThan(2);
      expect(ap.glideAngleDeg as number).toBeLessThan(8);
      expect(ap.finalSpeedKt as number).toBeGreaterThan(30);
      expect(ap.finalSpeedKt as number).toBeLessThan(70);
    }
    expect(approaches.some((a) => a.touched)).toBe(true);
  });

  it("does not report spurious approaches while taxiing (first 6 min)", () => {
    const t0 = points[0].timeMs;
    const earlyApproaches = analysis!.approaches.filter((a) => a.timeMs - t0 < 6 * 60_000);
    expect(earlyApproaches.length).toBe(0);
  });
});

describe("analyzeCircuit — published side derivation", () => {
  it("flips to a right-hand published side when turns are published to the SE", () => {
    const seTurns: PatternAerodrome = { ...sacd, publishedTurnDirectionDeg: 135 };
    expect(analyzeCircuit(points, seTurns)?.publishedSide).toBe("right");
  });

  it("returns a null published side when no turn direction is published", () => {
    const noNorm: PatternAerodrome = { ...sacd, publishedTurnDirectionDeg: null };
    expect(analyzeCircuit(points, noNorm)?.publishedSide).toBeNull();
  });
});

describe("analyzeCircuit — guard rails", () => {
  it("returns null when the track never approaches the field", () => {
    const farAway: PatternAerodrome = { ...sacd, lat: 0, lon: 0 };
    expect(analyzeCircuit(points, farAway)).toBeNull();
  });

  it("returns null when the aerodrome has no runways", () => {
    const noRunways: PatternAerodrome = { ...sacd, runwayEnds: [] };
    expect(analyzeCircuit(points, noRunways)).toBeNull();
  });

  it("returns null for a track that is too short", () => {
    expect(analyzeCircuit(points.slice(0, 5), sacd)).toBeNull();
  });
});
