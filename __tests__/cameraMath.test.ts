import { describe, it, expect } from "vitest";
import * as Cesium from "cesium";
import {
  computeCameraPose,
  computeCockpitPose,
  sampleField,
  toRad,
  type CamMode,
} from "../app/replay/cameraMath";
import type { ReplayPoint } from "../app/replay/types";

function pt(timeMs: number, extra: Partial<ReplayPoint> = {}): ReplayPoint {
  return { lat: 0, lon: 0, ele: 1000, timeMs, ...extra };
}

describe("sampleField", () => {
  it("interpolates rollDeg linearly between bracketing points", () => {
    const points = [pt(0, { rollDeg: 0 }), pt(1000, { rollDeg: 10 })];
    expect(sampleField(points, 500, "rollDeg")).toBeCloseTo(5);
    expect(sampleField(points, 250, "rollDeg")).toBeCloseTo(2.5);
  });

  it("returns the exact value at a sample timestamp", () => {
    const points = [pt(0, { rollDeg: -8 }), pt(1000, { rollDeg: 12 })];
    expect(sampleField(points, 0, "rollDeg")).toBeCloseTo(-8);
    expect(sampleField(points, 1000, "rollDeg")).toBeCloseTo(12);
  });

  it("falls back to whichever endpoint has the field", () => {
    const onlyFrom = [pt(0, { rollDeg: 7 }), pt(1000)];
    expect(sampleField(onlyFrom, 500, "rollDeg")).toBe(7);

    const onlyTo = [pt(0), pt(1000, { rollDeg: 7 })];
    expect(sampleField(onlyTo, 500, "rollDeg")).toBe(7);
  });

  it("returns null when neither bracketing point has the field (plain GPX)", () => {
    const points = [pt(0), pt(1000)];
    expect(sampleField(points, 500, "rollDeg")).toBeNull();
  });

  it("returns null for an empty track", () => {
    expect(sampleField([], 500, "rollDeg")).toBeNull();
  });

  it("clamps past the last point to the last value", () => {
    const points = [pt(0, { rollDeg: 3 }), pt(1000, { rollDeg: 9 })];
    expect(sampleField(points, 5000, "rollDeg")).toBe(9);
  });
});

describe("computeCockpitPose", () => {
  const aircraftPos = Cesium.Cartesian3.fromDegrees(-64.2, -31.4, 1500);

  it("passes the bank angle through to the pose roll", () => {
    const pose = computeCockpitPose(Cesium, aircraftPos, toRad(90), 0, 0, toRad(15));
    expect(pose.roll).toBeCloseTo(toRad(15));
  });

  it("defaults roll to 0 when no bank is provided", () => {
    const pose = computeCockpitPose(Cesium, aircraftPos, toRad(90), 0, 0);
    expect(pose.roll).toBe(0);
  });

  it("applies head-tracking offsets to heading and pitch", () => {
    const pose = computeCockpitPose(Cesium, aircraftPos, toRad(90), toRad(10), toRad(5));
    expect(pose.heading).toBeCloseTo(toRad(100));
    expect(pose.pitch).toBeCloseTo(toRad(-2) + toRad(5));
  });

  it("places the camera 4 m above the aircraft", () => {
    const pose = computeCockpitPose(Cesium, aircraftPos, 0, 0, 0);
    expect(Cesium.Cartesian3.distance(aircraftPos, pose.destination)).toBeCloseTo(4, 1);
  });
});

describe("computeCameraPose roll propagation", () => {
  const aircraftPos = Cesium.Cartesian3.fromDegrees(-64.2, -31.4, 1500);
  const sphere = new Cesium.BoundingSphere(aircraftPos, 5000);
  const bankRad = toRad(20);

  it("applies the bank to the cockpit pose", () => {
    const pose = computeCameraPose(Cesium, "cockpit", aircraftPos, toRad(45), sphere, 0, 0, 500, bankRad);
    expect(pose.roll).toBeCloseTo(bankRad);
  });

  it.each<CamMode>(["chase", "side-left", "side-right", "panorama-start", "panorama-end"])(
    "keeps roll at 0 for %s even when a bank is supplied",
    (mode) => {
      const pose = computeCameraPose(Cesium, mode, aircraftPos, toRad(45), sphere, 0, 0, 500, bankRad);
      expect(pose.roll).toBe(0);
    }
  );
});
