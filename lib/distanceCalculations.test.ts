import { describe, it, expect } from "vitest";
import {
  calculateHaversineDistance,
  calculateInitialBearing,
  validateCoordinates,
  isDistanceWithinRecommendedRange,
  MAX_RECOMMENDED_DISTANCE_NM,
} from "./distanceCalculations";

describe("distanceCalculations", () => {
  describe("calculateHaversineDistance", () => {
    it("should calculate distance between Madrid and Barcelona", () => {
      const distance = calculateHaversineDistance(
        40.4168,
        -3.7038,
        41.3874,
        2.1686
      );
      // Expected: ~273 NM using WGS-84
      expect(distance).toBeCloseTo(273.38, 1);
    });

    it("should calculate distance between New York and London", () => {
      const distance = calculateHaversineDistance(
        40.6892,
        -74.0445,
        51.5074,
        -0.1278
      );
      // Expected: ~3018 NM using WGS-84
      expect(distance).toBeCloseTo(3018.04, 1);
    });

    it("should calculate long distance: Wellington to Salamanca", () => {
      const distance = calculateHaversineDistance(-41.32, 174.81, 40.96, -5.5);
      // Expected: ~10777 NM using WGS-84
      expect(distance).toBeCloseTo(10777.36, 1);
    });

    it("should calculate distance along the equator", () => {
      const distance = calculateHaversineDistance(0, 0, 0, 90);
      // Expected: ~5410 NM (quarter of Earth's circumference at equator)
      expect(distance).toBeCloseTo(5409.69, 1);
    });

    it("should calculate distance near the North Pole", () => {
      const distance = calculateHaversineDistance(89, 0, 89, 180);
      // Expected: ~121 NM (much shorter due to convergence near poles)
      expect(distance).toBeCloseTo(120.62, 1);
    });

    it("should return 0 for same coordinates", () => {
      const distance = calculateHaversineDistance(40.0, -3.0, 40.0, -3.0);
      expect(distance).toBe(0);
    });

    it("should handle antipodal points", () => {
      const distance = calculateHaversineDistance(0, 0, 0, 180);
      // Half way around Earth at equator: ~10801 NM
      expect(distance).toBeCloseTo(10801.26, 1);
    });
  });

  describe("calculateInitialBearing", () => {
    it("should calculate bearing from Madrid to Barcelona (ENE)", () => {
      const bearing = calculateInitialBearing(
        40.4168,
        -3.7038,
        41.3874,
        2.1686
      );
      // Expected: ~76° (ENE direction)
      expect(bearing).toBeCloseTo(75.8, 1);
    });

    it("should calculate bearing from New York to London (NE)", () => {
      const bearing = calculateInitialBearing(
        40.6892,
        -74.0445,
        51.5074,
        -0.1278
      );
      // Expected: ~51° (NE direction)
      expect(bearing).toBeCloseTo(51.22, 1);
    });

    it("should calculate bearing due East along equator", () => {
      const bearing = calculateInitialBearing(0, 0, 0, 90);
      // Expected: 90° (due East)
      expect(bearing).toBeCloseTo(90, 1);
    });

    it("should calculate bearing due West along equator", () => {
      const bearing = calculateInitialBearing(0, 90, 0, 0);
      // Expected: 270° (due West)
      expect(bearing).toBeCloseTo(270, 1);
    });

    it("should calculate bearing due North", () => {
      const bearing = calculateInitialBearing(0, 0, 10, 0);
      // Expected: 0° (due North)
      expect(bearing).toBeCloseTo(0, 1);
    });

    it("should calculate bearing due South", () => {
      const bearing = calculateInitialBearing(10, 0, 0, 0);
      // Expected: 180° (due South)
      expect(bearing).toBeCloseTo(180, 1);
    });

    it("should handle bearing near the North Pole", () => {
      const bearing = calculateInitialBearing(89, 0, 89, 180);
      // Near poles, bearing can be unpredictable for short distances
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });

    it("should return bearing in range [0, 360)", () => {
      const bearing = calculateInitialBearing(-41.32, 174.81, 40.96, -5.5);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });
  });

  describe("validateCoordinates", () => {
    it("should validate correct coordinates", () => {
      expect(validateCoordinates(40.4168, -3.7038)).toBe(true);
      expect(validateCoordinates(0, 0)).toBe(true);
      expect(validateCoordinates(-90, -180)).toBe(true);
      expect(validateCoordinates(90, 180)).toBe(true);
    });

    it("should reject invalid latitudes", () => {
      expect(validateCoordinates(91, 0)).toBe(false);
      expect(validateCoordinates(-91, 0)).toBe(false);
      expect(validateCoordinates(100, 0)).toBe(false);
    });

    it("should reject invalid longitudes", () => {
      expect(validateCoordinates(0, 181)).toBe(false);
      expect(validateCoordinates(0, -181)).toBe(false);
      expect(validateCoordinates(0, 200)).toBe(false);
    });

    it("should reject both invalid coordinates", () => {
      expect(validateCoordinates(100, 200)).toBe(false);
    });
  });

  describe("isDistanceWithinRecommendedRange", () => {
    it("should return true for distances within recommended range", () => {
      expect(isDistanceWithinRecommendedRange(500)).toBe(true);
      expect(isDistanceWithinRecommendedRange(1000)).toBe(true);
      expect(isDistanceWithinRecommendedRange(0)).toBe(true);
    });

    it("should return false for distances beyond recommended range", () => {
      expect(isDistanceWithinRecommendedRange(1001)).toBe(false);
      expect(isDistanceWithinRecommendedRange(3000)).toBe(false);
      expect(isDistanceWithinRecommendedRange(10000)).toBe(false);
    });

    it("should match the exported constant", () => {
      expect(isDistanceWithinRecommendedRange(MAX_RECOMMENDED_DISTANCE_NM)).toBe(
        true
      );
      expect(
        isDistanceWithinRecommendedRange(MAX_RECOMMENDED_DISTANCE_NM + 1)
      ).toBe(false);
    });
  });

  describe("WGS-84 accuracy improvements", () => {
    it("should provide accurate results for polar regions", () => {
      // Near poles, WGS-84 is more accurate than Haversine
      const distance = calculateHaversineDistance(85, 0, 85, 90);
      expect(distance).toBeGreaterThan(0);
      // Should be relatively short distance due to convergence
      expect(distance).toBeLessThan(500);
    });

    it("should handle crossing the antimeridian", () => {
      const distance = calculateHaversineDistance(0, 179, 0, -179);
      // Should be ~120 NM (2 degrees at equator)
      expect(distance).toBeCloseTo(120, 0);
    });

    it("should handle southern hemisphere calculations", () => {
      // Buenos Aires to Sydney
      const distance = calculateHaversineDistance(
        -34.6037,
        -58.3816,
        -33.8688,
        151.2093
      );
      expect(distance).toBeGreaterThan(6000);
      expect(distance).toBeLessThan(7500);
    });
  });
});
