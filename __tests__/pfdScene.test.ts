import { describe, it, expect } from "vitest";
import { buildPfdScene, samplePfdData, type PfdData, type PfdNode } from "../app/replay/pfdScene";
import type { ReplayPoint } from "../app/replay/types";

function track(seconds: number, extra: (i: number) => Partial<ReplayPoint> = () => ({})): ReplayPoint[] {
  return Array.from({ length: seconds }, (_, i) => ({
    lat: 0,
    lon: i * 0.0005,
    ele: 1000,
    timeMs: i * 1000,
    ...extra(i),
  }));
}

/** All text contents in a scene, depth-first. */
function textsOf(node: PfdNode): string[] {
  if (node.kind === "text") return [node.text];
  if (node.kind === "group") return node.children.flatMap(textsOf);
  return [];
}

const baseData: PfdData = {
  iasKt: 74,
  groundSpeedKt: 77,
  tasKt: 77,
  altitudeFt: 2795,
  vsFpm: 450,
  headingDeg: 189,
  rollDeg: 0,
  pitchDeg: 5,
  latAccG: 0.02,
  windDirDeg: 104,
  windSpeedKt: 6,
  oatC: 16,
  aglFt: 900,
  engine: null,
};

describe("buildPfdScene", () => {
  it("shows the sampled values in the lenses and readouts", () => {
    const texts = textsOf(buildPfdScene(1280, 800, baseData, {}));
    expect(texts).toContain("74"); // IAS lens
    expect(texts).toContain("IAS");
    expect(texts).toContain("2,800"); // altitude lens, rounded to 10 ft
    expect(texts).toContain("189°"); // heading lens
    expect(texts).toContain("104° / 6"); // wind chip
    expect(texts).toContain("+5°"); // pitch readout
    expect(texts).toContain("N"); // rose cardinal
  });

  it("labels the speed tape GS when IAS is not recorded", () => {
    const texts = textsOf(buildPfdScene(1280, 800, { ...baseData, iasKt: null }, {}));
    expect(texts).toContain("GS");
    expect(texts).toContain("77");
  });

  it("includes the EIS strip only with engine data on a wide viewport", () => {
    const engine = {
      rpm: 4910,
      manifoldInHg: 25.8,
      fuelFlowGph: 5.3,
      fuelPressPsi: null,
      oilPressPsi: null,
      oilTempF: null,
      coolantTempF: null,
      egtMaxF: null,
      chtMaxF: null,
      volts: 14,
      amps: 8,
    };
    const ranges = { rpm: { min: 0, max: 6000 }, manifoldInHg: { min: 0, max: 30 }, fuelFlowGph: { min: 0, max: 8 } };

    const wide = textsOf(buildPfdScene(1280, 800, { ...baseData, engine }, ranges));
    expect(wide).toContain("RPM");
    expect(wide).toContain("4910");
    expect(wide).toContain("14.0V · 8A");

    // Narrow viewports hide the strip, mirroring the live overlay.
    const narrow = textsOf(buildPfdScene(700, 800, { ...baseData, engine }, ranges));
    expect(narrow).not.toContain("RPM");

    const noEngine = textsOf(buildPfdScene(1280, 800, baseData, ranges));
    expect(noEngine).not.toContain("RPM");
  });

  it("omits the bank arc and rose when attitude/heading are unavailable", () => {
    const texts = textsOf(
      buildPfdScene(1280, 800, { ...baseData, rollDeg: null, pitchDeg: null, headingDeg: null }, {})
    );
    expect(texts).not.toContain("PITCH");
    expect(texts).not.toContain("189°");
  });
});

describe("samplePfdData", () => {
  it("prefers recorded fields and reports engine presence", () => {
    const points = track(10, () => ({
      iasKt: 80,
      vsFpm: 500,
      headingMagDeg: 120,
      rollDeg: 10,
      pitchDeg: 3,
      latAccG: 0.05,
      rpm: 2400,
    }));
    const data = samplePfdData(points, 5000);
    expect(data.iasKt).toBeCloseTo(80);
    expect(data.vsFpm).toBeCloseTo(500);
    expect(data.headingDeg).toBeCloseTo(120);
    expect(data.rollDeg).toBeCloseTo(10);
    expect(data.latAccG).toBeCloseTo(0.05);
    expect(data.engine?.rpm).toBeCloseTo(2400);
  });

  it("falls back to GPS-derived values for plain GPX", () => {
    const points = track(10);
    const data = samplePfdData(points, 5000);
    expect(data.iasKt).toBeNull();
    expect(data.engine).toBeNull();
    expect(data.groundSpeedKt).not.toBeNull(); // derived from positions
    expect(data.altitudeFt).toBeCloseTo(1000 * 3.28084, 0);
  });
});
