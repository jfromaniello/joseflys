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
          {/* Course Calculator Card */}
          <Link
            href="/course"
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
                  Course Calculator
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "oklch(0.65 0.02 240)" }}
                >
                  Calculate true course, wind correction angle, ground speed,
                  and compass heading for accurate navigation
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

          {/* Distance Calculator Card */}
          <Link
            href="/distance"
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
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2" style={{ color: "white" }}>
                  Distance Calculator
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "oklch(0.65 0.02 240)" }}
                >
                  Calculate precise distances and bearings between coordinates
                  using WGS-84 geodesic algorithms for high-precision navigation
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

          {/* Flight Planning Card */}
          <Link
            href="/planning"
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
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2" style={{ color: "white" }}>
                  Flight Planning
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "oklch(0.65 0.02 240)" }}
                >
                  Calculate time, speed, distance and fuel consumption. Solve any
                  flight planning problem by entering two known values
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
            Experimental aviation calculators based on ISA standard atmosphere,
            WGS-84 geodesic algorithms, and wind triangle principles. All calculations
            are performed client-side for instant results.
          </p>
        </div>
      </main>

      <Footer description="Experimental aviation calculators for TAS, wind correction, distance & bearing, and flight planning" />
    </PageLayout>
  );
}
