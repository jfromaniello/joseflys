import { describe, it, expect } from "vitest";
import {
  parseRunwayDesignator,
  getHeadingWindComponents,
  getRelativeWindComponents,
} from "../lib/windComponents";

describe("parseRunwayDesignator", () => {
  it("parses runway designators", () => {
    expect(parseRunwayDesignator("11")).toBe(110);
    expect(parseRunwayDesignator("09")).toBe(90);
    expect(parseRunwayDesignator("9")).toBe(90);
    expect(parseRunwayDesignator("29L")).toBe(290);
    expect(parseRunwayDesignator("RWY 36")).toBe(360);
  });

  it("rejects invalid input", () => {
    expect(parseRunwayDesignator("")).toBeNull();
    expect(parseRunwayDesignator("0")).toBeNull();
    expect(parseRunwayDesignator("37")).toBeNull();
    expect(parseRunwayDesignator("110")).toBeNull();
    expect(parseRunwayDesignator("abc")).toBeNull();
  });
});

describe("getHeadingWindComponents", () => {
  it("solves wind 085/30 on runway 11 (exam question)", () => {
    const r = getHeadingWindComponents(110, 85, 30);
    expect(r.angle).toBeCloseTo(25);
    expect(Math.round(r.headwind)).toBe(27);
    expect(Math.round(r.crosswind)).toBe(13);
    expect(r.crosswindFrom).toBe("L");
  });

  it("detects wind from the right", () => {
    const r = getHeadingWindComponents(110, 140, 20);
    expect(r.angle).toBeCloseTo(30);
    expect(r.crosswind).toBeCloseTo(10);
    expect(r.crosswindFrom).toBe("R");
  });

  it("handles wrap-around at north", () => {
    const r = getHeadingWindComponents(350, 10, 20);
    expect(r.angle).toBeCloseTo(20);
    expect(r.crosswindFrom).toBe("R");
  });

  it("reports tailwind as negative headwind", () => {
    const r = getHeadingWindComponents(90, 270, 10);
    expect(r.angle).toBeCloseTo(180);
    expect(r.headwind).toBeCloseTo(-10);
    expect(r.crosswind).toBeCloseTo(0);
    expect(r.crosswindFrom).toBeNull();
  });
});

describe("getRelativeWindComponents", () => {
  it("matches the chart example: 40 kt at 30°", () => {
    const r = getRelativeWindComponents(30, 40);
    expect(Math.round(r.headwind)).toBe(35);
    expect(Math.round(r.crosswind)).toBe(20);
    expect(r.crosswindFrom).toBeNull();
  });

  it("is pure crosswind at 90°", () => {
    const r = getRelativeWindComponents(90, 15);
    expect(r.headwind).toBeCloseTo(0);
    expect(r.crosswind).toBeCloseTo(15);
  });
});
