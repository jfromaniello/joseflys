import { describe, it, expect } from "vitest";
import { calculateCourse } from "../lib/courseCalculations";

describe("Climb and Descent Navigation Parameters", () => {
  it("should calculate WCA, MH, Dev, CC for climb phase with wind", () => {
    const result = calculateCourse({
      th: 90, // True course: 090°
      tas: 120, // Cruise TAS: 120 KT
      wd: 180, // Wind from 180°
      ws: 25, // Wind speed: 25 KT
      var: 5, // Magnetic variation: 5°E (WMM convention)
      dist: 85,
      ff: 8,
      climbTas: 100, // Climb TAS: 100 KT
      climbDist: 10, // Climb distance: 10 NM
      climbFuel: 2, // Climb fuel: 2 GAL
      climbWd: 200, // Climb wind from 200° (different from cruise)
      climbWs: 20, // Climb wind speed: 20 KT
    });

    // Verify climb phase exists
    expect(result.climbPhase).toBeDefined();
    expect(result.climbPhase!.distance).toBe(10);

    // Verify climb navigation parameters are calculated
    expect(result.climbPhase!.windCorrectionAngle).toBeDefined();
    expect(result.climbPhase!.magneticHeading).toBeDefined();
    expect(result.climbPhase!.compassDeviation).toBeDefined();
    expect(result.climbPhase!.compassCourse).toBeDefined();

    // WCA should be non-zero with wind
    expect(result.climbPhase!.windCorrectionAngle).not.toBe(0);

    // Magnetic heading should be different from cruise MH due to different WCA
    expect(result.climbPhase!.magneticHeading).not.toBe(result.magneticHeading);

    console.log("Climb Phase Navigation:");
    console.log(`  WCA: ${result.climbPhase!.windCorrectionAngle.toFixed(1)}°`);
    console.log(`  MH: ${Math.round(result.climbPhase!.magneticHeading)}°`);
    console.log(`  Dev: ${result.climbPhase!.compassDeviation.toFixed(1)}°`);
    console.log(`  CC: ${Math.round(result.climbPhase!.compassCourse)}°`);
  });

  it("should calculate WCA, MH, Dev, CC for descent phase with wind", () => {
    const result = calculateCourse({
      th: 270, // True course: 270°
      tas: 130, // Cruise TAS: 130 KT
      wd: 360, // Wind from 360° (North)
      ws: 30, // Wind speed: 30 KT
      var: -10, // Magnetic variation: 10°W (WMM convention)
      dist: 100,
      ff: 9,
      descentTas: 110, // Descent TAS: 110 KT
      descentDist: 15, // Descent distance: 15 NM
      descentFuel: 1.5, // Descent fuel: 1.5 GAL
      descentWd: 340, // Descent wind from 340° (different from cruise)
      descentWs: 25, // Descent wind speed: 25 KT
    });

    // Verify descent phase exists
    expect(result.descentPhase).toBeDefined();
    expect(result.descentPhase!.distance).toBe(15);

    // Verify descent navigation parameters are calculated
    expect(result.descentPhase!.windCorrectionAngle).toBeDefined();
    expect(result.descentPhase!.magneticHeading).toBeDefined();
    expect(result.descentPhase!.compassDeviation).toBeDefined();
    expect(result.descentPhase!.compassCourse).toBeDefined();

    // WCA should be non-zero with wind
    expect(result.descentPhase!.windCorrectionAngle).not.toBe(0);

    // Magnetic heading should be different from cruise MH due to different WCA
    expect(result.descentPhase!.magneticHeading).not.toBe(result.magneticHeading);

    console.log("Descent Phase Navigation:");
    console.log(`  WCA: ${result.descentPhase!.windCorrectionAngle.toFixed(1)}°`);
    console.log(`  MH: ${Math.round(result.descentPhase!.magneticHeading)}°`);
    console.log(`  Dev: ${result.descentPhase!.compassDeviation.toFixed(1)}°`);
    console.log(`  CC: ${Math.round(result.descentPhase!.compassCourse)}°`);
  });

  it("should have zero WCA when no wind in climb phase", () => {
    const result = calculateCourse({
      th: 90,
      tas: 120,
      var: 5,
      dist: 85,
      ff: 8,
      climbTas: 100,
      climbDist: 10,
      climbFuel: 2,
      // No wind specified
    });

    expect(result.climbPhase).toBeDefined();
    expect(Math.abs(result.climbPhase!.windCorrectionAngle)).toBeLessThan(0.001);
    // MH should equal MC when WCA is 0
    expect(result.climbPhase!.magneticHeading).toBe(result.magneticCourse);
  });

  it("should have zero WCA when no wind in descent phase", () => {
    const result = calculateCourse({
      th: 270,
      tas: 130,
      var: -10,
      dist: 100,
      ff: 9,
      descentTas: 110,
      descentDist: 15,
      descentFuel: 1.5,
      // No wind specified
    });

    expect(result.descentPhase).toBeDefined();
    expect(result.descentPhase!.windCorrectionAngle).toBe(0);
    // MH should equal MC when WCA is 0
    expect(result.descentPhase!.magneticHeading).toBe(result.magneticCourse);
  });

  it("should use cruise wind if climb wind not specified", () => {
    const result = calculateCourse({
      th: 90,
      tas: 120,
      wd: 180, // Cruise wind
      ws: 25,
      var: 5,
      dist: 85,
      ff: 8,
      climbTas: 100,
      climbDist: 10,
      climbFuel: 2,
      // Climb wind not specified, should use cruise wind
    });

    expect(result.climbPhase).toBeDefined();
    expect(result.climbPhase!.windCorrectionAngle).not.toBe(0);
  });

  it("should use cruise wind if descent wind not specified", () => {
    const result = calculateCourse({
      th: 270,
      tas: 130,
      wd: 360, // Cruise wind
      ws: 30,
      var: -10,
      dist: 100,
      ff: 9,
      descentTas: 110,
      descentDist: 15,
      descentFuel: 1.5,
      // Descent wind not specified, should use cruise wind
    });

    expect(result.descentPhase).toBeDefined();
    expect(result.descentPhase!.windCorrectionAngle).not.toBe(0);
  });

  it("should handle both climb and descent phases together", () => {
    const result = calculateCourse({
      th: 45,
      tas: 125,
      wd: 90,
      ws: 20,
      var: 3,
      dist: 120,
      ff: 8.5,
      climbTas: 95,
      climbDist: 12,
      climbFuel: 2.2,
      climbWd: 100,
      climbWs: 22,
      descentTas: 105,
      descentDist: 18,
      descentFuel: 1.8,
      descentWd: 80,
      descentWs: 18,
    });

    // Verify both phases exist
    expect(result.climbPhase).toBeDefined();
    expect(result.descentPhase).toBeDefined();
    expect(result.cruisePhase).toBeDefined();

    // Verify all navigation parameters are calculated for both phases
    expect(result.climbPhase!.windCorrectionAngle).toBeDefined();
    expect(result.climbPhase!.magneticHeading).toBeDefined();
    expect(result.descentPhase!.windCorrectionAngle).toBeDefined();
    expect(result.descentPhase!.magneticHeading).toBeDefined();

    // All three phases should have different WCAs due to different winds
    expect(result.climbPhase!.windCorrectionAngle).not.toBe(result.windCorrectionAngle);
    expect(result.descentPhase!.windCorrectionAngle).not.toBe(result.windCorrectionAngle);
    expect(result.climbPhase!.windCorrectionAngle).not.toBe(result.descentPhase!.windCorrectionAngle);

    console.log("\nMulti-Phase Navigation:");
    console.log("Climb Phase:");
    console.log(`  WCA: ${result.climbPhase!.windCorrectionAngle.toFixed(1)}°`);
    console.log(`  MH: ${Math.round(result.climbPhase!.magneticHeading)}°`);
    console.log("Cruise Phase:");
    console.log(`  WCA: ${result.windCorrectionAngle.toFixed(1)}°`);
    console.log(`  MH: ${Math.round(result.magneticHeading)}°`);
    console.log("Descent Phase:");
    console.log(`  WCA: ${result.descentPhase!.windCorrectionAngle.toFixed(1)}°`);
    console.log(`  MH: ${Math.round(result.descentPhase!.magneticHeading)}°`);
  });
});
