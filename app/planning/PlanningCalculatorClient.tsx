"use client";

import { useState, useEffect } from "react";
import { PageLayout } from "../components/PageLayout";
import { CalculatorPageHeader } from "../components/CalculatorPageHeader";
import { Footer } from "../components/Footer";
import { Tooltip } from "../components/Tooltip";
import { ShareButton } from "../components/ShareButton";
import {
  calculateTimeSpeedDistance,
  calculateFuelConsumption,
  formatTime,
} from "@/lib/flightPlan";
import {
  SpeedUnit,
  getDistanceUnitForSpeed,
  getSpeedUnitLabel,
  toKnots,
  fromKnots,
} from "@/lib/speedConversion";
import { FuelUnit, getFuelUnitLabel, getFuelResultUnit } from "@/lib/fuelConversion";
import { convert } from "@/lib/unitConversions";

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
  initialSpeedUnit?: string;
  initialFuelUnit?: string;
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
  initialSpeedUnit = "kt",
  initialFuelUnit = "gph",
}: PlanningCalculatorClientProps) {
  // Mode selection
  const [mode, setMode] = useState<CalculatorMode>(initialMode);

  // Speed unit
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>(initialSpeedUnit as SpeedUnit);

  // Fuel unit
  const [fuelUnit, setFuelUnit] = useState<FuelUnit>(initialFuelUnit as FuelUnit);

  // Time-Speed-Distance inputs
  const [groundSpeed, setGroundSpeed] = useState<string>(initialGs);
  const [distance, setDistance] = useState<string>(initialDist);
  const [timeHours, setTimeHours] = useState<string>(initialTh);
  const [timeMinutes, setTimeMinutes] = useState<string>(initialTm);
  const [timeDecimal, setTimeDecimal] = useState<string>(() => {
    const th = parseFloat(initialTh) || 0;
    const tm = parseFloat(initialTm) || 0;
    return th > 0 || tm > 0 ? ((th * 60 + tm) / 60).toString() : "";
  });

  // Fuel inputs
  const [fuelFlow, setFuelFlow] = useState<string>(initialFf);
  const [fuelUsed, setFuelUsed] = useState<string>(initialFu);
  const [fuelTimeHours, setFuelTimeHours] = useState<string>(initialFth);
  const [fuelTimeMinutes, setFuelTimeMinutes] = useState<string>(initialFtm);
  const [fuelTimeDecimal, setFuelTimeDecimal] = useState<string>(() => {
    const fth = parseFloat(initialFth) || 0;
    const ftm = parseFloat(initialFtm) || 0;
    return fth > 0 || ftm > 0 ? ((fth * 60 + ftm) / 60).toString() : "";
  });
  const [fuelAvailable, setFuelAvailable] = useState<string>(initialFa);

  // Update URL when inputs change
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    if (speedUnit !== "kt") params.set("su", speedUnit);
    if (fuelUnit !== "gph") params.set("funit", fuelUnit);

    if (mode === "time-speed-distance") {
      if (groundSpeed) params.set("gs", groundSpeed);
      if (distance) params.set("dist", distance);
      if (timeHours) params.set("th", timeHours);
      if (timeMinutes) params.set("tm", timeMinutes);
    } else {
      if (fuelFlow) params.set("ff", fuelFlow);
      if (fuelUsed) params.set("fused", fuelUsed);
      if (fuelTimeHours) params.set("fth", fuelTimeHours);
      if (fuelTimeMinutes) params.set("ftm", fuelTimeMinutes);
      if (fuelAvailable) params.set("fa", fuelAvailable);
    }

    // Use window.history.replaceState instead of router.replace to avoid server requests
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [
    mode,
    speedUnit,
    fuelUnit,
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

  // Get distance unit for current speed unit
  const distanceUnit = getDistanceUnitForSpeed(speedUnit);

  // Convert input values to base units (knots, nautical miles)
  const groundSpeedKnots = groundSpeed ? toKnots(parseFloat(groundSpeed), speedUnit) : undefined;
  const distanceNM = distance
    ? convert(parseFloat(distance), distanceUnit, 'NM', 'distance') || undefined
    : undefined;

  // Perform calculations in base units
  const tsdResultBase = calculateTimeSpeedDistance(
    groundSpeedKnots,
    distanceNM,
    totalTimeMinutes > 0 ? totalTimeMinutes : undefined
  );

  // Convert results back to selected units
  const tsdResult = {
    groundSpeed: tsdResultBase.groundSpeed ? fromKnots(tsdResultBase.groundSpeed, speedUnit) : undefined,
    distance: tsdResultBase.distance
      ? convert(tsdResultBase.distance, 'NM', distanceUnit, 'distance') || undefined
      : undefined,
    time: tsdResultBase.time,
  };

  // Calculate results for Fuel
  const fuelTotalTimeMinutes =
    (parseFloat(fuelTimeHours) || 0) * 60 + (parseFloat(fuelTimeMinutes) || 0);
  const fuelResult = calculateFuelConsumption(
    fuelFlow ? parseFloat(fuelFlow) : undefined,
    fuelUsed ? parseFloat(fuelUsed) : undefined,
    fuelTotalTimeMinutes > 0 ? fuelTotalTimeMinutes : undefined,
    fuelAvailable ? parseFloat(fuelAvailable) : undefined
  );

  // Build OG image URL for download
  const hasParams = mode === "time-speed-distance"
    ? (groundSpeed || distance || timeHours || timeMinutes)
    : (fuelFlow || fuelUsed || fuelTimeHours || fuelTimeMinutes || fuelAvailable);

  const ogImageUrl = hasParams
    ? mode === "time-speed-distance"
      ? `/api/og-planning?mode=${mode}&gs=${groundSpeed}&dist=${distance}&th=${timeHours}&tm=${timeMinutes}`
      : `/api/og-planning?mode=${mode}&ff=${fuelFlow}&fu=${fuelUsed}&fth=${fuelTimeHours}&ftm=${fuelTimeMinutes}&fa=${fuelAvailable}`
    : undefined;

  return (
    <PageLayout currentPage="planning">
      <CalculatorPageHeader
        title="Flight Planning Calculator"
        description="Calculate time, speed, distance, and fuel consumption. Solve any flight planning problem by entering two known values"
      />

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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Ground Speed */}
                  <div>
                    <label
                      className="block text-xs font-medium mb-2"
                      style={{ color: "oklch(0.72 0.015 240)" }}
                    >
                      Ground Speed
                      <Tooltip content="Your speed over the ground. Select your preferred units." />
                    </label>
                    <div className="grid grid-cols-[1fr_auto] gap-x-3">
                      <input
                        type="number"
                        value={groundSpeed}
                        onChange={(e) => setGroundSpeed(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                        placeholder="200"
                        step="any"
                      />
                      <select
                        value={speedUnit}
                        onChange={(e) => setSpeedUnit(e.target.value as SpeedUnit)}
                        className="select-no-arrow w-22 px-3 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white cursor-pointer"
                      >
                        <option value="kt">KT</option>
                        <option value="kmh">km/h</option>
                        <option value="mph">mph</option>
                      </select>
                    </div>
                  </div>

                  {/* Distance */}
                  <div>
                    <label
                      className="block text-xs font-medium mb-2"
                      style={{ color: "oklch(0.72 0.015 240)" }}
                    >
                      Distance
                      <Tooltip content="Distance to travel" />
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={distance}
                        onChange={(e) => setDistance(e.target.value)}
                        className="w-full px-4 py-3 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                        placeholder="300"
                        step="any"
                      />
                      <span
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                        style={{ color: "oklch(0.55 0.02 240)" }}
                      >
                        {getDistanceUnitForSpeed(speedUnit)}
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
                      <Tooltip content="Time in decimal hours (e.g., 1.5 for 1 hour 30 minutes)" />
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={timeDecimal}
                        onChange={(e) => {
                          setTimeDecimal(e.target.value);
                          if (e.target.value === "") {
                            setTimeHours("");
                            setTimeMinutes("");
                          } else {
                            const hours = parseFloat(e.target.value) || 0;
                            const totalMinutes = hours * 60;
                            setTimeHours(Math.floor(totalMinutes / 60).toString());
                            setTimeMinutes(Math.round(totalMinutes % 60).toString());
                          }
                        }}
                        className="w-full px-4 py-3 pr-16 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                        placeholder="1.5"
                        step="any"
                      />
                      <span
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                        style={{ color: "oklch(0.55 0.02 240)" }}
                      >
                        HRS
                      </span>
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
                          {getSpeedUnitLabel(speedUnit)}
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
                          {getDistanceUnitForSpeed(speedUnit)}
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                  {/* Fuel Flow */}
                  <div>
                    <label
                      className="block text-xs font-medium mb-2"
                      style={{ color: "oklch(0.72 0.015 240)" }}
                    >
                      Fuel Flow
                      <Tooltip content="Fuel consumption rate per hour. Select your preferred units." />
                    </label>
                    <div className="grid grid-cols-[1fr_auto] gap-x-3">
                      <input
                        type="number"
                        value={fuelFlow}
                        onChange={(e) => setFuelFlow(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                        placeholder="70"
                        step="any"
                      />
                      <select
                        value={fuelUnit}
                        onChange={(e) => setFuelUnit(e.target.value as FuelUnit)}
                        className="select-no-arrow w-22 px-3 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white cursor-pointer"
                      >
                        <option value="gph">GPH</option>
                        <option value="lph">LPH</option>
                        <option value="pph">PPH</option>
                        <option value="kgh">KG/H</option>
                      </select>
                    </div>
                  </div>

                  {/* Fuel Used */}
                  <div>
                    <label
                      className="block text-xs font-medium mb-2"
                      style={{ color: "oklch(0.72 0.015 240)" }}
                    >
                      Fuel Used
                      <Tooltip content="Amount of fuel consumed" />
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={fuelUsed}
                        onChange={(e) => setFuelUsed(e.target.value)}
                        className="w-full px-4 py-3 pr-14 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                        placeholder="105"
                        step="any"
                      />
                      <span
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                        style={{ color: "oklch(0.55 0.02 240)" }}
                      >
                        {getFuelResultUnit(fuelUnit)}
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
                      <Tooltip content="Time in decimal hours (e.g., 1.5 for 1 hour 30 minutes)" />
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={fuelTimeDecimal}
                        onChange={(e) => {
                          setFuelTimeDecimal(e.target.value);
                          if (e.target.value === "") {
                            setFuelTimeHours("");
                            setFuelTimeMinutes("");
                          } else {
                            const hours = parseFloat(e.target.value) || 0;
                            const totalMinutes = hours * 60;
                            setFuelTimeHours(Math.floor(totalMinutes / 60).toString());
                            setFuelTimeMinutes(Math.round(totalMinutes % 60).toString());
                          }
                        }}
                        className="w-full px-4 py-3 pr-16 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                        placeholder="1.5"
                        step="any"
                      />
                      <span
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                        style={{ color: "oklch(0.55 0.02 240)" }}
                      >
                        HRS
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
                      className="w-full px-4 py-3 pr-14 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                      placeholder="200"
                      step="any"
                    />
                    <span
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                      style={{ color: "oklch(0.55 0.02 240)" }}
                    >
                      {getFuelResultUnit(fuelUnit)}
                    </span>
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
                          {getFuelUnitLabel(fuelUnit)}
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
                          {getFuelResultUnit(fuelUnit)}
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
            }}
          />
        </div>
      </main>

      <Footer description="Flight Planning Calculator - Calculate Time, Speed, Distance and Fuel Consumption for flight planning" />
    </PageLayout>
  );
}
