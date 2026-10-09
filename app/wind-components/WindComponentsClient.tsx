"use client";

import { useState, useEffect, useRef } from "react";
import { Tooltip } from "../components/Tooltip";
import { PageLayout } from "../components/PageLayout";
import { CalculatorPageHeader } from "../components/CalculatorPageHeader";
import { Footer } from "../components/Footer";
import { ShareButton } from "../components/ShareButton";
import { WindComponentsChart, type WindComponentsChange } from "./WindComponentsChart";
import {
  parseRunwayDesignator,
  getHeadingWindComponents,
  getRelativeWindComponents,
} from "@/lib/windComponents";
import { formatCourse, formatWind } from "@/lib/formatters";

export type WindInputMode = "direction" | "relative";
export type ReferenceType = "hdg" | "rwy";

interface WindComponentsClientProps {
  initialMode: WindInputMode;
  initialRefType: ReferenceType;
  initialReference: string;
  initialWindDir: string;
  initialWindSpeed: string;
  initialAngle: string;
  initialShowExplanation: boolean;
}

const inputClass =
  "w-full px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right";
const labelClass = "flex items-center text-sm font-medium mb-2";
const unitClass = "absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none";

export function WindComponentsClient({
  initialMode,
  initialRefType,
  initialReference,
  initialWindDir,
  initialWindSpeed,
  initialAngle,
  initialShowExplanation,
}: WindComponentsClientProps) {
  const [mode, setMode] = useState<WindInputMode>(initialMode);
  const [refType, setRefType] = useState<ReferenceType>(initialRefType);
  const [reference, setReference] = useState(initialReference);
  const [windDir, setWindDir] = useState(initialWindDir);
  const [windSpeed, setWindSpeed] = useState(initialWindSpeed);
  const [angle, setAngle] = useState(initialAngle);
  const [showExplanation, setShowExplanation] = useState(initialShowExplanation);

  // Update URL when parameters change. Debounced: dragging the chart changes state on every
  // pointer move, and Safari throws a SecurityError after ~100 replaceState calls in 30s.
  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (mode === "relative") {
        params.set("m", "a");
        if (angle) params.set("ang", angle);
      } else {
        if (reference) params.set(refType, reference);
        if (windDir) params.set("wd", windDir);
      }
      if (windSpeed) params.set("ws", windSpeed);
      if (showExplanation) params.set("explain", "1");

      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", newUrl);
    }, 300);
    return () => clearTimeout(timeout);
  }, [mode, refType, reference, windDir, windSpeed, angle, showExplanation]);

  // Parse values
  const isRunway = refType === "rwy";
  const headingInput = parseFloat(reference);
  const heading = isRunway
    ? parseRunwayDesignator(reference)
    : !isNaN(headingInput) && headingInput >= 0 && headingInput <= 360
      ? headingInput
      : null;
  const windDirVal = parseFloat(windDir);
  const windSpeedVal = parseFloat(windSpeed);
  const angleVal = parseFloat(angle);

  const validSpeed = !isNaN(windSpeedVal) && windSpeedVal >= 0;
  const validWindDir = !isNaN(windDirVal) && windDirVal >= 0 && windDirVal <= 360;
  const validAngle = !isNaN(angleVal) && angleVal >= 0 && angleVal <= 180;

  const results =
    mode === "direction"
      ? heading !== null && validWindDir && validSpeed
        ? getHeadingWindComponents(heading, windDirVal, windSpeedVal)
        : null
      : validAngle && validSpeed
        ? getRelativeWindComponents(angleVal, windSpeedVal)
        : null;

  // Remember which side the wind came from, so dragging through 0°/180° on the chart keeps it
  const lastSide = useRef<"L" | "R">("R");

  // Chart drag → back to wind speed + angle. Rounded to 0.1 so the component being held
  // fixed on the chart doesn't visibly shift when recomputed from the inputs.
  const handleChartChange = ({ headwind, crosswind }: WindComponentsChange) => {
    const round1 = (v: number) => Math.round(v * 10) / 10;
    const speed = round1(Math.hypot(headwind, crosswind));
    const rel = round1((Math.atan2(crosswind, headwind) * 180) / Math.PI);
    setWindSpeed(String(speed));
    if (mode === "relative") {
      setAngle(String(rel));
    } else if (heading !== null) {
      const side = results?.crosswindFrom ?? lastSide.current;
      lastSide.current = side;
      const dir = round1((((heading + (side === "L" ? -rel : rel)) % 360) + 360) % 360);
      setWindDir(String(dir === 0 ? 360 : dir));
    }
  };

  const isTailwind = results !== null && results.headwind < -0.05;
  const sideLabel =
    results?.crosswindFrom === "L" ? "from the left" : results?.crosswindFrom === "R" ? "from the right" : null;
  // What the wind is measured against, for labels
  const refName = mode === "direction" && isRunway ? "runway" : "heading";

  const problemText =
    mode === "direction"
      ? `${isRunway ? `Runway ${reference} (${formatCourse(heading)})` : `Heading ${formatCourse(heading)}`}, wind ${formatWind(windDirVal, windSpeedVal)}`
      : `Wind ${windSpeedVal} KT at ${angleVal}° off the nose`;
  const resultText = results
    ? `${isTailwind ? "Tailwind" : "Headwind"} ${Math.abs(results.headwind).toFixed(0)} KT, crosswind ${results.crosswind.toFixed(0)} KT${sideLabel ? ` ${sideLabel}` : ""}`
    : "";

  return (
    <PageLayout currentPage="wind-components">
      <CalculatorPageHeader
        title="Wind Components"
        description="Split any wind into headwind/tailwind and crosswind components relative to your heading or a runway, and see it on the wind component chart"
      />

      <main className="w-full max-w-4xl">
        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">
          {/* Section Header */}
          <div className="mb-6 pb-6 border-b border-gray-700 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: "white" }}>
                Wind
              </h2>
              <p className="text-sm" style={{ color: "oklch(0.7 0.02 240)" }}>
                {mode === "direction"
                  ? "Enter your heading (or a runway) and the wind"
                  : "Enter how far off the nose the wind is, and its speed"}
              </p>
            </div>

            {/* Mode toggle */}
            <div className="inline-flex rounded-xl bg-slate-900/50 border border-gray-600 p-1 self-start sm:self-auto">
              {(
                [
                  { id: "direction", label: "Heading + Wind" },
                  { id: "relative", label: "Relative Angle" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMode(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    mode === opt.id ? "bg-sky-500/20 text-white border border-sky-500/50" : "text-gray-400 hover:text-white border border-transparent"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Fields */}
          <div className={`grid grid-cols-1 ${mode === "direction" ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4 sm:gap-6 mb-8`}>
            {mode === "direction" ? (
              <>
                <div>
                  <label className={labelClass} style={{ color: "oklch(0.72 0.015 240)" }}>
                    {isRunway ? "Runway" : "Heading"}
                    <Tooltip content="The direction you are pointing: your heading in flight, or a runway for takeoff/landing. Tap HDG/RWY to switch: in RWY mode enter the designator (11, 29L → 110°, 290°)." />
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className={`${inputClass} pr-20`}
                      placeholder={isRunway ? "11" : "110"}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        // Convert the current value so switching doesn't lose it
                        if (isRunway && heading !== null) setReference(String(heading).padStart(3, "0"));
                        if (!isRunway && heading !== null) setReference(String(Math.round(heading / 10) || 36).padStart(2, "0"));
                        setRefType(isRunway ? "hdg" : "rwy");
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-xs font-semibold border border-gray-600 hover:border-sky-500/50 transition-colors cursor-pointer"
                      style={{ color: "oklch(0.75 0.1 230)" }}
                      title="Switch between heading (degrees) and runway designator"
                    >
                      {isRunway ? "RWY" : "HDG°"}
                    </button>
                  </div>
                  {isRunway && heading !== null && (
                    <p className="mt-1 text-xs text-right" style={{ color: "oklch(0.55 0.02 240)" }}>
                      = {formatCourse(heading)}
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelClass} style={{ color: "oklch(0.72 0.015 240)" }}>
                    Wind Direction
                    <Tooltip content="Direction the wind blows FROM, in degrees. Use the same reference (true or magnetic) as the heading. Tower/ATIS winds are magnetic; METAR/TAF and winds aloft are true." />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={windDir}
                      onChange={(e) => setWindDir(e.target.value)}
                      className={inputClass}
                      placeholder="085"
                    />
                    <span className={unitClass} style={{ color: "oklch(0.55 0.02 240)" }}>
                      °
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className={labelClass} style={{ color: "oklch(0.72 0.015 240)" }}>
                  Relative Wind Angle
                  <Tooltip content="How far off the nose the wind is (between the wind and your heading or runway): 0° = straight on the nose, 90° = from the side, 180° = straight from behind." />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={angle}
                    onChange={(e) => setAngle(e.target.value)}
                    className={inputClass}
                    placeholder="30"
                  />
                  <span className={unitClass} style={{ color: "oklch(0.55 0.02 240)" }}>
                    °
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className={labelClass} style={{ color: "oklch(0.72 0.015 240)" }}>
                Wind Speed
                <Tooltip content="Wind speed in knots. To check gusts, enter the gust value." />
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={windSpeed}
                  onChange={(e) => setWindSpeed(e.target.value)}
                  className={inputClass}
                  placeholder="30"
                />
                <span className={unitClass} style={{ color: "oklch(0.55 0.02 240)" }}>
                  KT
                </span>
              </div>
            </div>
          </div>

          {/* Validation warnings */}
          {mode === "direction" && reference && heading === null && (
            <ValidationWarning>
              {isRunway
                ? "Invalid runway: use a designator from 01 to 36, like 11 or 29L."
                : "Heading must be between 0° and 360°."}
            </ValidationWarning>
          )}
          {mode === "direction" && windDir && !validWindDir && (
            <ValidationWarning>Wind direction must be between 0° and 360°.</ValidationWarning>
          )}
          {mode === "relative" && angle && !validAngle && (
            <ValidationWarning>Relative wind angle must be between 0° and 180°.</ValidationWarning>
          )}

          {results && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <ResultCard
                  title={isTailwind ? "Tailwind" : "Headwind"}
                  tooltip={`Component along the ${refName}: wind speed × cos(angle). Beyond 90° it becomes a tailwind.`}
                  value={Math.abs(results.headwind).toFixed(1)}
                  unit="kt"
                  color={isTailwind ? "oklch(0.7 0.2 25)" : "oklch(0.75 0.17 150)"}
                />
                <ResultCard
                  title="Crosswind"
                  tooltip={`Component across the ${refName}: wind speed × sin(angle).`}
                  value={results.crosswind.toFixed(1)}
                  unit={sideLabel ? `kt ${sideLabel}` : "kt"}
                  color="oklch(0.8 0.15 75)"
                />
                <ResultCard
                  title="Relative Wind"
                  tooltip={`Angle between the wind and the ${refName}.`}
                  value={`${results.angle.toFixed(0)}°`}
                  unit={mode === "direction" && heading !== null ? `${formatCourse(windDirVal)} vs ${formatCourse(heading)}` : "off the nose"}
                  color="oklch(0.75 0.15 230)"
                />
              </div>

              {isTailwind && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "oklch(0.75 0.15 15)" }}>
                    <span className="font-semibold">Tailwind:</span> the wind is more than 90° off the {refName}.
                    {refName === "runway" && " Consider the opposite runway direction."}
                  </p>
                </div>
              )}

              {/* Chart */}
              <div className="mb-6 p-4 rounded-xl bg-slate-900/40 border border-gray-700">
                <h3
                  className="text-sm font-semibold mb-1 uppercase tracking-wide"
                  style={{ color: "oklch(0.65 0.15 230)" }}
                >
                  Wind Component Chart
                </h3>
                <p className="text-xs mb-3" style={{ color: "oklch(0.65 0.02 240)" }}>
                  Follow the <strong style={{ color: "oklch(0.75 0.15 230)" }}>{results.angle.toFixed(0)}° line</strong> out to
                  the <strong style={{ color: "oklch(0.75 0.15 230)" }}>{windSpeedVal} kt arc</strong>, then read{" "}
                  <strong style={{ color: isTailwind ? "#ef4444" : "#22c55e" }}>
                    {isTailwind ? "tailwind" : "headwind"} on the left axis
                  </strong>{" "}
                  and <strong style={{ color: "#f59e0b" }}>crosswind on the bottom axis</strong>.
                </p>
                <p className="text-xs mb-3" style={{ color: "oklch(0.55 0.02 240)" }}>
                  ✋ Drag the blue point (or click anywhere) to change the wind, or drag the green/orange markers to change
                  one component while keeping the other.
                </p>
                <WindComponentsChart
                  angle={results.angle}
                  windSpeed={windSpeedVal}
                  headwind={results.headwind}
                  crosswind={results.crosswind}
                  onChange={handleChartChange}
                />
              </div>

              <ShareButton
                shareData={{
                  title: "José's Wind Components Calculator",
                  text: `${problemText} → ${resultText}`,
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
                  <div
                    className="mt-4 p-4 rounded-xl bg-slate-900/40 border border-gray-700 text-sm space-y-3"
                    style={{ color: "oklch(0.75 0.02 240)" }}
                  >
                    <ol className="list-decimal list-inside space-y-2">
                      {mode === "direction" && heading !== null && (
                        <li>
                          Angle between wind and {refName}: |{formatCourse(windDirVal)} − {formatCourse(heading)}| ={" "}
                          <strong className="text-white">{results.angle.toFixed(0)}°</strong>
                        </li>
                      )}
                      <li>
                        {isTailwind ? "Tailwind" : "Headwind"} = {windSpeedVal} × cos {results.angle.toFixed(0)}° ={" "}
                        {windSpeedVal} × {Math.cos((results.angle * Math.PI) / 180).toFixed(3)} ={" "}
                        <strong className="text-white">{Math.abs(results.headwind).toFixed(1)} kt</strong>
                      </li>
                      <li>
                        Crosswind = {windSpeedVal} × sin {results.angle.toFixed(0)}° = {windSpeedVal} ×{" "}
                        {Math.sin((results.angle * Math.PI) / 180).toFixed(3)} ={" "}
                        <strong className="text-white">{results.crosswind.toFixed(1)} kt</strong>
                      </li>
                    </ol>
                    <p className="text-xs" style={{ color: "oklch(0.65 0.02 240)" }}>
                      <span className="font-semibold">Rule of thumb (clock method):</span> crosswind ≈ wind speed × the
                      angle as a fraction of an hour — 15° ≈ ¼, 30° ≈ ½, 45° ≈ ¾, 60° or more ≈ all of it.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Note */}
          <div className="mt-6 p-4 rounded-xl bg-slate-900/30 border border-gray-700">
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "oklch(0.6 0.02 240)" }}>
              <span className="font-semibold">Note:</span>{" "}Use the same reference for both directions. In flight,
              winds aloft are true, so compare them with your true heading. Runway numbers are magnetic headings
              rounded to 10°, and tower/ATIS winds are magnetic while METAR/TAF winds are true. For takeoff and
              landing, check the crosswind against your aircraft&apos;s maximum demonstrated crosswind.
            </p>
          </div>
        </div>
      </main>

      <Footer description="Headwind = V × cos(angle), crosswind = V × sin(angle)" />
    </PageLayout>
  );
}

function ValidationWarning({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
      <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "oklch(0.75 0.15 15)" }}>
        <span className="font-semibold">⚠️ </span>
        {children}
      </p>
    </div>
  );
}

function ResultCard({
  title,
  tooltip,
  value,
  unit,
  color,
}: {
  title: string;
  tooltip: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div className="p-6 rounded-xl text-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
      <div className="flex items-center justify-center mb-2">
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color }}>
          {title}
        </p>
        <Tooltip content={tooltip} />
      </div>
      <p className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: "white" }}>
        {value}
      </p>
      <p className="text-sm" style={{ color: "oklch(0.6 0.02 240)" }}>
        {unit}
      </p>
    </div>
  );
}
