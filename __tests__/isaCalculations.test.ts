import { describe, it, expect } from "vitest";
import {
  isInHg,
  isValidQNH,
  calculateISATemp,
  calculatePA,
  calculateDA,
  calculateISA,
  isaPressure,
  isaTemperatureK,
  airDensity,
  ISA_SEA_LEVEL_DENSITY,
  ISA_P0,
  ISA_T0,
} from "../lib/isaCalculations";

describe("isaCalculations", () => {
  describe("isInHg", () => {
    it("detects inHg values (25-35 range)", () => {
      expect(isInHg(29.92)).toBe(true);
      expect(isInHg(28.22)).toBe(true);
      expect(isInHg(30.5)).toBe(true);
      expect(isInHg(25)).toBe(true);
      expect(isInHg(35)).toBe(true);
    });

    it("detects hPa values", () => {
      expect(isInHg(1013.25)).toBe(false);
      expect(isInHg(1000)).toBe(false);
      expect(isInHg(950)).toBe(false);
      expect(isInHg(1050)).toBe(false);
    });

    it("treats very low values as inHg", () => {
      // Values < 870 are assumed inHg since hPa cannot be that low
      expect(isInHg(28)).toBe(true);
      expect(isInHg(27)).toBe(true);
    });
  });

  describe("isValidQNH", () => {
    it("validates inHg range (26.5 - 31.5)", () => {
      expect(isValidQNH(29.92)).toBe(true);
      expect(isValidQNH(28.22)).toBe(true);
      expect(isValidQNH(26.5)).toBe(true);
      expect(isValidQNH(31.5)).toBe(true);
      expect(isValidQNH(25)).toBe(false);
      expect(isValidQNH(32)).toBe(false);
    });

    it("validates hPa range (900 - 1050)", () => {
      expect(isValidQNH(1013.25)).toBe(true);
      expect(isValidQNH(1000)).toBe(true);
      expect(isValidQNH(900)).toBe(true);
      expect(isValidQNH(1050)).toBe(true);
      expect(isValidQNH(899)).toBe(false);
      expect(isValidQNH(1051)).toBe(false);
    });

    it("rejects NaN", () => {
      expect(isValidQNH(NaN)).toBe(false);
    });
  });

  describe("calculateISATemp", () => {
    it("returns 15°C at sea level", () => {
      expect(calculateISATemp(0)).toBe(15);
    });

    it("decreases 1.98°C per 1000 ft", () => {
      expect(calculateISATemp(1000)).toBeCloseTo(13.02, 2);
      expect(calculateISATemp(5000)).toBeCloseTo(5.1, 1);
      expect(calculateISATemp(10000)).toBeCloseTo(-4.8, 1);
    });
  });

  describe("calculatePA - ISA atmospheric model", () => {
    describe("standard pressure (should equal indicated altitude)", () => {
      it("at sea level with 1013.25 hPa", () => {
        const pa = calculatePA(0, 1013.25);
        expect(pa).toBeCloseTo(0, 0);
      });

      it("at 5000 ft with 1013.25 hPa", () => {
        const pa = calculatePA(5000, 1013.25);
        expect(pa).toBeCloseTo(5000, 0);
      });

      it("at 10000 ft with 1013.25 hPa", () => {
        const pa = calculatePA(10000, 1013.25);
        expect(pa).toBeCloseTo(10000, 0);
      });

      // Note: 29.92 inHg ≈ 1013.21 hPa, not exactly 1013.25
      it("at sea level with 29.92 inHg (slight difference expected)", () => {
        const pa = calculatePA(0, 29.92);
        // 29.92 inHg = 1013.21 hPa, so PA will be slightly > 0
        expect(pa).toBeCloseTo(1, 0); // Within 0.5 ft
      });
    });

    describe("low pressure (PA > indicated altitude)", () => {
      it("FAA Figure 8 example: 1380 ft, 28.22 inHg → ~2991 ft", () => {
        // This is the key test case from FAA documentation
        // Linear approximation gives 3080 ft (wrong)
        // ISA model should give ~2976-2991 ft
        const pa = calculatePA(1380, 28.22);
        expect(pa).toBeGreaterThan(2950);
        expect(pa).toBeLessThan(3010);
        // More specifically, close to table value
        expect(pa).toBeCloseTo(2976, -1); // Within 10 ft
      });

      it("sea level with low pressure 28.00 inHg", () => {
        const pa = calculatePA(0, 28.0);
        // Should be significantly above 0
        expect(pa).toBeGreaterThan(1800);
        expect(pa).toBeLessThan(2000);
      });

      it("5000 ft with 980 hPa", () => {
        const pa = calculatePA(5000, 980);
        expect(pa).toBeGreaterThan(5800);
      });
    });

    describe("high pressure (PA < indicated altitude)", () => {
      it("2000 ft with 30.50 inHg", () => {
        const pa = calculatePA(2000, 30.5);
        expect(pa).toBeLessThan(2000);
        expect(pa).toBeGreaterThan(1400);
      });

      it("sea level with 1030 hPa", () => {
        const pa = calculatePA(0, 1030);
        expect(pa).toBeLessThan(0);
        expect(pa).toBeGreaterThan(-500);
      });
    });

    describe("hPa and inHg equivalence", () => {
      it("equivalent pressures give same PA", () => {
        // 29.92 inHg ≈ 1013.21 hPa
        const paInHg = calculatePA(5000, 29.92);
        const paHPa = calculatePA(5000, 1013.21);
        expect(paInHg).toBeCloseTo(paHPa, 0);
      });

      it("28.00 inHg ≈ 948.2 hPa", () => {
        const paInHg = calculatePA(3000, 28.0);
        const paHPa = calculatePA(3000, 948.2);
        expect(paInHg).toBeCloseTo(paHPa, 0);
      });
    });

    describe("accuracy vs linear approximation", () => {
      it("ISA model is more accurate than linear for large pressure differences", () => {
        // 1380 ft, 28.22 inHg
        // Linear: 1380 + (29.92 - 28.22) * 1000 = 3080 ft
        // ISA model: ~2976 ft
        // FAA table: ~2991 ft
        const pa = calculatePA(1380, 28.22);
        const linearApprox = 1380 + (29.92 - 28.22) * 1000;

        // ISA model should be closer to 2991 than linear approx
        const isaError = Math.abs(pa - 2991);
        const linearError = Math.abs(linearApprox - 2991);
        expect(isaError).toBeLessThan(linearError);
      });
    });
  });

  describe("calculateDA", () => {
    it("equals PA when temp equals ISA temp", () => {
      const pa = 5000;
      const isaTemp = calculateISATemp(5000); // ~5.1°C
      const da = calculateDA(pa, isaTemp, isaTemp);
      expect(da).toBeCloseTo(pa, 0);
    });

    it("increases ~118.8 ft per degree above ISA", () => {
      const pa = 5000;
      const isaTemp = calculateISATemp(5000);
      const da = calculateDA(pa, isaTemp + 10, isaTemp);
      expect(da).toBeCloseTo(pa + 1188, 0);
    });

    it("decreases when temp is below ISA", () => {
      const pa = 5000;
      const isaTemp = calculateISATemp(5000);
      const da = calculateDA(pa, isaTemp - 10, isaTemp);
      expect(da).toBeCloseTo(pa - 1188, 0);
    });
  });

  describe("calculateISA - complete calculation", () => {
    it("returns all values for standard conditions", () => {
      const result = calculateISA(0, 1013.25, 15);
      expect(result.isaTemp).toBe(15);
      expect(result.pressureAltitude).toBeCloseTo(0, 0);
      expect(result.densityAltitude).toBeCloseTo(0, 0);
      expect(result.qnhFormat).toBe("hPa");
    });

    it("detects inHg format", () => {
      const result = calculateISA(0, 29.92, 15);
      expect(result.qnhFormat).toBe("inHg");
    });

    it("calculates high density altitude on hot day", () => {
      // 5000 ft elevation, standard pressure, 30°C (hot day)
      const result = calculateISA(5000, 1013.25, 30);
      expect(result.isaTemp).toBeCloseTo(5.1, 1);
      expect(result.pressureAltitude).toBeCloseTo(5000, 0);
      // DA should be much higher due to hot temp
      expect(result.densityAltitude).toBeGreaterThan(7500);
    });

    it("calculates low density altitude on cold day", () => {
      // 5000 ft elevation, standard pressure, -10°C (cold day)
      const result = calculateISA(5000, 1013.25, -10);
      expect(result.isaTemp).toBeCloseTo(5.1, 1);
      // DA should be much lower due to cold temp
      expect(result.densityAltitude).toBeLessThan(3500);
    });
  });

  // ============================================================================
  // Primitive ISA Functions
  // ============================================================================

  describe("isaPressure", () => {
    it("returns sea level pressure at 0 ft", () => {
      const pressure = isaPressure(0);
      expect(pressure).toBeCloseTo(ISA_P0, 0); // 101325 Pa
    });

    it("decreases with altitude", () => {
      const p0 = isaPressure(0);
      const p5000 = isaPressure(5000);
      const p10000 = isaPressure(10000);
      expect(p5000).toBeLessThan(p0);
      expect(p10000).toBeLessThan(p5000);
    });

    it("matches known ISA values", () => {
      // At 18,000 ft, pressure should be approximately half of sea level
      const p18000 = isaPressure(18000);
      expect(p18000).toBeCloseTo(ISA_P0 / 2, -3); // Within 1000 Pa
    });
  });

  describe("isaTemperatureK", () => {
    it("returns 288.15 K (15°C) at sea level", () => {
      const temp = isaTemperatureK(0);
      expect(temp).toBeCloseTo(ISA_T0, 2); // 288.15 K
    });

    it("decreases with altitude (lapse rate)", () => {
      const t0 = isaTemperatureK(0);
      const t5000 = isaTemperatureK(5000);
      const t10000 = isaTemperatureK(10000);
      expect(t5000).toBeLessThan(t0);
      expect(t10000).toBeLessThan(t5000);
    });

    it("matches ISA lapse rate (~2°C per 1000 ft)", () => {
      const t0 = isaTemperatureK(0);
      const t10000 = isaTemperatureK(10000);
      // Should drop ~20K over 10,000 ft (actually 19.8K with exact lapse rate)
      const drop = t0 - t10000;
      expect(drop).toBeCloseTo(19.8, 0);
    });
  });

  describe("airDensity", () => {
    it("calculates sea level density correctly", () => {
      const rho = airDensity(ISA_P0, ISA_T0);
      expect(rho).toBeCloseTo(ISA_SEA_LEVEL_DENSITY, 6);
      // ISA sea level density is ~1.225 kg/m³
      expect(rho).toBeCloseTo(1.225, 2);
    });

    it("density decreases with lower pressure", () => {
      const rhoHigh = airDensity(ISA_P0, ISA_T0);
      const rhoLow = airDensity(ISA_P0 / 2, ISA_T0);
      expect(rhoLow).toBeCloseTo(rhoHigh / 2, 6);
    });

    it("density decreases with higher temperature", () => {
      const rhoCold = airDensity(ISA_P0, 273.15); // 0°C
      const rhoHot = airDensity(ISA_P0, 303.15); // 30°C
      expect(rhoHot).toBeLessThan(rhoCold);
    });
  });

  describe("ISA_SEA_LEVEL_DENSITY", () => {
    it("is approximately 1.225 kg/m³", () => {
      expect(ISA_SEA_LEVEL_DENSITY).toBeCloseTo(1.225, 2);
    });
  });
});
