"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Tooltip } from "../components/Tooltip";
import { PageLayout } from "../components/PageLayout";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { calculateTAS } from "@/lib/tasCalculations";

function Calculator() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [cas, setCas] = useState<string>(searchParams.get("cas") || "90");
  const [oat, setOat] = useState<string>(searchParams.get("oat") || "8");
  const [altitude, setAltitude] = useState<string>(searchParams.get("alt") || "4000");
  const [shareSuccess, setShareSuccess] = useState(false);

  // Update URL when parameters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (cas) params.set("cas", cas);
    if (oat) params.set("oat", oat);
    if (altitude) params.set("alt", altitude);

    router.replace(`?${params.toString()}`, { scroll: false });
  }, [cas, oat, altitude, router]);

  // Calculate TAS during render (not in useEffect to avoid cascading renders)
  const casVal = parseFloat(cas);
  const oatVal = parseFloat(oat);
  const altVal = parseFloat(altitude);

  const tas =
    !isNaN(casVal) && !isNaN(oatVal) && !isNaN(altVal)
      ? calculateTAS(casVal, oatVal, altVal)
      : null;

  // Share function
  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: "José's TAS Calculator",
      text: `CAS: ${cas} kt, OAT: ${oat}°C, Alt: ${altitude} ft → TAS: ${tas?.toFixed(2)} kt`,
      url: url,
    };

    try {
      if (navigator.share) {
        // Use Web Share API on mobile
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(url);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      }
    } catch (err) {
      // User cancelled or error occurred
      console.log("Share cancelled or failed");
    }
  };

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
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </div>
          <h1
            className="text-4xl sm:text-5xl font-bold"
            style={{ color: "white" }}
          >
            José's TAS Calculator
          </h1>
        </div>
        <p
          className="text-base sm:text-lg mb-4"
          style={{ color: "oklch(0.58 0.02 240)" }}
        >
          Calculate True Airspeed from Calibrated Airspeed
        </p>
        <Navigation currentPage="tas" />
      </div>

      <main className="w-full max-w-3xl">
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
              <div className="p-8 sm:p-10 rounded-xl text-center mb-6 bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
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
              <div className="text-center mb-6">
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:brightness-110 active:scale-95 cursor-pointer"
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
            </>
          )}

          {/* Note */}
          <div className="p-4 rounded-xl bg-slate-900/30 border border-gray-700">
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

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <Calculator />
    </Suspense>
  );
}
