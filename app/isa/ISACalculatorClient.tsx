"use client";

import { useState, useEffect, useMemo } from "react";
import { Tooltip } from "../components/Tooltip";
import { PageLayout } from "../components/PageLayout";
import { CalculatorPageHeader } from "../components/CalculatorPageHeader";
import { Footer } from "../components/Footer";
import { ShareButton } from "../components/ShareButton";
import { calculateISA, isInHg, isValidQNH, getQNHRange, isaPressure } from "@/lib/isaCalculations";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceLine,
} from "recharts";

// Generate ISA atmosphere data for the chart
function generateISAData() {
  const data = [];
  for (let alt = 0; alt <= 20000; alt += 500) {
    const pressurePa = isaPressure(alt);
    const pressureHPa = pressurePa / 100;
    const pressureInHg = pressurePa / 3386.39;
    data.push({
      altitude: alt,
      pressureHPa: Math.round(pressureHPa * 10) / 10,
      pressureInHg: Math.round(pressureInHg * 100) / 100,
    });
  }
  return data;
}

interface ISACalculatorClientProps {
  initialElevation: string;
  initialQnh: string;
  initialTemp: string;
  initialShowExplanation: boolean;
}

export function ISACalculatorClient({
  initialElevation,
  initialQnh,
  initialTemp,
  initialShowExplanation,
}: ISACalculatorClientProps) {
  const [elevation, setElevation] = useState<string>(initialElevation);
  const [qnh, setQnh] = useState<string>(initialQnh);
  const [temp, setTemp] = useState<string>(initialTemp);
  const [showExplanation, setShowExplanation] = useState(initialShowExplanation);

  // Update URL when parameters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (elevation) params.set("elev", elevation);
    if (qnh) params.set("qnh", qnh);
    if (temp) params.set("temp", temp);
    if (showExplanation) params.set("explain", "1");

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [elevation, qnh, temp, showExplanation]);

  // Parse values
  const elevVal = parseFloat(elevation);
  const qnhVal = parseFloat(qnh);
  const tempVal = parseFloat(temp);

  // Detect QNH format independently
  const qnhFormat = !isNaN(qnhVal) && isInHg(qnhVal) ? "inHg" : "hPa";

  // Calculate results - OAT is optional
  const hasElevAndQnh = !isNaN(elevVal) && !isNaN(qnhVal);
  const hasTemp = !isNaN(tempVal);

  const results = hasElevAndQnh ? calculateISA(elevVal, qnhVal, hasTemp ? tempVal : 0) : null;

  const isaTemp = results?.isaTemp ?? null;
  const pa = results?.pressureAltitude ?? null;
  // DA only available when temperature is provided
  const da = hasTemp ? results?.densityAltitude ?? null : null;

  // ISA atmosphere chart data
  const isaChartData = useMemo(() => generateISAData(), []);

  // Build share URL
  const _shareUrl = (() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams();
    if (elevation) params.set("elev", elevation);
    if (qnh) params.set("qnh", qnh);
    if (temp) params.set("temp", temp);
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  })();

  return (
    <PageLayout currentPage="isa">
      <CalculatorPageHeader
        title="ISA Calculator"
        description="Calculate ISA Temperature, Pressure Altitude, and Density Altitude based on elevation, QNH, and actual temperature"
      />

      <main className="w-full max-w-4xl">
        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">
          {/* Section Header */}
          <div className="mb-6 pb-6 border-b border-gray-700">
            <h2
              className="text-xl sm:text-2xl font-bold mb-2"
              style={{ color: "white" }}
            >
              Atmospheric Parameters
            </h2>
            <p
              className="text-sm"
              style={{ color: "oklch(0.7 0.02 240)" }}
            >
              Enter elevation, QNH, and actual temperature to calculate ISA values
            </p>
          </div>

          {/* Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
            {/* Elevation Input */}
            <div>
              <label
                className="flex items-center text-sm font-medium mb-2"
                style={{ color: "oklch(0.72 0.015 240)" }}
              >
                Elevation
                <Tooltip content="The altitude of the aerodrome or location above mean sea level in feet." />
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={elevation}
                  onChange={(e) => setElevation(e.target.value)}
                  className="w-full px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                  placeholder="2000"
                />
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                  style={{ color: "oklch(0.55 0.02 240)" }}
                >
                  ft
                </span>
              </div>
            </div>

            {/* QNH Input */}
            <div>
              <label
                className="flex items-center text-sm font-medium mb-2"
                style={{ color: "oklch(0.72 0.015 240)" }}
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
                  className="w-full px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                  placeholder="1013 or 29.92"
                />
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                  style={{ color: "oklch(0.55 0.02 240)" }}
                >
                  {qnhFormat}
                </span>
              </div>
            </div>

            {/* Temperature Input */}
            <div>
              <label
                className="flex items-center text-sm font-medium mb-2"
                style={{ color: "oklch(0.72 0.015 240)" }}
              >
                Actual Temperature
                <Tooltip content="The actual outside air temperature in degrees Celsius at the current location." />
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  className="w-full px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                  placeholder="15"
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

          {/* QNH Validation Warning */}
          {!isNaN(qnhVal) && qnh && !isValidQNH(qnhVal) && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "oklch(0.75 0.15 15)" }}>
                <span className="font-semibold">⚠️ Invalid QNH:</span> The value {qnhVal.toFixed(2)} {qnhFormat} is outside the typical range.
                Expected range: {getQNHRange(qnhVal).min} - {getQNHRange(qnhVal).max} {getQNHRange(qnhVal).unit}.
                Please verify your input.
              </p>
            </div>
          )}

          {/* Results */}
          {hasElevAndQnh && isaTemp !== null && pa !== null && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* ISA Temperature Result */}
                <div className="p-6 rounded-xl text-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
                  <div className="flex items-center justify-center mb-2">
                    <p
                      className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                      style={{ color: "oklch(0.65 0.15 230)" }}
                    >
                      ISA Temperature
                    </p>
                    <Tooltip content="The standard temperature at this elevation according to the International Standard Atmosphere model." />
                  </div>
                  <p
                    className="text-3xl sm:text-4xl font-bold mb-1"
                    style={{ color: "white" }}
                  >
                    {isaTemp.toFixed(1)}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "oklch(0.6 0.02 240)" }}
                  >
                    °C
                  </p>
                </div>

                {/* Pressure Altitude Result */}
                <div className="p-6 rounded-xl text-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
                  <div className="flex items-center justify-center mb-2">
                    <p
                      className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                      style={{ color: "oklch(0.65 0.15 230)" }}
                    >
                      Pressure Altitude
                    </p>
                    <Tooltip content="The altitude corrected for non-standard pressure. This is what your altimeter reads when set to standard pressure (29.92 inHg / 1013 hPa)." />
                  </div>
                  <p
                    className="text-3xl sm:text-4xl font-bold mb-1"
                    style={{ color: "white" }}
                  >
                    {pa.toFixed(0)}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "oklch(0.6 0.02 240)" }}
                  >
                    ft
                  </p>
                </div>

                {/* Density Altitude Result - only shown when OAT is provided */}
                {da !== null ? (
                  <div className="p-6 rounded-xl text-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
                    <div className="flex items-center justify-center mb-2">
                      <p
                        className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                        style={{ color: "oklch(0.65 0.15 230)" }}
                      >
                        Density Altitude
                      </p>
                      <Tooltip content="The altitude relative to standard atmosphere conditions where the air density would be equal to the current conditions. High density altitude means reduced aircraft performance." />
                    </div>
                    <p
                      className="text-3xl sm:text-4xl font-bold mb-1"
                      style={{ color: "white" }}
                    >
                      {da.toFixed(0)}
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "oklch(0.6 0.02 240)" }}
                    >
                      ft
                    </p>
                  </div>
                ) : (
                  <div className="p-6 rounded-xl text-center bg-slate-900/30 border border-gray-700">
                    <div className="flex items-center justify-center mb-2">
                      <p
                        className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                        style={{ color: "oklch(0.5 0.02 240)" }}
                      >
                        Density Altitude
                      </p>
                    </div>
                    <p
                      className="text-sm"
                      style={{ color: "oklch(0.5 0.02 240)" }}
                    >
                      Enter OAT to calculate
                    </p>
                  </div>
                )}
              </div>

              {/* Performance Note - warn when DA significantly exceeds PA */}
              {da !== null && pa !== null && da > pa + 1000 && (
                <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <p
                    className="text-xs sm:text-sm leading-relaxed"
                    style={{ color: "oklch(0.7 0.1 30)" }}
                  >
                    <span className="font-semibold">High Density Altitude:</span> Aircraft performance will be reduced. Expect longer takeoff rolls, reduced climb rate, and decreased engine performance.
                  </p>
                </div>
              )}

              {/* Share Button */}
              <ShareButton
                shareData={{
                  title: "José's ISA Calculator",
                  text: da !== null
                    ? `Elevation: ${elevation} ft, QNH: ${qnh} ${qnhFormat}, Temp: ${temp}°C → ISA: ${isaTemp.toFixed(1)}°C, PA: ${pa.toFixed(0)} ft, DA: ${da.toFixed(0)} ft`
                    : `Elevation: ${elevation} ft, QNH: ${qnh} ${qnhFormat} → ISA: ${isaTemp.toFixed(1)}°C, PA: ${pa.toFixed(0)} ft`,
                }}
              />

              {/* Manual Calculation Explanation */}
              <div className="mt-6">
                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ color: "oklch(0.65 0.15 230)" }}
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${showExplanation ? "rotate-90" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  How to calculate manually
                </button>

                {showExplanation && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-gray-700 space-y-4">
                    {/* ISA Temperature */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2" style={{ color: "oklch(0.8 0.1 230)" }}>
                        1. ISA Temperature
                      </h4>
                      <p className="text-xs mb-2" style={{ color: "oklch(0.65 0.02 240)" }}>
                        Standard temperature decreases ~2°C per 1,000 ft from 15°C at sea level.
                      </p>
                      <div className="font-mono text-xs p-2 rounded bg-slate-800/50" style={{ color: "oklch(0.75 0.05 180)" }}>
                        ISA Temp = 15 − (1.98 × Elevation ÷ 1000)
                      </div>
                      <p className="text-xs mt-2" style={{ color: "oklch(0.6 0.02 240)" }}>
                        → 15 − (1.98 × {elevVal.toFixed(0)} ÷ 1000) = <strong style={{ color: "white" }}>{isaTemp.toFixed(1)}°C</strong>
                      </p>
                    </div>

                    {/* Pressure Altitude */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2" style={{ color: "oklch(0.8 0.1 230)" }}>
                        2. Pressure Altitude
                      </h4>
                      <p className="text-xs mb-2" style={{ color: "oklch(0.65 0.02 240)" }}>
                        {qnhFormat === "inHg" ? (
                          <>Quick approximation: ~1,000 ft per inHg difference from 29.92.</>
                        ) : (
                          <>Quick approximation: ~27 ft per hPa difference from 1013.25.</>
                        )}
                      </p>
                      <div className="font-mono text-xs p-2 rounded bg-slate-800/50" style={{ color: "oklch(0.75 0.05 180)" }}>
                        {qnhFormat === "inHg" ? (
                          <>PA ≈ Elevation + (29.92 − QNH) × 1000</>
                        ) : (
                          <>PA ≈ Elevation + (1013.25 − QNH) × 27</>
                        )}
                      </div>
                      <p className="text-xs mt-2" style={{ color: "oklch(0.6 0.02 240)" }}>
                        {qnhFormat === "inHg" ? (
                          <>→ {elevVal.toFixed(0)} + (29.92 − {qnhVal.toFixed(2)}) × 1000 ≈ {(elevVal + (29.92 - qnhVal) * 1000).toFixed(0)} ft</>
                        ) : (
                          <>→ {elevVal.toFixed(0)} + (1013.25 − {qnhVal.toFixed(2)}) × 27 ≈ {(elevVal + (1013.25 - qnhVal) * 27).toFixed(0)} ft</>
                        )}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "oklch(0.5 0.02 240)" }}>
                        This calculator uses the exact ISA barometric formula: <strong style={{ color: "white" }}>{pa.toFixed(0)} ft</strong>
                      </p>
                    </div>

                    {/* Density Altitude */}
                    {da !== null && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2" style={{ color: "oklch(0.8 0.1 230)" }}>
                          3. Density Altitude
                        </h4>
                        <p className="text-xs mb-2" style={{ color: "oklch(0.65 0.02 240)" }}>
                          Adjusts PA for temperature deviation from ISA (~120 ft per °C).
                        </p>
                        <div className="font-mono text-xs p-2 rounded bg-slate-800/50" style={{ color: "oklch(0.75 0.05 180)" }}>
                          DA = PA + 118.8 × (OAT − ISA Temp)
                        </div>
                        <p className="text-xs mt-2" style={{ color: "oklch(0.6 0.02 240)" }}>
                          → {pa.toFixed(0)} + 118.8 × ({tempVal.toFixed(1)} − {isaTemp.toFixed(1)}) = <strong style={{ color: "white" }}>{da.toFixed(0)} ft</strong>
                        </p>
                      </div>
                    )}

                    {/* ISA Atmosphere Chart */}
                    <div className="pt-4 border-t border-gray-700">
                      <h4 className="text-sm font-semibold mb-3" style={{ color: "oklch(0.8 0.1 230)" }}>
                        Standard Atmosphere Chart
                      </h4>
                      <p className="text-xs mb-3" style={{ color: "oklch(0.65 0.02 240)" }}>
                        This chart shows the ISA pressure-altitude relationship. Hover to see values at any altitude.
                        {pa !== null && (
                          <> Your current point is marked: <strong style={{ color: "oklch(0.8 0.15 60)" }}>PA = {pa.toFixed(0)} ft</strong></>
                        )}
                      </p>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={isaChartData}
                            margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                          >
                            <XAxis
                              dataKey="altitude"
                              type="number"
                              domain={[0, 20000]}
                              tick={{ fontSize: 10, fill: "oklch(0.6 0.02 240)" }}
                              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                              label={{
                                value: "Altitude (ft)",
                                position: "bottom",
                                offset: 5,
                                style: { fontSize: 10, fill: "oklch(0.55 0.02 240)" },
                              }}
                            />
                            <YAxis
                              dataKey={qnhFormat === "inHg" ? "pressureInHg" : "pressureHPa"}
                              type="number"
                              domain={qnhFormat === "inHg" ? [16, 32] : [450, 1050]}
                              tick={{ fontSize: 10, fill: "oklch(0.6 0.02 240)" }}
                              tickFormatter={(value) => qnhFormat === "inHg" ? value.toFixed(0) : value.toFixed(0)}
                              label={{
                                value: qnhFormat === "inHg" ? "Pressure (inHg)" : "Pressure (hPa)",
                                angle: -90,
                                position: "insideLeft",
                                offset: 15,
                                style: { fontSize: 10, fill: "oklch(0.55 0.02 240)" },
                              }}
                            />
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: "oklch(0.2 0.02 240)",
                                border: "1px solid oklch(0.4 0.02 240)",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                              labelStyle={{ color: "white", fontWeight: "bold" }}
                              formatter={(value: number, name: string) => {
                                if (name === "pressureHPa") return [`${value.toFixed(1)} hPa`, "Pressure"];
                                if (name === "pressureInHg") return [`${value.toFixed(2)} inHg`, "Pressure"];
                                return [value, name];
                              }}
                              labelFormatter={(label) => `Altitude: ${Number(label).toLocaleString()} ft`}
                            />
                            <Line
                              type="monotone"
                              dataKey={qnhFormat === "inHg" ? "pressureInHg" : "pressureHPa"}
                              stroke="oklch(0.7 0.15 230)"
                              strokeWidth={2}
                              dot={false}
                            />
                            {/* Current PA point */}
                            {pa !== null && pa >= 0 && pa <= 20000 && (
                              <>
                                <ReferenceLine
                                  x={pa}
                                  stroke="oklch(0.7 0.15 60)"
                                  strokeDasharray="3 3"
                                  strokeWidth={1}
                                />
                                <ReferenceLine
                                  y={qnhFormat === "inHg"
                                    ? isaPressure(pa) / 3386.39
                                    : isaPressure(pa) / 100
                                  }
                                  stroke="oklch(0.7 0.15 60)"
                                  strokeDasharray="3 3"
                                  strokeWidth={1}
                                />
                                <ReferenceDot
                                  x={pa}
                                  y={qnhFormat === "inHg"
                                    ? isaPressure(pa) / 3386.39
                                    : isaPressure(pa) / 100
                                  }
                                  r={6}
                                  fill="oklch(0.8 0.15 60)"
                                  stroke="white"
                                  strokeWidth={2}
                                />
                              </>
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-xs mt-2 text-center" style={{ color: "oklch(0.5 0.02 240)" }}>
                        ISA: P = P₀ × (1 − L×h/T₀)^(g/RL) where P₀=1013.25 hPa, T₀=288.15 K, L=0.0065 K/m
                      </p>
                    </div>

                    <p className="text-xs pt-2 border-t border-gray-700" style={{ color: "oklch(0.5 0.02 240)" }}>
                      Note: The linear approximations are quick rules of thumb. This calculator uses the full ISA barometric equation for accuracy.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Note */}
          <div className="mt-6 p-4 rounded-xl bg-slate-900/30 border border-gray-700">
            <p
              className="text-xs sm:text-sm leading-relaxed"
              style={{ color: "oklch(0.6 0.02 240)" }}
            >
              <span className="font-semibold">Note:</span> This calculator uses
              the ISA standard atmosphere model. QNH format is auto-detected
              (values between 25-35 are treated as inHg, otherwise as hPa).
              Density altitude is critical for aircraft performance assessment.
            </p>
          </div>
        </div>
      </main>

      <Footer description="ISA calculations based on standard atmosphere model" />
    </PageLayout>
  );
}
