"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
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
            José's Aviation Calculators
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
              <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30 group-hover:border-sky-500/50 transition-colors">
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
              <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30 group-hover:border-sky-500/50 transition-colors">
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
        </div>

        {/* Footer */}
        <div className="mt-12 p-6 rounded-xl bg-slate-900/30 border border-gray-700">
          <p
            className="text-sm text-center leading-relaxed mb-4"
            style={{ color: "oklch(0.6 0.02 240)" }}
          >
            Experimental aviation calculators based on ISA standard atmosphere and
            wind triangle principles. All calculations are performed client-side
            for instant results.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm">
            <span style={{ color: "oklch(0.6 0.02 240)" }}>
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
