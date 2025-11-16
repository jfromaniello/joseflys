import { describe, it, expect } from "vitest";

/**
 * Helper function to normalize angle to 0-360 range
 */
function normalizeHeading(heading: number): number {
  let normalized = heading % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  return normalized;
}

/**
 * Calculate magnetic heading from true heading and magnetic declination
 *
 * Aviation mnemonics:
 * - "East is Least": When variation is East, magnetic heading is less than true heading
 * - "West is Best": When variation is West, magnetic heading is greater than true heading
 *
 * WMM Convention (used by magvar library):
 * - Positive declination = East of true north
 * - Negative declination = West of true north
 *
 * Formula: magneticHeading = trueHeading - declination
 *
 * Examples:
 * - TH=090°, VAR=10°E (+10): MH = 90 - 10 = 80° ✓ (East is Least)
 * - TH=090°, VAR=10°W (-10): MH = 90 - (-10) = 100° ✓ (West is Best)
 */
function calculateMagneticHeading(trueHeading: number, declination: number): number {
  return normalizeHeading(trueHeading - declination);
}

describe("Magnetic Heading Calculations", () => {
  describe("East is Least - Easterly Variation", () => {
    it("should calculate MH correctly with 10°E variation", () => {
      const trueHeading = 90;
      const declination = 10; // 10°E (positive in WMM)
      const magneticHeading = calculateMagneticHeading(trueHeading, declination);

      // East is Least: MH should be less than TH
      expect(magneticHeading).toBe(80);
      expect(magneticHeading).toBeLessThan(trueHeading);
    });

    it("should calculate MH correctly with 5°E variation", () => {
      const trueHeading = 45;
      const declination = 5; // 5°E (positive in WMM)
      const magneticHeading = calculateMagneticHeading(trueHeading, declination);

      expect(magneticHeading).toBe(40);
      expect(magneticHeading).toBeLessThan(trueHeading);
    });

    it("should handle wrap-around with easterly variation", () => {
      const trueHeading = 5;
      const declination = 10; // 10°E
      const magneticHeading = calculateMagneticHeading(trueHeading, declination);

      // 5 - 10 = -5, normalized to 355
      expect(magneticHeading).toBe(355);
    });
  });

  describe("West is Best - Westerly Variation", () => {
    it("should calculate MH correctly with 10°W variation", () => {
      const trueHeading = 90;
      const declination = -10; // 10°W (negative in WMM)
      const magneticHeading = calculateMagneticHeading(trueHeading, declination);

      // West is Best: MH should be greater than TH
      expect(magneticHeading).toBe(100);
      expect(magneticHeading).toBeGreaterThan(trueHeading);
    });

    it("should calculate MH correctly with 7.5°W variation", () => {
      const trueHeading = 12;
      const declination = -7.5; // 7.5°W (negative in WMM)
      const magneticHeading = calculateMagneticHeading(trueHeading, declination);

      // MH = 12 - (-7.5) = 19.5
      expect(magneticHeading).toBe(19.5);
      expect(magneticHeading).toBeGreaterThan(trueHeading);
    });

    it("should calculate MH correctly with 5°W variation", () => {
      const trueHeading = 45;
      const declination = -5; // 5°W (negative in WMM)
      const magneticHeading = calculateMagneticHeading(trueHeading, declination);

      expect(magneticHeading).toBe(50);
      expect(magneticHeading).toBeGreaterThan(trueHeading);
    });

    it("should handle wrap-around with westerly variation", () => {
      const trueHeading = 355;
      const declination = -10; // 10°W
      const magneticHeading = calculateMagneticHeading(trueHeading, declination);

      // 355 - (-10) = 365, normalized to 5
      expect(magneticHeading).toBe(5);
    });
  });

  describe("Zero Variation", () => {
    it("should return the same heading when variation is zero", () => {
      const trueHeading = 90;
      const declination = 0;
      const magneticHeading = calculateMagneticHeading(trueHeading, declination);

      expect(magneticHeading).toBe(trueHeading);
    });
  });

  describe("Real World Examples", () => {
    it("should match expected values for Buenos Aires area (7.5°W)", () => {
      // Location near Buenos Aires has approximately 7.5°W variation
      const trueHeading = 12;
      const declination = -7.5; // 7.5°W
      const magneticHeading = calculateMagneticHeading(trueHeading, declination);

      // MH = 12 - (-7.5) = 19.5
      expect(magneticHeading).toBeCloseTo(19.5, 1);
    });

    it("should match expected values for London area (0-2°W)", () => {
      const trueHeading = 270;
      const declination = -1.5; // ~1.5°W
      const magneticHeading = calculateMagneticHeading(trueHeading, declination);

      expect(magneticHeading).toBeCloseTo(271.5, 1);
    });

    it("should match expected values for Japan area (7-9°W)", () => {
      const trueHeading = 180;
      const declination = -8; // ~8°W
      const magneticHeading = calculateMagneticHeading(trueHeading, declination);

      expect(magneticHeading).toBe(188);
    });

    it("should match expected values for East Coast USA (10-15°W)", () => {
      const trueHeading = 360;
      const declination = -12; // ~12°W
      const magneticHeading = calculateMagneticHeading(trueHeading, declination);

      // 360 - (-12) = 372, normalized to 12
      expect(magneticHeading).toBe(12);
    });
  });

  describe("Inverse Relationship - True from Magnetic", () => {
    it("should correctly reverse the calculation", () => {
      const magneticHeading = 100;
      const declination = -10; // 10°W

      // If MH = TH - declination, then TH = MH + declination
      const trueHeading = normalizeHeading(magneticHeading + declination);

      expect(trueHeading).toBe(90);

      // Verify round-trip
      const calculatedMH = calculateMagneticHeading(trueHeading, declination);
      expect(calculatedMH).toBe(magneticHeading);
    });
  });
});
