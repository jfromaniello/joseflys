/**
 * Mach / CAS / TAS relationships using compressible flow formulas.
 *
 * For high-altitude flight where Mach effects matter, the simple
 * incompressible TAS = CAS·√(ρ₀/ρ) breaks down. We use the standard
 * impact-pressure (qc) formulas instead — valid for subsonic flow.
 *
 *   qc/p₀      = (1 + 0.2·(CAS/a₀)²)^3.5 - 1     // CAS → qc (sea-level)
 *   M          = √(5·[(qc/p_s + 1)^(2/7) - 1])    // qc, p_static → Mach
 *   qc/p_s     = (1 + 0.2·M²)^3.5 - 1             // Mach, p_static → qc
 *   CAS        = a₀·√(5·[(qc/p₀ + 1)^(2/7) - 1])  // qc → CAS
 *   a(T)       = a₀·√(T/T₀)                        // local speed of sound
 *   TAS        = M·a(T_actual)
 *
 * Mach depends only on CAS and pressure altitude (static pressure).
 * Temperature only enters via the speed of sound, which scales TAS.
 */

import {
  ISA_T0,
  ISA_P0,
  isaPressure,
  isaTemperatureK,
  airDensity,
  calculateDA,
  calculateISATemp,
} from "./isaCalculations";

/** Speed of sound at ISA sea level: √(γ·R·T₀) for γ=1.4, T₀=288.15 K = 340.294 m/s = 661.479 kt */
export const A0_KT = 661.4787;

/** Speed of sound at a given temperature, in knots */
export function speedOfSoundKt(temperatureK: number): number {
  return A0_KT * Math.sqrt(temperatureK / ISA_T0);
}

/**
 * Convert Calibrated Airspeed → Mach using compressible flow.
 * Static pressure is taken from pressure altitude (ISA).
 */
export function casToMach(casKt: number, staticPressurePa: number): number {
  if (casKt <= 0) return 0;
  const ratio = casKt / A0_KT;
  const qc = (Math.pow(1 + 0.2 * ratio * ratio, 3.5) - 1) * ISA_P0;
  const m2 = 5 * (Math.pow(qc / staticPressurePa + 1, 2 / 7) - 1);
  return Math.sqrt(Math.max(0, m2));
}

/**
 * Convert Mach → Calibrated Airspeed (inverse of casToMach).
 */
export function machToCas(mach: number, staticPressurePa: number): number {
  if (mach <= 0) return 0;
  const qc = (Math.pow(1 + 0.2 * mach * mach, 3.5) - 1) * staticPressurePa;
  const arg = 5 * (Math.pow(qc / ISA_P0 + 1, 2 / 7) - 1);
  return A0_KT * Math.sqrt(Math.max(0, arg));
}

export interface AirspeedSnapshot {
  /** Calibrated airspeed in knots */
  cas: number;
  /** Mach number (dimensionless) */
  mach: number;
  /** True airspeed in knots */
  tas: number;
  /** Outside air temperature in °C (ISA + deviation) */
  oatC: number;
  /** Outside air temperature in K */
  oatK: number;
  /** Static pressure at altitude (Pa) */
  staticPressurePa: number;
  /** Air density (kg/m³) */
  density: number;
  /** Density altitude in feet */
  densityAltitudeFt: number;
  /** Local speed of sound in knots */
  speedOfSoundKt: number;
}

export type HoldMode = "cas" | "mach";

/**
 * Compute the full set of airspeed quantities at a given altitude and
 * ISA temperature deviation, holding either CAS or Mach constant.
 */
export function computeAirspeeds(input: {
  altitudeFt: number;
  isaDevC: number;
  hold: HoldMode;
  /** Required when hold === "cas" */
  casKt?: number;
  /** Required when hold === "mach" */
  mach?: number;
}): AirspeedSnapshot {
  const { altitudeFt, isaDevC, hold } = input;
  const staticPressurePa = isaPressure(altitudeFt);
  const oatK = isaTemperatureK(altitudeFt) + isaDevC;
  const oatC = oatK - 273.15;
  const aKt = speedOfSoundKt(oatK);
  const density = airDensity(staticPressurePa, oatK);

  let cas: number;
  let mach: number;
  if (hold === "cas") {
    cas = input.casKt ?? 0;
    mach = casToMach(cas, staticPressurePa);
  } else {
    mach = input.mach ?? 0;
    cas = machToCas(mach, staticPressurePa);
  }

  const tas = mach * aKt;
  const isaTempC = calculateISATemp(altitudeFt);
  const densityAltitudeFt = calculateDA(altitudeFt, oatC, isaTempC);

  return {
    cas,
    mach,
    tas,
    oatC,
    oatK,
    staticPressurePa,
    density,
    densityAltitudeFt,
    speedOfSoundKt: aKt,
  };
}

/**
 * Build a series of snapshots stepping through altitudes from 0 → maxFt.
 * Used to plot how IAS/TAS/Mach evolve with altitude while holding one constant.
 */
export function airspeedCurve(input: {
  fromFt: number;
  toFt: number;
  stepFt: number;
  isaDevC: number;
  hold: HoldMode;
  casKt?: number;
  mach?: number;
}): Array<{ altitudeFt: number } & AirspeedSnapshot> {
  const out: Array<{ altitudeFt: number } & AirspeedSnapshot> = [];
  for (let h = input.fromFt; h <= input.toFt + 1e-6; h += input.stepFt) {
    const snap = computeAirspeeds({
      altitudeFt: h,
      isaDevC: input.isaDevC,
      hold: input.hold,
      casKt: input.casKt,
      mach: input.mach,
    });
    out.push({ altitudeFt: h, ...snap });
  }
  return out;
}
