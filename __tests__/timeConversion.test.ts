import { describe, it, expect } from "vitest";
import {
  toMinutes,
  fromMinutes,
  getTimeUnitLabel,
  type TimeUnit,
} from "../lib/timeConversion";

describe("timeConversion", () => {
  describe("toMinutes", () => {
    it("should convert hours to minutes", () => {
      expect(toMinutes(1, "hrs")).toBe(60);
      expect(toMinutes(2, "hrs")).toBe(120);
      expect(toMinutes(0.5, "hrs")).toBe(30);
      expect(toMinutes(1.5, "hrs")).toBe(90);
    });

    it("should keep minutes as minutes", () => {
      expect(toMinutes(60, "min")).toBe(60);
      expect(toMinutes(90, "min")).toBe(90);
      expect(toMinutes(30, "min")).toBe(30);
      expect(toMinutes(1, "min")).toBe(1);
    });

    it("should handle zero", () => {
      expect(toMinutes(0, "hrs")).toBe(0);
      expect(toMinutes(0, "min")).toBe(0);
    });

    it("should handle decimal values", () => {
      expect(toMinutes(0.25, "hrs")).toBe(15);
      expect(toMinutes(0.75, "hrs")).toBe(45);
      expect(toMinutes(2.5, "hrs")).toBe(150);
    });
  });

  describe("fromMinutes", () => {
    it("should convert minutes to hours", () => {
      expect(fromMinutes(60, "hrs")).toBe(1);
      expect(fromMinutes(120, "hrs")).toBe(2);
      expect(fromMinutes(30, "hrs")).toBe(0.5);
      expect(fromMinutes(90, "hrs")).toBe(1.5);
    });

    it("should keep minutes as minutes", () => {
      expect(fromMinutes(60, "min")).toBe(60);
      expect(fromMinutes(90, "min")).toBe(90);
      expect(fromMinutes(30, "min")).toBe(30);
      expect(fromMinutes(1, "min")).toBe(1);
    });

    it("should handle zero", () => {
      expect(fromMinutes(0, "hrs")).toBe(0);
      expect(fromMinutes(0, "min")).toBe(0);
    });

    it("should handle decimal values", () => {
      expect(fromMinutes(15, "hrs")).toBe(0.25);
      expect(fromMinutes(45, "hrs")).toBe(0.75);
      expect(fromMinutes(150, "hrs")).toBe(2.5);
    });
  });

  describe("round trip conversions", () => {
    it("should convert hours to minutes and back", () => {
      const hours = 2.5;
      const minutes = toMinutes(hours, "hrs");
      const result = fromMinutes(minutes, "hrs");
      expect(result).toBe(hours);
    });

    it("should convert minutes to hours and back", () => {
      const minutes = 90;
      const hours = fromMinutes(minutes, "min");
      const result = toMinutes(hours, "min");
      expect(result).toBe(minutes);
    });

    it("should handle conversion between different units", () => {
      // 1.5 hours = 90 minutes
      const hours = 1.5;
      const minutes = toMinutes(hours, "hrs");
      expect(minutes).toBe(90);
      expect(fromMinutes(minutes, "min")).toBe(90);
    });
  });

  describe("getTimeUnitLabel", () => {
    it("should return correct label for hours", () => {
      expect(getTimeUnitLabel("hrs")).toBe("HRS");
    });

    it("should return correct label for minutes", () => {
      expect(getTimeUnitLabel("min")).toBe("MIN");
    });

    it("should default to HRS for invalid unit", () => {
      expect(getTimeUnitLabel("invalid" as TimeUnit)).toBe("HRS");
    });
  });

  describe("edge cases", () => {
    it("should handle very small values", () => {
      expect(toMinutes(0.01, "hrs")).toBeCloseTo(0.6, 2);
      expect(fromMinutes(0.6, "hrs")).toBeCloseTo(0.01, 2);
    });

    it("should handle very large values", () => {
      expect(toMinutes(24, "hrs")).toBe(1440);
      expect(fromMinutes(1440, "hrs")).toBe(24);
    });

    it("should handle negative values (for calculations)", () => {
      expect(toMinutes(-1, "hrs")).toBe(-60);
      expect(fromMinutes(-60, "hrs")).toBe(-1);
    });
  });

  describe("typical flight planning scenarios", () => {
    it("should handle typical short leg (30 minutes)", () => {
      const timeInHours = 0.5;
      const timeInMinutes = toMinutes(timeInHours, "hrs");
      expect(timeInMinutes).toBe(30);
      expect(fromMinutes(timeInMinutes, "min")).toBe(30);
    });

    it("should handle typical medium leg (1h 45m)", () => {
      const timeInHours = 1.75;
      const timeInMinutes = toMinutes(timeInHours, "hrs");
      expect(timeInMinutes).toBe(105);
      expect(fromMinutes(timeInMinutes, "min")).toBe(105);
    });

    it("should handle typical long leg (3h 20m)", () => {
      const timeInHours = 3 + 20 / 60;
      const timeInMinutes = toMinutes(timeInHours, "hrs");
      expect(timeInMinutes).toBeCloseTo(200, 0);
      expect(fromMinutes(timeInMinutes, "min")).toBeCloseTo(200, 0);
    });

    it("should handle endurance calculation (4h 30m)", () => {
      const timeInHours = 4.5;
      const timeInMinutes = toMinutes(timeInHours, "hrs");
      expect(timeInMinutes).toBe(270);
      expect(fromMinutes(timeInMinutes, "min")).toBe(270);
    });
  });
});
