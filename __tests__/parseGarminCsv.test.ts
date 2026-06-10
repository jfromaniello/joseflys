import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseGarminCsv, isGarminCsv } from "../app/replay/parseGarminCsv";
import { parseTrack } from "../app/replay/parseTrack";

const csv = readFileSync(
  join(__dirname, "fixtures", "garmin-g3x-sample.csv"),
  "utf-8"
);

describe("parseGarminCsv", () => {
  it("detects the Garmin G3X format", () => {
    expect(isGarminCsv(csv)).toBe(true);
    expect(isGarminCsv("<gpx><trk></trk></gpx>")).toBe(false);
  });

  it("parses coordinates, altitude (ft→m) and rich telemetry", () => {
    const points = parseGarminCsv(csv);
    expect(points.length).toBeGreaterThan(10);

    const p = points[0];
    // Coordinates in the fixture are offset from the real flight to anonymize it.
    expect(p.lat).toBeCloseTo(28.3503669, 5);
    expect(p.lon).toBeCloseTo(25.5947096, 5);
    // 2795 ft → meters
    expect(p.ele).toBeCloseTo(2795 * 0.3048, 1);
    expect(p.groundSpeedKt).toBeCloseTo(77.3, 1);
    expect(p.iasKt).toBeCloseTo(73.9, 1);
    expect(p.tasKt).toBeCloseTo(77, 1);
    expect(p.pitchDeg).toBeCloseTo(5.46, 2);
    expect(p.rollDeg).toBeCloseTo(-0.09, 2);
    expect(p.windSpeedKt).toBeCloseTo(5.9, 1);
    expect(p.windDirDeg).toBeCloseTo(104, 0);
    expect(p.aglFt).toBeCloseTo(900, 0);
  });

  it("parses engine (EIS) fields, keeping the hottest EGT", () => {
    const points = parseGarminCsv(csv);
    const p = points[0];
    expect(p.manifoldInHg).toBeCloseTo(25.8, 1);
    expect(p.rpm).toBeCloseTo(4910, 0);
    expect(p.oilPressPsi).toBeCloseTo(45, 0);
    expect(p.oilTempF).toBeCloseTo(181, 0);
    expect(p.coolantTempF).toBeCloseTo(217, 0);
    expect(p.fuelFlowGph).toBeCloseTo(5.3, 1);
    expect(p.fuelPressPsi).toBeCloseTo(4.1, 1);
    expect(p.volts).toBeCloseTo(14.0, 1);
    expect(p.amps).toBeCloseTo(8, 0);
    // Hottest of EGT1-4 (1497, 1452, 1371, 1341).
    expect(p.egtMaxF).toBeCloseTo(1497, 0);
    // The fixture airframe has no CHT columns.
    expect(p.chtMaxF).toBeUndefined();
  });

  it("builds absolute timestamps from local time + UTC offset", () => {
    const points = parseGarminCsv(csv);
    // First sampled row: 2026-05-29 17:02:21 local, -03:00 → 20:02:21 UTC.
    expect(new Date(points[0].timeMs).toISOString()).toBe("2026-05-29T20:02:21.000Z");
    // Timestamps strictly increase.
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i].timeMs).toBeGreaterThan(points[i - 1].timeMs);
    }
  });

  it("is routed through parseTrack as garmin-csv", () => {
    const result = parseTrack(csv);
    expect(result.format).toBe("garmin-csv");
    expect(result.points.length).toBeGreaterThan(10);
  });
});
