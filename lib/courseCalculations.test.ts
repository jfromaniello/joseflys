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

        // WP1: 15 min = 0.25 hr × 10 GPH = 2.5
        // WP2: 30 min = 0.5 hr × 10 GPH = 5
        // WP3: 45 min = 0.75 hr × 10 GPH = 7.5
        expect(results[0].fuelUsed).toBeCloseTo(2.5, 1);
        expect(results[1].fuelUsed).toBe(5);
        expect(results[2].fuelUsed).toBeCloseTo(7.5, 1);
      });

      it("should account for previous fuel used", () => {
        const flightParams: FlightParameters = {
          previousFuelUsed: 20,
        };

        const results = calculateWaypoints(waypoints, 100, 10, flightParams);

        // Previous: 20 gal
        // WP1: 20 + (0.25 hr × 10 GPH) = 22.5
        // WP2: 20 + (0.5 hr × 10 GPH) = 25
        // WP3: 20 + (0.75 hr × 10 GPH) = 27.5
        expect(results[0].fuelUsed).toBeCloseTo(22.5, 1);
        expect(results[1].fuelUsed).toBe(25);
        expect(results[2].fuelUsed).toBeCloseTo(27.5, 1);
      });

      it("should account for elapsed minutes without previousFuelUsed", () => {
        const flightParams: FlightParameters = {
          elapsedMinutes: 30, // Already flown 30 minutes
        };

        const results = calculateWaypoints(waypoints, 100, 10, flightParams);

        // WP1: (30 + 15) min = 45 min = 0.75 hr × 10 GPH = 7.5
        // WP2: (30 + 30) min = 60 min = 1 hr × 10 GPH = 10
        // WP3: (30 + 45) min = 75 min = 1.25 hr × 10 GPH = 12.5
        expect(results[0].fuelUsed).toBeCloseTo(7.5, 1);
        expect(results[1].fuelUsed).toBe(10);
        expect(results[2].fuelUsed).toBeCloseTo(12.5, 1);
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

    describe("climb phase calculations", () => {
      const climbPhase = {
        distance: 10, // 10 NM climb distance
        groundSpeed: 80, // 80 kt GS during climb
        time: 0.125, // 7.5 minutes (10 NM / 80 kt)
        fuelUsed: 2, // 2 gallons during climb
      };

      it("should calculate waypoint entirely within climb phase", () => {
        const waypoints: Waypoint[] = [{ name: "WP1", distance: 5 }];

        const results = calculateWaypoints(
          waypoints,
          120, // Cruise GS
          10, // Cruise fuel flow (GPH)
          undefined,
          undefined,
          climbPhase
        );

        // Should have WP1 + "Cruise Altitude Reached" (WP1 is before cruise altitude)
        expect(results).toHaveLength(2);
        expect(results[0].name).toBe("WP1");
        expect(results[1].name).toBe("Cruise Altitude Reached");
        expect(results[1].distance).toBe(10);

        // WP1 at 5 NM, entirely in climb phase
        // Time: 5 NM / 80 kt = 0.0625 hr = 3.75 min (rounds to 4)
        expect(results[0].timeSinceLast).toBe(4);
        expect(results[0].cumulativeTime).toBe(4);

        // Fuel: proportional to distance in climb (2 gal / 10 NM = 0.2 gal/NM)
        // 5 NM * 0.2 = 1 gal
        expect(results[0].fuelUsed).toBe(1);
      });

      it("should calculate waypoint after climb phase", () => {
        const waypoints: Waypoint[] = [{ name: "WP1", distance: 30 }];

        const results = calculateWaypoints(
          waypoints,
          120, // Cruise GS
          10, // Cruise fuel flow (GPH)
          undefined,
          undefined,
          climbPhase
        );

        // Should have "Cruise Altitude Reached" + WP1 (WP1 is after cruise altitude)
        expect(results).toHaveLength(2);
        expect(results[0].name).toBe("Cruise Altitude Reached");
        expect(results[1].name).toBe("WP1");

        // WP1 at 30 NM: 10 NM climb + 20 NM cruise
        // timeSinceLast from Cruise Altitude Reached to WP1: 20 NM cruise
        // Cruise time: 20 / 120 = 0.1667 hr = 10 min
        expect(results[1].timeSinceLast).toBe(10);
        // Total cumulative time: 7.5 (climb) + 10 (cruise) = 17.5 -> 18
        expect(results[1].cumulativeTime).toBe(18);

        // Fuel: 2 gal (climb) + (10 GPH * 0.1667 hr) = 2 + 1.667 = 3.667
        expect(results[1].fuelUsed).toBeCloseTo(3.667, 1);
      });

      it("should calculate multiple waypoints spanning climb and cruise", () => {
        const waypoints: Waypoint[] = [
          { name: "WP1", distance: 5 }, // In climb
          { name: "WP2", distance: 15 }, // After climb
          { name: "WP3", distance: 35 }, // Further in cruise
        ];

        const results = calculateWaypoints(
          waypoints,
          120, // Cruise GS
          10, // Cruise fuel flow (GPH)
          undefined,
          undefined,
          climbPhase
        );

        // Should have WP1 + "Cruise Altitude Reached" + WP2 + WP3
        expect(results).toHaveLength(4);
        expect(results[0].name).toBe("WP1");
        expect(results[1].name).toBe("Cruise Altitude Reached");
        expect(results[2].name).toBe("WP2");
        expect(results[3].name).toBe("WP3");

        // WP1: 5 NM in climb
        expect(results[0].distance).toBe(5);
        expect(results[0].timeSinceLast).toBe(4); // 5/80 * 60 = 3.75 -> 4
        expect(results[0].fuelUsed).toBe(1); // 5 * 0.2 = 1

        // WP2: 10 NM climb + 5 NM cruise
        expect(results[2].distance).toBe(15);
        // Time from Cruise Altitude Reached to WP2: 5 NM cruise
        // 5/120 * 60 = 2.5 -> 3 min
        expect(results[2].timeSinceLast).toBe(3);
        // Total time from start: 7.5 (climb) + 2.5 (cruise) = 10 min
        expect(results[2].cumulativeTime).toBe(10);
        // Fuel: 2 (all climb) + 10 * (5/120) = 2 + 0.417 = 2.417
        expect(results[2].fuelUsed).toBeCloseTo(2.417, 1);

        // WP3: 10 NM climb + 25 NM cruise
        expect(results[3].distance).toBe(35);
        // Time from WP2 to WP3: 20 NM cruise
        // 20/120 * 60 = 10 min
        expect(results[3].timeSinceLast).toBe(10);
        // Total time: 7.5 (climb) + 12.5 (cruise) = 20 min
        expect(results[3].cumulativeTime).toBe(20);
        // Fuel: 2 (climb) + 10 * (25/120) = 2 + 2.083 = 4.083
        expect(results[3].fuelUsed).toBeCloseTo(4.083, 1);
      });

      it("should handle waypoints with previous fuel used during climb", () => {
        const waypoints: Waypoint[] = [
          { name: "WP1", distance: 5 },
          { name: "WP2", distance: 20 },
        ];

        const flightParams: FlightParameters = {
          previousFuelUsed: 10,
        };

        const results = calculateWaypoints(
          waypoints,
          120,
          10,
          flightParams,
          undefined,
          climbPhase
        );

        // Should have WP1 + "Cruise Altitude Reached" + WP2
        expect(results).toHaveLength(3);
        expect(results[0].name).toBe("WP1");
        expect(results[1].name).toBe("Cruise Altitude Reached");
        expect(results[2].name).toBe("WP2");

        // WP1: 10 (previous) + 1 (climb fuel) = 11
        expect(results[0].fuelUsed).toBe(11);

        // WP2: 10 (previous) + 2 (all climb) + 0.833 (cruise) = 12.833
        expect(results[2].fuelUsed).toBeCloseTo(12.833, 1);
      });

      it("should calculate ETAs correctly with climb phase", () => {
        const waypoints: Waypoint[] = [
          { name: "In Climb", distance: 5 },
          { name: "After Climb", distance: 20 },
        ];

        const flightParams: FlightParameters = {
          departureTime: "1400", // 2:00 PM
        };

        const results = calculateWaypoints(
          waypoints,
          120,
          10,
          flightParams,
          undefined,
          climbPhase
        );

        // Should have In Climb + "Cruise Altitude Reached" + After Climb
        expect(results).toHaveLength(3);
        expect(results[0].name).toBe("In Climb");
        expect(results[1].name).toBe("Cruise Altitude Reached");
        expect(results[2].name).toBe("After Climb");

        // In Climb at 5 NM: 4 min from departure = 14:04
        expect(results[0].eta).toBe("1404");

        // After Climb at 20 NM: climb (7.5 min) + cruise (5 min) = 12.5 min -> 13 min = 14:13
        expect(results[2].eta).toBe("1413");
      });

      it("should handle edge case where waypoint is exactly at climb distance", () => {
        const waypoints: Waypoint[] = [{ name: "Top of Climb", distance: 10 }];

        const results = calculateWaypoints(
          waypoints,
          120,
          10,
          undefined,
          undefined,
          climbPhase
        );

        // Should have Top of Climb + "Cruise Altitude Reached" (both at same distance)
        expect(results).toHaveLength(2);
        expect(results[0].name).toBe("Top of Climb");
        expect(results[1].name).toBe("Cruise Altitude Reached");

        // At exactly climb distance, should use climb calculations
        // 10 NM / 80 kt = 0.125 hr = 7.5 min -> 8
        expect(results[0].timeSinceLast).toBe(8);
        // Fuel: all climb fuel = 2 gal
        expect(results[0].fuelUsed).toBe(2);

        // Cruise Altitude Reached is at same distance, so timeSinceLast is 0
        expect(results[1].timeSinceLast).toBe(0);
        expect(results[1].cumulativeTime).toBe(8);
        expect(results[1].fuelUsed).toBe(2);
      });

      it("should handle arrival waypoint with climb phase", () => {
        const waypoints: Waypoint[] = [
          { name: "WP1", distance: 8 },
        ];

        const results = calculateWaypoints(
          waypoints,
          120,
          10,
          undefined,
          50, // Total distance (arrival at 50 NM)
          climbPhase
        );

        // Should have WP1 + "Cruise Altitude Reached" + Arrival
        expect(results).toHaveLength(3);
        expect(results[0].name).toBe("WP1");
        expect(results[1].name).toBe("Cruise Altitude Reached");
        expect(results[2].name).toBe("Arrival");
        expect(results[2].distance).toBe(50);

        // Arrival at 50 NM: 10 climb + 40 cruise
        // Time: 7.5 (climb) + 20 (cruise) = 27.5 -> 28 min
        expect(results[2].cumulativeTime).toBe(28);

        // Fuel: 2 (climb) + 10 * (40/120) = 2 + 3.333 = 5.333
        expect(results[2].fuelUsed).toBeCloseTo(5.333, 1);
      });

      it("should use different cruise fuel flow if provided", () => {
        const waypoints: Waypoint[] = [{ name: "WP1", distance: 30 }];

        // Cruise fuel flow is 12 GPH instead of 10
        const results = calculateWaypoints(
          waypoints,
          120,
          10, // This becomes the default, but we override with cruiseFuelFlow
          undefined,
          undefined,
          climbPhase,
          12 // Different cruise fuel flow
        );

        // Should have "Cruise Altitude Reached" + WP1
        expect(results).toHaveLength(2);
        expect(results[0].name).toBe("Cruise Altitude Reached");

        // WP1: 10 climb + 20 cruise
        // Fuel: 2 (climb) + 12 * (20/120) = 2 + 2 = 4
        expect(results[1].fuelUsed).toBe(4);
      });

      it("should handle no fuel flow with climb phase (time only)", () => {
        const waypoints: Waypoint[] = [
          { name: "WP1", distance: 5 },
          { name: "WP2", distance: 20 },
        ];

        // Climb phase with NO fuel data (fuelUsed: 0)
        const climbPhaseNoFuel = {
          distance: 10,
          groundSpeed: 80,
          time: 0.125,
          fuelUsed: 0, // No fuel data
        };

        const results = calculateWaypoints(
          waypoints,
          120,
          undefined, // No fuel flow
          undefined,
          undefined,
          climbPhaseNoFuel
        );

        // Should have WP1 + "Cruise Altitude Reached" + WP2
        expect(results).toHaveLength(3);
        expect(results[0].name).toBe("WP1");
        expect(results[1].name).toBe("Cruise Altitude Reached");
        expect(results[2].name).toBe("WP2");

        // Should calculate times correctly
        // WP1: 5 NM / 80 kt = 3.75 min -> 4
        expect(results[0].timeSinceLast).toBe(4);
        // WP2: From Cruise Altitude Reached to WP2 = 10 NM cruise
        // Cruise: 10 NM @ 120 kt = 5 min
        expect(results[2].timeSinceLast).toBe(5);

        // But no fuel calculations (no fuel flow and no climb fuel)
        expect(results[0].fuelUsed).toBeUndefined();
        expect(results[2].fuelUsed).toBeUndefined();
      });
    });
  });
});
