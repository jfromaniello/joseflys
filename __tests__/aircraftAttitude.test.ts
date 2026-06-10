import { describe, it, expect } from "vitest";
import { magvar } from "magvar";
import { estimateAttitude, recordedHeadingRad } from "../app/replay/aircraftAttitude";
import type { ReplayPoint } from "../app/replay/types";

const DEG_TO_RAD = Math.PI / 180;
// ~55 m/s eastward at the equator, per 1 s sample.
const LON_STEP_DEG = 0.0005;

/** Straight eastbound track at the equator, one point per second. */
function straightTrack(seconds: number, extra: (i: number) => Partial<ReplayPoint> = () => ({})): ReplayPoint[] {
  return Array.from({ length: seconds }, (_, i) => ({
    lat: 0,
    lon: i * LON_STEP_DEG,
    ele: 1000,
    timeMs: i * 1000,
    ...extra(i),
  }));
}

/** Track turning at a constant rate (deg/s), integrated from heading, ~55 m/s. */
function turningTrack(seconds: number, turnRateDegPerSec: number): ReplayPoint[] {
  const points: ReplayPoint[] = [];
  let lat = 0;
  let lon = 0;
  const speedMps = 55;
  for (let i = 0; i < seconds; i++) {
    points.push({ lat, lon, ele: 1000, timeMs: i * 1000 });
    const headingRad = i * turnRateDegPerSec * DEG_TO_RAD;
    lat += (speedMps * Math.cos(headingRad)) / 111320;
    lon += (speedMps * Math.sin(headingRad)) / (111320 * Math.cos(lat * DEG_TO_RAD));
  }
  return points;
}

describe("estimateAttitude with recorded telemetry (Garmin CSV)", () => {
  it("uses the recorded roll and pitch verbatim", () => {
    const points = straightTrack(40, () => ({ rollDeg: 15, pitchDeg: 5, headingMagDeg: 90 }));
    const att = estimateAttitude(points, 20000);
    expect(att).not.toBeNull();
    expect(att!.rollRad).toBeCloseTo(15 * DEG_TO_RAD);
    expect(att!.pitchRad).toBeCloseTo(5 * DEG_TO_RAD);
  });

  it("interpolates recorded roll between samples", () => {
    const points = straightTrack(40, (i) => ({ rollDeg: i < 20 ? 10 : 20 }));
    // Halfway between the 10° sample at t=19s and the 20° sample at t=20s.
    const att = estimateAttitude(points, 19500);
    expect(att!.rollRad).toBeCloseTo(15 * DEG_TO_RAD);
  });

  it("converts the recorded magnetic heading to true with WMM declination", () => {
    const points = straightTrack(40, () => ({ headingMagDeg: 90 }));
    const att = estimateAttitude(points, 20000);
    const here = points[20];
    const declination = magvar(here.lat, here.lon, 0);
    expect(att!.headingRad).toBeCloseTo((90 + declination) * DEG_TO_RAD, 3);
  });
});

describe("recordedHeadingRad", () => {
  it("returns the magnetic heading converted to true", () => {
    const points = straightTrack(40, () => ({ headingMagDeg: 180 }));
    const heading = recordedHeadingRad(points, 20000);
    const declination = magvar(points[20].lat, points[20].lon, 0);
    expect(heading).toBeCloseTo((180 + declination) * DEG_TO_RAD, 3);
  });

  it("interpolates across the 0°/360° wrap along the shortest arc", () => {
    const points = straightTrack(40, (i) => ({ headingMagDeg: i < 20 ? 350 : 10 }));
    const heading = recordedHeadingRad(points, 19500);
    const declination = magvar(0, 19.5 * LON_STEP_DEG, 0);
    // Midpoint of 350° → 10° is 0°, not 180°.
    const expected = (((0 + declination) * DEG_TO_RAD) + Math.PI * 2) % (Math.PI * 2);
    const normalized = ((heading as number) + Math.PI * 2) % (Math.PI * 2);
    expect(normalized).toBeCloseTo(expected, 3);
  });

  it("back-fills from the first valid sample while the AHRS aligns", () => {
    const points = straightTrack(40, (i) => (i >= 30 ? { headingMagDeg: 45 } : {}));
    const heading = recordedHeadingRad(points, 5000);
    const declination = magvar(points[5].lat, points[5].lon, 0);
    expect(heading).toBeCloseTo((45 + declination) * DEG_TO_RAD, 3);
  });

  it("returns null when the track never records heading (plain GPX)", () => {
    const points = straightTrack(40);
    expect(recordedHeadingRad(points, 20000)).toBeNull();
  });
});

describe("estimateAttitude GPS fallback (plain GPX)", () => {
  it("keeps the wings level on a straight track", () => {
    const points = straightTrack(60);
    const att = estimateAttitude(points, 30000);
    expect(att).not.toBeNull();
    expect(Math.abs(att!.rollRad)).toBeLessThan(0.5 * DEG_TO_RAD);
  });

  it("banks right (positive roll) in a right turn", () => {
    const points = turningTrack(60, 3);
    const att = estimateAttitude(points, 30000);
    expect(att!.rollRad).toBeGreaterThan(2 * DEG_TO_RAD);
  });

  it("banks left (negative roll) in a left turn", () => {
    const points = turningTrack(60, -3);
    const att = estimateAttitude(points, 30000);
    expect(att!.rollRad).toBeLessThan(-2 * DEG_TO_RAD);
  });

  it("derives heading from motion when no magnetic heading is recorded", () => {
    const points = straightTrack(60);
    const att = estimateAttitude(points, 30000);
    // Eastbound → 90° true.
    expect(att!.headingRad).toBeCloseTo(90 * DEG_TO_RAD, 2);
  });
});
