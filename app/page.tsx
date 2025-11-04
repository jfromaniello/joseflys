"use client";

import Link from "next/link";
import { PageLayout } from "./components/PageLayout";
import { Footer } from "./components/Footer";

export default function Home() {
  return (
    <PageLayout>
      {/* Header */}
      <div className="text-center mb-12 sm:mb-16">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-slate-800/50 backdrop-blur-sm border border-gray-700">
            <svg
              className="w-12 h-12"
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
          <h1 className="text-5xl sm:text-6xl font-bold" style={{ color: "white" }}>
            José&apos;s Aviation Calculators
          </h1>
        </div>
        <p
          className="text-lg sm:text-xl"
          style={{ color: "oklch(0.58 0.02 240)" }}
        >
          Experimental flight planning tools
        </p>
      </div>

      {/* Calculator Cards */}
      <main className="w-full max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* TAS Calculator Card */}
          <Link
            href="/tas"
            className="group block p-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border-2 border-gray-700 hover:border-sky-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30 group-hover:border-sky-500/50 transition-colors">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="oklch(0.65 0.15 230)"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2" style={{ color: "white" }}>
                  TAS Calculator
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "oklch(0.65 0.02 240)" }}
                >
                  Calculate True Airspeed from Calibrated Airspeed, Outside Air
                  Temperature, and Pressure Altitude using the ISA model
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "oklch(0.65 0.15 230)" }}>
              Open Calculator
              <svg
                className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </div>
          </Link>

          {/* Wind Calculator Card */}
          <Link
            href="/winds"
            className="group block p-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border-2 border-gray-700 hover:border-sky-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30 group-hover:border-sky-500/50 transition-colors">
                <svg
                  className="w-8 h-8"
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
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2" style={{ color: "white" }}>
                  Wind Calculator
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "oklch(0.65 0.02 240)" }}
                >
                  Calculate wind correction angle, ground speed, compass heading,
                  and wind components for accurate flight planning
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "oklch(0.65 0.15 230)" }}>
              Open Calculator
              <svg
                className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </div>
          </Link>

          {/* Unit Converter Card */}
          <Link
            href="/conversions"
            className="group block p-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border-2 border-gray-700 hover:border-sky-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30 group-hover:border-sky-500/50 transition-colors">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="oklch(0.65 0.15 230)"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2" style={{ color: "white" }}>
                  Unit Converter
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "oklch(0.65 0.02 240)" }}
                >
                  Convert aviation units including distances, speeds, fuel volumes,
                  temperatures, weight, and pressure. Inspired by the Jeppesen CR-3
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "oklch(0.65 0.15 230)" }}>
              Open Calculator
              <svg
                className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </div>
          </Link>
        </div>

        {/* Info Box */}
        <div className="mt-12 p-6 rounded-xl bg-slate-900/30 border border-gray-700">
          <p
            className="text-sm text-center leading-relaxed"
            style={{ color: "oklch(0.6 0.02 240)" }}
          >
            Experimental aviation calculators based on ISA standard atmosphere and
            wind triangle principles. All calculations are performed client-side
            for instant results.
          </p>
        </div>
      </main>

      <Footer description="Experimental aviation calculators for TAS, wind correction, and flight planning" />
    </PageLayout>
  );
}
