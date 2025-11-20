"use client";

import { useState, useEffect } from "react";
import { Tooltip } from "../components/Tooltip";
import { PageLayout } from "../components/PageLayout";
import { CalculatorPageHeader } from "../components/CalculatorPageHeader";
import { Footer } from "../components/Footer";
import { ShareButton } from "../components/ShareButton";
import { calculateISA, isInHg, isValidQNH, getQNHRange } from "@/lib/isaCalculations";

interface ISACalculatorClientProps {
  initialElevation: string;
  initialQnh: string;
  initialTemp: string;
}

export function ISACalculatorClient({
  initialElevation,
  initialQnh,
  initialTemp,
}: ISACalculatorClientProps) {
  const [elevation, setElevation] = useState<string>(initialElevation);
  const [qnh, setQnh] = useState<string>(initialQnh);
  const [temp, setTemp] = useState<string>(initialTemp);

  // Update URL when parameters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (elevation) params.set("elev", elevation);
    if (qnh) params.set("qnh", qnh);
    if (temp) params.set("temp", temp);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [elevation, qnh, temp]);

  // Parse values
  const elevVal = parseFloat(elevation);
  const qnhVal = parseFloat(qnh);
  const tempVal = parseFloat(temp);

  // Detect QNH format independently
  const qnhFormat = !isNaN(qnhVal) && isInHg(qnhVal) ? "inHg" : "hPa";

  // Calculate results
  const hasValidInputs = !isNaN(elevVal) && !isNaN(qnhVal) && !isNaN(tempVal);

  const results = hasValidInputs ? calculateISA(elevVal, qnhVal, tempVal) : null;

  const isaTemp = results?.isaTemp ?? null;
  const pa = results?.pressureAltitude ?? null;
  const da = results?.densityAltitude ?? null;

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
          {hasValidInputs && isaTemp !== null && pa !== null && da !== null && (
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

                {/* Density Altitude Result */}
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
              </div>

              {/* Performance Note */}
              {da > elevVal + 1000 && (
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
                  text: `Elevation: ${elevation} ft, QNH: ${qnh} ${qnhFormat}, Temp: ${temp}°C → ISA: ${isaTemp.toFixed(1)}°C, PA: ${pa.toFixed(0)} ft, DA: ${da.toFixed(0)} ft`,
                }}
              />
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
