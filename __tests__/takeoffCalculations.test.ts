import { describe, it, expect } from "vitest";
import {
  calculateTakeoffPerformance,
  validateTakeoffInputs,
  type TakeoffInputs,
} from "../lib/takeoffCalculations";
import { PRESET_AIRCRAFT } from "../lib/aircraft";
import type { ResolvedAircraftPerformance } from "../lib/aircraft/types";

describe("takeoffCalculations", () => {
  // Get a test aircraft (Cessna 150)
  // PRESET_AIRCRAFT entries are fully resolved, so we can safely cast to ResolvedAircraftPerformance
  const testAircraft = PRESET_AIRCRAFT.find((a) => a.model === "C150")! as ResolvedAircraftPerformance;

  describe("V-speeds calculations", () => {
    it("should calculate weight-adjusted VS1", () => {
      const inputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: testAircraft.weights.standardWeight || testAircraft.weights.maxGrossWeight,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      // VS1 should be close to reference VS at standard weight
      expect(results.vSpeeds.vs1IAS).toBeCloseTo(testAircraft.limits.vs, 1);
    });

    it("should calculate higher VS1 at heavier weight", () => {
      const lightWeight: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1400,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const heavyWeight: TakeoffInputs = {
        ...lightWeight,
        weight: 1670, // Max gross
      };

      const lightResults = calculateTakeoffPerformance(lightWeight);
      const heavyResults = calculateTakeoffPerformance(heavyWeight);

      // Heavier weight should have higher stall speed
      expect(heavyResults.vSpeeds.vs1IAS).toBeGreaterThan(lightResults.vSpeeds.vs1IAS);
    });

    it("should calculate Vr as 1.2 × VS1", () => {
      const inputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      // Vr should be 1.2 times VS1
      expect(results.vSpeeds.vrIAS).toBeCloseTo(results.vSpeeds.vs1IAS * 1.2, 1);
    });

    it("should calculate higher TAS at high density altitude", () => {
      const seaLevel: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const highAlt: TakeoffInputs = {
        ...seaLevel,
        pressureAltitude: 8000,
        densityAltitude: 10000,
        oat: 30,
      };

      const seaLevelResults = calculateTakeoffPerformance(seaLevel);
      const highAltResults = calculateTakeoffPerformance(highAlt);

      // TAS should be higher at altitude (same IAS)
      expect(highAltResults.vSpeeds.vrTAS).toBeGreaterThan(seaLevelResults.vSpeeds.vrTAS);
      expect(highAltResults.vSpeeds.vxTAS).toBeGreaterThan(seaLevelResults.vSpeeds.vxTAS);
    });
  });

  describe("Ground roll calculations", () => {
    it("should calculate ground roll for standard conditions", () => {
      const inputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      // Ground roll should be reasonable (between 500-1500 ft for C150 at sea level)
      expect(results.distances.groundRoll).toBeGreaterThan(200);
      expect(results.distances.groundRoll).toBeLessThan(2000);
    });

    it("should increase ground roll with higher weight", () => {
      const lightInputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1400,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const heavyInputs: TakeoffInputs = {
        ...lightInputs,
        weight: 1670,
      };

      const lightResults = calculateTakeoffPerformance(lightInputs);
      const heavyResults = calculateTakeoffPerformance(heavyInputs);

      expect(heavyResults.distances.groundRoll).toBeGreaterThan(lightResults.distances.groundRoll);
    });

    it("should increase ground roll at high density altitude", () => {
      const seaLevel: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const highAlt: TakeoffInputs = {
        ...seaLevel,
        pressureAltitude: 8000,
        densityAltitude: 10000,
        oat: 30,
      };

      const seaLevelResults = calculateTakeoffPerformance(seaLevel);
      const highAltResults = calculateTakeoffPerformance(highAlt);

      expect(highAltResults.distances.groundRoll).toBeGreaterThan(seaLevelResults.distances.groundRoll);
    });
  });

  describe("Surface corrections", () => {
    it("should increase distance on wet asphalt", () => {
      const dry: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const wet: TakeoffInputs = {
        ...dry,
        surfaceType: "wet-asphalt",
      };

      const dryResults = calculateTakeoffPerformance(dry);
      const wetResults = calculateTakeoffPerformance(wet);

      expect(wetResults.distances.groundRoll).toBeGreaterThan(dryResults.distances.groundRoll);
      expect(wetResults.distances.groundRoll / dryResults.distances.groundRoll).toBeCloseTo(1.15, 1);
    });

    it("should increase distance on grass", () => {
      const asphalt: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const grass: TakeoffInputs = {
        ...asphalt,
        surfaceType: "dry-grass",
      };

      const asphaltResults = calculateTakeoffPerformance(asphalt);
      const grassResults = calculateTakeoffPerformance(grass);

      expect(grassResults.distances.groundRoll).toBeGreaterThan(asphaltResults.distances.groundRoll);
      expect(grassResults.distances.groundRoll / asphaltResults.distances.groundRoll).toBeCloseTo(1.20, 1);
    });

    it("should have maximum penalty for wet grass", () => {
      const best: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const worst: TakeoffInputs = {
        ...best,
        surfaceType: "wet-grass",
      };

      const bestResults = calculateTakeoffPerformance(best);
      const worstResults = calculateTakeoffPerformance(worst);

      expect(worstResults.distances.groundRoll).toBeGreaterThan(bestResults.distances.groundRoll);
      expect(worstResults.distances.groundRoll / bestResults.distances.groundRoll).toBeCloseTo(1.30, 1);
    });
  });

  describe("Wind corrections", () => {
    it("should decrease distance with headwind", () => {
      const noWind: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const headwind: TakeoffInputs = {
        ...noWind,
        headwindComponent: 10, // 10 kt headwind
      };

      const noWindResults = calculateTakeoffPerformance(noWind);
      const headwindResults = calculateTakeoffPerformance(headwind);

      expect(headwindResults.distances.groundRoll).toBeLessThan(noWindResults.distances.groundRoll);
    });

    it("should increase distance with tailwind", () => {
      const noWind: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const tailwind: TakeoffInputs = {
        ...noWind,
        headwindComponent: -10, // 10 kt tailwind
      };

      const noWindResults = calculateTakeoffPerformance(noWind);
      const tailwindResults = calculateTakeoffPerformance(tailwind);

      expect(tailwindResults.distances.groundRoll).toBeGreaterThan(noWindResults.distances.groundRoll);
    });

    it("should warn about tailwind", () => {
      const inputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: -5,
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      expect(results.warnings.some(w => w.includes("Tailwind"))).toBe(true);
    });
  });

  describe("Slope corrections", () => {
    it("should increase distance with uphill slope", () => {
      const flat: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const uphill: TakeoffInputs = {
        ...flat,
        runwaySlope: 2, // 2% uphill
      };

      const flatResults = calculateTakeoffPerformance(flat);
      const uphillResults = calculateTakeoffPerformance(uphill);

      expect(uphillResults.distances.groundRoll).toBeGreaterThan(flatResults.distances.groundRoll);
    });

    it("should decrease distance with downhill slope", () => {
      const flat: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const downhill: TakeoffInputs = {
        ...flat,
        runwaySlope: -2, // 2% downhill
      };

      const flatResults = calculateTakeoffPerformance(flat);
      const downhillResults = calculateTakeoffPerformance(downhill);

      expect(downhillResults.distances.groundRoll).toBeLessThan(flatResults.distances.groundRoll);
    });

    it("should warn about uphill slope", () => {
      const inputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 2,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      expect(results.warnings.some(w => w.includes("Uphill"))).toBe(true);
    });
  });

  describe("Obstacle clearance", () => {
    it("should calculate obstacle distance greater than ground roll", () => {
      const inputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      expect(results.distances.obstacleDistance).toBeGreaterThan(results.distances.groundRoll);
    });

    it("should increase obstacle distance with higher obstacle", () => {
      const low: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 35,
      };

      const high: TakeoffInputs = {
        ...low,
        obstacleHeight: 100,
      };

      const lowResults = calculateTakeoffPerformance(low);
      const highResults = calculateTakeoffPerformance(high);

      expect(highResults.distances.obstacleDistance).toBeGreaterThan(lowResults.distances.obstacleDistance);
    });

    it("should calculate climb distance", () => {
      const inputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      expect(results.distances.climbDistance).toBeGreaterThan(0);
      expect(results.distances.groundRoll + results.distances.climbDistance).toBeCloseTo(
        results.distances.obstacleDistance,
        0
      );
    });
  });

  describe("Safety margins and decisions", () => {
    it("should return GO with adequate runway", () => {
      const inputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 5000, // Long runway
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      expect(results.decision).toBe("GO");
      expect(results.safetyMargin).toBeGreaterThan(0.20);
    });

    it("should return MARGINAL with tight margins", () => {
      const inputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 8000,
        densityAltitude: 10000,
        oat: 30,
        runwayLength: 2000, // Shorter runway at high DA
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      // At high DA with short runway, should be marginal or no-go
      expect(results.decision).not.toBe("GO");
    });

    it("should return NO-GO with insufficient runway", () => {
      const inputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 8000,
        densityAltitude: 12000, // Very high DA
        oat: 35,
        runwayLength: 1500, // Short runway
        surfaceType: "wet-grass", // Worst surface
        runwaySlope: 2, // Uphill
        headwindComponent: -5, // Tailwind
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      expect(results.decision).toBe("NO-GO");
      expect(results.safetyMargin).toBeLessThan(0);
    });

    it("should calculate safety margin correctly", () => {
      const inputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      const expectedMargin = (inputs.runwayLength - results.distances.obstacleDistance) / inputs.runwayLength;
      expect(results.safetyMargin).toBeCloseTo(expectedMargin, 3);
    });
  });

  describe("Warnings", () => {
    it("should warn about high density altitude", () => {
      const inputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 8000,
        densityAltitude: 10000,
        oat: 30,
        runwayLength: 5000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      expect(results.warnings.some(w => w.includes("density altitude"))).toBe(true);
    });

    it("should warn about weight close to MTOW", () => {
      const inputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: testAircraft.weights.maxGrossWeight,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      expect(results.warnings.some(w => w.includes("MTOW"))).toBe(true);
    });

    it("should warn about wet/grass surface", () => {
      const inputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "wet-grass",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      expect(results.warnings.some(w => w.includes("wet") || w.includes("grass"))).toBe(true);
    });
  });

  describe("Validation", () => {
    it("should validate weight is above empty weight", () => {
      const errors = validateTakeoffInputs({
        aircraft: testAircraft,
        weight: testAircraft.weights.emptyWeight - 100,
      });

      expect(errors.some(e => e.includes("empty weight"))).toBe(true);
    });

    it("should validate weight is below MTOW", () => {
      const errors = validateTakeoffInputs({
        aircraft: testAircraft,
        weight: testAircraft.weights.maxGrossWeight + 100,
      });

      expect(errors.some(e => e.includes("maximum gross weight"))).toBe(true);
    });

    it("should validate runway length is positive", () => {
      const errors = validateTakeoffInputs({
        aircraft: testAircraft,
        runwayLength: 0,
      });

      expect(errors.some(e => e.includes("Runway length"))).toBe(true);
    });

    it("should validate obstacle height is not negative", () => {
      const errors = validateTakeoffInputs({
        aircraft: testAircraft,
        obstacleHeight: -10,
      });

      expect(errors.some(e => e.includes("Obstacle height"))).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("should handle aircraft with missing VS data", () => {
      const badAircraft = JSON.parse(JSON.stringify(testAircraft));
      delete badAircraft.limits.vs;

      const inputs: TakeoffInputs = {
        aircraft: badAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      expect(results.errors.some(e => e.includes("VS"))).toBe(true);
    });

    it("should detect weight below empty weight", () => {
      const inputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: testAircraft.weights.emptyWeight - 100,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      expect(results.errors.some(e => e.includes("empty weight"))).toBe(true);
    });

    it("should detect weight above MTOW", () => {
      const inputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: testAircraft.weights.maxGrossWeight + 100,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "dry-asphalt",
        runwaySlope: 0,
        headwindComponent: 0,
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      expect(results.errors.some(e => e.includes("MTOW"))).toBe(true);
    });
  });
});
