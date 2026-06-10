import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { anonymizeGarminCsv } from "../app/replay/anonymizeGarminCsv";
import { parseGarminCsv, parseGarminAirframeInfo } from "../app/replay/parseGarminCsv";
import { parseTrack } from "../app/replay/parseTrack";

// The committed fixture is anonymized (ident "SAMPLE"); rebuild a log with a
// real-looking registration for the identification tests.
const sampleCsv = readFileSync(
  join(__dirname, "fixtures", "garmin-g3x-sample.csv"),
  "utf-8"
);
const csv = sampleCsv.replace('aircraft_ident="SAMPLE"', 'aircraft_ident="LV-ABC"');

describe("parseGarminAirframeInfo", () => {
  it("extracts the aircraft ident from the #airframe_info header", () => {
    expect(parseGarminAirframeInfo(csv)).toEqual({ aircraftIdent: "LV-ABC" });
  });

  it("returns no ident for GPX content or a blank attribute", () => {
    expect(parseGarminAirframeInfo("<gpx><trk></trk></gpx>")).toEqual({});
    expect(
      parseGarminAirframeInfo('#airframe_info,log_version="1.00",aircraft_ident=""\n')
    ).toEqual({});
  });

  it("treats the factory placeholder ident as anonymous", () => {
    expect(parseGarminAirframeInfo(sampleCsv)).toEqual({});
    expect(
      parseGarminAirframeInfo('#airframe_info,aircraft_ident="sample"\n')
    ).toEqual({});
  });

  it("is surfaced by parseTrack for Garmin logs", () => {
    expect(parseTrack(csv).aircraftIdent).toBe("LV-ABC");
    expect(parseTrack(anonymizeGarminCsv(csv)).aircraftIdent).toBeUndefined();
  });
});

describe("anonymizeGarminCsv", () => {
  it("blanks aircraft_ident and system_id in the header", () => {
    const anonymized = anonymizeGarminCsv(csv);
    const header = anonymized.split("\n")[0];
    expect(header).toContain('aircraft_ident=""');
    expect(header).toContain('system_id=""');
    expect(parseGarminAirframeInfo(anonymized)).toEqual({});
  });

  it("keeps non-identifying header fields", () => {
    const header = anonymizeGarminCsv(csv).split("\n")[0];
    expect(header).toContain('product="GDU 460"');
    expect(header).toContain('log_version="1.00"');
  });

  it("leaves track data intact — playback points are identical", () => {
    const original = parseGarminCsv(csv);
    const anonymized = parseGarminCsv(anonymizeGarminCsv(csv));
    expect(anonymized).toEqual(original);
  });

  it("is idempotent", () => {
    const once = anonymizeGarminCsv(csv);
    expect(anonymizeGarminCsv(once)).toBe(once);
  });

  it("returns content without identifying attributes unchanged", () => {
    const gpx = "<gpx><trk></trk></gpx>";
    expect(anonymizeGarminCsv(gpx)).toBe(gpx);
  });
});
