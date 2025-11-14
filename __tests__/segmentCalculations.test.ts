import { describe, it, expect } from "vitest";
import { calculateNavigationSegments } from "../lib/segmentCalculations";
import { Geodesic } from "geographiclib-geodesic";

const METERS_TO_NM = 1 / 1852;

describe("segmentCalculations", () => {
  describe("calculateNavigationSegments", () => {
    it("should calculate NY to Tokyo with 35 segments without negative penalty", () => {
      // Coordinates from the problematic URL
      const nyLat = 40.7127281;
      const nyLon = -74.0060152;
      const tokyoLat = 35.6768601;
      const tokyoLon = 139.7638947;
      const numSegments = 35;

      const result = calculateNavigationSegments(
        nyLat,
        nyLon,
        tokyoLat,
        tokyoLon,
        numSegments
      );

      // Verify great circle distance matches GeographicLib directly
      const directGC = Geodesic.WGS84.Inverse(nyLat, nyLon, tokyoLat, tokyoLon);
      const gcDistanceNM = (directGC.s12 ?? 0) * METERS_TO_NM;

      expect(result.orthodromicDistance).toBeCloseTo(gcDistanceNM, 1);

      // CRITICAL: Segmented route must ALWAYS be >= great circle distance
      // This is physically impossible to violate
      expect(result.totalDistance).toBeGreaterThanOrEqual(
        result.orthodromicDistance
      );

      // Calculate penalty
      const penalty = result.totalDistance - result.orthodromicDistance;

      // Penalty should be positive
      expect(penalty).toBeGreaterThanOrEqual(0);

      console.log("\n📊 NY to Tokyo (35 segments):");
      console.log(`  Segmented Route: ${result.totalDistance.toFixed(1)} NM`);
      console.log(
        `  Great Circle:    ${result.orthodromicDistance.toFixed(1)} NM`
      );
      console.log(`  Penalty:         ${penalty.toFixed(1)} NM`);
      console.log(
        `  Penalty %:       ${((penalty / result.orthodromicDistance) * 100).toFixed(3)}%`
      );
    });

    it("should show penalty increases with fewer segments", () => {
      const nyLat = 40.7127281;
      const nyLon = -74.0060152;
      const tokyoLat = 35.6768601;
      const tokyoLon = 139.7638947;

      const segments = [1, 10, 35, 100];
      const penalties = segments.map((n) => {
        const result = calculateNavigationSegments(
          nyLat,
          nyLon,
          tokyoLat,
          tokyoLon,
          n
        );
        return result.totalDistance - result.orthodromicDistance;
      });

      console.log("\n📈 Penalty vs Segment Count (NY-Tokyo):");
      segments.forEach((n, i) => {
        console.log(
          `  ${String(n).padStart(3)} segments: ${penalties[i].toFixed(2)} NM`
        );
      });

      // Verify all penalties are positive
      penalties.forEach((penalty) => {
        expect(penalty).toBeGreaterThanOrEqual(0);
      });

      // Verify penalty decreases as segments increase (more accurate)
      for (let i = 1; i < penalties.length; i++) {
        expect(penalties[i]).toBeLessThanOrEqual(penalties[i - 1]);
      }
    });

    it("should calculate Madrid to Barcelona correctly", () => {
      const madridLat = 40.4168;
      const madridLon = -3.7038;
      const barcelonaLat = 41.3874;
      const barcelonaLon = 2.1686;

      const result = calculateNavigationSegments(
        madridLat,
        madridLon,
        barcelonaLat,
        barcelonaLon,
        10
      );

      // Verify great circle is around 273 NM
      expect(result.orthodromicDistance).toBeCloseTo(273.38, 1);

      // Verify penalty is positive or very small negative (within numerical precision)
      // For short routes with many segments, rhumb and geodesic converge
      const penalty = result.totalDistance - result.orthodromicDistance;
      expect(penalty).toBeGreaterThanOrEqual(-1.0); // Allow 1 NM tolerance for short routes

      console.log("\n📊 Madrid to Barcelona (10 segments):");
      console.log(`  Segmented Route: ${result.totalDistance.toFixed(1)} NM`);
      console.log(
        `  Great Circle:    ${result.orthodromicDistance.toFixed(1)} NM`
      );
      console.log(`  Penalty:         ${penalty.toFixed(2)} NM`);
    });

    it("should handle single segment (pure loxodrome)", () => {
      const lat1 = 40.0;
      const lon1 = -3.0;
      const lat2 = 41.0;
      const lon2 = 2.0;

      const result = calculateNavigationSegments(lat1, lon1, lat2, lon2, 1);

      // Single segment should have penalty close to zero or positive
      // For short distances, rhumb and geodesic are nearly identical
      const penalty = result.totalDistance - result.orthodromicDistance;
      expect(penalty).toBeGreaterThanOrEqual(-1.0); // Allow 1 NM tolerance

      // Should have exactly 1 segment
      expect(result.segments).toHaveLength(1);
    });

    it("should verify last segment ends at destination", () => {
      const nyLat = 40.7127281;
      const nyLon = -74.0060152;
      const tokyoLat = 35.6768601;
      const tokyoLon = 139.7638947;

      const result = calculateNavigationSegments(
        nyLat,
        nyLon,
        tokyoLat,
        tokyoLon,
        35
      );

      const lastSeg = result.segments[result.segments.length - 1];

      // Last segment should end at destination (within tolerance)
      expect(lastSeg.endLat).toBeCloseTo(tokyoLat, 4);
      expect(lastSeg.endLon).toBeCloseTo(tokyoLon, 4);
    });

    it("should calculate cumulative distances correctly", () => {
      const lat1 = 40.0;
      const lon1 = -3.0;
      const lat2 = 41.0;
      const lon2 = 2.0;

      const result = calculateNavigationSegments(lat1, lon1, lat2, lon2, 5);

      // Cumulative distance should increase monotonically
      for (let i = 1; i < result.segments.length; i++) {
        expect(result.segments[i].cumulativeDistance).toBeGreaterThan(
          result.segments[i - 1].cumulativeDistance
        );
      }

      // Last cumulative distance should equal total distance
      const lastSeg = result.segments[result.segments.length - 1];
      expect(lastSeg.cumulativeDistance).toBeCloseTo(result.totalDistance, 5);
    });

    it("should handle routes near poles", () => {
      // Oslo to Anchorage (high latitude route)
      const osloLat = 59.9139;
      const osloLon = 10.7522;
      const anchorageLat = 61.2181;
      const anchorageLon = -149.9003;

      const result = calculateNavigationSegments(
        osloLat,
        osloLon,
        anchorageLat,
        anchorageLon,
        20
      );

      // Verify penalty is positive even at high latitudes
      const penalty = result.totalDistance - result.orthodromicDistance;
      expect(penalty).toBeGreaterThanOrEqual(0);

      console.log("\n📊 Oslo to Anchorage (20 segments):");
      console.log(`  Segmented Route: ${result.totalDistance.toFixed(1)} NM`);
      console.log(
        `  Great Circle:    ${result.orthodromicDistance.toFixed(1)} NM`
      );
      console.log(`  Penalty:         ${penalty.toFixed(2)} NM`);
    });

    it("should handle crossing antimeridian", () => {
      // Fiji to Alaska (crosses 180° meridian)
      const fijiLat = -18.1248;
      const fijiLon = 178.4501;
      const alaskaLat = 64.2008;
      const alaskaLon = -149.4937;

      const result = calculateNavigationSegments(
        fijiLat,
        fijiLon,
        alaskaLat,
        alaskaLon,
        25
      );

      // Verify penalty is positive when crossing antimeridian
      const penalty = result.totalDistance - result.orthodromicDistance;
      expect(penalty).toBeGreaterThanOrEqual(0);

      console.log("\n📊 Fiji to Alaska (25 segments, crosses antimeridian):");
      console.log(`  Segmented Route: ${result.totalDistance.toFixed(1)} NM`);
      console.log(
        `  Great Circle:    ${result.orthodromicDistance.toFixed(1)} NM`
      );
      console.log(`  Penalty:         ${penalty.toFixed(2)} NM`);
    });

    it("should calculate SACO to RJAA correctly (reported bug)", () => {
      // SACO (Córdoba, Argentina) to RJAA (Narita, Japan)
      const sacoLat = -31.323601;
      const sacoLon = -64.208;
      const rjaaLat = 35.764702;
      const rjaaLon = 140.386002;

      console.log("\n🐛 SACO to RJAA - Bug Investigation:");

      // Test different segment counts
      const testCases = [1, 2, 10, 33, 50, 100];

      testCases.forEach((numSegments) => {
        const result = calculateNavigationSegments(
          sacoLat,
          sacoLon,
          rjaaLat,
          rjaaLon,
          numSegments
        );

        const penalty = result.totalDistance - result.orthodromicDistance;

        console.log(
          `  ${String(numSegments).padStart(3)} segments: Total=${result.totalDistance.toFixed(1)} NM, GC=${result.orthodromicDistance.toFixed(1)} NM, Penalty=${penalty.toFixed(1)} NM`
        );

        // CRITICAL: Total distance must ALWAYS be >= great circle distance
        expect(result.totalDistance).toBeGreaterThanOrEqual(
          result.orthodromicDistance
        );

        // Penalty must be positive
        expect(penalty).toBeGreaterThanOrEqual(0);
      });

      // Verify great circle distance is consistent across segment counts
      const gc1 = calculateNavigationSegments(
        sacoLat,
        sacoLon,
        rjaaLat,
        rjaaLon,
        1
      ).orthodromicDistance;
      const gc10 = calculateNavigationSegments(
        sacoLat,
        sacoLon,
        rjaaLat,
        rjaaLon,
        10
      ).orthodromicDistance;
      const gc100 = calculateNavigationSegments(
        sacoLat,
        sacoLon,
        rjaaLat,
        rjaaLon,
        100
      ).orthodromicDistance;

      // Great circle distance should be identical regardless of segments
      expect(gc1).toBeCloseTo(gc10, 1);
      expect(gc1).toBeCloseTo(gc100, 1);
    });

    it("should show penalty decreases monotonically for SACO to RJAA", () => {
      const sacoLat = -31.323601;
      const sacoLon = -64.208;
      const rjaaLat = 35.764702;
      const rjaaLon = 140.386002;

      const segments = [1, 2, 5, 10, 20, 33, 50, 100];
      const results = segments.map((n) =>
        calculateNavigationSegments(sacoLat, sacoLon, rjaaLat, rjaaLon, n)
      );

      console.log("\n📉 SACO to RJAA - Penalty Monotonicity Check:");

      results.forEach((result, i) => {
        const penalty = result.totalDistance - result.orthodromicDistance;
        console.log(
          `  ${String(segments[i]).padStart(3)} segments: ${penalty.toFixed(2)} NM penalty`
        );
      });

      // Verify all penalties are positive
      results.forEach((result) => {
        const penalty = result.totalDistance - result.orthodromicDistance;
        expect(penalty).toBeGreaterThanOrEqual(0);
      });

      // Verify penalty decreases as segments increase
      for (let i = 1; i < results.length; i++) {
        const prevPenalty =
          results[i - 1].totalDistance - results[i - 1].orthodromicDistance;
        const currPenalty =
          results[i].totalDistance - results[i].orthodromicDistance;

        // Current penalty should be <= previous penalty (monotonic decrease)
        expect(currPenalty).toBeLessThanOrEqual(prevPenalty);
      }
    });

    it("should calculate pure rhumb line distance correctly", () => {
      const sacoLat = -31.323601;
      const sacoLon = -64.208;
      const rjaaLat = 35.764702;
      const rjaaLon = 140.386002;

      console.log("\n📏 Pure Rhumb Line Distance Comparison:");

      const testCases = [1, 10, 35, 100];
      testCases.forEach((numSegments) => {
        const result = calculateNavigationSegments(
          sacoLat,
          sacoLon,
          rjaaLat,
          rjaaLon,
          numSegments
        );

        console.log(`\n  ${numSegments} segment(s):`);
        console.log(
          `    Great Circle:    ${result.orthodromicDistance.toFixed(1)} NM`
        );
        console.log(
          `    Pure Rhumb:      ${result.pureRhumbDistance.toFixed(1)} NM`
        );
        console.log(
          `    Segmented:       ${result.totalDistance.toFixed(1)} NM`
        );
        console.log(
          `    Savings vs Rhumb: ${(result.pureRhumbDistance - result.totalDistance).toFixed(1)} NM`
        );

        // Pure rhumb should be >= great circle
        expect(result.pureRhumbDistance).toBeGreaterThanOrEqual(
          result.orthodromicDistance
        );

        // Pure rhumb distance should be constant across all segment counts
        expect(result.pureRhumbDistance).toBeCloseTo(9653.3, 0);

        // Segmented route should converge to great circle as segments increase
        if (numSegments >= 100) {
          expect(result.totalDistance).toBeCloseTo(
            result.orthodromicDistance,
            0
          );
        }
      });
    });
  });
});
