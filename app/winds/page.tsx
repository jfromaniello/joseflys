"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Tooltip } from "../components/Tooltip";

interface WindCalculations {
  crosswind: number;
  headwind: number;
  windCorrectionAngle: number;
  compassHeading: number;
  groundSpeed: number;
  etas?: number;
}

function calculateWinds(
  windDir: number,
  windSpeed: number,
  trueHeading: number,
  tas: number,
  magDev: number
): WindCalculations {
  // Convert to radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  // Normalize angles to 0-360
  const normalize = (angle: number) => ((angle % 360) + 360) % 360;

  windDir = normalize(windDir);
  trueHeading = normalize(trueHeading);

  // Relative wind angle (angle between wind direction and heading)
  const relativeWind = toRad(windDir - trueHeading);

  // Crosswind component (positive = wind from right)
  const crosswind = windSpeed * Math.sin(relativeWind);

  // Headwind component (positive = headwind, negative = tailwind)
  const headwind = -windSpeed * Math.cos(relativeWind);

  // Wind correction angle using arcsin formula
  const wcaRad = Math.asin((windSpeed * Math.sin(relativeWind)) / tas);
  const windCorrectionAngle = toDeg(wcaRad);

  // ETAS (Effective True Air Speed) - used when WCA > 10°
  let etas: number | undefined;
  let effectiveSpeed = tas;
  if (Math.abs(windCorrectionAngle) > 10) {
    etas = tas * Math.cos(wcaRad);
    effectiveSpeed = etas; // Use ETAS for GS calculation when WCA > 10°
  }

  // Ground speed using law of cosines with effective speed
  // GS² = EffectiveSpeed² + WS² - 2·EffectiveSpeed·WS·cos(relative wind angle)
  const gsSquared =
    effectiveSpeed * effectiveSpeed +
    windSpeed * windSpeed -
    2 * effectiveSpeed * windSpeed * Math.cos(relativeWind);
  const groundSpeed = Math.sqrt(Math.max(0, gsSquared));

  // Compass heading = True heading + WCA - Magnetic deviation
  const compassHeading = normalize(trueHeading + windCorrectionAngle - magDev);

  return {
    crosswind,
    headwind,
    windCorrectionAngle,
    compassHeading,
    groundSpeed,
    etas,
  };
}

function WindCalculator() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [windDir, setWindDir] = useState<string>(
    searchParams.get("wd") || "270"
  );
  const [windSpeed, setWindSpeed] = useState<string>(
    searchParams.get("ws") || "20"
  );
  const [trueHeading, setTrueHeading] = useState<string>(
    searchParams.get("th") || "360"
  );
  const [tas, setTas] = useState<string>(searchParams.get("tas") || "100");
  const [magDev, setMagDev] = useState<string>(searchParams.get("md") || "0");
  const [results, setResults] = useState<WindCalculations | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Update URL when parameters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (windDir) params.set("wd", windDir);
    if (windSpeed) params.set("ws", windSpeed);
    if (trueHeading) params.set("th", trueHeading);
    if (tas) params.set("tas", tas);
    if (magDev) params.set("md", magDev);

    router.replace(`?${params.toString()}`, { scroll: false });
  }, [windDir, windSpeed, trueHeading, tas, magDev, router]);

  // Calculate results
  useEffect(() => {
    const wd = parseFloat(windDir);
    const ws = parseFloat(windSpeed);
    const th = parseFloat(trueHeading);
    const tasVal = parseFloat(tas);
    const md = parseFloat(magDev);

    if (
      !isNaN(wd) &&
      !isNaN(ws) &&
      !isNaN(th) &&
      !isNaN(tasVal) &&
      !isNaN(md) &&
      tasVal > 0
    ) {
      const calc = calculateWinds(wd, ws, th, tasVal, md);
      setResults(calc);
    } else {
      setResults(null);
    }
  }, [windDir, windSpeed, trueHeading, tas, magDev]);

  // Share function
  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: "José's Wind Calculator",
      text: `Wind: ${windDir}° at ${windSpeed} kt, Heading: ${trueHeading}° → GS: ${results?.groundSpeed.toFixed(1)} kt`,
      url: url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      }
    } catch (err) {
      console.log("Share cancelled or failed");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
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
            José's Wind Calculator
          </h1>
        </div>
        <p
          className="text-base sm:text-lg mb-4"
          style={{ color: "oklch(0.58 0.02 240)" }}
        >
          Calculate wind correction and ground speed
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm transition-colors hover:brightness-125"
            style={{ color: "oklch(0.65 0.15 230)" }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Home
          </Link>
          <span style={{ color: "oklch(0.4 0.02 240)" }}>•</span>
          <Link
            href="/tas"
            className="inline-flex items-center gap-2 text-sm transition-colors hover:brightness-125"
            style={{ color: "oklch(0.65 0.15 230)" }}
          >
            TAS Calculator
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </Link>
        </div>
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
              </div>
            </div>
          </div>

          {/* Results */}
          {results !== null && (
            <div className="space-y-4">
              {/* Primary Results */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Ground Speed */}
                <div className="p-6 rounded-xl text-center bg-gradient-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
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
                <div className="p-6 rounded-xl text-center bg-gradient-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
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
              <div className={`grid grid-cols-1 gap-4 ${results.etas ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
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

                {/* ETAS - only shown when WCA > 10° */}
                {results.etas && (
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-amber-500/50">
                    <div className="flex items-center justify-center mb-1">
                      <p
                        className="text-xs font-medium"
                        style={{ color: "oklch(0.75 0.15 60)" }}
                      >
                        ETAS
                      </p>
                      <Tooltip content="Effective True Air Speed - Your actual effective forward speed when flying at a large crab angle. ETAS = TAS × cos(WCA). Only shown when wind correction angle exceeds 10° for more accurate ground speed calculations." />
                    </div>
                    <p className="text-2xl font-bold" style={{ color: "white" }}>
                      {results.etas.toFixed(1)} kt
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "oklch(0.6 0.02 240)" }}
                    >
                      effective TAS
                    </p>
                  </div>
                )}

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

              {/* Share Button */}
              <div className="text-center pt-2">
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:brightness-110 active:scale-95"
                  style={{
                    backgroundColor: "oklch(0.65 0.15 230)",
                    color: "oklch(0.145 0.02 240)",
                  }}
                >
                  {shareSuccess ? (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                        />
                      </svg>
                      Share Result
                    </>
                  )}
                </button>
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

        {/* Footer */}
        <div className="text-center mt-8">
          <p
            className="text-sm mb-3"
            style={{ color: "oklch(0.52 0.015 240)" }}
          >
            Aviation calculations based on wind triangle principles
          </p>
          <div className="flex items-center justify-center gap-2 text-sm">
            <span style={{ color: "oklch(0.52 0.015 240)" }}>
              Feedback or kudos?
            </span>
            <a
              href="https://twitter.com/jfroma"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:brightness-125"
              style={{ color: "oklch(0.65 0.15 230)" }}
            >
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              @jfroma
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function WindsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <WindCalculator />
    </Suspense>
  );
}
