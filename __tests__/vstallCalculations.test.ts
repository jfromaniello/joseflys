import { describe, it, expect } from "vitest";
import {
  calculateLoadFactor,
  calculateVsWeight,
  calculateVsLoadFactor,
  calculateTASFromIAS,
  calculateVStall,
  validateInputs,
} from "../lib/vstallCalculations";

describe("vstallCalculations", () => {
  describe("calculateLoadFactor", () => {
    it("should return 1.0 for 0° bank", () => {
      expect(calculateLoadFactor(0)).toBe(1.0);
    });

    it("should return ~1.414 for 45° bank", () => {
      const result = calculateLoadFactor(45);
      expect(result).toBeCloseTo(1.414, 2);
    });

    it("should return 2.0 for 60° bank", () => {
      const result = calculateLoadFactor(60);
      expect(result).toBeCloseTo(2.0, 1);
    });

    it("should return ~2.924 for 70° bank", () => {
      const result = calculateLoadFactor(70);
      expect(result).toBeCloseTo(2.924, 2);
    });
  });

  describe("calculateVsWeight", () => {
    it("should return same Vs when weight equals reference", () => {
      const result = calculateVsWeight(42, 1500, 1500);
      expect(result).toBe(42);
    });

    it("should increase Vs when weight is higher than reference", () => {
      const result = calculateVsWeight(42, 1600, 1500);
      expect(result).toBeGreaterThan(42);
      expect(result).toBeCloseTo(43.37, 1);
    });

    it("should decrease Vs when weight is lower than reference", () => {
      const result = calculateVsWeight(42, 1400, 1500);
      expect(result).toBeLessThan(42);
      expect(result).toBeCloseTo(40.59, 1);
    });

    it("should follow square root relationship", () => {
      // At 2x weight, Vs should be sqrt(2) times higher
      const result = calculateVsWeight(42, 3000, 1500);
      expect(result).toBeCloseTo(42 * Math.sqrt(2), 1);
    });
  });

  describe("calculateVsLoadFactor", () => {
    it("should return same Vs for load factor of 1.0", () => {
      const result = calculateVsLoadFactor(42, 1.0);
      expect(result).toBe(42);
    });

    it("should increase Vs for load factor > 1.0", () => {
      const result = calculateVsLoadFactor(42, 1.414);
      expect(result).toBeCloseTo(49.96, 1);
    });

    it("should follow square root relationship", () => {
      // At 2g, Vs should be sqrt(2) times higher
      const result = calculateVsLoadFactor(42, 2.0);
      expect(result).toBeCloseTo(42 * Math.sqrt(2), 1);
    });
  });

  describe("calculateTASFromIAS", () => {
    it("should return same speed at sea level", () => {
      const result = calculateTASFromIAS(100, 0);
      expect(result).toBeCloseTo(100, 0);
    });

    it("should increase TAS at higher density altitude", () => {
      const result = calculateTASFromIAS(100, 5000);
      expect(result).toBeGreaterThan(100);
      expect(result).toBeCloseTo(107.7, 0);
    });

    it("should significantly increase TAS at high density altitude", () => {
      const result = calculateTASFromIAS(100, 10000);
      expect(result).toBeGreaterThan(115);
    });
  });

  describe("calculateVStall", () => {
    it("should calculate basic stall speed at reference conditions", () => {
      const result = calculateVStall({
        vsRef: 42,
        weightRef: 1500,
        weightActual: 1500,
        bankAngle: 0,
        densityAltitude: 0,
      });

      expect(result.vsRef).toBe(42);
      expect(result.vsWeight).toBe(42);
      expect(result.vsBank).toBe(42);
      expect(result.vsTAS).toBeCloseTo(42, 0);
      expect(result.loadFactor).toBe(1.0);
      expect(result.weightIncreasePercent).toBe(0);
      expect(result.bankIncreasePercent).toBe(0);
    });

    it("should calculate stall speed with increased weight", () => {
      const result = calculateVStall({
        vsRef: 42,
        weightRef: 1500,
        weightActual: 1600,
        bankAngle: 0,
        densityAltitude: 0,
      });

      expect(result.vsWeight).toBeGreaterThan(42);
      expect(result.vsWeight).toBeCloseTo(43.37, 1);
      expect(result.weightIncreasePercent).toBeGreaterThan(0);
      expect(result.weightIncreasePercent).toBeCloseTo(3.27, 1);
    });

    it("should calculate accelerated stall with bank angle", () => {
      const result = calculateVStall({
        vsRef: 42,
        weightRef: 1500,
        weightActual: 1500,
        bankAngle: 45,
        densityAltitude: 0,
      });

      expect(result.vsBank).toBeGreaterThan(42);
      expect(result.vsBank).toBeCloseTo(49.96, 1);
      expect(result.loadFactor).toBeCloseTo(1.414, 2);
      expect(result.bankIncreasePercent).toBeGreaterThan(0);
    });

    it("should calculate TAS increase at altitude", () => {
      const result = calculateVStall({
        vsRef: 42,
        weightRef: 1500,
        weightActual: 1500,
        bankAngle: 0,
        densityAltitude: 5000,
      });

      expect(result.vsTAS).toBeGreaterThan(42);
      expect(result.vsTAS).toBeCloseTo(45.2, 0);
      expect(result.tasIncreasePercent).toBeGreaterThan(0);
    });

    it("should calculate combined effects of weight, bank, and altitude", () => {
      const result = calculateVStall({
        vsRef: 42,
        weightRef: 1500,
        weightActual: 1600,
        bankAngle: 45,
        densityAltitude: 5000,
      });

      // All speeds should be progressively higher
      expect(result.vsRef).toBe(42);
      expect(result.vsWeight).toBeGreaterThan(result.vsRef);
      expect(result.vsBank).toBeGreaterThan(result.vsWeight);
      expect(result.vsTAS).toBeGreaterThan(result.vsBank);

      // Specific values
      expect(result.vsWeight).toBeCloseTo(43.37, 1);
      expect(result.vsBank).toBeCloseTo(51.58, 1);
      expect(result.vsTAS).toBeCloseTo(55.6, 0);

      // All percentage increases should be positive
      expect(result.weightIncreasePercent).toBeGreaterThan(0);
      expect(result.bankIncreasePercent).toBeGreaterThan(0);
      expect(result.tasIncreasePercent).toBeGreaterThan(0);
    });
  });

  describe("validateInputs", () => {
    it("should return no errors for valid inputs", () => {
      const errors = validateInputs(1500, 1100, 1600, 1500, 30, 5000, 4000);
      expect(errors.filter(e => e.type === "error")).toHaveLength(0);
    });

    it("should return error for weight below empty weight", () => {
      const errors = validateInputs(1000, 1100, 1600, 1500, 0, 5000, 4000);
      const weightErrors = errors.filter(e => e.field === "weight" && e.type === "error");
      expect(weightErrors.length).toBeGreaterThan(0);
      expect(weightErrors[0].message).toContain("less than empty weight");
    });

    it("should return error for weight above max gross", () => {
      const errors = validateInputs(1700, 1100, 1600, 1500, 0, 5000, 4000);
      const weightErrors = errors.filter(e => e.field === "weight" && e.type === "error");
      expect(weightErrors.length).toBeGreaterThan(0);
      expect(weightErrors[0].message).toContain("exceeds maximum gross weight");
    });

    it("should return warning for weight significantly below reference", () => {
      const errors = validateInputs(1000, 900, 1600, 1500, 0, 5000, 4000);
      const weightWarnings = errors.filter(e => e.field === "weight" && e.type === "warning");
      expect(weightWarnings.length).toBeGreaterThan(0);
      expect(weightWarnings[0].message).toContain("significantly below reference weight");
    });

    it("should return error for bank angle >= 75°", () => {
      const errors = validateInputs(1500, 1100, 1600, 1500, 75, 5000, 4000);
      const bankErrors = errors.filter(e => e.field === "bankAngle" && e.type === "error");
      expect(bankErrors.length).toBeGreaterThan(0);
      expect(bankErrors[0].message).toContain("too high");
    });

    it("should return warning for bank angle > 45°", () => {
      const errors = validateInputs(1500, 1100, 1600, 1500, 50, 5000, 4000);
      const bankWarnings = errors.filter(e => e.field === "bankAngle" && e.type === "warning");
      expect(bankWarnings.length).toBeGreaterThan(0);
      expect(bankWarnings[0].message).toContain("High bank angle");
    });

    it("should return warning for high density altitude", () => {
      const errors = validateInputs(1500, 1100, 1600, 1500, 30, 9000, 8000);
      const daWarnings = errors.filter(e => e.field === "densityAltitude" && e.type === "warning");
      expect(daWarnings.length).toBeGreaterThan(0);
      expect(daWarnings[0].message).toContain("High density altitude");
    });

    it("should return warning for DA < PA", () => {
      const errors = validateInputs(1500, 1100, 1600, 1500, 0, 3000, 4000);
      const daWarnings = errors.filter(e => e.field === "densityAltitude" && e.type === "warning");
      expect(daWarnings.length).toBeGreaterThan(0);
      expect(daWarnings[0].message).toContain("lower than pressure altitude");
    });

    it("should return error when at or above service ceiling", () => {
      const errors = validateInputs(1500, 1100, 1600, 1500, 0, 5000, 14000, 14000);
      const paErrors = errors.filter(e => e.field === "pressureAltitude" && e.type === "error");
      expect(paErrors.length).toBeGreaterThan(0);
      expect(paErrors[0].message).toContain("NO GO");
      expect(paErrors[0].message).toContain("service ceiling");
    });

    it("should return error when above service ceiling", () => {
      const errors = validateInputs(1500, 1100, 1600, 1500, 0, 5000, 15000, 14000);
      const paErrors = errors.filter(e => e.field === "pressureAltitude" && e.type === "error");
      expect(paErrors.length).toBeGreaterThan(0);
      expect(paErrors[0].message).toContain("NO GO");
      expect(paErrors[0].message).toContain("meets or exceeds");
    });

    it("should return error when within 10% of service ceiling", () => {
      const errors = validateInputs(1500, 1100, 1600, 1500, 0, 5000, 13000, 14000);
      const paErrors = errors.filter(e => e.field === "pressureAltitude" && e.type === "error");
      expect(paErrors.length).toBeGreaterThan(0);
      expect(paErrors[0].message).toContain("NO GO");
      expect(paErrors[0].message).toContain("93%");
    });

    it("should not return error when below 90% of service ceiling", () => {
      const errors = validateInputs(1500, 1100, 1600, 1500, 0, 5000, 12000, 14000);
      const paErrors = errors.filter(e => e.field === "pressureAltitude" && e.type === "error");
      expect(paErrors.length).toBe(0);
    });

    it("should not validate service ceiling if not provided", () => {
      const errors = validateInputs(1500, 1100, 1600, 1500, 0, 5000, 15000);
      const paErrors = errors.filter(e => e.field === "pressureAltitude");
      expect(paErrors.length).toBe(0);
    });

    it("should return warning when density altitude meets or exceeds service ceiling", () => {
      const errors = validateInputs(1500, 1100, 1600, 1500, 0, 14500, 5000, 14000);
      const daWarnings = errors.filter(e => e.field === "densityAltitude" && e.type === "warning");
      expect(daWarnings.length).toBeGreaterThan(0);
      expect(daWarnings[0].message).toContain("meets or exceeds service ceiling");
      expect(daWarnings[0].message).toContain("Engine and aircraft performance");
    });

    it("should return warning when density altitude is at 85% or more of service ceiling", () => {
      const errors = validateInputs(1500, 1100, 1600, 1500, 0, 12000, 5000, 14000);
      const daWarnings = errors.filter(e => e.field === "densityAltitude" && e.type === "warning");
      expect(daWarnings.length).toBeGreaterThan(0);
      expect(daWarnings[0].message).toContain("86%");
      expect(daWarnings[0].message).toContain("Engine performance significantly reduced");
    });

    it("should not return DA warning when below 85% of service ceiling", () => {
      const errors = validateInputs(1500, 1100, 1600, 1500, 0, 11000, 5000, 14000);
      const daWarnings = errors.filter(e => e.field === "densityAltitude" && e.message.includes("service ceiling"));
      expect(daWarnings.length).toBe(0);
    });

    it("should handle both PA and DA service ceiling validations independently", () => {
      // PA is safe but DA is high
      const errors = validateInputs(1500, 1100, 1600, 1500, 0, 13000, 8000, 14000);
      const paErrors = errors.filter(e => e.field === "pressureAltitude" && e.type === "error");
      const daWarnings = errors.filter(e => e.field === "densityAltitude" && e.message.includes("service ceiling"));

      expect(paErrors.length).toBe(0); // PA is at 57%, safe
      expect(daWarnings.length).toBeGreaterThan(0); // DA is at 93%, warning
    });
  });
});
