"use client";

import { useState, useEffect } from "react";
import { Tooltip } from "../components/Tooltip";
import { PageLayout } from "../components/PageLayout";
import { CalculatorPageHeader } from "../components/CalculatorPageHeader";
import { Footer } from "../components/Footer";
import { ShareButton } from "../components/ShareButton";
import { AircraftPerformanceModal } from "../components/AircraftPerformanceModal";
import { DensityAltitudeModal } from "../components/DensityAltitudeModal";
import { AircraftPerformance, PRESET_AIRCRAFT } from "@/lib/aircraftPerformance";
import { calculateClimbPerformance, ClimbResults } from "@/lib/climbCalculations";
import { calculateCourse } from "@/lib/courseCalculations";
import { WindInputs } from "../course/components/WindInputs";
import { AltitudeInputs } from "./components/AltitudeInputs";
import { CourseInput } from "./components/CourseInput";

interface ClimbCalculatorClientProps {
  initialCurrentAlt: string;
  initialTargetAlt: string;
  initialDA: string;
  initialWeight: string;
  initialTH: string;
  initialWD: string;
  initialWS: string;
  initialAircraft: string;
}

export function ClimbCalculatorClient({
  initialCurrentAlt,
  initialTargetAlt,
  initialDA,
  initialWeight,
  initialTH,
  initialWD,
  initialWS,
  initialAircraft,
}: ClimbCalculatorClientProps) {
  const [currentAlt, setCurrentAlt] = useState<string>(initialCurrentAlt);
  const [targetAlt, setTargetAlt] = useState<string>(initialTargetAlt);
  const [densityAlt, setDensityAlt] = useState<string>(initialDA);
  const [weight, setWeight] = useState<string>(initialWeight);
  const [trueHeading, setTrueHeading] = useState<string>(initialTH);
  const [windDir, setWindDir] = useState<string>(initialWD);
  const [windSpeed, setWindSpeed] = useState<string>(initialWS);

  const [aircraft, setAircraft] = useState<AircraftPerformance>(
    PRESET_AIRCRAFT.find((ac) => ac.model === initialAircraft) || PRESET_AIRCRAFT[0]
  );

  const [isAircraftModalOpen, setIsAircraftModalOpen] = useState(false);
  const [isDAModalOpen, setIsDAModalOpen] = useState(false);

  // Update URL when parameters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentAlt) params.set("curr", currentAlt);
    if (targetAlt) params.set("tgt", targetAlt);
    if (densityAlt) params.set("da", densityAlt);
    if (weight) params.set("wt", weight);
    if (trueHeading) params.set("th", trueHeading);
    if (windDir) params.set("wd", windDir);
    if (windSpeed) params.set("ws", windSpeed);
    if (aircraft.model) params.set("ac", aircraft.model);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [currentAlt, targetAlt, densityAlt, weight, trueHeading, windDir, windSpeed, aircraft]);

  // Parse values
  const currentAltVal = parseFloat(currentAlt);
  const targetAltVal = parseFloat(targetAlt);
  const densityAltVal = parseFloat(densityAlt);
  const weightVal = parseFloat(weight);
  const thVal = parseFloat(trueHeading);
  const wdVal = windDir ? parseFloat(windDir) : 0;
  const wsVal = windSpeed ? parseFloat(windSpeed) : 0;

  // Calculate average TAS from performance table for wind calculations
  // We use the middle altitude segment's TAS as a representative value
  const avgTAS = aircraft.climbTable.length > 0
    ? aircraft.climbTable[Math.floor(aircraft.climbTable.length / 2)].climbTAS
    : 80; // Default fallback

  // Calculate ground speed using wind correction
  const windCalc = !isNaN(thVal) && avgTAS > 0
    ? calculateCourse(wdVal, wsVal, thVal, avgTAS, 0) // magDev = 0 (we only need GS)
    : null;

  const groundSpeedVal = windCalc ? windCalc.groundSpeed : avgTAS;

  // Calculate weight ratio
  const weightRatio = !isNaN(weightVal) && aircraft.standardWeight > 0
    ? weightVal / aircraft.standardWeight
    : 1.0;

  // Calculate results
  const hasValidInputs =
    !isNaN(currentAltVal) &&
    !isNaN(targetAltVal) &&
    !isNaN(densityAltVal) &&
    !isNaN(weightVal) &&
    !isNaN(thVal) &&
    groundSpeedVal > 0 &&
    targetAltVal > currentAltVal;

  const results: ClimbResults | null = hasValidInputs
    ? calculateClimbPerformance(
        aircraft,
        currentAltVal,
        targetAltVal,
        densityAltVal,
        groundSpeedVal,
        weightRatio
      )
    : null;

  const handleAircraftApply = (newAircraft: AircraftPerformance) => {
    setAircraft(newAircraft);
    // Update weight if it's still at the old standard weight
    if (parseFloat(weight) === aircraft.standardWeight) {
      setWeight(newAircraft.standardWeight.toString());
    }
  };

  const handleDAApply = (da: number) => {
    setDensityAlt(da.toString());
  };

  return (
    <PageLayout currentPage="climb">
      <CalculatorPageHeader
        title="Climb Calculator"
        description="Calculate climb time, distance, fuel consumption, and Top of Climb position based on aircraft performance"
      />

      <main className="w-full max-w-4xl">
        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">
          {/* Aircraft Details Section */}
          <div className="mb-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "white" }}>
                Aircraft Details
              </h2>
              <button
                onClick={() => setIsAircraftModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 transition-all cursor-pointer border border-sky-500/30 text-sm font-medium"
                style={{ color: "oklch(0.8 0.15 230)" }}
              >
                Edit Performance Table
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-gray-600">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "white" }}>
                    {aircraft.name}
                  </p>
                  <p className="text-xs" style={{ color: "oklch(0.6 0.02 240)" }}>
                    {aircraft.climbTable.length} altitude segments • Standard weight:{" "}
                    {aircraft.standardWeight} lbs
                  </p>
                </div>

                {/* Aircraft Weight Input */}
                <div className="sm:w-48">
                  <label
                    className="flex items-center text-xs font-medium mb-1"
                    style={{ color: "oklch(0.72 0.015 240)" }}
                  >
                    Aircraft Weight
                    <Tooltip content="Current aircraft weight including fuel, passengers, and cargo" />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full px-3 pr-12 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-base bg-slate-900/50 border-2 border-gray-600 text-white text-right"
                      placeholder={aircraft.standardWeight.toString()}
                    />
                    <span
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none"
                      style={{ color: "oklch(0.55 0.02 240)" }}
                    >
                      lbs
                    </span>
                  </div>
                  {!isNaN(weightVal) && weightVal > aircraft.maxWeight && (
                    <p className="text-xs mt-1" style={{ color: "oklch(0.7 0.1 30)" }}>
                      ⚠️ Exceeds max ({aircraft.maxWeight} lbs)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Climb Parameters */}
          <div className="mb-8 space-y-6">
            {/* Altitude & Atmospheric Conditions */}
            <AltitudeInputs
              currentAlt={currentAlt}
              setCurrentAlt={setCurrentAlt}
              targetAlt={targetAlt}
              setTargetAlt={setTargetAlt}
              densityAlt={densityAlt}
              setDensityAlt={setDensityAlt}
              onDACalculatorClick={() => setIsDAModalOpen(true)}
            />

            {/* Course */}
            <CourseInput
              trueHeading={trueHeading}
              setTrueHeading={setTrueHeading}
            />

            {/* Wind */}
            <WindInputs
              windDir={windDir}
              setWindDir={setWindDir}
              windSpeed={windSpeed}
              setWindSpeed={setWindSpeed}
            />
          </div>

          {/* Results Section */}
          {hasValidInputs && results && (
            <>
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold mb-6" style={{ color: "white" }}>
                  Climb Performance Results
                </h2>

                {/* Primary Results - Row 1: 3 columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Ground Speed */}
                  <div className="p-6 rounded-xl text-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
                    <div className="flex items-center justify-center mb-2">
                      <p
                        className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                        style={{ color: "oklch(0.65 0.15 230)" }}
                      >
                        Ground Speed
                      </p>
                      <Tooltip content="Ground speed during climb, calculated from climb TAS (middle segment), true heading, and wind" />
                    </div>
                    <p className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: "white" }}>
                      {groundSpeedVal.toFixed(0)}
                    </p>
                    <p className="text-sm" style={{ color: "oklch(0.6 0.02 240)" }}>
                      kt
                    </p>
                  </div>

                  {/* Total Time */}
                  <div className="p-6 rounded-xl text-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
                    <div className="flex items-center justify-center mb-2">
                      <p
                        className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                        style={{ color: "oklch(0.65 0.15 230)" }}
                      >
                        Climb Time
                      </p>
                      <Tooltip content="Total time to climb from current altitude to target altitude" />
                    </div>
                    <p className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: "white" }}>
                      {results.totalTime.toFixed(1)}
                    </p>
                    <p className="text-sm" style={{ color: "oklch(0.6 0.02 240)" }}>
                      min ({Math.floor(results.totalTime)}:{((results.totalTime % 1) * 60).toFixed(0).padStart(2, '0')})
                    </p>
                  </div>

                  {/* Total Distance */}
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
                      {results.totalDistance.toFixed(1)}
                    </p>
                    <p className="text-sm" style={{ color: "oklch(0.6 0.02 240)" }}>
                      NM
                    </p>
                  </div>
                </div>

                {/* Primary Results - Row 2: 2 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Total Fuel */}
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
                      {results.totalFuel.toFixed(1)}
                    </p>
                    <p className="text-sm" style={{ color: "oklch(0.6 0.02 240)" }}>
                      gal (US)
                    </p>
                  </div>

                  {/* Average ROC */}
                  <div className="p-6 rounded-xl text-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
                    <div className="flex items-center justify-center mb-2">
                      <p
                        className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                        style={{ color: "oklch(0.65 0.15 230)" }}
                      >
                        Avg Rate of Climb
                      </p>
                      <Tooltip content="Average rate of climb for this climb segment" />
                    </div>
                    <p className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: "white" }}>
                      {results.averageROC.toFixed(0)}
                    </p>
                    <p className="text-sm" style={{ color: "oklch(0.6 0.02 240)" }}>
                      ft/min
                    </p>
                  </div>
                </div>

                {/* Detailed Segments */}
                {results.segments.length > 0 && (
                  <div className="mb-6">
                    <h3
                      className="text-lg font-semibold mb-3 flex items-center"
                      style={{ color: "white" }}
                    >
                      Climb Segments
                      <Tooltip content="Detailed breakdown of climb performance by altitude segment" />
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-600">
                            <th
                              className="text-left py-2 px-3"
                              style={{ color: "oklch(0.7 0.02 240)" }}
                            >
                              Altitude
                            </th>
                            <th
                              className="text-right py-2 px-3"
                              style={{ color: "oklch(0.7 0.02 240)" }}
                            >
                              ROC
                            </th>
                            <th
                              className="text-right py-2 px-3"
                              style={{ color: "oklch(0.7 0.02 240)" }}
                            >
                              Time
                            </th>
                            <th
                              className="text-right py-2 px-3"
                              style={{ color: "oklch(0.7 0.02 240)" }}
                            >
                              Distance
                            </th>
                            <th
                              className="text-right py-2 px-3"
                              style={{ color: "oklch(0.7 0.02 240)" }}
                            >
                              Fuel
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.segments.map((segment, index) => (
                            <tr key={index} className="border-b border-gray-700/50">
                              <td className="py-2 px-3" style={{ color: "white" }}>
                                {segment.altitudeFrom.toFixed(0)} - {segment.altitudeTo.toFixed(0)}{" "}
                                ft
                              </td>
                              <td
                                className="text-right py-2 px-3"
                                style={{ color: "oklch(0.8 0.02 240)" }}
                              >
                                {segment.rateOfClimb.toFixed(0)} ft/min
                              </td>
                              <td
                                className="text-right py-2 px-3"
                                style={{ color: "oklch(0.8 0.02 240)" }}
                              >
                                {segment.time.toFixed(1)} min
                              </td>
                              <td
                                className="text-right py-2 px-3"
                                style={{ color: "oklch(0.8 0.02 240)" }}
                              >
                                {segment.distance.toFixed(1)} NM
                              </td>
                              <td
                                className="text-right py-2 px-3"
                                style={{ color: "oklch(0.8 0.02 240)" }}
                              >
                                {segment.fuelUsed.toFixed(1)} gal
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Share Button */}
                <ShareButton
                  shareData={{
                    title: "José's Climb Calculator",
                    text: `${aircraft.name}: Climb from ${currentAlt} to ${targetAlt} ft → Time: ${results.totalTime.toFixed(1)} min, Distance: ${results.totalDistance.toFixed(1)} NM, Fuel: ${results.totalFuel.toFixed(1)} gal`,
                  }}
                />
              </div>
            </>
          )}

          {/* Info Note */}
          <div className="mt-6 p-4 rounded-xl bg-slate-900/30 border border-gray-700">
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "oklch(0.6 0.02 240)" }}>
              <span className="font-semibold">Note:</span> Calculations are based on aircraft
              performance tables and automatically adjusted for density altitude and weight.
              Performance may vary based on pilot technique, aircraft condition, and atmospheric
              conditions. Always refer to your POH for official performance data.
            </p>
            <p className="text-xs sm:text-sm leading-relaxed mt-3" style={{ color: "oklch(0.6 0.02 240)" }}>
              <span className="font-semibold">Ground Speed Calculation:</span> Ground speed is
              calculated using the <span className="font-semibold">horizontal component</span> of
              your velocity vector. The TAS value is taken from the <span className="font-semibold">middle
              altitude segment</span> of the performance table as a representative value for the
              entire climb. While TAS varies slightly across segments (typically 1-2 kt), using a
              single representative value provides a good approximation with minimal error. Wind
              correction is then applied to this TAS to calculate ground speed.
            </p>
          </div>
        </div>
      </main>

      <Footer description="Climb performance calculations based on aircraft POH data and ISA corrections" />

      {/* Modals */}
      <AircraftPerformanceModal
        isOpen={isAircraftModalOpen}
        onClose={() => setIsAircraftModalOpen(false)}
        onApply={handleAircraftApply}
        initialAircraft={aircraft}
      />

      <DensityAltitudeModal
        isOpen={isDAModalOpen}
        onClose={() => setIsDAModalOpen(false)}
        onApply={handleDAApply}
        initialElevation={!isNaN(currentAltVal) ? currentAltVal : 0}
      />
    </PageLayout>
  );
}
