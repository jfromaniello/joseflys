"use client";

import { useState, useEffect } from "react";
import { PageLayout } from "../components/PageLayout";
import { Footer } from "../components/Footer";
import { Tooltip } from "../components/Tooltip";
import { Navigation } from "../components/Navigation";
import { ShareButton } from "../components/ShareButton";
import {
  calculateTimeSpeedDistance,
  calculateFuelConsumption,
  formatTime,
} from "@/lib/flightPlanningCalculations";

type CalculatorMode = "time-speed-distance" | "fuel";

interface PlanningCalculatorClientProps {
  initialMode: CalculatorMode;
  initialGs?: string;
  initialDist?: string;
  initialTh?: string;
  initialTm?: string;
  initialFf?: string;
  initialFu?: string;
  initialFth?: string;
  initialFtm?: string;
  initialFa?: string;
}

export function PlanningCalculatorClient({
  initialMode,
  initialGs = "",
  initialDist = "",
  initialTh = "",
  initialTm = "",
  initialFf = "",
  initialFu = "",
  initialFth = "",
  initialFtm = "",
  initialFa = "",
}: PlanningCalculatorClientProps) {
  // Mode selection
  const [mode, setMode] = useState<CalculatorMode>(initialMode);

  // Time-Speed-Distance inputs
  const [groundSpeed, setGroundSpeed] = useState<string>(initialGs);
  const [distance, setDistance] = useState<string>(initialDist);
  const [timeHours, setTimeHours] = useState<string>(initialTh);
  const [timeMinutes, setTimeMinutes] = useState<string>(initialTm);

  // Fuel inputs
  const [fuelFlow, setFuelFlow] = useState<string>(initialFf);
  const [fuelUsed, setFuelUsed] = useState<string>(initialFu);
  const [fuelTimeHours, setFuelTimeHours] = useState<string>(initialFth);
  const [fuelTimeMinutes, setFuelTimeMinutes] = useState<string>(initialFtm);
  const [fuelAvailable, setFuelAvailable] = useState<string>(initialFa);

  // Update URL when inputs change
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("mode", mode);

    if (mode === "time-speed-distance") {
      if (groundSpeed) params.set("gs", groundSpeed);
      if (distance) params.set("dist", distance);
      if (timeHours) params.set("th", timeHours);
      if (timeMinutes) params.set("tm", timeMinutes);
    } else {
      if (fuelFlow) params.set("ff", fuelFlow);
      if (fuelUsed) params.set("fu", fuelUsed);
      if (fuelTimeHours) params.set("fth", fuelTimeHours);
      if (fuelTimeMinutes) params.set("ftm", fuelTimeMinutes);
      if (fuelAvailable) params.set("fa", fuelAvailable);
    }

    // Use window.history.replaceState instead of router.replace to avoid server requests
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [
    mode,
    groundSpeed,
    distance,
    timeHours,
    timeMinutes,
    fuelFlow,
    fuelUsed,
    fuelTimeHours,
    fuelTimeMinutes,
    fuelAvailable,
  ]);

  // Calculate results for Time-Speed-Distance
  const totalTimeMinutes =
    (parseFloat(timeHours) || 0) * 60 + (parseFloat(timeMinutes) || 0);
  const tsdResult = calculateTimeSpeedDistance(
    groundSpeed ? parseFloat(groundSpeed) : undefined,
    distance ? parseFloat(distance) : undefined,
    totalTimeMinutes > 0 ? totalTimeMinutes : undefined
  );

  // Calculate results for Fuel
  const fuelTotalTimeMinutes =
    (parseFloat(fuelTimeHours) || 0) * 60 + (parseFloat(fuelTimeMinutes) || 0);
  const fuelResult = calculateFuelConsumption(
    fuelFlow ? parseFloat(fuelFlow) : undefined,
    fuelUsed ? parseFloat(fuelUsed) : undefined,
    fuelTotalTimeMinutes > 0 ? fuelTotalTimeMinutes : undefined,
    fuelAvailable ? parseFloat(fuelAvailable) : undefined
  );

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
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1
            className="text-4xl sm:text-5xl font-bold"
            style={{ color: "white" }}
          >
            José&apos;s Flight Planning
          </h1>
        </div>
        <p
          className="text-base sm:text-lg mb-4"
          style={{ color: "oklch(0.58 0.02 240)" }}
        >
          Time, Speed, Distance & Fuel calculations
        </p>
        <Navigation currentPage="planning" />
      </div>

      <main className="w-full max-w-3xl">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 mb-8 shadow-2xl">
          {/* Mode Selection */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <label
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: "oklch(0.7 0.15 230)" }}
              >
                Calculator Type
                <Tooltip content="Choose between Time-Speed-Distance problems or Fuel Consumption problems" />
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setMode("time-speed-distance")}
                className={`px-4 py-3 rounded-xl font-medium transition-all ${
                  mode === "time-speed-distance"
                    ? "shadow-lg"
                    : "hover:brightness-110 active:scale-95"
                }`}
                style={{
                  backgroundColor:
                    mode === "time-speed-distance"
                      ? "oklch(0.65 0.15 230)"
                      : "oklch(0.25 0.02 240)",
                  color:
                    mode === "time-speed-distance"
                      ? "white"
                      : "oklch(0.72 0.015 240)",
                  borderWidth: "2px",
                  borderColor:
                    mode === "time-speed-distance"
                      ? "oklch(0.7 0.15 230)"
                      : "oklch(0.35 0.02 240)",
                }}
              >
                Time / Speed / Distance
              </button>
              <button
                onClick={() => setMode("fuel")}
                className={`px-4 py-3 rounded-xl font-medium transition-all ${
                  mode === "fuel"
                    ? "shadow-lg"
                    : "hover:brightness-110 active:scale-95"
                }`}
                style={{
                  backgroundColor:
                    mode === "fuel"
                      ? "oklch(0.65 0.15 230)"
                      : "oklch(0.25 0.02 240)",
                  color: mode === "fuel" ? "white" : "oklch(0.72 0.015 240)",
                  borderWidth: "2px",
                  borderColor:
                    mode === "fuel"
                      ? "oklch(0.7 0.15 230)"
                      : "oklch(0.35 0.02 240)",
                }}
              >
                Fuel Consumption
              </button>
            </div>
          </div>

          {/* Time-Speed-Distance Calculator */}
          {mode === "time-speed-distance" && (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <label
                    className="text-sm font-semibold uppercase tracking-wider"
                    style={{ color: "oklch(0.7 0.15 230)" }}
                  >
                    Input Values (Enter any 2)
                    <Tooltip content="Enter any two values and the calculator will compute the third. For example: enter speed and distance to find time." />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Ground Speed */}
                  <div>
                    <label
                      className="block text-xs font-medium mb-2"
                      style={{ color: "oklch(0.72 0.015 240)" }}
                    >
                      Ground Speed
                      <Tooltip content="Your speed over the ground in knots" />
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={groundSpeed}
                        onChange={(e) => setGroundSpeed(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
                        placeholder="200"
                        step="any"
                      />
                      <span
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                        style={{ color: "oklch(0.55 0.02 240)" }}
                      >
                        KT
                      </span>
                    </div>
                  </div>

                  {/* Distance */}
                  <div>
                    <label
                      className="block text-xs font-medium mb-2"
                      style={{ color: "oklch(0.72 0.015 240)" }}
                    >
                      Distance
                      <Tooltip content="Distance to travel in nautical miles" />
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={distance}
                        onChange={(e) => setDistance(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
                        placeholder="300"
                        step="any"
                      />
                      <span
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                        style={{ color: "oklch(0.55 0.02 240)" }}
                      >
                        NM
                      </span>
                    </div>
                  </div>

                  {/* Time */}
                  <div>
                    <label
                      className="block text-xs font-medium mb-2"
                      style={{ color: "oklch(0.72 0.015 240)" }}
                    >
                      Time
                      <Tooltip content="Time in hours and minutes" />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <input
                          type="number"
                          value={timeHours}
                          onChange={(e) => setTimeHours(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
                          placeholder="1"
                          min="0"
                        />
                        <span
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                          style={{ color: "oklch(0.55 0.02 240)" }}
                        >
                          HRS
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={timeMinutes}
                          onChange={(e) => setTimeMinutes(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
                          placeholder="30"
                          min="0"
                          max="59"
                        />
                        <span
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                          style={{ color: "oklch(0.55 0.02 240)" }}
                        >
                          MIN
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results */}
              {(tsdResult.groundSpeed || tsdResult.distance || tsdResult.time) && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <label
                      className="text-sm font-semibold uppercase tracking-wider"
                      style={{ color: "oklch(0.7 0.15 230)" }}
                    >
                      Results
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div
                      className="rounded-xl p-4 border backdrop-blur-sm"
                      style={{
                        background:
                          "linear-gradient(to bottom right, oklch(0.65 0.15 230 / 0.1), oklch(0.6 0.15 230 / 0.1))",
                        borderColor: "oklch(0.65 0.15 230 / 0.3)",
                      }}
                    >
                      <div
                        className="text-xs font-medium mb-1 uppercase tracking-wide"
                        style={{ color: "oklch(0.72 0.015 240)" }}
                      >
                        Ground Speed
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">
                          {tsdResult.groundSpeed?.toFixed(1) || "—"}
                        </span>
                        <span
                          className="text-sm font-medium"
                          style={{ color: "oklch(0.72 0.015 240)" }}
                        >
                          KT
                        </span>
                      </div>
                    </div>

                    <div
                      className="rounded-xl p-4 border backdrop-blur-sm"
                      style={{
                        background:
                          "linear-gradient(to bottom right, oklch(0.65 0.15 230 / 0.1), oklch(0.6 0.15 230 / 0.1))",
                        borderColor: "oklch(0.65 0.15 230 / 0.3)",
                      }}
                    >
                      <div
                        className="text-xs font-medium mb-1 uppercase tracking-wide"
                        style={{ color: "oklch(0.72 0.015 240)" }}
                      >
                        Distance
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">
                          {tsdResult.distance?.toFixed(1) || "—"}
                        </span>
                        <span
                          className="text-sm font-medium"
                          style={{ color: "oklch(0.72 0.015 240)" }}
                        >
                          NM
                        </span>
                      </div>
                    </div>

                    <div
                      className="rounded-xl p-4 border backdrop-blur-sm"
                      style={{
                        background:
                          "linear-gradient(to bottom right, oklch(0.65 0.15 230 / 0.1), oklch(0.6 0.15 230 / 0.1))",
                        borderColor: "oklch(0.65 0.15 230 / 0.3)",
                      }}
                    >
                      <div
                        className="text-xs font-medium mb-1 uppercase tracking-wide"
                        style={{ color: "oklch(0.72 0.015 240)" }}
                      >
                        Time
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">
                          {tsdResult.time ? formatTime(tsdResult.time) : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Fuel Calculator */}
          {mode === "fuel" && (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <label
                    className="text-sm font-semibold uppercase tracking-wider"
                    style={{ color: "oklch(0.7 0.15 230)" }}
                  >
                    Input Values (Enter any 2)
                    <Tooltip content="Enter any two values to calculate the third. Enter Fuel Flow and Fuel Available to calculate endurance." />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Fuel Flow */}
                  <div>
                    <label
                      className="block text-xs font-medium mb-2"
                      style={{ color: "oklch(0.72 0.015 240)" }}
                    >
                      Fuel Flow
                      <Tooltip content="Fuel consumption rate in gallons per hour or pounds per hour" />
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={fuelFlow}
                        onChange={(e) => setFuelFlow(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
                        placeholder="70"
                        step="any"
                      />
                      <span
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                        style={{ color: "oklch(0.55 0.02 240)" }}
                      >
                        /HR
                      </span>
                    </div>
                  </div>

                  {/* Fuel Used */}
                  <div>
                    <label
                      className="block text-xs font-medium mb-2"
                      style={{ color: "oklch(0.72 0.015 240)" }}
                    >
                      Fuel Used
                      <Tooltip content="Amount of fuel consumed in gallons or pounds" />
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={fuelUsed}
                        onChange={(e) => setFuelUsed(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
                        placeholder="105"
                        step="any"
                      />
                      <span
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                        style={{ color: "oklch(0.55 0.02 240)" }}
                      >
                        GAL/LBS
                      </span>
                    </div>
                  </div>

                  {/* Time */}
                  <div>
                    <label
                      className="block text-xs font-medium mb-2"
                      style={{ color: "oklch(0.72 0.015 240)" }}
                    >
                      Time
                      <Tooltip content="Time period in hours and minutes" />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <input
                          type="number"
                          value={fuelTimeHours}
                          onChange={(e) => setFuelTimeHours(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
                          placeholder="1"
                          min="0"
                        />
                        <span
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                          style={{ color: "oklch(0.55 0.02 240)" }}
                        >
                          HRS
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={fuelTimeMinutes}
                          onChange={(e) => setFuelTimeMinutes(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
                          placeholder="30"
                          min="0"
                          max="59"
                        />
                        <span
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                          style={{ color: "oklch(0.55 0.02 240)" }}
                        >
                          MIN
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fuel Available (Optional - for endurance) */}
                  <div>
                    <label
                      className="block text-xs font-medium mb-2"
                      style={{ color: "oklch(0.72 0.015 240)" }}
                    >
                      Fuel Available (Optional)
                      <Tooltip content="Total fuel available to calculate endurance (how long fuel will last)" />
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={fuelAvailable}
                        onChange={(e) => setFuelAvailable(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
                        placeholder="200"
                        step="any"
                      />
                      <span
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                        style={{ color: "oklch(0.55 0.02 240)" }}
                      >
                        GAL/LBS
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results */}
              {(fuelResult.fuelFlow ||
                fuelResult.fuelUsed ||
                fuelResult.time ||
                fuelResult.endurance) && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <label
                      className="text-sm font-semibold uppercase tracking-wider"
                      style={{ color: "oklch(0.7 0.15 230)" }}
                    >
                      Results
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      className="rounded-xl p-4 border backdrop-blur-sm"
                      style={{
                        background:
                          "linear-gradient(to bottom right, oklch(0.65 0.15 230 / 0.1), oklch(0.6 0.15 230 / 0.1))",
                        borderColor: "oklch(0.65 0.15 230 / 0.3)",
                      }}
                    >
                      <div
                        className="text-xs font-medium mb-1 uppercase tracking-wide"
                        style={{ color: "oklch(0.72 0.015 240)" }}
                      >
                        Fuel Flow
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">
                          {fuelResult.fuelFlow?.toFixed(1) || "—"}
                        </span>
                        <span
                          className="text-sm font-medium"
                          style={{ color: "oklch(0.72 0.015 240)" }}
                        >
                          /HR
                        </span>
                      </div>
                    </div>

                    <div
                      className="rounded-xl p-4 border backdrop-blur-sm"
                      style={{
                        background:
                          "linear-gradient(to bottom right, oklch(0.65 0.15 230 / 0.1), oklch(0.6 0.15 230 / 0.1))",
                        borderColor: "oklch(0.65 0.15 230 / 0.3)",
                      }}
                    >
                      <div
                        className="text-xs font-medium mb-1 uppercase tracking-wide"
                        style={{ color: "oklch(0.72 0.015 240)" }}
                      >
                        Fuel Used
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">
                          {fuelResult.fuelUsed?.toFixed(1) || "—"}
                        </span>
                        <span
                          className="text-sm font-medium"
                          style={{ color: "oklch(0.72 0.015 240)" }}
                        >
                          GAL/LBS
                        </span>
                      </div>
                    </div>

                    <div
                      className="rounded-xl p-4 border backdrop-blur-sm"
                      style={{
                        background:
                          "linear-gradient(to bottom right, oklch(0.65 0.15 230 / 0.1), oklch(0.6 0.15 230 / 0.1))",
                        borderColor: "oklch(0.65 0.15 230 / 0.3)",
                      }}
                    >
                      <div
                        className="text-xs font-medium mb-1 uppercase tracking-wide"
                        style={{ color: "oklch(0.72 0.015 240)" }}
                      >
                        Time
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">
                          {fuelResult.time ? formatTime(fuelResult.time) : "—"}
                        </span>
                      </div>
                    </div>

                    {fuelResult.endurance && (
                      <div
                        className="rounded-xl p-4 border backdrop-blur-sm"
                        style={{
                          background:
                            "linear-gradient(to bottom right, oklch(0.7 0.15 150 / 0.1), oklch(0.65 0.15 150 / 0.1))",
                          borderColor: "oklch(0.7 0.15 150 / 0.3)",
                        }}
                      >
                        <div
                          className="text-xs font-medium mb-1 uppercase tracking-wide"
                          style={{ color: "oklch(0.72 0.015 240)" }}
                        >
                          Endurance
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-white">
                            {formatTime(fuelResult.endurance)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Share Button */}
          <ShareButton
            shareData={{
              title: "Flight Planning Calculator",
              text: "Flight Planning Calculator - Time, Speed, Distance & Fuel",
              url: typeof window !== "undefined" ? window.location.href : "",
            }}
          />
        </div>
      </main>

      <Footer description="Flight Planning Calculator - Calculate Time, Speed, Distance and Fuel Consumption for flight planning" />
    </PageLayout>
  );
}
