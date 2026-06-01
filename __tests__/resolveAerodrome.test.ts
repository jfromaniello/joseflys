import { describe, it, expect } from "vitest";
import {
  resolveAerodrome,
  parsePublishedTurnDirection,
} from "../lib/replay/resolveAerodrome";
import { analyzeCircuit } from "../app/replay/patternAnalysis";
import circuitFixture from "./fixtures/sacd-circuit.json";
import type { ReplayPoint } from "../app/replay/types";

describe("parsePublishedTurnDirection", () => {
  it("parses the SACD norm (turns to the NW)", () => {
    expect(
      parsePublishedTurnDirection("Los virajes se efectuarán al NW del RCL 05/23.")
    ).toBe(315);
  });

  it("parses Spanish intercardinals (NO = noroeste)", () => {
    expect(parsePublishedTurnDirection("Los virajes se realizarán al NO de la pista.")).toBe(
      315
    );
    expect(parsePublishedTurnDirection("Virajes al SO del aeródromo.")).toBe(225);
  });

  it("returns null when no turn direction is published", () => {
    expect(parsePublishedTurnDirection("Operaciones VFR diurnas únicamente.")).toBeNull();
    expect(parsePublishedTurnDirection(null)).toBeNull();
  });
});

describe("resolveAerodrome — SACD (ANAC)", () => {
  // Track start coordinate from the real fixture.
  const aerodrome = resolveAerodrome(-31.4905, -64.14579);

  it("resolves Coronel Olmedo from ANAC", () => {
    expect(aerodrome).not.toBeNull();
    expect(aerodrome?.source).toBe("anac");
    expect(aerodrome?.code).toBe("SACD");
  });

  it("converts the magnetic runway designator to a true heading", () => {
    const rwy05 = aerodrome?.runwayEnds.find((e) => e.id === "05");
    expect(rwy05).toBeDefined();
    // 050° magnetic − ~7.1° westerly declination ≈ 42.9° true.
    expect(rwy05!.headingTrueDeg).toBeGreaterThan(41);
    expect(rwy05!.headingTrueDeg).toBeLessThan(45);
  });

  it("parses the published left-hand circuit", () => {
    expect(aerodrome?.publishedTurnDirectionDeg).toBe(315);
  });

  it("feeds the real circuit analysis end-to-end", () => {
    const points: ReplayPoint[] = (circuitFixture as [number, number, number, number][]).map(
      ([lat, lon, ele, timeMs]) => ({ lat, lon, ele, timeMs })
    );
    const analysis = analyzeCircuit(points, aerodrome!);
    expect(analysis?.activeRunway.id).toBe("05");
    expect(analysis?.flownSide).toBe("left");
    expect(analysis?.publishedSide).toBe("left");
  });
});

describe("resolveAerodrome — guard rails", () => {
  it("returns null in the middle of the ocean", () => {
    expect(resolveAerodrome(0, -30)).toBeNull();
  });
});
