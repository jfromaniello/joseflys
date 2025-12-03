"use client";

import { useState, useEffect, useCallback } from "react";
import { Tooltip } from "../components/Tooltip";
import { PageLayout } from "../components/PageLayout";
import { CalculatorPageHeader } from "../components/CalculatorPageHeader";
import { Footer } from "../components/Footer";
import { ShareButtonSimple } from "../components/ShareButtonSimple";
import { AircraftSelectorModal } from "../components/AircraftSelectorModal";
import { AircraftSelector } from "../components/AircraftSelector";
import { ResolvedAircraftPerformance, PRESET_AIRCRAFT } from "@/lib/aircraft";
import { calculateClimbPerformance, getClimbTableTemperatureRange, ClimbResult } from "@/lib/climbCalculations";
import {
  getAircraftByModel,
  loadAircraftFromUrl,
  serializeAircraft,
} from "@/lib/aircraftStorage";

interface ClimbCalculatorClientProps {
  initialCurrentAlt: string;
  initialTargetAlt: string;
  initialDA: string;
  initialPA: string;
  initialAlt: string;
  initialQNH: string;
  initialOAT: string;
  initialWeight: string;
  initialTH: string;
  initialWD: string;
  initialWS: string;
  initialAircraft: string;
  initialPlane: string;
}

export function ClimbCalculatorClient({
  initialCurrentAlt,
  initialTargetAlt,
  initialOAT,
  initialAircraft,
  initialPlane,
}: ClimbCalculatorClientProps) {
  const [currentAlt, setCurrentAlt] = useState<string>(initialCurrentAlt);
  const [targetAlt, setTargetAlt] = useState<string>(initialTargetAlt);
  const [oat, setOat] = useState<string>(initialOAT || "20");

  // Initialize aircraft from URL (prioritize plane param, then ac param)
  const [aircraft, setAircraft] = useState<ResolvedAircraftPerformance>(() => {
    // Try loading from serialized plane parameter first
    if (initialPlane) {
      const loadedAircraft = loadAircraftFromUrl(initialPlane);
      if (loadedAircraft) return loadedAircraft;
    }

    // Fall back to model code (ac parameter)
    const aircraftFromModel = getAircraftByModel(initialAircraft);
    return aircraftFromModel || (PRESET_AIRCRAFT[0] as ResolvedAircraftPerformance);
  });

  const [isAircraftModalOpen, setIsAircraftModalOpen] = useState(false);

  // Update URL when parameters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentAlt) params.set("curr", currentAlt);
    if (targetAlt) params.set("tgt", targetAlt);
    if (oat) params.set("oat", oat);

    // For custom aircraft (not presets), serialize to URL
    const isPreset = PRESET_AIRCRAFT.some(
      (preset) => preset.model === aircraft.model
    );

    if (isPreset) {
      params.set("ac", aircraft.model);
    } else {
      const serialized = serializeAircraft(aircraft, {
        includeStandardWeight: true,
        includeMaxWeight: true,
        includeClimbTable: true,
      });
      params.set("plane", serialized);
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [currentAlt, targetAlt, oat, aircraft]);

  // Parse values
  const currentAltVal = parseFloat(currentAlt);
  const targetAltVal = parseFloat(targetAlt);
  const oatVal = parseFloat(oat);

  // Get temperature range from climb table
  const tempRange = aircraft.climbTable ? getClimbTableTemperatureRange(aircraft.climbTable) : null;

  // Calculate results
  const hasValidInputs =
    !isNaN(currentAltVal) &&
    !isNaN(targetAltVal) &&
    !isNaN(oatVal) &&
    aircraft.climbTable &&
    aircraft.climbTable.length > 0 &&
    targetAltVal > currentAltVal;

  const results: ClimbResult | null = hasValidInputs
    ? calculateClimbPerformance(
        aircraft.climbTable!,
        currentAltVal,
        targetAltVal,
        oatVal
      )
    : null;

  const handleAircraftApply = useCallback((newAircraft: ResolvedAircraftPerformance) => {
    setAircraft(newAircraft);
  }, []);

  return (
    <PageLayout currentPage="climb">
      <CalculatorPageHeader
        title="Climb Calculator"
        description="Calculate climb time, distance, and fuel consumption based on POH performance tables"
      />

      <main className="w-full max-w-4xl">
        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">
          {/* Aircraft Section */}
          <div className="mb-8">
            <label
              className="flex items-center text-sm font-medium mb-2"
              style={{ color: "oklch(0.72 0.015 240)" }}
            >
              Aircraft
              <Tooltip content="Select an aircraft with climb performance data from its POH" />
            </label>
            <AircraftSelector
              aircraft={aircraft}
              onClick={() => setIsAircraftModalOpen(true)}
              showClimbInfo
            />
          </div>

          {/* Climb Parameters */}
          <div className="mb-8 pb-8 border-b border-gray-700/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                <svg className="w-6 h-6" fill="none" stroke="oklch(0.7 0.15 160)" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: "white" }}>
                  Climb Parameters
                </h2>
                <p className="text-sm" style={{ color: "oklch(0.65 0.02 240)" }}>
                  Enter pressure altitudes and outside air temperature
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Current Pressure Altitude */}
              <div>
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Current PA
                  <Tooltip content="Current pressure altitude (departure elevation)" />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={currentAlt}
                    onChange={(e) => setCurrentAlt(e.target.value)}
                    className="w-full h-[52px] px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 hover:border-gray-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
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

              {/* Target Pressure Altitude */}
              <div>
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Target PA
                  <Tooltip content="Target pressure altitude (cruise altitude)" />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={targetAlt}
                    onChange={(e) => setTargetAlt(e.target.value)}
                    className="w-full h-[52px] px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 hover:border-gray-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                    placeholder="6000"
                  />
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                    style={{ color: "oklch(0.55 0.02 240)" }}
                  >
                    ft
                  </span>
                </div>
              </div>

              {/* OAT */}
              <div>
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  OAT
                  <Tooltip content="Outside Air Temperature at departure altitude" />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={oat}
                    onChange={(e) => setOat(e.target.value)}
                    className="w-full h-[52px] px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 hover:border-gray-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                    placeholder="20"
                  />
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                    style={{ color: "oklch(0.55 0.02 240)" }}
                  >
                    °C
                  </span>
                </div>
                {tempRange && (
                  <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.02 240)" }}>
                    Table range: {tempRange.min}°C to {tempRange.max}°C
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Results Section */}
          {hasValidInputs && results && (
            <>
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold mb-6" style={{ color: "white" }}>
                  Climb Performance Results
                </h2>

                {/* Primary Results - 3 columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Climb Time */}
                  <div className="p-6 rounded-xl text-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
                    <div className="flex items-center justify-center mb-2">
                      <p
                        className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                        style={{ color: "oklch(0.65 0.15 230)" }}
                      >
                        Climb Time
                      </p>
                      <Tooltip content="Total time to climb from current to target altitude" />
                    </div>
                    <p className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: "white" }}>
                      {results.time.toFixed(1)}
                    </p>
                    <p className="text-sm" style={{ color: "oklch(0.6 0.02 240)" }}>
                      min ({Math.floor(results.time)}:{((results.time % 1) * 60).toFixed(0).padStart(2, '0')})
                    </p>
                  </div>

                  {/* Climb Distance */}
                  <div className="p-6 rounded-xl text-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
                    <div className="flex items-center justify-center mb-2">
                      <p
                        className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                        style={{ color: "oklch(0.65 0.15 230)" }}
                      >
                        Climb Distance
                      </p>
                      <Tooltip content="Horizontal distance covered during climb" />
                    </div>
                    <p className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: "white" }}>
                      {results.distance.toFixed(1)}
                    </p>
                    <p className="text-sm" style={{ color: "oklch(0.6 0.02 240)" }}>
                      NM
                    </p>
                  </div>

                  {/* Fuel Used */}
                  <div className="p-6 rounded-xl text-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
                    <div className="flex items-center justify-center mb-2">
                      <p
                        className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                        style={{ color: "oklch(0.65 0.15 230)" }}
                      >
                        Fuel Used
                      </p>
                      <Tooltip content="Total fuel consumed during climb" />
                    </div>
                    <p className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: "white" }}>
                      {results.fuel.toFixed(1)}
                    </p>
                    <p className="text-sm" style={{ color: "oklch(0.6 0.02 240)" }}>
                      gal (US)
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="print:hidden grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Copy Climb Data Button */}
                  <button
                    onClick={() => {
                      const climbData = {
                        climbDistance: parseFloat(results.distance.toFixed(1)),
                        climbFuel: parseFloat(results.fuel.toFixed(1)),
                        climbTime: parseFloat(results.time.toFixed(1)),
                      };
                      navigator.clipboard.writeText(JSON.stringify(climbData));
                      const btn = document.activeElement as HTMLElement;
                      const originalText = btn.textContent;
                      btn.textContent = '✓ Copied!';
                      setTimeout(() => {
                        btn.textContent = originalText;
                      }, 2000);
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all font-medium cursor-pointer"
                    style={{ color: "oklch(0.7 0.15 150)" }}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy Climb Data for Leg Planner
                  </button>

                  {/* Share & Print Buttons */}
                  <div className="flex gap-2">
                    <ShareButtonSimple
                      shareData={{
                        title: "José's Climb Calculator",
                        text: `${aircraft.name}: Climb from ${currentAlt} to ${targetAlt} ft @ ${oat}°C → Time: ${results.time.toFixed(1)} min, Distance: ${results.distance.toFixed(1)} NM, Fuel: ${results.fuel.toFixed(1)} gal`,
                      }}
                    />
                    <button
                      onClick={() => window.print()}
                      className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-600 hover:border-gray-500 hover:bg-slate-700/50 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
                      style={{ color: "oklch(0.7 0.02 240)" }}
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                        />
                      </svg>
                      <span className="text-sm font-medium">Print</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Info Note */}
          <div className="mt-6 p-4 rounded-xl bg-slate-900/30 border border-gray-700">
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "oklch(0.6 0.02 240)" }}>
              <span className="font-semibold">Note:</span> Calculations use POH climb performance tables
              with bilinear interpolation for Pressure Altitude × OAT. Values are cumulative from sea level
              and subtracted to get climb segment performance. Always refer to your POH for official data.
            </p>
          </div>
        </div>
      </main>

      <Footer description="Climb performance calculations based on aircraft POH data" />

      {/* Modals */}
      <AircraftSelectorModal
        isOpen={isAircraftModalOpen}
        onClose={() => setIsAircraftModalOpen(false)}
        onApply={handleAircraftApply}
        initialAircraft={aircraft}
      />
    </PageLayout>
  );
}
