import { describe, it, expect } from "vitest";
import {
  computeEngineRanges,
  hasEngineData,
  hasRichTelemetry,
  sampleEngine,
  sampleTelemetry,
} from "../app/replay/replayMetrics";
import { sampleMagneticHeadingDeg } from "../app/replay/aircraftAttitude";
import type { ReplayPoint } from "../app/replay/types";

/** Straight track, one point per second, with per-point extras. */
function track(seconds: number, extra: (i: number) => Partial<ReplayPoint> = () => ({})): ReplayPoint[] {
  return Array.from({ length: seconds }, (_, i) => ({
    lat: 0,
    lon: i * 0.0005,
    ele: 1000,
    timeMs: i * 1000,
    ...extra(i),
  }));
}

describe("sampleTelemetry recorded VS and AGL", () => {
  it("interpolates the recorded vertical speed between samples", () => {
    const points = track(10, (i) => ({ vsFpm: i < 5 ? 500 : 700 }));
    // Halfway between the 500 sample at t=4s and the 700 sample at t=5s.
    expect(sampleTelemetry(points, 4500).vsFpm).toBeCloseTo(600);
  });

  it("interpolates the recorded AGL between samples", () => {
    const points = track(10, (i) => ({ aglFt: i * 100 }));
    expect(sampleTelemetry(points, 2500).aglFt).toBeCloseTo(250);
  });

  it("returns null VS and AGL for plain GPX tracks", () => {
    const points = track(10);
    const sample = sampleTelemetry(points, 5000);
    expect(sample.vsFpm).toBeNull();
    expect(sample.aglFt).toBeNull();
  });
});

describe("hasRichTelemetry", () => {
  it("is true when any point records airspeed", () => {
    expect(hasRichTelemetry(track(10, (i) => (i === 5 ? { iasKt: 80 } : {})))).toBe(true);
  });

  it("is false for plain GPX tracks", () => {
    expect(hasRichTelemetry(track(10))).toBe(false);
  });
});

describe("engine (EIS) sampling", () => {
  it("detects engine data from RPM / fuel flow / manifold pressure", () => {
    expect(hasEngineData(track(10, () => ({ rpm: 2400 })))).toBe(true);
    expect(hasEngineData(track(10, () => ({ fuelFlowGph: 8.2 })))).toBe(true);
    expect(hasEngineData(track(10))).toBe(false);
  });

  it("interpolates engine fields between samples", () => {
    const points = track(10, (i) => ({ rpm: i < 5 ? 2000 : 2400, fuelFlowGph: 6 }));
    const sample = sampleEngine(points, 4500);
    expect(sample.rpm).toBeCloseTo(2200);
    expect(sample.fuelFlowGph).toBeCloseTo(6);
    expect(sample.chtMaxF).toBeNull();
  });
});

describe("computeEngineRanges", () => {
  it("derives a zero-based, padded, rounded scale for RPM", () => {
    const points = track(10, () => ({ rpm: 5200 }));
    // 5200 * 1.1 = 5720 → next 500 step = 6000.
    expect(computeEngineRanges(points).rpm).toEqual({ min: 0, max: 6000 });
  });

  it("floors temperature scales near the recorded minimum instead of 0", () => {
    const points = track(10, () => ({ oilTempF: 180 }));
    const range = computeEngineRanges(points).oilTempF!;
    // 180 * 0.9 = 162 → floor to 150; 180 * 1.1 = 198 → ceil to 200.
    expect(range).toEqual({ min: 150, max: 200 });
  });

  it("omits fields the track never records", () => {
    const ranges = computeEngineRanges(track(10, () => ({ rpm: 2400 })));
    expect(ranges.rpm).toBeDefined();
    expect(ranges.fuelFlowGph).toBeUndefined();
    expect(computeEngineRanges(track(10))).toEqual({});
  });

  it("always spans at least one step even for constant values", () => {
    const range = computeEngineRanges(track(10, () => ({ volts: 0 }))).volts!;
    expect(range.max).toBeGreaterThan(range.min);
  });
});

describe("sampleMagneticHeadingDeg", () => {
  it("interpolates between recorded headings", () => {
    const points = track(10, (i) => ({ headingMagDeg: i < 5 ? 80 : 100 }));
    expect(sampleMagneticHeadingDeg(points, 4500)).toBeCloseTo(90);
  });

  it("interpolates across the 0°/360° wrap by the shortest arc", () => {
    const points = track(10, (i) => ({ headingMagDeg: i < 5 ? 350 : 10 }));
    expect(sampleMagneticHeadingDeg(points, 4500)).toBeCloseTo(0);
  });

  it("normalizes the result to [0, 360)", () => {
    const points = track(10, () => ({ headingMagDeg: 350 }));
    const heading = sampleMagneticHeadingDeg(points, 5000)!;
    expect(heading).toBeGreaterThanOrEqual(0);
    expect(heading).toBeLessThan(360);
    expect(heading).toBeCloseTo(350);
  });

  it("back-fills from the first recorded heading while the AHRS aligns", () => {
    const points = track(10, (i) => (i >= 5 ? { headingMagDeg: 123 } : {}));
    expect(sampleMagneticHeadingDeg(points, 1000)).toBeCloseTo(123);
  });

  it("returns null when the track never records heading", () => {
    expect(sampleMagneticHeadingDeg(track(10), 5000)).toBeNull();
  });
});
