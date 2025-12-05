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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      // VS1 should be close to reference VS at standard weight
      expect(results.vSpeeds.vs1IAS).toBeCloseTo(testAircraft.limits.vs, 1);
    });

    it("should use actual OAT for TAS calculations, not ISA temperature", () => {
      const baseInputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 5000,
        densityAltitude: 5000,
        oat: 15, // ISA temperature at sea level
        runwayLength: 3000,
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
        obstacleHeight: 50,
      };

      // Hot day (ISA + 15°C)
      const hotDay: TakeoffInputs = {
        ...baseInputs,
        oat: 20, // Much hotter than ISA at 5000ft
        densityAltitude: 7500, // Higher DA due to hot temp
      };

      // Cold day (ISA - 15°C)
      const coldDay: TakeoffInputs = {
        ...baseInputs,
        oat: -10, // Much colder than ISA at 5000ft
        densityAltitude: 2500, // Lower DA due to cold temp
      };

      const hotResults = calculateTakeoffPerformance(hotDay);
      const coldResults = calculateTakeoffPerformance(coldDay);

      // Hot day should have higher TAS than cold day at same pressure altitude
      // because air is less dense (higher temperature)
      expect(hotResults.vSpeeds.vrTAS).toBeGreaterThan(coldResults.vSpeeds.vrTAS);
      expect(hotResults.vSpeeds.vxTAS).toBeGreaterThan(coldResults.vSpeeds.vxTAS);
      expect(hotResults.vSpeeds.vyTAS).toBeGreaterThan(coldResults.vSpeeds.vyTAS);

      // IAS should be the same (only depends on weight)
      expect(hotResults.vSpeeds.vrIAS).toBeCloseTo(coldResults.vSpeeds.vrIAS, 1);
    });

    it("should calculate accurate TAS on hot day at altitude", () => {
      const inputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 8000,
        densityAltitude: 12000, // Hot day: DA much higher than PA
        oat: 30, // Very hot
        runwayLength: 5000,
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      // On a hot day at 8000 ft PA with 30°C OAT, TAS should be significantly higher than IAS
      const tasIncrease = ((results.vSpeeds.vrTAS - results.vSpeeds.vrIAS) / results.vSpeeds.vrIAS) * 100;

      // At 8000 ft PA with hot temp, expect at least 18% TAS increase
      expect(tasIncrease).toBeGreaterThan(18);
      expect(results.vSpeeds.vrTAS).toBeGreaterThan(results.vSpeeds.vrIAS * 1.18);
    });

    it("should calculate accurate TAS on cold day at altitude", () => {
      const inputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 8000,
        densityAltitude: 5000, // Cold day: DA lower than PA
        oat: -20, // Very cold
        runwayLength: 5000,
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      // On a cold day, TAS increase should be less than hot day at same PA
      const tasIncrease = ((results.vSpeeds.vrTAS - results.vSpeeds.vrIAS) / results.vSpeeds.vrIAS) * 100;

      // At 8000 ft PA with cold temp, expect around 10-15% TAS increase (less than hot day)
      expect(tasIncrease).toBeGreaterThan(8);
      expect(tasIncrease).toBeLessThan(18);
    });

    it("should show different TAS at same density altitude with different OAT", () => {
      // Two scenarios with same DA but achieved differently

      // Scenario 1: High PA, cold temperature (ISA-10)
      const highPACold: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 8000,
        densityAltitude: 6000, // Cold reduces DA
        oat: -12, // Cold day (ISA is -2°C at 8000 ft)
        runwayLength: 5000,
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
        obstacleHeight: 50,
      };

      // Scenario 2: Low PA, hot temperature (same DA)
      const lowPAHot: TakeoffInputs = {
        ...highPACold,
        pressureAltitude: 4000,
        densityAltitude: 6000, // Same DA
        oat: 18, // Hot day at low altitude creates same DA (ISA is 7°C at 4000 ft)
      };

      const highPAColdResults = calculateTakeoffPerformance(highPACold);
      const lowPAHotResults = calculateTakeoffPerformance(lowPAHot);

      // Even though DA is the same (6000 ft), TAS should differ because PA and temperature differ
      // Higher PA (with colder temp) should have higher TAS than lower PA (with hotter temp)
      // because TAS is primarily driven by pressure altitude
      expect(highPAColdResults.vSpeeds.vrTAS).toBeGreaterThan(lowPAHotResults.vSpeeds.vrTAS);

      // This proves we're using actual OAT and PA, not just density altitude for TAS
      const tasDifference = highPAColdResults.vSpeeds.vrTAS - lowPAHotResults.vSpeeds.vrTAS;
      expect(tasDifference).toBeGreaterThan(0.5); // Should be noticeable difference
    });

    it("should calculate higher VS1 at heavier weight", () => {
      const lightWeight: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1400,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
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
    it("should increase distance on poor pavement", () => {
      const good: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
        obstacleHeight: 50,
      };

      const poor: TakeoffInputs = {
        ...good,
        surfaceType: "PP",
      };

      const goodResults = calculateTakeoffPerformance(good);
      const poorResults = calculateTakeoffPerformance(poor);

      expect(poorResults.distances.groundRoll).toBeGreaterThan(goodResults.distances.groundRoll);
      expect(poorResults.distances.groundRoll / goodResults.distances.groundRoll).toBeCloseTo(1.05, 1);
    });

    it("should increase distance on grass", () => {
      const asphalt: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
        obstacleHeight: 50,
      };

      const grass: TakeoffInputs = {
        ...asphalt,
        surfaceType: "GG",
      };

      const asphaltResults = calculateTakeoffPerformance(asphalt);
      const grassResults = calculateTakeoffPerformance(grass);

      expect(grassResults.distances.groundRoll).toBeGreaterThan(asphaltResults.distances.groundRoll);
      expect(grassResults.distances.groundRoll / asphaltResults.distances.groundRoll).toBeCloseTo(1.20, 1);
    });

    it("should have higher penalty for fair grass", () => {
      const best: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
        obstacleHeight: 50,
      };

      const fairGrass: TakeoffInputs = {
        ...best,
        surfaceType: "GF",
      };

      const bestResults = calculateTakeoffPerformance(best);
      const fairGrassResults = calculateTakeoffPerformance(fairGrass);

      expect(fairGrassResults.distances.groundRoll).toBeGreaterThan(bestResults.distances.groundRoll);
      expect(fairGrassResults.distances.groundRoll / bestResults.distances.groundRoll).toBeCloseTo(1.38, 1);
    });

    it("should have severe penalty for sand", () => {
      const best: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
        obstacleHeight: 50,
      };

      const sand: TakeoffInputs = {
        ...best,
        surfaceType: "SD",
      };

      const bestResults = calculateTakeoffPerformance(best);
      const sandResults = calculateTakeoffPerformance(sand);

      expect(sandResults.distances.groundRoll).toBeGreaterThan(bestResults.distances.groundRoll);
      expect(sandResults.distances.groundRoll / bestResults.distances.groundRoll).toBeCloseTo(1.60, 1);
    });

    it("should return error for water surface", () => {
      const inputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "WT",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      expect(results.errors.some(e => e.includes("Water"))).toBe(true);
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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: -5,
        flapConfiguration: "0",
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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
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
        surfaceType: "PG",
        runwaySlope: 2,
        headwindComponent: 0,
        flapConfiguration: "0",
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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
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
        surfaceType: "GF", // Worst surface
        runwaySlope: 2, // Uphill
        headwindComponent: -5, // Tailwind
        flapConfiguration: "0",
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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      expect(results.warnings.some(w => w.includes("MTOW"))).toBe(true);
    });

    it("should warn about non-pavement surface", () => {
      const inputs: TakeoffInputs = {
        aircraft: testAircraft,
        weight: 1670,
        pressureAltitude: 0,
        densityAltitude: 0,
        oat: 15,
        runwayLength: 3000,
        surfaceType: "GF",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      expect(results.warnings.some(w => w.includes("Fair grass") || w.includes("Grass"))).toBe(true);
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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
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
        surfaceType: "PG",
        runwaySlope: 0,
        headwindComponent: 0,
        flapConfiguration: "0",
        obstacleHeight: 50,
      };

      const results = calculateTakeoffPerformance(inputs);

      expect(results.errors.some(e => e.includes("MTOW"))).toBe(true);
    });
  });
});
