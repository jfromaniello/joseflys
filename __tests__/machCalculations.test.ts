import { describe, it, expect } from "vitest";
import {
  A0_KT,
  speedOfSoundKt,
  casToMach,
  machToCas,
  computeAirspeeds,
} from "../lib/machCalculations";
import { isaPressure } from "../lib/isaCalculations";

describe("machCalculations", () => {
  describe("speedOfSoundKt", () => {
    it("equals a₀ at ISA sea level (288.15 K)", () => {
      expect(speedOfSoundKt(288.15)).toBeCloseTo(A0_KT, 3);
    });

    it("scales with √T", () => {
      // 4× temperature → 2× speed of sound
      expect(speedOfSoundKt(288.15 * 4)).toBeCloseTo(A0_KT * 2, 2);
    });

    it("matches FL350 ISA tropopause speed of sound (~576 kt)", () => {
      // ISA at FL350: ~218.81 K → a ≈ 576 kt
      expect(speedOfSoundKt(218.81)).toBeCloseTo(576, 0);
    });
  });

  describe("casToMach / machToCas", () => {
    it("CAS at sea level ISA equals TAS, Mach = CAS/a₀", () => {
      const p0 = isaPressure(0);
      const m = casToMach(200, p0);
      // At sea level, M = CAS/a₀
      expect(m).toBeCloseTo(200 / A0_KT, 4);
    });

    it("typical airliner cruise: CAS 250 at FL350 ISA → ~M0.74", () => {
      const p = isaPressure(35000);
      expect(casToMach(250, p)).toBeCloseTo(0.742, 2);
    });

    it("typical airliner cruise: M0.78 at FL350 ISA → ~CAS 264", () => {
      const p = isaPressure(35000);
      expect(machToCas(0.78, p)).toBeCloseTo(264, 0);
    });

    it("round-trip CAS → Mach → CAS preserves value", () => {
      const p = isaPressure(28000);
      const cas = 230;
      const m = casToMach(cas, p);
      expect(machToCas(m, p)).toBeCloseTo(cas, 4);
    });

    it("round-trip Mach → CAS → Mach preserves value", () => {
      const p = isaPressure(40000);
      const m = 0.82;
      const cas = machToCas(m, p);
      expect(casToMach(cas, p)).toBeCloseTo(m, 4);
    });

    it("zero CAS produces zero Mach (no NaN)", () => {
      expect(casToMach(0, isaPressure(20000))).toBe(0);
    });
  });

  describe("computeAirspeeds — holding CAS constant", () => {
    it("at sea level ISA, CAS≈TAS and Mach is small", () => {
      const s = computeAirspeeds({
        altitudeFt: 0,
        isaDevC: 0,
        hold: "cas",
        casKt: 120,
      });
      expect(s.tas).toBeCloseTo(120, 0);
      expect(s.mach).toBeCloseTo(120 / A0_KT, 3);
      expect(s.oatC).toBeCloseTo(15, 1);
    });

    it("at FL350 ISA, CAS 250 → M~0.74, TAS~428", () => {
      const s = computeAirspeeds({
        altitudeFt: 35000,
        isaDevC: 0,
        hold: "cas",
        casKt: 250,
      });
      expect(s.mach).toBeCloseTo(0.742, 2);
      expect(s.tas).toBeCloseTo(427, 0);
      expect(s.oatC).toBeCloseTo(-54.3, 1);
    });

    it("ISA deviation does NOT change Mach for fixed CAS+altitude", () => {
      const cold = computeAirspeeds({
        altitudeFt: 35000,
        isaDevC: -15,
        hold: "cas",
        casKt: 250,
      });
      const hot = computeAirspeeds({
        altitudeFt: 35000,
        isaDevC: +15,
        hold: "cas",
        casKt: 250,
      });
      expect(cold.mach).toBeCloseTo(hot.mach, 6);
      // But TAS differs (warm air = faster sound = higher TAS for same Mach)
      expect(hot.tas).toBeGreaterThan(cold.tas);
    });
  });

  describe("computeAirspeeds — holding Mach constant (climb scenario)", () => {
    it("at FL350 ISA, M0.78 → CAS~264, TAS~449", () => {
      const s = computeAirspeeds({
        altitudeFt: 35000,
        isaDevC: 0,
        hold: "mach",
        mach: 0.78,
      });
      expect(s.cas).toBeCloseTo(264, 0);
      expect(s.tas).toBeCloseTo(450, 0);
    });

    it("climbing at constant Mach: CAS decreases with altitude", () => {
      const low = computeAirspeeds({
        altitudeFt: 25000,
        isaDevC: 0,
        hold: "mach",
        mach: 0.78,
      });
      const high = computeAirspeeds({
        altitudeFt: 39000,
        isaDevC: 0,
        hold: "mach",
        mach: 0.78,
      });
      expect(high.cas).toBeLessThan(low.cas);
    });
  });

  describe("computeAirspeeds — holding CAS constant (climb scenario)", () => {
    it("climbing at constant CAS: Mach increases with altitude", () => {
      const low = computeAirspeeds({
        altitudeFt: 20000,
        isaDevC: 0,
        hold: "cas",
        casKt: 280,
      });
      const high = computeAirspeeds({
        altitudeFt: 38000,
        isaDevC: 0,
        hold: "cas",
        casKt: 280,
      });
      expect(high.mach).toBeGreaterThan(low.mach);
      // And TAS increases too
      expect(high.tas).toBeGreaterThan(low.tas);
    });
  });
});
