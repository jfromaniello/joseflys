"use client";

import { useState, useEffect } from "react";
import { Tooltip } from "../components/Tooltip";
import { PageLayout } from "../components/PageLayout";
import { Footer } from "../components/Footer";
import { ShareButton } from "../components/ShareButton";
import { calculateTAS } from "@/lib/tasCalculations";

interface TASCalculatorClientProps {
  initialCas: string;
  initialOat: string;
  initialAlt: string;
}

export function TASCalculatorClient({
  initialCas,
  initialOat,
  initialAlt,
}: TASCalculatorClientProps) {
  const [cas, setCas] = useState<string>(initialCas);
  const [oat, setOat] = useState<string>(initialOat);
  const [altitude, setAltitude] = useState<string>(initialAlt);

  // Update URL when parameters change (client-side only, no page reload)
  useEffect(() => {
    const params = new URLSearchParams();
    if (cas) params.set("cas", cas);
    if (oat) params.set("oat", oat);
    if (altitude) params.set("alt", altitude);

    // Use window.history.replaceState instead of router.replace to avoid server requests
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [cas, oat, altitude]);

  // Calculate TAS during render (not in useEffect to avoid cascading renders)
  const casVal = parseFloat(cas);
  const oatVal = parseFloat(oat);
  const altVal = parseFloat(altitude);

  const tas =
    !isNaN(casVal) && !isNaN(oatVal) && !isNaN(altVal)
      ? calculateTAS(casVal, oatVal, altVal)
      : null;

  // Build OG image URL for download and share URL
  const hasParams = cas || oat || altitude;
  const ogImageUrl = hasParams
    ? `/api/og-tas?cas=${cas}&oat=${oat}&alt=${altitude}`
    : undefined;

  // Build share URL with current parameters
  const shareUrl = (() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams();
    if (cas) params.set("cas", cas);
    if (oat) params.set("oat", oat);
    if (altitude) params.set("alt", altitude);
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  })();

  return (
    <PageLayout currentPage="tas">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <p
          className="text-base sm:text-lg"
          style={{ color: "oklch(0.58 0.02 240)" }}
        >
          Calculate True Airspeed from Calibrated Airspeed
        </p>
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
            <p
              className="text-sm"
              style={{ color: "oklch(0.58 0.02 240)" }}
            >
              Enter your flight data to calculate True Airspeed
            </p>
          </div>

          {/* Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
            {/* CAS Input */}
            <div>
              <label
                className="flex items-center text-sm font-medium mb-2"
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
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
                  placeholder="90"
                />
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                  style={{ color: "oklch(0.55 0.02 240)" }}
                >
                  kt
                </span>
              </div>
            </div>

            {/* OAT Input */}
            <div>
              <label
                className="flex items-center text-sm font-medium mb-2"
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
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
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

            {/* Altitude Input */}
            <div>
              <label
                className="flex items-center text-sm font-medium mb-2"
                style={{ color: "oklch(0.72 0.015 240)" }}
              >
                Pressure Altitude
                <Tooltip content="Altitude above standard pressure (29.92 inHg). Set your altimeter to 29.92 and read the indicated altitude. This represents your height in the standard atmosphere model." />
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={altitude}
                  onChange={(e) => setAltitude(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
                  placeholder="4000"
                />
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                  style={{ color: "oklch(0.55 0.02 240)" }}
                >
                  ft
                </span>
              </div>
            </div>
          </div>

          {/* Result */}
          {tas !== null && (
            <>
              <div className="p-6 sm:p-8 rounded-xl text-center mb-6 bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
                <div className="flex items-center justify-center mb-3">
                  <p
                    className="text-sm sm:text-base font-semibold uppercase tracking-wider"
                    style={{ color: "oklch(0.65 0.15 230)" }}
                  >
                    True Airspeed
                  </p>
                  <Tooltip content="True Airspeed (TAS) is your actual speed through the air mass, corrected for altitude and temperature. This is faster than your indicated airspeed due to lower air density at altitude. Use TAS for flight planning, fuel calculations, and navigation." />
                </div>
                <p
                  className="text-5xl sm:text-6xl md:text-7xl font-bold mb-2"
                  style={{ color: "white" }}
                >
                  {tas.toFixed(2)}
                </p>
                <p
                  className="text-lg sm:text-xl"
                  style={{ color: "oklch(0.6 0.02 240)" }}
                >
                  knots
                </p>
              </div>

              {/* Share Button */}
              <ShareButton
                shareData={{
                  title: "José's TAS Calculator",
                  text: `CAS: ${cas} kt, OAT: ${oat}°C, Alt: ${altitude} ft → TAS: ${tas?.toFixed(2)} kt`,
                  url: shareUrl,
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
              the International Standard Atmosphere (ISA) model for pressure
              calculations and accounts for actual temperature to determine air
              density.
            </p>
          </div>
        </div>

      </main>

      <Footer description="Aviation calculations based on ISA standard atmosphere" />
    </PageLayout>
  );
}
