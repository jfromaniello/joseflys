"use client";

import Link from "next/link";
import { PageLayout } from "./components/PageLayout";
import { Footer } from "./components/Footer";

export default function Home() {
  return (
    <PageLayout currentPage="home">
      {/* Hero Section */}
      <div className="text-center mb-12 sm:mb-16 max-w-4xl">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6" style={{ color: "white" }}>
          Aviation Calculators
          <span className="block mt-2 text-3xl sm:text-4xl md:text-5xl" style={{ color: "oklch(0.75 0.15 230)" }}>
            for Pilots
          </span>
        </h1>
        <p
          className="text-base sm:text-lg md:text-xl mb-6 leading-relaxed max-w-2xl mx-auto"
          style={{ color: "oklch(0.7 0.02 240)" }}
        >
          Professional flight planning tools for accurate navigation. Plan complete flight legs with waypoints,
          calculate TAS, compass course, wind correction, distance & bearing, and fuel consumption.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm" style={{ color: "oklch(0.6 0.02 240)" }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-gray-700">
            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>ISA Standard Atmosphere</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-gray-700">
            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>WGS-84 Geodesic</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-gray-700">
            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Instant Results</span>
          </div>
        </div>
      </div>

      {/* Calculator Cards */}
      <main className="w-full max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Leg Planner Card */}
          <Link
            href="/leg"
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2" style={{ color: "white" }}>
                  Leg Planner
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "oklch(0.65 0.02 240)" }}
                >
                  Complete flight leg planning with course, fuel consumption, waypoints,
                  and time estimates. Perfect for VFR navigation
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "oklch(0.65 0.15 230)" }}>
              Open Planner
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
                  Calculate wind correction angle, ground speed, and compass heading.
                  Simple and focused on basic course calculations
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

          {/* Route Calculator Card */}
          <Link
            href="/route"
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
                  Route Calculator
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "oklch(0.65 0.02 240)" }}
                >
                  Calculate distance, true bearing, magnetic heading, and variation
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

          {/* ISA Calculator Card */}
          <Link
            href="/isa"
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
                    d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2" style={{ color: "white" }}>
                  ISA Calculator
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "oklch(0.65 0.02 240)" }}
                >
                  Calculate ISA Temperature, Pressure Altitude, and Density Altitude
                  from elevation, QNH, and actual temperature
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

          {/* Climb Calculator Card */}
          <Link
            href="/climb"
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
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2" style={{ color: "white" }}>
                  Climb Calculator
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "oklch(0.65 0.02 240)" }}
                >
                  Calculate climb time, distance, fuel consumption, and Top of Climb
                  position based on aircraft performance and density altitude
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

          {/* LNAV Segments Calculator Card */}
          <Link
            href="/segments"
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
                  LNAV Segments
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "oklch(0.65 0.02 240)" }}
                >
                  Divide great circle routes into constant-heading segments. See how
                  FMS systems approximate orthodromic paths with loxodromic navigation
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

          {/* Local Chart Card */}
          <Link
            href="/local-chart"
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
                  Local Chart
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "oklch(0.65 0.02 240)" }}
                >
                  Create printable route charts with fixed UTM scale for short-range local flights.
                  Measure distances with ruler like a real aeronautical chart
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "oklch(0.65 0.15 230)" }}>
              Open Chart Creator
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
            WGS-84 geodesic algorithms, and wind triangle principles. Plan complete flight legs
            with waypoints, ETAs, and fuel consumption. All calculations are performed client-side for instant results.
          </p>
        </div>
      </main>

      <Footer description="Experimental aviation calculators for leg planning, TAS, wind correction, distance & bearing, and fuel calculations" />
    </PageLayout>
  );
}
