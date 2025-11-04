"use client";

import { useState, useEffect } from "react";
import { Tooltip } from "../components/Tooltip";
import { PageLayout } from "../components/PageLayout";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { ShareButton } from "../components/ShareButton";
import { calculateWinds } from "@/lib/windCalculations";

interface WindCalculatorClientProps {
  initialWd: string;
  initialWs: string;
  initialTh: string;
  initialTas: string;
  initialMd: string;
  initialDist: string;
  initialFf: string;
}

export function WindCalculatorClient({
  initialWd,
  initialWs,
  initialTh,
  initialTas,
  initialMd,
  initialDist,
  initialFf,
}: WindCalculatorClientProps) {
  const [windDir, setWindDir] = useState<string>(initialWd);
  const [windSpeed, setWindSpeed] = useState<string>(initialWs);
  const [trueHeading, setTrueHeading] = useState<string>(initialTh);
  const [tas, setTas] = useState<string>(initialTas);
  const [magDev, setMagDev] = useState<string>(initialMd);
  const [distance, setDistance] = useState<string>(initialDist);
  const [fuelFlow, setFuelFlow] = useState<string>(initialFf);

  // Update URL when parameters change (client-side only, no page reload)
  useEffect(() => {
    const params = new URLSearchParams();
    if (windDir) params.set("wd", windDir);
    if (windSpeed) params.set("ws", windSpeed);
    if (trueHeading) params.set("th", trueHeading);
    if (tas) params.set("tas", tas);
    if (magDev) params.set("md", magDev);
    if (distance) params.set("dist", distance);
    if (fuelFlow) params.set("ff", fuelFlow);

    // Use window.history.replaceState instead of router.replace to avoid server requests
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [windDir, windSpeed, trueHeading, tas, magDev, distance, fuelFlow]);

  // Calculate results during render (not in useEffect to avoid cascading renders)
  const wd = parseFloat(windDir);
  const ws = parseFloat(windSpeed);
  const th = parseFloat(trueHeading);
  const tasVal = parseFloat(tas);
  const md = parseFloat(magDev);
  const dist = distance ? parseFloat(distance) : undefined;
  const ff = fuelFlow ? parseFloat(fuelFlow) : undefined;

  const results =
    !isNaN(wd) &&
    !isNaN(ws) &&
    !isNaN(th) &&
    !isNaN(tasVal) &&
    !isNaN(md) &&
    tasVal > 0
      ? calculateWinds(wd, ws, th, tasVal, md, dist, ff)
      : null;

  return (
    <PageLayout>
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="flex items-center justify-center gap-4 mb-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-slate-800/50 backdrop-blur-sm border border-gray-700">
            <svg
              className="w-9 h-9"
              fill="none"
              stroke="oklch(0.65 0.15 230)"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold" style={{ color: "white" }}>
            José&apos;s Wind Calculator
          </h1>
        </div>
        <p
          className="text-base sm:text-lg mb-4"
          style={{ color: "oklch(0.58 0.02 240)" }}
        >
          Calculate wind correction and ground speed
        </p>
        <Navigation currentPage="winds" />
      </div>

      <main className="w-full max-w-4xl">
        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">
          {/* Section Header */}
          <div className="mb-6 pb-6 border-b border-gray-700">
            <h2
              className="text-xl sm:text-2xl font-bold mb-2"
              style={{ color: "white" }}
            >
              Flight Parameters
            </h2>
            <p className="text-sm" style={{ color: "oklch(0.58 0.02 240)" }}>
              Enter wind and heading data to calculate corrections
            </p>
          </div>

          {/* Input Fields - Grouped */}
          <div className="space-y-6 mb-8">
            {/* Wind Parameters Group */}
            <div>
              <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
                Wind Conditions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Wind Direction */}
                <div>
                  <label
                    className="flex items-center text-sm font-medium mb-2"
                    style={{ color: "oklch(0.72 0.015 240)" }}
                  >
                    Wind Direction
                    <Tooltip content="The direction the wind is coming FROM in degrees (0-360). For example, 270° means wind from the west. Use METAR or ATIS wind reports." />
                  </label>
              <div className="relative">
                <input
                  type="number"
                  value={windDir}
                  onChange={(e) => setWindDir(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
                  placeholder="270"
                  min="0"
                  max="360"
                />
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                  style={{ color: "oklch(0.55 0.02 240)" }}
                >
                  °
                </span>
              </div>
            </div>

                {/* Wind Speed */}
                <div>
                  <label
                    className="flex items-center text-sm font-medium mb-2"
                    style={{ color: "oklch(0.72 0.015 240)" }}
                  >
                    Wind Speed
                    <Tooltip content="The wind speed in knots. This is the second part of a wind report (e.g., '270/20' means 20 knots from 270°)." />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={windSpeed}
                      onChange={(e) => setWindSpeed(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
                      placeholder="20"
                    />
                    <span
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                      style={{ color: "oklch(0.55 0.02 240)" }}
                    >
                      kt
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Course Parameters Group */}
            <div>
              <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
                Course Parameters
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* True Heading */}
                <div>
                  <label
                    className="flex items-center text-sm font-medium mb-2"
                    style={{ color: "oklch(0.72 0.015 240)" }}
                  >
                    True Heading
                    <Tooltip content="Your desired track or course over the ground in true degrees (0-360). This is the direction you want to fly, not accounting for wind drift." />
                  </label>
              <div className="relative">
                <input
                  type="number"
                  value={trueHeading}
                  onChange={(e) => setTrueHeading(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
                  placeholder="360"
                  min="0"
                  max="360"
                />
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                  style={{ color: "oklch(0.55 0.02 240)" }}
                >
                  °
                </span>
              </div>
            </div>

                {/* True Airspeed */}
                <div>
                  <label
                    className="flex items-center text-sm font-medium mb-2"
                    style={{ color: "oklch(0.72 0.015 240)" }}
                  >
                    True Airspeed
                    <Tooltip content="Your aircraft's actual speed through the air mass in knots. Use the TAS Calculator if you only have CAS, OAT, and altitude." />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={tas}
                      onChange={(e) => setTas(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
                      placeholder="100"
                    />
                    <span
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                      style={{ color: "oklch(0.55 0.02 240)" }}
                    >
                      kt
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Optional Parameters Group */}
            <div>
              <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
                Optional Parameters
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Magnetic Deviation */}
                <div>
                  <label
                    className="flex items-center text-sm font-medium mb-2"
                    style={{ color: "oklch(0.72 0.015 240)" }}
                  >
                    Magnetic Deviation
                    <Tooltip content="Local magnetic variation (east or west) in degrees. Found on aviation charts. Positive for east, negative for west. Defaults to 0 if unknown." />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={magDev}
                      onChange={(e) => setMagDev(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
                      placeholder="0"
                    />
                    <span
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                      style={{ color: "oklch(0.55 0.02 240)" }}
                    >
                      °
                    </span>
                  </div>
                </div>

                {/* Distance */}
                <div>
                  <label
                    className="flex items-center text-sm font-medium mb-2"
                    style={{ color: "oklch(0.72 0.015 240)" }}
                  >
                    Distance
                    <Tooltip content="Flight distance in nautical miles. When provided, this calculator will compute your Estimated Time of Arrival (ETA). Add Fuel Flow to also calculate total fuel consumption." />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
                      placeholder="Optional"
                    />
                    <span
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                      style={{ color: "oklch(0.55 0.02 240)" }}
                    >
                      NM
                    </span>
                  </div>
                </div>

                {/* Fuel Flow */}
                <div>
                  <label
                    className="flex items-center text-sm font-medium mb-2"
                    style={{ color: "oklch(0.72 0.015 240)" }}
                  >
                    Fuel Flow
                    <Tooltip content="Your aircraft's fuel consumption rate per hour (e.g., 8.5 gal/hr, 32 L/hr, or 24 kg/hr). The unit doesn't matter - fuel used will be in the same units. Find this in your POH or flight manual." />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={fuelFlow}
                      onChange={(e) => setFuelFlow(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
                      placeholder="Optional"
                    />
                    <span
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                      style={{ color: "oklch(0.55 0.02 240)" }}
                    >
                      units/hr
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          {results !== null && (
            <div className="space-y-4">
              {/* Primary Results */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Ground Speed */}
                <div className="p-6 rounded-xl text-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
                  <div className="flex items-center justify-center mb-2">
                    <p
                      className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                      style={{ color: "oklch(0.65 0.15 230)" }}
                    >
                      Ground Speed
                    </p>
                    <Tooltip content="Ground Speed (GS) is your actual speed over the ground, accounting for wind. This is what determines your actual time en route. When WCA > 10°, GS is calculated using ETAS for improved accuracy." />
                  </div>
                  <p
                    className="text-3xl sm:text-4xl font-bold"
                    style={{ color: "white" }}
                  >
                    {results.groundSpeed.toFixed(1)}
                  </p>
                  <p
                    className="text-sm mt-1"
                    style={{ color: "oklch(0.6 0.02 240)" }}
                  >
                    knots
                  </p>
                </div>

                {/* Compass Heading */}
                <div className="p-6 rounded-xl text-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
                  <div className="flex items-center justify-center mb-2">
                    <p
                      className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                      style={{ color: "oklch(0.65 0.15 230)" }}
                    >
                      Compass Heading
                    </p>
                    <Tooltip content="The magnetic heading you should fly on your compass to maintain your desired track. This includes wind correction angle and magnetic variation. This is the heading to set in your cockpit." />
                  </div>
                  <p
                    className="text-3xl sm:text-4xl font-bold"
                    style={{ color: "white" }}
                  >
                    {results.compassHeading.toFixed(1)}°
                  </p>
                  <p
                    className="text-sm mt-1"
                    style={{ color: "oklch(0.6 0.02 240)" }}
                  >
                    magnetic
                  </p>
                </div>
              </div>

              {/* Secondary Results */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Wind Correction Angle */}
                <div className="p-4 rounded-xl bg-slate-900/50 border border-gray-600">
                  <div className="flex items-center justify-center mb-1">
                    <p
                      className="text-xs font-medium"
                      style={{ color: "oklch(0.65 0.15 230)" }}
                    >
                      Wind Correction Angle
                    </p>
                    <Tooltip content="The angle you need to adjust your heading to compensate for wind drift. Positive (+) means turn right, negative (-) means turn left from your true heading. When WCA exceeds 10°, ETAS is used for more accurate calculations." />
                  </div>
                  <p className="text-2xl font-bold" style={{ color: "white" }}>
                    {results.windCorrectionAngle >= 0 ? "+" : ""}
                    {results.windCorrectionAngle.toFixed(1)}°
                  </p>
                </div>

                {/* ETAS - always shown, active when WCA > 10° */}
                <div className={`p-4 rounded-xl ${results.etas ? 'bg-slate-900/50 border-amber-500/50' : 'bg-slate-900/30 border-gray-700'} border`}>
                  <div className="flex items-center justify-center mb-1">
                    <p
                      className="text-xs font-medium"
                      style={{ color: results.etas ? "oklch(0.75 0.15 60)" : "oklch(0.45 0.02 240)" }}
                    >
                      ETAS
                    </p>
                    <Tooltip content="Effective True Air Speed - Your actual effective forward speed when flying at a large crab angle. ETAS = TAS × cos(WCA). Only calculated when wind correction angle exceeds 10° for more accurate ground speed calculations." />
                  </div>
                  <p className="text-2xl font-bold" style={{ color: results.etas ? "white" : "oklch(0.35 0.02 240)" }}>
                    {results.etas ? `${results.etas.toFixed(1)} kt` : '—'}
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "oklch(0.45 0.02 240)" }}
                  >
                    {results.etas ? 'effective TAS' : 'WCA ≤ 10°'}
                  </p>
                </div>

                {/* Crosswind */}
                <div className="p-4 rounded-xl bg-slate-900/50 border border-gray-600">
                  <div className="flex items-center justify-center mb-1">
                    <p
                      className="text-xs font-medium"
                      style={{ color: "oklch(0.65 0.15 230)" }}
                    >
                      Crosswind
                    </p>
                    <Tooltip content="The component of wind blowing perpendicular to your flight path. Important for runway selection and landing planning. 'From right' means wind from your right, 'from left' means wind from your left." />
                  </div>
                  <p className="text-2xl font-bold" style={{ color: "white" }}>
                    {Math.abs(results.crosswind).toFixed(1)} kt
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "oklch(0.6 0.02 240)" }}
                  >
                    {results.crosswind > 0 ? "from right" : results.crosswind < 0 ? "from left" : "none"}
                  </p>
                </div>

                {/* Headwind/Tailwind */}
                <div className="p-4 rounded-xl bg-slate-900/50 border border-gray-600">
                  <div className="flex items-center justify-center mb-1">
                    <p
                      className="text-xs font-medium"
                      style={{ color: "oklch(0.65 0.15 230)" }}
                    >
                      {results.headwind >= 0 ? "Headwind" : "Tailwind"}
                    </p>
                    <Tooltip content="The component of wind blowing along your flight path. Headwind slows you down (increases flight time), tailwind speeds you up (decreases flight time). This directly affects your ground speed." />
                  </div>
                  <p className="text-2xl font-bold" style={{ color: "white" }}>
                    {Math.abs(results.headwind).toFixed(1)} kt
                  </p>
                </div>
              </div>

              {/* ETA and Fuel Results - always shown, active when inputs provided */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* ETA */}
                <div className={`p-6 rounded-xl text-center ${results.eta !== undefined ? 'bg-linear-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/30' : 'bg-slate-900/30 border-gray-700'} border`}>
                  <div className="flex items-center justify-center mb-2">
                    <p
                      className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                      style={{ color: results.eta !== undefined ? "oklch(0.7 0.15 150)" : "oklch(0.45 0.02 240)" }}
                    >
                      ETA
                    </p>
                    <Tooltip content="Estimated Time of Arrival based on your ground speed and distance. Displayed in hours and minutes format (e.g., 1:30 means 1 hour and 30 minutes). Accounts for wind effects on your ground speed. Requires Distance input." />
                  </div>
                  <p
                    className="text-3xl sm:text-4xl font-bold"
                    style={{ color: results.eta !== undefined ? "white" : "oklch(0.35 0.02 240)" }}
                  >
                    {results.eta !== undefined
                      ? `${Math.floor(results.eta)}:${String(Math.round((results.eta % 1) * 60)).padStart(2, '0')}`
                      : '—'}
                  </p>
                  <p
                    className="text-sm mt-1"
                    style={{ color: "oklch(0.45 0.02 240)" }}
                  >
                    {results.eta !== undefined ? 'hours' : 'enter distance'}
                  </p>
                </div>

                {/* Fuel Used */}
                <div className={`p-6 rounded-xl text-center ${results.fuelUsed !== undefined ? 'bg-linear-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/30' : 'bg-slate-900/30 border-gray-700'} border`}>
                  <div className="flex items-center justify-center mb-2">
                    <p
                      className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                      style={{ color: results.fuelUsed !== undefined ? "oklch(0.7 0.15 150)" : "oklch(0.45 0.02 240)" }}
                    >
                      Fuel Used
                    </p>
                    <Tooltip content="Estimated fuel consumption for this leg based on your fuel flow rate and flight time. Units match your fuel flow input (gallons, liters, kg, etc.). Always add reserves as required by regulations! Requires Distance and Fuel Flow inputs." />
                  </div>
                  <p
                    className="text-3xl sm:text-4xl font-bold"
                    style={{ color: results.fuelUsed !== undefined ? "white" : "oklch(0.35 0.02 240)" }}
                  >
                    {results.fuelUsed !== undefined ? results.fuelUsed.toFixed(1) : '—'}
                  </p>
                  <p
                    className="text-sm mt-1"
                    style={{ color: "oklch(0.45 0.02 240)" }}
                  >
                    {results.fuelUsed !== undefined ? 'units' : 'enter dist & FF'}
                  </p>
                </div>
              </div>

              {/* Share Button */}
              <div className="pt-2">
                <ShareButton
                  shareData={{
                    title: "José's Wind Calculator",
                    text: `Wind: ${windDir}° at ${windSpeed} kt, Heading: ${trueHeading}° → GS: ${results?.groundSpeed.toFixed(1)} kt`,
                    url: typeof window !== "undefined" ? window.location.href : "",
                  }}
                />
              </div>
            </div>
          )}

          {/* Note */}
          <div className="mt-6 p-4 rounded-xl bg-slate-900/30 border border-gray-700">
            <p
              className="text-xs sm:text-sm leading-relaxed"
              style={{ color: "oklch(0.6 0.02 240)" }}
            >
              <span className="font-semibold">Note:</span> This calculator uses
              standard aviation wind triangle formulas. Wind direction is where
              the wind is coming FROM. Positive WCA means turn right, negative
              means turn left. {" "}
              <span className="font-semibold">ETAS (Effective True Air Speed)</span> is
              shown when WCA exceeds 10° to account for the reduced effective forward
              speed when crabbing at large angles.
            </p>
          </div>
        </div>

      </main>

      <Footer description="Aviation calculations based on wind triangle principles" />
    </PageLayout>
  );
}
