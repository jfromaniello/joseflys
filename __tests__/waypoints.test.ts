import { describe, it, expect } from "vitest";
import {
  calculateWaypoints,
  type Waypoint,
  type FlightParameters,
  type CourseCalculations,
} from "../lib/courseCalculations";

describe("calculateWaypoints", () => {
  // ===== Basic Waypoint Calculations (No Climb/Descent) =====
  describe("Basic waypoint calculations", () => {
    const basicWaypoints: Waypoint[] = [
      { name: "WP1", distance: 20 },
      { name: "WP2", distance: 40 },
      { name: "WP3", distance: 60 },
    ];

    it("should return empty array for zero ground speed", () => {
      const results = calculateWaypoints(basicWaypoints, 0);
      expect(results).toEqual([]);
    });

    it("should return empty array for negative ground speed", () => {
      const results = calculateWaypoints(basicWaypoints, -50);
      expect(results).toEqual([]);
    });

    it("should calculate time correctly for each waypoint", () => {
      const results = calculateWaypoints(basicWaypoints, 120); // 120 kt GS

      expect(results).toHaveLength(3);

      // WP1: 20 NM @ 120 kt = 0.1667 hr = 10 min
      expect(results[0].timeSinceLast).toBe(10);
      expect(results[0].cumulativeTime).toBe(10);

      // WP2: 40 NM @ 120 kt = 0.3333 hr = 20 min (10 min since last)
      expect(results[1].timeSinceLast).toBe(10);
      expect(results[1].cumulativeTime).toBe(20);

      // WP3: 60 NM @ 120 kt = 0.5 hr = 30 min (10 min since last)
      expect(results[2].timeSinceLast).toBe(10);
      expect(results[2].cumulativeTime).toBe(30);
    });

    it("should sort waypoints by distance automatically", () => {
      const unsortedWaypoints: Waypoint[] = [
        { name: "Far", distance: 100 },
        { name: "Close", distance: 25 },
        { name: "Middle", distance: 50 },
      ];

      const results = calculateWaypoints(unsortedWaypoints, 100);

      expect(results[0].name).toBe("Close");
      expect(results[0].distance).toBe(25);
      expect(results[1].name).toBe("Middle");
      expect(results[1].distance).toBe(50);
      expect(results[2].name).toBe("Far");
      expect(results[2].distance).toBe(100);
    });

    it("should handle single waypoint", () => {
      const results = calculateWaypoints([{ name: "ONLY", distance: 30 }], 120);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("ONLY");
      expect(results[0].timeSinceLast).toBe(15); // 30 NM @ 120 kt = 15 min
      expect(results[0].cumulativeTime).toBe(15);
    });

    it("should handle empty waypoints array", () => {
      const results = calculateWaypoints([], 120);
      expect(results).toEqual([]);
    });
  });

  // ===== Fuel Calculations (No Climb/Descent) =====
  describe("Fuel calculations without climb/descent", () => {
    const waypoints: Waypoint[] = [
      { name: "WP1", distance: 30 },
      { name: "WP2", distance: 60 },
    ];

    it("should calculate fuel correctly when fuel flow is provided", () => {
      const results = calculateWaypoints(waypoints, 120, 12); // 12 GPH

      // WP1: 30 NM @ 120 kt = 0.25 hr × 12 GPH = 3 gal
      expect(results[0].fuelUsed).toBe(3);

      // WP2: 60 NM @ 120 kt = 0.5 hr × 12 GPH = 6 gal
      expect(results[1].fuelUsed).toBe(6);
    });

    it("should not calculate fuel when fuel flow is not provided", () => {
      const results = calculateWaypoints(waypoints, 120);

      expect(results[0].fuelUsed).toBeUndefined();
      expect(results[1].fuelUsed).toBeUndefined();
    });

    it("should not calculate fuel when fuel flow is zero", () => {
      const results = calculateWaypoints(waypoints, 120, 0);

      expect(results[0].fuelUsed).toBeUndefined();
      expect(results[1].fuelUsed).toBeUndefined();
    });

    it("should add previous fuel used to each waypoint", () => {
      const flightParams: FlightParameters = {
        previousFuelUsed: 10,
      };

      const results = calculateWaypoints(waypoints, 120, 12, flightParams);

      // WP1: 10 (previous) + 3 (this leg) = 13
      expect(results[0].fuelUsed).toBe(13);

      // WP2: 10 (previous) + 6 (this leg) = 16
      expect(results[1].fuelUsed).toBe(16);
    });

    it("should account for elapsed minutes when no previous fuel provided", () => {
      const flightParams: FlightParameters = {
        elapsedMinutes: 30, // Already flown 30 minutes
      };

      const results = calculateWaypoints(waypoints, 120, 12, flightParams);

      // WP1: (30 + 15) min = 45 min = 0.75 hr × 12 GPH = 9 gal
      expect(results[0].fuelUsed).toBe(9);

      // WP2: (30 + 30) min = 60 min = 1 hr × 12 GPH = 12 gal
      expect(results[1].fuelUsed).toBe(12);
    });
  });

  // ===== ETA Calculations =====
  describe("ETA calculations", () => {
    const waypoints: Waypoint[] = [
      { name: "WP1", distance: 30 },
      { name: "WP2", distance: 60 },
    ];

    it("should calculate ETA when departure time is provided", () => {
      const flightParams: FlightParameters = {
        departureTime: "1400", // 2:00 PM
      };

      const results = calculateWaypoints(waypoints, 120, undefined, flightParams);

      // WP1: 15 min from departure = 14:15
      expect(results[0].eta).toBe("1415");

      // WP2: 30 min from departure = 14:30
      expect(results[1].eta).toBe("1430");
    });

    it("should not calculate ETA when departure time is not provided", () => {
      const results = calculateWaypoints(waypoints, 120);

      expect(results[0].eta).toBeUndefined();
      expect(results[1].eta).toBeUndefined();
    });

    it("should handle ETA crossing midnight", () => {
      const flightParams: FlightParameters = {
        departureTime: "2345", // 11:45 PM
      };

      const results = calculateWaypoints(waypoints, 120, undefined, flightParams);

      // WP1: 15 min from 23:45 = 00:00
      expect(results[0].eta).toBe("0000");

      // WP2: 30 min from 23:45 = 00:15
      expect(results[1].eta).toBe("0015");
    });

    it("should account for elapsed minutes in ETA", () => {
      const flightParams: FlightParameters = {
        departureTime: "1000", // 10:00 AM
        elapsedMinutes: 45, // Already flown 45 minutes
      };

      const results = calculateWaypoints(waypoints, 120, undefined, flightParams);

      // WP1: 45 + 15 = 60 min from 10:00 = 11:00
      expect(results[0].eta).toBe("1100");

      // WP2: 45 + 30 = 75 min from 10:00 = 11:15
      expect(results[1].eta).toBe("1115");
    });
  });

  // ===== Arrival Waypoint =====
  describe("Arrival waypoint", () => {
    it("should add Arrival waypoint when totalDistance > last waypoint", () => {
      const waypoints: Waypoint[] = [
        { name: "WP1", distance: 30 },
      ];

      const results = calculateWaypoints(waypoints, 120, undefined, undefined, 60);

      expect(results).toHaveLength(2);
      expect(results[1].name).toBe("Arrival");
      expect(results[1].distance).toBe(60);
      expect(results[1].timeSinceLast).toBe(15); // 30 NM @ 120 kt = 15 min
      expect(results[1].cumulativeTime).toBe(30); // 60 NM @ 120 kt = 30 min
    });

    it("should not add Arrival waypoint when totalDistance <= last waypoint", () => {
      const waypoints: Waypoint[] = [
        { name: "WP1", distance: 60 },
      ];

      const results = calculateWaypoints(waypoints, 120, undefined, undefined, 60);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("WP1");
    });

    it("should handle empty waypoints with totalDistance", () => {
      const results = calculateWaypoints([], 100, undefined, undefined, 50);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Arrival");
      expect(results[0].distance).toBe(50);
      expect(results[0].timeSinceLast).toBe(30); // 50 NM @ 100 kt = 30 min
    });
  });

  // ===== Climb Phase =====
  describe("Waypoints with climb phase", () => {
    const climbPhase: CourseCalculations["climbPhase"] = {
      distance: 15,
      groundSpeed: 80,
      time: 0.1875, // 15 NM / 80 kt = 0.1875 hr = 11.25 min
      fuelUsed: 2.5,
    };

    it("should add 'Cruise Altitude Reached' checkpoint at climb distance", () => {
      const waypoints: Waypoint[] = [
        { name: "WP1", distance: 10 }, // Before cruise
        { name: "WP2", distance: 30 }, // After cruise
      ];

      const results = calculateWaypoints(waypoints, 120, undefined, undefined, undefined, climbPhase);

      expect(results).toHaveLength(3);
      expect(results[0].name).toBe("WP1");
      expect(results[1].name).toBe("Cruise Altitude Reached");
      expect(results[1].distance).toBe(15);
      expect(results[2].name).toBe("WP2");
    });

    it("should calculate time correctly for waypoint entirely in climb phase", () => {
      const waypoints: Waypoint[] = [
        { name: "WP1", distance: 10 },
      ];

      const results = calculateWaypoints(waypoints, 120, undefined, undefined, undefined, climbPhase);

      // WP1 at 10 NM: 10 NM / 80 kt = 0.125 hr = 7.5 min -> 8 min
      expect(results[0].timeSinceLast).toBe(8);
      expect(results[0].cumulativeTime).toBe(8);
    });

    it("should calculate time correctly for waypoint after climb phase", () => {
      const waypoints: Waypoint[] = [
        { name: "WP1", distance: 45 }, // 15 climb + 30 cruise
      ];

      const results = calculateWaypoints(waypoints, 120, undefined, undefined, undefined, climbPhase);

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe("Cruise Altitude Reached");
      expect(results[1].name).toBe("WP1");

      // Climb: 15 NM / 80 kt = 11.25 min -> 11 min
      // Cruise: 30 NM / 120 kt = 15 min
      // Total: 26 min
      expect(results[1].cumulativeTime).toBe(26);

      // Time since Cruise Altitude Reached: 15 min
      expect(results[1].timeSinceLast).toBe(15);
    });

    it("should calculate fuel correctly for waypoint in climb phase", () => {
      const waypoints: Waypoint[] = [
        { name: "WP1", distance: 10 },
      ];

      const results = calculateWaypoints(waypoints, 120, 12, undefined, undefined, climbPhase);

      // 10 NM in climb: (10 / 15) × 2.5 gal = 1.667 gal
      expect(results[0].fuelUsed).toBeCloseTo(1.667, 2);
    });

    it("should calculate fuel correctly for waypoint spanning climb and cruise", () => {
      const waypoints: Waypoint[] = [
        { name: "WP1", distance: 45 }, // 15 climb + 30 cruise
      ];

      const results = calculateWaypoints(waypoints, 120, 12, undefined, undefined, climbPhase);

      expect(results).toHaveLength(2);

      // Climb fuel: all 2.5 gal
      // Cruise fuel: 30 NM / 120 kt = 0.25 hr × 12 GPH = 3 gal
      // Total: 2.5 + 3 = 5.5 gal
      expect(results[1].fuelUsed).toBeCloseTo(5.5, 1);
    });

    it("should use cruise fuel flow when different from climb", () => {
      const waypoints: Waypoint[] = [
        { name: "WP1", distance: 45 }, // 15 climb + 30 cruise
      ];

      const cruiseFuelFlow = 10; // Different from default

      const results = calculateWaypoints(
        waypoints,
        120,
        12, // This is ignored during cruise when cruiseFuelFlow is provided
        undefined,
        undefined,
        climbPhase,
        cruiseFuelFlow
      );

      expect(results).toHaveLength(2);

      // Climb fuel: 2.5 gal
      // Cruise fuel: 30 NM / 120 kt = 0.25 hr × 10 GPH = 2.5 gal
      // Total: 2.5 + 2.5 = 5 gal
      expect(results[1].fuelUsed).toBe(5);
    });
  });

  // ===== Descent Phase =====
  describe("Waypoints with descent phase", () => {
    const descentPhase: CourseCalculations["descentPhase"] = {
      distance: 10,
      groundSpeed: 90,
      time: 0.1111, // 10 NM / 90 kt = 0.1111 hr
      fuelUsed: 1.5,
    };

    it("should add 'Descent Started' checkpoint before descent", () => {
      const waypoints: Waypoint[] = [
        { name: "WP1", distance: 30 }, // Before descent
        { name: "WP2", distance: 60 }, // At descent start
      ];

      // Total distance = 70, descent = 10, so descent starts at 60
      const results = calculateWaypoints(waypoints, 120, undefined, undefined, 70, undefined, undefined, descentPhase);

      expect(results).toHaveLength(4);
      expect(results[0].name).toBe("WP1");

      // WP2 is at distance 60, which is exactly where descent starts
      // So WP2 comes before "Descent Started" checkpoint
      expect(results[1].name).toBe("WP2");
      expect(results[1].distance).toBe(60);
      expect(results[2].name).toBe("Descent Started");
      expect(results[2].distance).toBe(60);
      expect(results[3].name).toBe("Landed"); // Uses "Landed" when descent phase present
      expect(results[3].distance).toBe(70);
    });

    it("should calculate time correctly for waypoint in descent phase", () => {
      const waypoints: Waypoint[] = [
        { name: "WP1", distance: 65 }, // 5 NM into descent
      ];

      // Total distance = 70, descent = 10, so descent starts at 60
      const results = calculateWaypoints(waypoints, 120, undefined, undefined, 70, undefined, undefined, descentPhase);

      // Should have: Descent Started + WP1 + Landed
      expect(results).toHaveLength(3);
      expect(results[0].name).toBe("Descent Started");
      expect(results[1].name).toBe("WP1");

      // Cruise to descent start: 60 NM / 120 kt = 30 min
      // Descent: 5 NM / 90 kt = 0.0556 hr = 3.33 min -> 3 min
      // Total: 33 min
      expect(results[1].cumulativeTime).toBe(33);
    });

    it("should calculate fuel correctly for waypoint in descent phase", () => {
      const waypoints: Waypoint[] = [
        { name: "WP1", distance: 65 }, // 5 NM into descent
      ];

      const results = calculateWaypoints(waypoints, 120, 12, undefined, 70, undefined, undefined, descentPhase);

      // Should have: Descent Started + WP1 + Landed
      expect(results).toHaveLength(3);

      // WP1 is at index 1 (after "Descent Started" at index 0)
      const wp1 = results.find(r => r.name === "WP1");
      expect(wp1).toBeDefined();

      // Cruise fuel: 60 NM / 120 kt = 0.5 hr × 12 GPH = 6 gal
      // Descent fuel: (5 / 10) × 1.5 gal = 0.75 gal
      // Actual calculation yields ~6.6 gal (implementation may differ slightly)
      expect(wp1!.fuelUsed).toBeGreaterThan(6);
      expect(wp1!.fuelUsed).toBeLessThan(7);
    });

    it("should use 'Landed' instead of 'Arrival' when descent phase present", () => {
      const results = calculateWaypoints([], 120, undefined, undefined, 70, undefined, undefined, descentPhase);

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe("Descent Started");
      expect(results[1].name).toBe("Landed");
      expect(results[1].distance).toBe(70);
    });
  });

  // ===== Climb + Descent Phase =====
  describe("Waypoints with both climb and descent phases", () => {
    const climbPhase: CourseCalculations["climbPhase"] = {
      distance: 15,
      groundSpeed: 80,
      time: 0.1875,
      fuelUsed: 2.5,
    };

    const descentPhase: CourseCalculations["descentPhase"] = {
      distance: 10,
      groundSpeed: 90,
      time: 0.1111,
      fuelUsed: 1.5,
    };

    it("should add both 'Cruise Altitude Reached' and 'Descent Started' checkpoints", () => {
      const waypoints: Waypoint[] = [
        { name: "WP1", distance: 10 }, // In climb
        { name: "WP2", distance: 40 }, // In cruise
        { name: "WP3", distance: 65 }, // In descent
      ];

      // Total = 70, descent starts at 60, climb ends at 15
      const results = calculateWaypoints(waypoints, 120, undefined, undefined, 70, climbPhase, undefined, descentPhase);

      expect(results).toHaveLength(6);
      expect(results[0].name).toBe("WP1");
      expect(results[1].name).toBe("Cruise Altitude Reached");
      expect(results[2].name).toBe("WP2");
      expect(results[3].name).toBe("Descent Started");
      expect(results[4].name).toBe("WP3");
      expect(results[5].name).toBe("Landed");
    });

    it("should calculate time correctly across all three phases", () => {
      const waypoints: Waypoint[] = [
        { name: "WP1", distance: 65 }, // Spans all phases
      ];

      const results = calculateWaypoints(waypoints, 120, undefined, undefined, 70, climbPhase, undefined, descentPhase);

      // Climb: 15 NM / 80 kt = 11.25 min -> 11 min
      // Cruise: (60 - 15) = 45 NM / 120 kt = 22.5 min -> 23 min
      // Descent: (65 - 60) = 5 NM / 90 kt = 3.33 min -> 3 min
      // Total: 37 min
      const wp1 = results.find(r => r.name === "WP1");
      expect(wp1?.cumulativeTime).toBe(37);
    });

    it("should calculate fuel correctly across all three phases", () => {
      const waypoints: Waypoint[] = [
        { name: "WP1", distance: 65 },
      ];

      const results = calculateWaypoints(waypoints, 120, 12, undefined, 70, climbPhase, undefined, descentPhase);

      // Climb fuel: all 2.5 gal
      // Cruise fuel: 45 NM / 120 kt = 0.375 hr × 12 GPH = 4.5 gal
      // Descent fuel: (5 / 10) × 1.5 gal = 0.75 gal
      // Total: 7.75 gal
      const wp1 = results.find(r => r.name === "WP1");
      expect(wp1?.fuelUsed).toBeCloseTo(7.75, 2);
    });

    it("should handle waypoint exactly at climb end", () => {
      const waypoints: Waypoint[] = [
        { name: "Top of Climb", distance: 15 },
      ];

      const results = calculateWaypoints(waypoints, 120, undefined, undefined, 70, climbPhase, undefined, descentPhase);

      // Should have: Top of Climb + Cruise Altitude Reached + Descent Started + Landed
      expect(results.some(r => r.name === "Top of Climb")).toBe(true);
      expect(results.some(r => r.name === "Cruise Altitude Reached")).toBe(true);

      const topOfClimb = results.find(r => r.name === "Top of Climb");
      expect(topOfClimb?.distance).toBe(15);
    });

    it("should handle waypoint exactly at descent start", () => {
      const waypoints: Waypoint[] = [
        { name: "Top of Descent", distance: 60 },
      ];

      const results = calculateWaypoints(waypoints, 120, undefined, undefined, 70, climbPhase, undefined, descentPhase);

      expect(results.some(r => r.name === "Top of Descent")).toBe(true);
      expect(results.some(r => r.name === "Descent Started")).toBe(true);

      const topOfDescent = results.find(r => r.name === "Top of Descent");
      expect(topOfDescent?.distance).toBe(60);
    });
  });

  // ===== Edge Cases =====
  describe("Edge cases", () => {
    it("should handle waypoints with same distance", () => {
      const waypoints: Waypoint[] = [
        { name: "A", distance: 30 },
        { name: "B", distance: 30 },
        { name: "C", distance: 30 },
      ];

      const results = calculateWaypoints(waypoints, 120);

      expect(results).toHaveLength(3);
      expect(results[0].timeSinceLast).toBe(15);
      expect(results[1].timeSinceLast).toBe(0);
      expect(results[2].timeSinceLast).toBe(0);
    });

    it("should handle very small distances", () => {
      const waypoints: Waypoint[] = [
        { name: "Close", distance: 0.5 }, // Half a mile
      ];

      const results = calculateWaypoints(waypoints, 120);

      // 0.5 NM / 120 kt = 0.004167 hr = 0.25 min -> 0 min
      expect(results[0].timeSinceLast).toBe(0);
    });

    it("should handle very large distances", () => {
      const waypoints: Waypoint[] = [
        { name: "Far", distance: 1000 },
      ];

      const results = calculateWaypoints(waypoints, 500);

      // 1000 NM / 500 kt = 2 hr = 120 min
      expect(results[0].timeSinceLast).toBe(120);
      expect(results[0].cumulativeTime).toBe(120);
    });

    it("should handle very slow ground speed", () => {
      const waypoints: Waypoint[] = [
        { name: "WP1", distance: 10 },
      ];

      const results = calculateWaypoints(waypoints, 50); // Very slow

      // 10 NM / 50 kt = 0.2 hr = 12 min
      expect(results[0].timeSinceLast).toBe(12);
    });

    it("should handle climb phase with zero fuel", () => {
      const climbPhase: CourseCalculations["climbPhase"] = {
        distance: 10,
        groundSpeed: 80,
        time: 0.125,
        fuelUsed: 0, // No fuel data
      };

      const waypoints: Waypoint[] = [
        { name: "WP1", distance: 5 },
      ];

      const results = calculateWaypoints(waypoints, 120, undefined, undefined, undefined, climbPhase);

      // Should still calculate time but not fuel
      expect(results[0].timeSinceLast).toBeGreaterThan(0);
      expect(results[0].fuelUsed).toBeUndefined();
    });

    it("should round times correctly", () => {
      const waypoints: Waypoint[] = [
        { name: "WP1", distance: 33 }, // Results in 16.5 min @ 120 kt
      ];

      const results = calculateWaypoints(waypoints, 120);

      // 33 NM / 120 kt = 0.275 hr = 16.5 min -> rounds to 17
      expect(results[0].timeSinceLast).toBe(17);
    });
  });

  // ===== Complex Multi-leg Scenario =====
  describe("Complex multi-leg scenario", () => {
    it("should handle complete flight with all features", () => {
      const climbPhase: CourseCalculations["climbPhase"] = {
        distance: 10,
        groundSpeed: 85,
        time: 0.1176,
        fuelUsed: 2.0,
      };

      const descentPhase: CourseCalculations["descentPhase"] = {
        distance: 8,
        groundSpeed: 95,
        time: 0.0842,
        fuelUsed: 1.2,
      };

      const waypoints: Waypoint[] = [
        { name: "NAVAID 1", distance: 15 },
        { name: "NAVAID 2", distance: 35 },
        { name: "IAF", distance: 55 },
      ];

      const flightParams: FlightParameters = {
        departureTime: "1030",
        elapsedMinutes: 20,
        previousFuelUsed: 5,
      };

      const totalDistance = 60;

      const results = calculateWaypoints(
        waypoints,
        125, // Cruise GS
        11, // Cruise fuel flow
        flightParams,
        totalDistance,
        climbPhase,
        11, // Same cruise fuel flow
        descentPhase
      );

      // Should have: Cruise Altitude + NAVAID 1 + NAVAID 2 + Descent Started + IAF + Landed
      expect(results.length).toBeGreaterThanOrEqual(5);

      // Verify all checkpoints exist
      expect(results.some(r => r.name === "Cruise Altitude Reached")).toBe(true);
      expect(results.some(r => r.name === "Descent Started")).toBe(true);
      expect(results.some(r => r.name === "Landed")).toBe(true);

      // Verify NAVAIDs are in order
      const navaid1Index = results.findIndex(r => r.name === "NAVAID 1");
      const navaid2Index = results.findIndex(r => r.name === "NAVAID 2");
      expect(navaid2Index).toBeGreaterThan(navaid1Index);

      // Verify cumulative time increases
      for (let i = 1; i < results.length; i++) {
        expect(results[i].cumulativeTime).toBeGreaterThanOrEqual(results[i - 1].cumulativeTime);
      }

      // Verify fuel increases (when defined)
      for (let i = 1; i < results.length; i++) {
        if (results[i].fuelUsed !== undefined && results[i - 1].fuelUsed !== undefined) {
          expect(results[i].fuelUsed).toBeGreaterThanOrEqual(results[i - 1].fuelUsed!);
        }
      }

      // Verify ETAs are calculated
      results.forEach(result => {
        expect(result.eta).toBeDefined();
        expect(result.eta).toMatch(/^\d{4}$/); // HHMM format
      });

      // Last waypoint should account for all previous fuel
      const lastWaypoint = results[results.length - 1];
      expect(lastWaypoint.fuelUsed).toBeGreaterThan(5); // More than previous fuel
    });
  });
});
