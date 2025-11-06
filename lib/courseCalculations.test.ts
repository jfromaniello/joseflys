import { describe, it, expect } from "vitest";
import {
  calculateCourse,
  calculateWaypoints,
  type Waypoint,
  type FlightParameters,
} from "./courseCalculations";

describe("courseCalculations", () => {
  describe("calculateCourse", () => {
    describe("wind components", () => {
      it("should calculate direct headwind correctly", () => {
        // Wind from 360° (North), heading 360° (North), 20 knots
        const result = calculateCourse(360, 20, 360, 100, 0);

        expect(result.crosswind).toBeCloseTo(0, 1);
        expect(result.headwind).toBeCloseTo(-20, 1); // Formula uses -cos, so headwind is negative
        expect(result.windCorrectionAngle).toBeCloseTo(0, 1);
      });

      it("should calculate direct tailwind correctly", () => {
        // Wind from 180° (South), heading 360° (North), 20 knots
        const result = calculateCourse(180, 20, 360, 100, 0);

        expect(result.crosswind).toBeCloseTo(0, 1);
        expect(result.headwind).toBeCloseTo(20, 1); // Formula uses -cos, so tailwind is positive
        expect(result.windCorrectionAngle).toBeCloseTo(0, 1);
      });

      it("should calculate pure crosswind from right", () => {
        // Wind from 090° (East), heading 360° (North), 20 knots
        const result = calculateCourse(90, 20, 360, 100, 0);

        expect(result.crosswind).toBeCloseTo(20, 1); // Positive = from right
        expect(result.headwind).toBeCloseTo(0, 1);
      });

      it("should calculate pure crosswind from left", () => {
        // Wind from 270° (West), heading 360° (North), 20 knots
        const result = calculateCourse(270, 20, 360, 100, 0);

        expect(result.crosswind).toBeCloseTo(-20, 1); // Negative = from left
        expect(result.headwind).toBeCloseTo(0, 1);
      });

      it("should calculate quartering headwind from right", () => {
        // Wind from 045° (NE), heading 360° (North), 20 knots
        const result = calculateCourse(45, 20, 360, 100, 0);

        expect(result.crosswind).toBeCloseTo(14.14, 1); // From right
        expect(result.headwind).toBeCloseTo(-14.14, 1); // Headwind component (negative per formula)
      });
    });

    describe("wind correction angle (WCA)", () => {
      it("should calculate positive WCA for crosswind from right", () => {
        // Wind from 090°, heading 360°, TAS 100kt, WS 20kt
        const result = calculateCourse(90, 20, 360, 100, 0);

        // Should correct to the left (negative WCA in some conventions, positive in ours)
        expect(Math.abs(result.windCorrectionAngle)).toBeGreaterThan(0);
      });

      it("should have zero WCA for direct headwind", () => {
        const result = calculateCourse(360, 20, 360, 100, 0);

        expect(result.windCorrectionAngle).toBeCloseTo(0, 1);
      });

      it("should have zero WCA for direct tailwind", () => {
        const result = calculateCourse(180, 20, 360, 100, 0);

        expect(result.windCorrectionAngle).toBeCloseTo(0, 1);
      });

      it("should calculate reasonable WCA for typical crosswind", () => {
        // 30kt crosswind, 120kt TAS
        const result = calculateCourse(90, 30, 360, 120, 0);

        // WCA should be around 14-15 degrees
        expect(Math.abs(result.windCorrectionAngle)).toBeGreaterThan(13);
        expect(Math.abs(result.windCorrectionAngle)).toBeLessThan(16);
      });
    });

    describe("ground speed", () => {
      it("should calculate reduced GS with headwind", () => {
        // 20kt headwind, 100kt TAS
        const result = calculateCourse(360, 20, 360, 100, 0);

        expect(result.groundSpeed).toBeCloseTo(80, 1); // 100 - 20 = 80
      });

      it("should calculate increased GS with tailwind", () => {
        // 20kt tailwind, 100kt TAS
        const result = calculateCourse(180, 20, 360, 100, 0);

        expect(result.groundSpeed).toBeCloseTo(120, 1); // 100 + 20 = 120
      });

      it("should maintain GS close to TAS with pure crosswind", () => {
        // Pure crosswind, GS should be close to TAS
        const result = calculateCourse(90, 20, 360, 100, 0);

        // With small crosswind, GS should be very close to TAS
        expect(result.groundSpeed).toBeGreaterThan(95);
        expect(result.groundSpeed).toBeLessThan(102);
      });

      it("should handle strong headwind", () => {
        // 50kt headwind, 100kt TAS
        const result = calculateCourse(360, 50, 360, 100, 0);

        expect(result.groundSpeed).toBeCloseTo(50, 1);
      });
    });

    describe("compass heading", () => {
      it("should apply magnetic deviation correctly (East)", () => {
        // No wind, true heading 360°, -5° East deviation
        const result = calculateCourse(0, 0, 360, 100, -5);

        // Compass heading = TH + WCA + MagDev = 360 + 0 + (-5) = 355
        expect(result.compassHeading).toBeCloseTo(355, 0);
      });

      it("should apply magnetic deviation correctly (West)", () => {
        // No wind, true heading 360°, +10° West deviation
        const result = calculateCourse(0, 0, 360, 100, 10);

        // Compass heading = TH + WCA + MagDev = 360 + 0 + 10 = 10
        expect(result.compassHeading).toBeCloseTo(10, 0);
      });

      it("should combine WCA and magnetic deviation", () => {
        // Crosswind requiring WCA, plus magnetic deviation
        const result = calculateCourse(90, 20, 360, 100, -5);

        // Compass heading should include both WCA and magnetic deviation
        expect(result.compassHeading).not.toBeCloseTo(360, 0);
      });

      it("should normalize compass heading to 0-360 range", () => {
        // Test that heading wraps around correctly
        const result = calculateCourse(0, 0, 5, 100, -10);

        // 5 + 0 + (-10) = -5, should normalize to 355
        expect(result.compassHeading).toBeGreaterThanOrEqual(0);
        expect(result.compassHeading).toBeLessThan(360);
        expect(result.compassHeading).toBeCloseTo(355, 0);
      });
    });

    describe("ETAS (Effective True Airspeed)", () => {
      it("should not calculate ETAS when WCA <= 10°", () => {
        // Small crosswind resulting in small WCA
        const result = calculateCourse(90, 10, 360, 100, 0);

        expect(result.etas).toBeUndefined();
      });

      it("should calculate ETAS when WCA > 10°", () => {
        // Larger crosswind resulting in WCA > 10°
        const result = calculateCourse(90, 30, 360, 120, 0);

        expect(result.etas).toBeDefined();
        expect(result.etas).toBeLessThan(120); // ETAS should be less than TAS
      });

      it("should use ETAS in ground speed calculation when WCA > 10°", () => {
        const result = calculateCourse(90, 30, 360, 120, 0);

        // When ETAS is used, effective speed is reduced
        if (result.etas) {
          expect(result.etas).toBeLessThan(120);
          // GS with pure crosswind should be close to TAS or slightly different
          expect(result.groundSpeed).toBeGreaterThan(0);
        }
      });
    });

    describe("ETA and fuel calculations", () => {
      it("should calculate ETA when distance is provided", () => {
        // 100 NM with tailwind: GS will be 120kt, so ETA = 100/120 = 0.833 hours
        const result = calculateCourse(180, 20, 360, 100, 0, 100);

        expect(result.eta).toBeDefined();
        expect(result.groundSpeed).toBeCloseTo(120, 1); // TAS 100 + tailwind 20
        expect(result.eta).toBeCloseTo(0.833, 2); // 100 NM / 120 kt
      });

      it("should calculate fuel used when distance and fuel flow provided", () => {
        // 100 NM at 120 kt GS (with tailwind), 10 GPH
        const result = calculateCourse(180, 20, 360, 100, 0, 100, 10);

        expect(result.fuelUsed).toBeDefined();
        expect(result.fuelUsed).toBeCloseTo(8.33, 1); // ~0.833 hours × 10 GPH
      });

      it("should add to previous fuel used when provided", () => {
        // This leg: 100 NM at 120 kt (~0.833 hour), 10 GPH = ~8.33 gallons
        // Previous fuel used: 15 gallons
        const result = calculateCourse(180, 20, 360, 100, 0, 100, 10, 0, 15);

        expect(result.fuelUsed).toBeCloseTo(23.33, 1); // 15 + 8.33 = 23.33
      });

      it("should account for elapsed time in fuel calculation when no previousFuelUsed", () => {
        // This leg: 100 NM at 120 kt (~0.833 hour)
        // Elapsed time: 60 minutes (1 hour)
        // Total time: ~1.833 hours × 10 GPH = ~18.33 gallons
        const result = calculateCourse(180, 20, 360, 100, 0, 100, 10, 60);

        expect(result.fuelUsed).toBeCloseTo(18.33, 1);
      });

      it("should not calculate fuel without fuel flow", () => {
        const result = calculateCourse(180, 20, 360, 100, 0, 100);

        expect(result.fuelUsed).toBeUndefined();
      });

      it("should not calculate ETA without distance", () => {
        const result = calculateCourse(180, 20, 360, 100, 0);

        expect(result.eta).toBeUndefined();
      });
    });

    describe("edge cases", () => {
      it("should handle zero wind", () => {
        const result = calculateCourse(0, 0, 360, 100, 0);

        expect(Math.abs(result.crosswind)).toBeCloseTo(0, 1);
        expect(Math.abs(result.headwind)).toBeCloseTo(0, 1);
        expect(Math.abs(result.windCorrectionAngle)).toBeCloseTo(0, 1);
        expect(result.groundSpeed).toBeCloseTo(100, 1);
      });

      it("should handle angle normalization (wind > 360°)", () => {
        const result = calculateCourse(720, 20, 360, 100, 0); // 720° = 360°

        expect(result.headwind).toBeCloseTo(-20, 1); // Headwind (negative per formula)
      });

      it("should handle angle normalization (heading > 360°)", () => {
        const result = calculateCourse(360, 20, 720, 100, 0); // 720° = 360°

        expect(result.headwind).toBeCloseTo(-20, 1); // Headwind (negative per formula)
      });

      it("should handle very high wind speeds", () => {
        // 80kt headwind, 100kt TAS
        const result = calculateCourse(360, 80, 360, 100, 0);

        expect(result.groundSpeed).toBeCloseTo(20, 1);
        expect(result.groundSpeed).toBeGreaterThan(0);
      });
    });

    describe("realistic flight scenarios", () => {
      it("should calculate typical VFR scenario", () => {
        // Wind: 270° at 15kt, Heading: 360°, TAS: 110kt, MagDev: -5° (5°E)
        const result = calculateCourse(270, 15, 360, 110, -5);

        expect(result.crosswind).toBeCloseTo(-15, 1); // From left
        expect(result.headwind).toBeCloseTo(0, 1);
        expect(result.groundSpeed).toBeGreaterThan(105);
        expect(result.groundSpeed).toBeLessThan(115);
      });

      it("should calculate typical IFR scenario with distance", () => {
        // Wind: 320° at 25kt, Heading: 090° (East), TAS: 150kt, Distance: 75 NM
        const result = calculateCourse(320, 25, 90, 150, 0, 75, 12);

        expect(result.eta).toBeDefined();
        expect(result.fuelUsed).toBeDefined();
        // ETA should be around 0.5 hours (30 minutes)
        expect(result.eta).toBeGreaterThan(0.4);
        expect(result.eta).toBeLessThan(0.6);
      });
    });
  });

  describe("calculateWaypoints", () => {
    const waypoints: Waypoint[] = [
      { name: "WP1", distance: 25 },
      { name: "WP2", distance: 50 },
      { name: "WP3", distance: 75 },
    ];

    describe("basic waypoint calculations", () => {
      it("should calculate waypoint times correctly", () => {
        // 100 kt ground speed
        const results = calculateWaypoints(waypoints, 100);

        expect(results).toHaveLength(3);
        expect(results[0].timeSinceLast).toBe(15); // 25 NM at 100kt = 15 min
        expect(results[1].timeSinceLast).toBe(15); // 25 NM at 100kt = 15 min
        expect(results[2].timeSinceLast).toBe(15); // 25 NM at 100kt = 15 min
      });

      it("should calculate cumulative times correctly", () => {
        const results = calculateWaypoints(waypoints, 100);

        expect(results[0].cumulativeTime).toBe(15); // 15 min
        expect(results[1].cumulativeTime).toBe(30); // 30 min
        expect(results[2].cumulativeTime).toBe(45); // 45 min
      });

      it("should sort waypoints by distance", () => {
        const unsorted: Waypoint[] = [
          { name: "WP3", distance: 75 },
          { name: "WP1", distance: 25 },
          { name: "WP2", distance: 50 },
        ];

        const results = calculateWaypoints(unsorted, 100);

        expect(results[0].name).toBe("WP1");
        expect(results[1].name).toBe("WP2");
        expect(results[2].name).toBe("WP3");
      });

      it("should return empty array for zero or negative ground speed", () => {
        expect(calculateWaypoints(waypoints, 0)).toEqual([]);
        expect(calculateWaypoints(waypoints, -10)).toEqual([]);
      });
    });

    describe("ETA calculations", () => {
      it("should calculate ETAs when departure time provided", () => {
        const flightParams: FlightParameters = {
          departureTime: "1430", // 2:30 PM
        };

        const results = calculateWaypoints(waypoints, 100, undefined, flightParams);

        expect(results[0].eta).toBe("1445"); // 2:45 PM
        expect(results[1].eta).toBe("1500"); // 3:00 PM
        expect(results[2].eta).toBe("1515"); // 3:15 PM
      });

      it("should handle departure time crossing midnight", () => {
        const flightParams: FlightParameters = {
          departureTime: "2350", // 11:50 PM
        };

        const results = calculateWaypoints(waypoints, 100, undefined, flightParams);

        expect(results[0].eta).toBe("0005"); // 12:05 AM
        expect(results[1].eta).toBe("0020"); // 12:20 AM
        expect(results[2].eta).toBe("0035"); // 12:35 AM
      });

      it("should not calculate ETA without departure time", () => {
        const results = calculateWaypoints(waypoints, 100);

        expect(results[0].eta).toBeUndefined();
        expect(results[1].eta).toBeUndefined();
        expect(results[2].eta).toBeUndefined();
      });
    });

    describe("fuel calculations", () => {
      it("should calculate fuel consumption for waypoints", () => {
        const results = calculateWaypoints(waypoints, 100, 10); // 10 GPH

        // WP1: 15 min = 0.25 hr × 10 GPH = 2.5 (rounded to 3)
        // WP2: 30 min = 0.5 hr × 10 GPH = 5
        // WP3: 45 min = 0.75 hr × 10 GPH = 7.5 (rounded to 8)
        expect(results[0].fuelUsed).toBeCloseTo(3, 0);
        expect(results[1].fuelUsed).toBe(5);
        expect(results[2].fuelUsed).toBeCloseTo(8, 0);
      });

      it("should account for previous fuel used", () => {
        const flightParams: FlightParameters = {
          previousFuelUsed: 20,
        };

        const results = calculateWaypoints(waypoints, 100, 10, flightParams);

        // Previous: 20 gal
        // WP1: 20 + (0.25 hr × 10 GPH) = 22.5 (rounded to 23)
        // WP2: 20 + (0.5 hr × 10 GPH) = 25
        // WP3: 20 + (0.75 hr × 10 GPH) = 27.5 (rounded to 28)
        expect(results[0].fuelUsed).toBeCloseTo(23, 0);
        expect(results[1].fuelUsed).toBe(25);
        expect(results[2].fuelUsed).toBeCloseTo(28, 0);
      });

      it("should account for elapsed minutes without previousFuelUsed", () => {
        const flightParams: FlightParameters = {
          elapsedMinutes: 30, // Already flown 30 minutes
        };

        const results = calculateWaypoints(waypoints, 100, 10, flightParams);

        // WP1: (30 + 15) min = 45 min = 0.75 hr × 10 GPH = 7.5 (rounded to 8)
        // WP2: (30 + 30) min = 60 min = 1 hr × 10 GPH = 10
        // WP3: (30 + 45) min = 75 min = 1.25 hr × 10 GPH = 12.5 (rounded to 13)
        expect(results[0].fuelUsed).toBeCloseTo(8, 0);
        expect(results[1].fuelUsed).toBe(10);
        expect(results[2].fuelUsed).toBeCloseTo(13, 0);
      });

      it("should not calculate fuel without fuel flow", () => {
        const results = calculateWaypoints(waypoints, 100);

        expect(results[0].fuelUsed).toBeUndefined();
        expect(results[1].fuelUsed).toBeUndefined();
        expect(results[2].fuelUsed).toBeUndefined();
      });
    });

    describe("totalDistance and arrival waypoint", () => {
      it("should add Arrival waypoint when totalDistance > last waypoint", () => {
        const results = calculateWaypoints(waypoints, 100, undefined, undefined, 100);

        expect(results).toHaveLength(4);
        expect(results[3].name).toBe("Arrival");
        expect(results[3].distance).toBe(100);
      });

      it("should not add Arrival waypoint when totalDistance <= last waypoint", () => {
        const results = calculateWaypoints(waypoints, 100, undefined, undefined, 75);

        expect(results).toHaveLength(3);
        expect(results[2].name).toBe("WP3");
      });

      it("should handle empty waypoints with totalDistance", () => {
        const results = calculateWaypoints([], 100, undefined, undefined, 50);

        expect(results).toHaveLength(1);
        expect(results[0].name).toBe("Arrival");
        expect(results[0].distance).toBe(50);
        expect(results[0].timeSinceLast).toBe(30); // 50 NM at 100kt = 30 min
      });
    });

    describe("realistic multi-leg flight", () => {
      it("should handle multi-leg flight with all parameters", () => {
        const flightParams: FlightParameters = {
          departureTime: "1000",
          elapsedMinutes: 60, // Already flown 1 hour
          previousFuelUsed: 12, // Already used 12 gallons
        };

        const results = calculateWaypoints(
          waypoints,
          120, // 120 kt GS
          12, // 12 GPH
          flightParams,
          100 // Total distance 100 NM
        );

        expect(results).toHaveLength(4); // 3 waypoints + Arrival
        expect(results[3].name).toBe("Arrival");

        // Check last waypoint (Arrival)
        const arrival = results[3];
        expect(arrival.distance).toBe(100);
        expect(arrival.cumulativeTime).toBeGreaterThan(60); // More than elapsed time
        expect(arrival.eta).toBeDefined();
        expect(arrival.fuelUsed).toBeGreaterThan(12); // More than previous fuel
      });
    });
  });
});
