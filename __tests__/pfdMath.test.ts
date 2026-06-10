import { describe, it, expect } from "vitest";
import { computeTapeTicks, headingTickLabel } from "../app/replay/pfdMath";

describe("computeTapeTicks", () => {
  it("centers the current value mid-tape", () => {
    const ticks = computeTapeTicks(100, 300, 6, 5, 10, 0);
    const center = ticks.find((t) => t.value === 100);
    expect(center).toBeDefined();
    expect(center!.y).toBeCloseTo(150);
  });

  it("places higher values toward the top (smaller y)", () => {
    const ticks = computeTapeTicks(100, 300, 6, 5, 10, 0);
    const above = ticks.find((t) => t.value === 110)!;
    const below = ticks.find((t) => t.value === 90)!;
    expect(above.y).toBeCloseTo(150 - 10 * 6);
    expect(below.y).toBeCloseTo(150 + 10 * 6);
  });

  it("marks multiples of the major step as major", () => {
    const ticks = computeTapeTicks(100, 300, 6, 5, 10, 0);
    expect(ticks.find((t) => t.value === 100)!.major).toBe(true);
    expect(ticks.find((t) => t.value === 105)!.major).toBe(false);
  });

  it("omits ticks below minValue (no negative airspeeds)", () => {
    const ticks = computeTapeTicks(5, 300, 6, 5, 10, 0);
    expect(ticks.every((t) => t.value >= 0)).toBe(true);
    expect(ticks.find((t) => t.value === 0)).toBeDefined();
  });

  it("covers only the visible range", () => {
    // 300 px at 6 px/kt → ±25 kt around the center.
    const ticks = computeTapeTicks(100, 300, 6, 5, 10, 0);
    expect(Math.min(...ticks.map((t) => t.value))).toBe(75);
    expect(Math.max(...ticks.map((t) => t.value))).toBe(125);
  });
});

describe("headingTickLabel", () => {
  it("uses cardinal letters on the cardinals", () => {
    expect(headingTickLabel(0)).toBe("N");
    expect(headingTickLabel(90)).toBe("E");
    expect(headingTickLabel(180)).toBe("S");
    expect(headingTickLabel(270)).toBe("W");
    expect(headingTickLabel(360)).toBe("N");
  });

  it("uses two-digit tens every 30°", () => {
    expect(headingTickLabel(30)).toBe("03");
    expect(headingTickLabel(120)).toBe("12");
    expect(headingTickLabel(330)).toBe("33");
  });

  it("returns null for unlabeled ticks", () => {
    expect(headingTickLabel(10)).toBeNull();
    expect(headingTickLabel(95)).toBeNull();
  });
});
