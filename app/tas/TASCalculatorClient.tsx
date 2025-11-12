"use client";

import { useState, useEffect } from "react";
import { Tooltip } from "../components/Tooltip";
import { PageLayout } from "../components/PageLayout";
import { CalculatorPageHeader } from "../components/CalculatorPageHeader";
import { Footer } from "../components/Footer";
import { ShareButton } from "../components/ShareButton";
import { calculateTAS } from "@/lib/tasCalculations";
import { calculatePA, isInHg } from "@/lib/isaCalculations";

interface TASCalculatorClientProps {
  initialCas: string;
  initialOat: string;
  initialPressureAlt: string;
  initialAltitude: string;
  initialQnh: string;
}

export function TASCalculatorClient({
  initialCas,
  initialOat,
  initialPressureAlt,
  initialAltitude,
  initialQnh,
}: TASCalculatorClientProps) {
  const [cas, setCas] = useState<string>(initialCas);
  const [oat, setOat] = useState<string>(initialOat);

  // Option 1: Direct pressure altitude
  const [pressureAltitude, setPressureAltitude] = useState<string>(initialPressureAlt);

  // Option 2: Altitude + QNH (to calculate pressure altitude)
  const [altitude, setAltitude] = useState<string>(initialAltitude);
  const [qnh, setQnh] = useState<string>(initialQnh);

  // Formula display toggle
  const [showFormulas, setShowFormulas] = useState<boolean>(false);

  // Determine which fields should be disabled based on mutual exclusion
  const isPressureAltDisabled = !!(altitude || qnh);
  const isAltitudeQnhDisabled = !!pressureAltitude;

  // Update URL when parameters change (client-side only, no page reload)
  useEffect(() => {
    const params = new URLSearchParams();
    if (cas) params.set("cas", cas);
    if (oat) params.set("oat", oat);
    if (pressureAltitude) params.set("pa", pressureAltitude);
    if (altitude) params.set("alt", altitude);
    if (qnh) params.set("qnh", qnh);

    // Use window.history.replaceState instead of router.replace to avoid server requests
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [cas, oat, pressureAltitude, altitude, qnh]);

  // Calculate TAS during render (not in useEffect to avoid cascading renders)
  const casVal = parseFloat(cas);
  const oatVal = parseFloat(oat);

  // Determine which pressure altitude to use
  let effectivePressureAlt: number | null = null;

  if (pressureAltitude) {
    // Option 1: Direct pressure altitude
    effectivePressureAlt = parseFloat(pressureAltitude);
  } else if (altitude && qnh) {
    // Option 2: Calculate from altitude + QNH
    const altVal = parseFloat(altitude);
    const qnhVal = parseFloat(qnh);
    if (!isNaN(altVal) && !isNaN(qnhVal)) {
      effectivePressureAlt = calculatePA(altVal, qnhVal);
    }
  }

  const tas =
    !isNaN(casVal) && !isNaN(oatVal) && effectivePressureAlt !== null && !isNaN(effectivePressureAlt)
      ? calculateTAS(casVal, oatVal, effectivePressureAlt)
      : null;

  // Calculate intermediate values for display
  let intermediateValues: {
    pIsa: number;
    rho0: number;
    rho: number;
    densityRatio: number;
  } | null = null;

  if (!isNaN(casVal) && !isNaN(oatVal) && effectivePressureAlt !== null && !isNaN(effectivePressureAlt)) {
    // ISA Constants
    const T0 = 288.15; // K (15°C)
    const P0 = 101325.0; // Pa
    const g0 = 9.80665; // m/s²
    const R = 287.05287; // J/(kg·K)
    const L = 0.0065; // K/m (lapse rate troposphere)

    // Unit conversions
    const hM = effectivePressureAlt * 0.3048;
    const tAct = oatVal + 273.15; // K

    // ISA pressure at altitude
    const exp = g0 / (R * L);
    const pIsa = P0 * Math.pow(1 - (L * hM) / T0, exp);

    // Densities
    const rho0 = P0 / (R * T0);
    const rho = pIsa / (R * tAct);

    intermediateValues = {
      pIsa,
      rho0,
      rho,
      densityRatio: rho0 / rho,
    };
  }

  // Detect QNH format for display
  const qnhVal = parseFloat(qnh);
  const qnhFormat = !isNaN(qnhVal) && isInHg(qnhVal) ? "inHg" : "hPa";

  return (
    <PageLayout currentPage="tas">
      <CalculatorPageHeader
        title="TAS Calculator"
        description="Calculate True Airspeed from Calibrated Airspeed, Outside Air Temperature, and Altitude"
      />

      <main className="w-full max-w-4xl">
        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">
          {/* Section Header */}
          <div className="mb-6 pb-6 border-b border-gray-700">
            <h2
              className="text-xl sm:text-2xl font-bold mb-2"
              style={{ color: "white" }}
            >
              TAS Calculator
            </h2>
            <p
              className="text-sm"
              style={{ color: "oklch(0.7 0.02 240)" }}
            >
              Enter flight parameters to calculate True Airspeed
            </p>
          </div>

          {/* Input Sections */}
          <div className="space-y-6 mb-8">
            {/* Flight Parameters Section */}
            <div className="flight-parameters">
              <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
                Flight Parameters
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem] gap-x-4 gap-y-4 lg:items-center">
                {/* CAS */}
                <label
                  className="flex items-center text-sm font-medium mb-2 lg:mb-0"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Calibrated Airspeed
                  <Tooltip content="The airspeed reading from your airspeed indicator, corrected for instrument and position errors. This is the speed shown on your cockpit instruments." />
                </label>

                <div className="relative">
                  <input
                    type="number"
                    value={cas}
                    onChange={(e) => setCas(e.target.value)}
                    className="w-full px-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                    placeholder="90"
                  />
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                    style={{ color: "oklch(0.55 0.02 240)" }}
                  >
                    KT
                  </span>
                </div>

                {/* Gap */}
                <div className="hidden lg:block"></div>

                {/* OAT */}
                <label
                  className="flex items-center text-sm font-medium mb-2 lg:mb-0"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Outside Air Temp
                  <Tooltip content="The actual air temperature outside the aircraft in Celsius. This affects air density and is crucial for calculating true airspeed. Use your OAT gauge reading." />
                </label>

                <div className="relative">
                  <input
                    type="number"
                    value={oat}
                    onChange={(e) => setOat(e.target.value)}
                    className="w-full px-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                    placeholder="8"
                  />
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                    style={{ color: "oklch(0.55 0.02 240)" }}
                  >
                    °C
                  </span>
                </div>
              </div>
            </div>

            {/* Altitude Section */}
            <div className="altitude-inputs">
              <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
                Altitude
              </h3>

              {/* Option 1: Pressure Altitude */}
              <div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem] gap-x-4 gap-y-4 lg:items-center mb-4">
                <label
                  className="flex items-center text-sm font-medium mb-2 lg:mb-0"
                  style={{ color: isPressureAltDisabled ? "oklch(0.5 0.015 240)" : "oklch(0.72 0.015 240)" }}
                >
                  Pressure Altitude
                  <Tooltip content="Altitude above standard pressure (29.92 inHg / 1013 hPa). Set your altimeter to standard and read the indicated altitude." />
                </label>

                <div className="relative">
                  <input
                    type="number"
                    value={pressureAltitude}
                    onChange={(e) => setPressureAltitude(e.target.value)}
                    disabled={isPressureAltDisabled}
                    className={`w-full px-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right ${
                      isPressureAltDisabled ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                    placeholder="4000"
                  />
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                    style={{ color: "oklch(0.55 0.02 240)" }}
                  >
                    ft
                  </span>
                </div>

                {/* Fill remaining columns */}
                <div className="hidden lg:block lg:col-span-3"></div>
              </div>

              {/* OR divider */}
              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 h-px bg-gray-700"></div>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.5 0.02 240)" }}>
                  Or use Altitude + QNH
                </span>
                <div className="flex-1 h-px bg-gray-700"></div>
              </div>

              {/* Option 2: Altitude + QNH */}
              <div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem] gap-x-4 gap-y-4 lg:items-center">
                {/* Altitude */}
                <label
                  className="flex items-center text-sm font-medium mb-2 lg:mb-0"
                  style={{ color: isAltitudeQnhDisabled ? "oklch(0.5 0.015 240)" : "oklch(0.72 0.015 240)" }}
                >
                  Altitude
                  <Tooltip content="The indicated altitude on your altimeter with current QNH set. We'll calculate pressure altitude for you." />
                </label>

                <div className="relative">
                  <input
                    type="number"
                    value={altitude}
                    onChange={(e) => setAltitude(e.target.value)}
                    disabled={isAltitudeQnhDisabled}
                    className={`w-full px-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right ${
                      isAltitudeQnhDisabled ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                    placeholder="3500"
                  />
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                    style={{ color: "oklch(0.55 0.02 240)" }}
                  >
                    ft
                  </span>
                </div>

                {/* Gap */}
                <div className="hidden lg:block"></div>

                {/* QNH */}
                <label
                  className="flex items-center text-sm font-medium mb-2 lg:mb-0"
                  style={{ color: isAltitudeQnhDisabled ? "oklch(0.5 0.015 240)" : "oklch(0.72 0.015 240)" }}
                >
                  QNH
                  <Tooltip content="The barometric pressure setting. Enter in hPa (millibars) or inHg. Format is auto-detected (25-35 = inHg, otherwise hPa)." />
                </label>

                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={qnh}
                    onChange={(e) => setQnh(e.target.value)}
                    disabled={isAltitudeQnhDisabled}
                    className={`w-full px-4 pr-14 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right ${
                      isAltitudeQnhDisabled ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                    placeholder="1013"
                  />
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                    style={{ color: "oklch(0.55 0.02 240)" }}
                  >
                    {qnhFormat}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Results */}
          {tas !== null && (
            <div className="space-y-6">
              {/* Formula Display - Collapsible */}
              <div className="rounded-lg bg-slate-900/30 border border-gray-700 overflow-hidden">
                <button
                  onClick={() => setShowFormulas(!showFormulas)}
                  className="w-full px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
                    {altitude && qnh ? 'Show Formulas' : 'Show Formula'}
                  </span>
                  <svg
                    className={`w-5 h-5 transition-transform ${showFormulas ? 'rotate-180' : ''}`}
                    style={{ color: "oklch(0.65 0.15 230)" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showFormulas && intermediateValues && (
                  <div className="px-4 pb-4 space-y-4 border-t border-gray-700/50">
                    {/* Pressure Altitude Formula - Only show when using altitude + QNH */}
                    {altitude && qnh && effectivePressureAlt !== null && !isNaN(effectivePressureAlt) && (
                      <div className="pt-3">
                        <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.7 0.02 240)" }}>
                          Step 1: Pressure Altitude
                        </p>
                        <p className="text-xs font-mono py-1.5 px-2 rounded bg-slate-800/50 mb-1" style={{ color: "oklch(0.8 0.02 240)" }}>
                          {qnhFormat === "inHg"
                            ? "PA = Alt + (29.92 - QNH) × 1000"
                            : "PA = Alt + (1013 - QNH) × 27"
                          }
                        </p>
                        <p className="text-xs" style={{ color: "oklch(0.6 0.02 240)" }}>
                          PA = {effectivePressureAlt.toFixed(0)} ft
                        </p>
                      </div>
                    )}

                    {/* ISA Pressure at Altitude */}
                    <div className={altitude && qnh ? 'pt-1' : 'pt-3'}>
                      <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.7 0.02 240)" }}>
                        {altitude && qnh ? 'Step 2: ' : 'Step 1: '}ISA Pressure at Altitude
                      </p>
                      <p className="text-xs font-mono py-1.5 px-2 rounded bg-slate-800/50 mb-1" style={{ color: "oklch(0.8 0.02 240)" }}>
                        P = P₀ × (1 - L×h/T₀)^(g₀/R×L)
                      </p>
                      <div className="text-xs space-y-0.5 ml-2" style={{ color: "oklch(0.6 0.02 240)" }}>
                        <p>P₀ = 101,325 Pa (sea level)</p>
                        <p>L = 0.0065 K/m (lapse rate)</p>
                        <p>h = {(effectivePressureAlt * 0.3048).toFixed(1)} m</p>
                        <p>T₀ = 288.15 K (15°C)</p>
                        <p>g₀ = 9.807 m/s²</p>
                        <p>R = 287.05 J/(kg·K)</p>
                      </div>
                      <p className="text-xs font-medium mt-1" style={{ color: "oklch(0.7 0.02 240)" }}>
                        P = {intermediateValues.pIsa.toFixed(1)} Pa
                      </p>
                    </div>

                    {/* Sea Level Density */}
                    <div className="pt-1">
                      <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.7 0.02 240)" }}>
                        {altitude && qnh ? 'Step 3: ' : 'Step 2: '}Sea Level Density (ρ₀)
                      </p>
                      <p className="text-xs font-mono py-1.5 px-2 rounded bg-slate-800/50 mb-1" style={{ color: "oklch(0.8 0.02 240)" }}>
                        ρ₀ = P₀ / (R × T₀)
                      </p>
                      <p className="text-xs ml-2" style={{ color: "oklch(0.6 0.02 240)" }}>
                        ρ₀ = 101,325 / (287.05 × 288.15)
                      </p>
                      <p className="text-xs font-medium mt-1" style={{ color: "oklch(0.7 0.02 240)" }}>
                        ρ₀ = {intermediateValues.rho0.toFixed(4)} kg/m³
                      </p>
                    </div>

                    {/* Actual Density */}
                    <div className="pt-1">
                      <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.7 0.02 240)" }}>
                        {altitude && qnh ? 'Step 4: ' : 'Step 3: '}Actual Air Density (ρ)
                      </p>
                      <p className="text-xs font-mono py-1.5 px-2 rounded bg-slate-800/50 mb-1" style={{ color: "oklch(0.8 0.02 240)" }}>
                        ρ = P / (R × T)
                      </p>
                      <div className="text-xs space-y-0.5 ml-2" style={{ color: "oklch(0.6 0.02 240)" }}>
                        <p>P = {intermediateValues.pIsa.toFixed(1)} Pa</p>
                        <p>T = {(parseFloat(oat) + 273.15).toFixed(2)} K ({oat}°C)</p>
                      </div>
                      <p className="text-xs ml-2" style={{ color: "oklch(0.6 0.02 240)" }}>
                        ρ = {intermediateValues.pIsa.toFixed(1)} / (287.05 × {(parseFloat(oat) + 273.15).toFixed(2)})
                      </p>
                      <p className="text-xs font-medium mt-1" style={{ color: "oklch(0.7 0.02 240)" }}>
                        ρ = {intermediateValues.rho.toFixed(4)} kg/m³
                      </p>
                    </div>

                    {/* Density Ratio */}
                    <div className="pt-1">
                      <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.7 0.02 240)" }}>
                        {altitude && qnh ? 'Step 5: ' : 'Step 4: '}Density Ratio
                      </p>
                      <p className="text-xs font-mono py-1.5 px-2 rounded bg-slate-800/50 mb-1" style={{ color: "oklch(0.8 0.02 240)" }}>
                        ρ₀/ρ = {intermediateValues.rho0.toFixed(4)} / {intermediateValues.rho.toFixed(4)}
                      </p>
                      <p className="text-xs font-medium mt-1" style={{ color: "oklch(0.7 0.02 240)" }}>
                        ρ₀/ρ = {intermediateValues.densityRatio.toFixed(4)}
                      </p>
                    </div>

                    {/* Final TAS Calculation */}
                    <div className="pt-1 pb-2">
                      <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.7 0.02 240)" }}>
                        {altitude && qnh ? 'Step 6: ' : 'Step 5: '}True Airspeed
                      </p>
                      <p className="text-xs font-mono py-1.5 px-2 rounded bg-slate-800/50 mb-1" style={{ color: "oklch(0.8 0.02 240)" }}>
                        TAS = CAS × √(ρ₀/ρ)
                      </p>
                      <p className="text-xs ml-2" style={{ color: "oklch(0.6 0.02 240)" }}>
                        TAS = {cas} × √{intermediateValues.densityRatio.toFixed(4)}
                      </p>
                      <p className="text-xs ml-2" style={{ color: "oklch(0.6 0.02 240)" }}>
                        TAS = {cas} × {Math.sqrt(intermediateValues.densityRatio).toFixed(4)}
                      </p>
                      <p className="text-xs font-medium mt-1" style={{ color: "oklch(0.7 0.02 240)" }}>
                        TAS = {tas?.toFixed(2)} kt
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Intermediate Values - Only show when using altitude + QNH */}
              {altitude && qnh && effectivePressureAlt !== null && !isNaN(effectivePressureAlt) && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
                    Intermediate Values
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {/* Calculated Pressure Altitude */}
                    <div className="p-3 rounded-lg bg-slate-900/30 border border-gray-700">
                      <div className="flex items-center justify-center mb-1">
                        <p className="text-xs font-medium" style={{ color: "white" }}>
                          Calculated Pressure Altitude
                        </p>
                        <Tooltip content="Pressure Altitude calculated from your indicated altitude and QNH. This is used to compute the True Airspeed." />
                      </div>
                      <p className="text-xl font-bold text-center" style={{ color: "white" }}>
                        {effectivePressureAlt.toFixed(0)} ft
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Primary Result */}
              <div>
                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
                  Result
                </h3>
                <div className="p-6 rounded-xl text-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
                  <div className="flex items-center justify-center mb-2">
                    <p
                      className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                      style={{ color: "oklch(0.65 0.15 230)" }}
                    >
                      True Airspeed
                    </p>
                    <Tooltip content="True Airspeed (TAS) is your actual speed through the air mass, corrected for altitude and temperature. This is faster than your indicated airspeed due to lower air density at altitude. Use TAS for flight planning, fuel calculations, and navigation." />
                  </div>
                  <p
                    className="text-3xl sm:text-4xl font-bold mb-1"
                    style={{ color: "white" }}
                  >
                    {tas.toFixed(2)}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "oklch(0.6 0.02 240)" }}
                  >
                    knots
                  </p>
                </div>
              </div>

              {/* Share Button */}
              <ShareButton
                shareData={{
                  title: "José's TAS Calculator",
                  text: `CAS: ${cas} kt, OAT: ${oat}°C${pressureAltitude ? `, PA: ${pressureAltitude} ft` : `, Alt: ${altitude} ft @ ${qnh} ${qnhFormat}`} → TAS: ${tas.toFixed(2)} kt`,
                }}
              />
            </div>
          )}

          {/* Note */}
          <div className="mt-6 p-4 rounded-xl bg-slate-900/30 border border-gray-700">
            <p
              className="text-xs sm:text-sm leading-relaxed"
              style={{ color: "oklch(0.6 0.02 240)" }}
            >
              <span className="font-semibold">Note:</span> This calculator uses
              the International Standard Atmosphere (ISA) model for pressure
              calculations and accounts for actual temperature to determine air
              density. You can either enter pressure altitude directly or provide
              altitude + QNH to calculate it automatically.
            </p>
          </div>
        </div>

      </main>

      <Footer description="Aviation calculations based on ISA standard atmosphere" />
    </PageLayout>
  );
}
