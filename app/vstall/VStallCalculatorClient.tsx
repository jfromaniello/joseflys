"use client";

import { useState, useEffect } from "react";
import { PageLayout } from "../components/PageLayout";
import { CalculatorPageHeader } from "../components/CalculatorPageHeader";
import { Footer } from "../components/Footer";
import { ShareButton } from "../components/ShareButton";
import { Tooltip } from "../components/Tooltip";
import { PRESET_AIRCRAFT, AircraftPerformance } from "@/lib/aircraft";
import { calculateVStall, validateInputs, FlapConfiguration, ValidationError } from "@/lib/vstallCalculations";
import { calculatePA, calculateDA, calculateISATemp } from "@/lib/isaCalculations";

interface VStallCalculatorClientProps {
  initialAircraft: string;
  initialWeight: string;
  initialPA: string;
  initialAlt: string;
  initialQNH: string;
  initialDA: string;
  initialOAT: string;
  initialFlaps: string;
  initialBank: string;
}

type AltitudeMode = "pa" | "qnh" | "da";

export function VStallCalculatorClient({
  initialAircraft,
  initialWeight,
  initialPA,
  initialAlt,
  initialQNH,
  initialDA,
  initialOAT,
  initialFlaps,
  initialBank,
}: VStallCalculatorClientProps) {
  // State for inputs
  const [selectedAircraft, setSelectedAircraft] = useState<string>(initialAircraft);
  const [weight, setWeight] = useState<string>(initialWeight);
  const [pressureAlt, setPressureAlt] = useState<string>(initialPA);
  const [altitude, setAltitude] = useState<string>(initialAlt);
  const [qnh, setQnh] = useState<string>(initialQNH);
  const [densityAlt, setDensityAlt] = useState<string>(initialDA);
  const [oat, setOat] = useState<string>(initialOAT);
  const [flaps, setFlaps] = useState<string>(initialFlaps);
  const [bank, setBank] = useState<string>(initialBank);

  // Altitude mode
  const [altitudeMode, setAltitudeMode] = useState<AltitudeMode>(() => {
    if (initialDA) return "da";
    if (initialAlt && initialQNH) return "qnh";
    return "pa";
  });

  // Get aircraft data
  const aircraft: AircraftPerformance | undefined = PRESET_AIRCRAFT.find(
    (a) => a.model === selectedAircraft
  );

  // Set default weight to standard weight or max gross weight
  useEffect(() => {
    if (!weight && aircraft) {
      const defaultWeight = aircraft.weights.standardWeight || aircraft.weights.maxGrossWeight;
      setWeight(defaultWeight.toString());
    }
  }, [aircraft, weight]);

  // Update URL when parameters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedAircraft) params.set("aircraft", selectedAircraft);
    if (weight) params.set("weight", weight);

    if (altitudeMode === "pa" && pressureAlt) {
      params.set("pa", pressureAlt);
    } else if (altitudeMode === "qnh" && altitude && qnh) {
      params.set("alt", altitude);
      params.set("qnh", qnh);
    } else if (altitudeMode === "da" && densityAlt) {
      params.set("da", densityAlt);
    }

    if (oat) params.set("oat", oat);
    if (flaps) params.set("flaps", flaps);
    if (bank) params.set("bank", bank);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [selectedAircraft, weight, pressureAlt, altitude, qnh, densityAlt, oat, flaps, bank, altitudeMode]);

  // Parse values
  const weightVal = parseFloat(weight);
  const paVal = parseFloat(pressureAlt);
  const altVal = parseFloat(altitude);
  const qnhVal = parseFloat(qnh);
  const daVal = parseFloat(densityAlt);
  const oatVal = parseFloat(oat);
  const bankVal = parseFloat(bank);

  // Calculate actual PA and DA based on mode
  let actualPA = 0;
  let actualDA = 0;

  if (altitudeMode === "pa" && !isNaN(paVal)) {
    actualPA = paVal;
    if (!isNaN(oatVal)) {
      const isaTemp = calculateISATemp(paVal);
      actualDA = calculateDA(paVal, oatVal, isaTemp);
    } else {
      actualDA = paVal; // Assume ISA conditions
    }
  } else if (altitudeMode === "qnh" && !isNaN(altVal) && !isNaN(qnhVal)) {
    actualPA = calculatePA(altVal, qnhVal);
    if (!isNaN(oatVal)) {
      const isaTemp = calculateISATemp(actualPA);
      actualDA = calculateDA(actualPA, oatVal, isaTemp);
    } else {
      actualDA = actualPA;
    }
  } else if (altitudeMode === "da" && !isNaN(daVal)) {
    actualDA = daVal;
    actualPA = daVal; // Approximate
  }

  // Get stall speed reference based on flap configuration
  let vsRef = 0;
  if (aircraft) {
    if (flaps === "clean") {
      vsRef = aircraft.limits.vs;
    } else if (flaps === "takeoff") {
      // Estimate takeoff stall speed based on CLmax ratio
      const clMaxClean = aircraft.limits.clMaxClean || 1.4;
      const clMaxTakeoff = aircraft.limits.clMaxTakeoff || 1.6;
      vsRef = aircraft.limits.vs * Math.sqrt(clMaxClean / clMaxTakeoff);
    } else {
      vsRef = aircraft.limits.vs0;
    }
  }

  // Calculate results
  const hasValidInputs =
    aircraft && !isNaN(weightVal) && !isNaN(bankVal) && vsRef > 0;

  const results = hasValidInputs
    ? calculateVStall({
        vsRef,
        weightRef: aircraft!.weights.standardWeight || aircraft!.weights.maxGrossWeight,
        weightActual: weightVal,
        bankAngle: bankVal,
        densityAltitude: actualDA,
      })
    : null;

  // Validate inputs
  const validationErrors: ValidationError[] = aircraft
    ? validateInputs(
        weightVal,
        aircraft.weights.emptyWeight,
        aircraft.weights.maxGrossWeight,
        aircraft.weights.standardWeight || aircraft.weights.maxGrossWeight,
        bankVal,
        actualDA,
        actualPA,
        aircraft.serviceCeiling
      )
    : [];

  const errors = validationErrors.filter((e) => e.type === "error");
  const warnings = validationErrors.filter((e) => e.type === "warning");

  // Check for missing CLmax values
  const missingCLmax =
    aircraft &&
    ((flaps === "clean" && !aircraft.limits.clMaxClean) ||
      (flaps === "takeoff" && !aircraft.limits.clMaxTakeoff) ||
      (flaps === "landing" && !aircraft.limits.clMaxLanding));

  // Build share URL
  const shareUrl = (() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams();
    if (selectedAircraft) params.set("aircraft", selectedAircraft);
    if (weight) params.set("weight", weight);
    if (altitudeMode === "pa" && pressureAlt) params.set("pa", pressureAlt);
    else if (altitudeMode === "qnh" && altitude && qnh) {
      params.set("alt", altitude);
      params.set("qnh", qnh);
    } else if (altitudeMode === "da" && densityAlt) params.set("da", densityAlt);
    if (oat) params.set("oat", oat);
    if (flaps) params.set("flaps", flaps);
    if (bank) params.set("bank", bank);
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  })();

  return (
    <PageLayout currentPage="vstall">
      <CalculatorPageHeader
        title="V-Stall Calculator"
        description="Calculate stall speed (IAS and TAS) under different flight conditions including weight, bank angle, flap configuration, and density altitude"
      />

      <main className="w-full max-w-4xl">
        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">
          {/* Aircraft Selection Section */}
          <div className="mb-8 pb-8 border-b border-gray-700/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-sky-500/20 to-blue-500/20 border border-sky-500/30">
                <svg className="w-6 h-6" fill="none" stroke="oklch(0.7 0.15 230)" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: "white" }}>
                  Aircraft Selection
                </h2>
                <p className="text-sm" style={{ color: "oklch(0.65 0.02 240)" }}>
                  Choose your aircraft model
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Aircraft Type
                  <Tooltip content="Select the aircraft model from the database" />
                </label>
                <select
                  value={selectedAircraft}
                  onChange={(e) => setSelectedAircraft(e.target.value)}
                  className="w-full h-[52px] pl-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 hover:border-gray-500 text-white cursor-pointer"
                >
                  {PRESET_AIRCRAFT.map((ac) => (
                    <option key={ac.model} value={ac.model}>
                      {ac.name}
                    </option>
                  ))}
                </select>
              </div>
              {aircraft && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/30 border border-gray-700/50">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.55 0.02 240)" }}>
                      Empty Weight
                    </p>
                    <p className="text-lg font-bold" style={{ color: "white" }}>
                      {aircraft.weights.emptyWeight} <span className="text-xs font-normal" style={{ color: "oklch(0.6 0.02 240)" }}>lbs</span>
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/30 border border-gray-700/50">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.55 0.02 240)" }}>
                      Max Gross
                    </p>
                    <p className="text-lg font-bold" style={{ color: "white" }}>
                      {aircraft.weights.maxGrossWeight} <span className="text-xs font-normal" style={{ color: "oklch(0.6 0.02 240)" }}>lbs</span>
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.65 0.15 230)" }}>
                      Vs Clean
                    </p>
                    <p className="text-lg font-bold" style={{ color: "white" }}>
                      {aircraft.limits.vs} <span className="text-xs font-normal" style={{ color: "oklch(0.6 0.02 240)" }}>KIAS</span>
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.65 0.15 230)" }}>
                      Vs0 Landing
                    </p>
                    <p className="text-lg font-bold" style={{ color: "white" }}>
                      {aircraft.limits.vs0} <span className="text-xs font-normal" style={{ color: "oklch(0.6 0.02 240)" }}>KIAS</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Weight and Configuration Section */}
          <div className="mb-8 pb-8 border-b border-gray-700/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <svg className="w-6 h-6" fill="none" stroke="oklch(0.7 0.15 290)" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: "white" }}>
                  Weight & Configuration
                </h2>
                <p className="text-sm" style={{ color: "oklch(0.65 0.02 240)" }}>
                  Set aircraft weight and flap position
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Aircraft Weight
                  <Tooltip content="Current weight of the aircraft in pounds" />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className={`w-full h-[52px] px-4 pr-16 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all text-lg bg-slate-900/50 border-2 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right ${
                      errors.some(e => e.field === "weight")
                        ? "border-red-500/60 focus:ring-red-500/50 hover:border-red-500/70"
                        : "border-gray-600 focus:ring-purple-500/50 hover:border-gray-500"
                    }`}
                    placeholder="1500"
                  />
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                    style={{ color: "oklch(0.55 0.02 240)" }}
                  >
                    lbs
                  </span>
                </div>
              </div>

              <div>
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Flap Configuration
                  <Tooltip content="Select flap configuration: clean (no flaps), takeoff, or landing (full flaps)" />
                </label>
                <select
                  value={flaps}
                  onChange={(e) => setFlaps(e.target.value)}
                  className="w-full h-[52px] pl-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 hover:border-gray-500 text-white cursor-pointer"
                >
                  <option value="clean">✈️ Clean (No Flaps)</option>
                  <option value="takeoff">🛫 Takeoff / Approach</option>
                  <option value="landing">🛬 Landing (Full Flaps)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Altitude Section */}
          <div className="mb-8 pb-8 border-b border-gray-700/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30">
                <svg className="w-6 h-6" fill="none" stroke="oklch(0.7 0.15 200)" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: "white" }}>
                  Altitude Parameters
                </h2>
                <p className="text-sm" style={{ color: "oklch(0.65 0.02 240)" }}>
                  Choose input method and set altitude
                </p>
              </div>
            </div>

            {/* Altitude Mode Selection */}
            <div className="mb-6">
              <div className="inline-flex gap-2 p-1.5 rounded-xl bg-slate-900/50 border border-gray-700">
                <button
                  onClick={() => setAltitudeMode("pa")}
                  className={`px-5 py-2.5 rounded-lg transition-all cursor-pointer font-medium ${
                    altitudeMode === "pa"
                      ? "bg-gradient-to-r from-cyan-500/30 to-teal-500/30 border border-cyan-500/50 shadow-lg"
                      : "border border-transparent hover:bg-slate-800/50"
                  }`}
                  style={{ color: altitudeMode === "pa" ? "oklch(0.8 0.15 200)" : "oklch(0.65 0.02 240)" }}
                >
                  Pressure Altitude
                </button>
                <button
                  onClick={() => setAltitudeMode("qnh")}
                  className={`px-5 py-2.5 rounded-lg transition-all cursor-pointer font-medium ${
                    altitudeMode === "qnh"
                      ? "bg-gradient-to-r from-cyan-500/30 to-teal-500/30 border border-cyan-500/50 shadow-lg"
                      : "border border-transparent hover:bg-slate-800/50"
                  }`}
                  style={{ color: altitudeMode === "qnh" ? "oklch(0.8 0.15 200)" : "oklch(0.65 0.02 240)" }}
                >
                  Altitude + QNH
                </button>
                <button
                  onClick={() => setAltitudeMode("da")}
                  className={`px-5 py-2.5 rounded-lg transition-all cursor-pointer font-medium ${
                    altitudeMode === "da"
                      ? "bg-gradient-to-r from-cyan-500/30 to-teal-500/30 border border-cyan-500/50 shadow-lg"
                      : "border border-transparent hover:bg-slate-800/50"
                  }`}
                  style={{ color: altitudeMode === "da" ? "oklch(0.8 0.15 200)" : "oklch(0.65 0.02 240)" }}
                >
                  Density Altitude
                </button>
              </div>
            </div>

            {/* Altitude Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {altitudeMode === "pa" && (
                <div>
                  <label
                    className="flex items-center text-sm font-medium mb-2"
                    style={{ color: "oklch(0.72 0.015 240)" }}
                  >
                    Pressure Altitude
                    <Tooltip content="Altitude when altimeter is set to standard pressure (29.92 inHg / 1013 hPa)" />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={pressureAlt}
                      onChange={(e) => setPressureAlt(e.target.value)}
                      className="w-full h-[52px] px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
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
              )}

              {altitudeMode === "qnh" && (
                <>
                  <div>
                    <label
                      className="flex items-center text-sm font-medium mb-2"
                      style={{ color: "oklch(0.72 0.015 240)" }}
                    >
                      Altitude
                      <Tooltip content="Altitude above mean sea level" />
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={altitude}
                        onChange={(e) => setAltitude(e.target.value)}
                        className="w-full h-[52px] px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
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

                  <div>
                    <label
                      className="flex items-center text-sm font-medium mb-2"
                      style={{ color: "oklch(0.72 0.015 240)" }}
                    >
                      QNH
                      <Tooltip content="Current barometric pressure setting (hPa or inHg, auto-detected)" />
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={qnh}
                        onChange={(e) => setQnh(e.target.value)}
                        className="w-full h-[52px] px-4 pr-16 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                        placeholder="1013"
                      />
                      <span
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                        style={{ color: "oklch(0.55 0.02 240)" }}
                      >
                        {!isNaN(qnhVal) && qnhVal >= 25 && qnhVal <= 35 ? "inHg" : "hPa"}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {altitudeMode === "da" && (
                <div>
                  <label
                    className="flex items-center text-sm font-medium mb-2"
                    style={{ color: "oklch(0.72 0.015 240)" }}
                  >
                    Density Altitude
                    <Tooltip content="Pressure altitude corrected for non-standard temperature" />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={densityAlt}
                      onChange={(e) => setDensityAlt(e.target.value)}
                      className={`w-full h-[52px] px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all text-lg bg-slate-900/50 border-2 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right ${
                        errors.some(e => e.field === "densityAltitude")
                          ? "border-red-500/60 focus:ring-red-500/50 hover:border-red-500/70"
                          : "border-gray-600 focus:ring-sky-500/50"
                      }`}
                      placeholder="5000"
                    />
                    <span
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                      style={{ color: "oklch(0.55 0.02 240)" }}
                    >
                      ft
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  OAT (Optional)
                  <Tooltip content="Outside Air Temperature in Celsius (used to calculate density altitude)" />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={oat}
                    onChange={(e) => setOat(e.target.value)}
                    className="w-full h-[52px] px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                    placeholder="15"
                  />
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                    style={{ color: "oklch(0.55 0.02 240)" }}
                  >
                    °C
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Angle Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                <svg className="w-6 h-6" fill="none" stroke="oklch(0.7 0.15 50)" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: "white" }}>
                  Maneuvering Parameters
                </h2>
                <p className="text-sm" style={{ color: "oklch(0.65 0.02 240)" }}>
                  Set bank angle for accelerated stall
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Bank Angle
                  <Tooltip content="Bank angle for accelerated stall calculation (0-70°). Higher bank angles increase load factor and stall speed." />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    min="0"
                    max="70"
                    className={`w-full h-[52px] px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all text-lg bg-slate-900/50 border-2 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right ${
                      errors.some(e => e.field === "bankAngle")
                        ? "border-red-500/60 focus:ring-red-500/50 hover:border-red-500/70"
                        : "border-gray-600 focus:ring-amber-500/50 hover:border-gray-500"
                    }`}
                    placeholder="0"
                  />
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                    style={{ color: "oklch(0.55 0.02 240)" }}
                  >
                    °
                  </span>
                </div>
              </div>
              {results && (
                <div className="flex items-center">
                  <div className="w-full p-5 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.65 0.15 50)" }}>
                      Load Factor
                    </p>
                    <p className="text-3xl font-bold" style={{ color: "white" }}>
                      {results.loadFactor.toFixed(2)}<span className="text-lg ml-1" style={{ color: "oklch(0.6 0.02 240)" }}>g</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mb-8">
              {errors.map((error, idx) => (
                <div key={idx} className="mb-3 p-5 rounded-2xl bg-gradient-to-r from-red-500/10 to-pink-500/10 border-2 border-red-500/40 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-500/20 border border-red-500/40 flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="oklch(0.8 0.15 15)" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "oklch(0.8 0.15 15)" }}>
                        Error
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: "oklch(0.85 0.05 15)" }}>
                        {error.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="mb-8">
              {warnings.map((warning, idx) => (
                <div key={idx} className="mb-3 p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-2 border-amber-500/40 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500/20 border border-amber-500/40 flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="oklch(0.8 0.15 50)" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "oklch(0.8 0.15 50)" }}>
                        Warning
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: "oklch(0.85 0.05 50)" }}>
                        {warning.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Missing CLmax Warning */}
          {missingCLmax && (
            <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/40">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/20 border border-blue-500/40 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="oklch(0.7 0.15 230)" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "oklch(0.7 0.15 230)" }}>
                    Note
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "oklch(0.75 0.05 230)" }}>
                    CLmax data not available for this configuration. Using estimated values based on POH stall speeds.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {hasValidInputs && results && errors.length === 0 && (
            <>
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-500/30">
                    <svg className="w-6 h-6" fill="none" stroke="oklch(0.7 0.15 15)" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold" style={{ color: "white" }}>
                      Stall Speed Results
                    </h2>
                    <p className="text-sm" style={{ color: "oklch(0.65 0.02 240)" }}>
                      Calculated speeds under specified conditions
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {/* Stall IAS at Reference Weight */}
                  <div className="group relative p-6 rounded-2xl text-center bg-gradient-to-br from-slate-700/30 to-slate-800/30 border-2 border-gray-600/50 hover:border-gray-500/70 transition-all">
                    <div className="absolute top-3 right-3">
                      <Tooltip content="Reference stall speed at standard weight" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "oklch(0.6 0.02 240)" }}>
                      Vs Reference
                    </p>
                    <p className="text-4xl font-black mb-2" style={{ color: "white" }}>
                      {results.vsRef.toFixed(0)}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: "oklch(0.65 0.02 240)" }}>
                      KIAS
                    </p>
                  </div>

                  {/* Stall IAS Adjusted for Weight */}
                  <div className="group relative p-6 rounded-2xl text-center bg-gradient-to-br from-sky-500/20 to-blue-600/20 border-2 border-sky-500/40 hover:border-sky-400/60 transition-all shadow-lg">
                    <div className="absolute top-3 right-3">
                      <Tooltip content="Stall speed adjusted for actual aircraft weight" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "oklch(0.7 0.15 230)" }}>
                      Vs @ Weight
                    </p>
                    <p className="text-4xl font-black mb-2" style={{ color: "white" }}>
                      {results.vsWeight.toFixed(0)}
                    </p>
                    <div className="text-sm font-semibold" style={{ color: "oklch(0.7 0.15 230)" }}>
                      KIAS
                      {results.weightIncreasePercent !== 0 && (
                        <div className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs" style={{
                          backgroundColor: results.weightIncreasePercent > 0 ? "oklch(0.5 0.15 15 / 0.2)" : "oklch(0.5 0.15 150 / 0.2)",
                          color: results.weightIncreasePercent > 0 ? "oklch(0.85 0.15 15)" : "oklch(0.85 0.15 150)"
                        }}>
                          {results.weightIncreasePercent > 0 ? "+" : ""}{results.weightIncreasePercent.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stall IAS with Bank Angle - PRIMARY RESULT */}
                  <div className="group relative p-6 rounded-2xl text-center bg-gradient-to-br from-orange-500/30 to-red-600/30 border-2 border-orange-500/60 hover:border-orange-400/80 transition-all shadow-xl ring-2 ring-orange-500/20">
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-xs font-bold text-white">!</span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <Tooltip content="Stall speed adjusted for bank angle (accelerated stall) - PRIMARY RESULT" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "oklch(0.8 0.15 30)" }}>
                      Vs Accelerated
                    </p>
                    <p className="text-5xl font-black mb-2" style={{ color: "white", textShadow: "0 2px 20px rgba(251, 146, 60, 0.3)" }}>
                      {results.vsBank.toFixed(0)}
                    </p>
                    <div className="text-sm font-bold" style={{ color: "oklch(0.8 0.15 30)" }}>
                      KIAS
                      {results.bankIncreasePercent !== 0 && (
                        <div className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs bg-red-500/20" style={{ color: "oklch(0.85 0.15 15)" }}>
                          +{results.bankIncreasePercent.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stall TAS */}
                  <div className="group relative p-6 rounded-2xl text-center bg-gradient-to-br from-purple-500/20 to-pink-600/20 border-2 border-purple-500/40 hover:border-purple-400/60 transition-all shadow-lg">
                    <div className="absolute top-3 right-3">
                      <Tooltip content="True airspeed stall speed at current density altitude" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "oklch(0.7 0.15 290)" }}>
                      Vs TAS
                    </p>
                    <p className="text-4xl font-black mb-2" style={{ color: "white" }}>
                      {results.vsTAS.toFixed(0)}
                    </p>
                    <div className="text-sm font-semibold" style={{ color: "oklch(0.7 0.15 290)" }}>
                      KTAS
                      {results.tasIncreasePercent !== 0 && (
                        <div className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs bg-purple-500/20" style={{ color: "oklch(0.8 0.1 290)" }}>
                          +{results.tasIncreasePercent.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-slate-900/50 to-slate-800/50 border-2 border-gray-600/50">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-sky-500/20 to-blue-500/20 border border-sky-500/30 flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="oklch(0.7 0.15 230)" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "oklch(0.65 0.15 230)" }}>
                      Flight Summary
                    </p>
                    <p className="text-base leading-relaxed" style={{ color: "oklch(0.75 0.02 240)" }}>
                      At <span className="font-bold text-white">{weightVal.toFixed(0)} lbs</span> with{" "}
                      <span className="font-bold text-white">{flaps} flaps</span>,{" "}
                      <span className="font-bold text-white">{bankVal.toFixed(0)}° bank</span>, and{" "}
                      <span className="font-bold text-white">{actualDA.toFixed(0)} ft</span> density altitude, the stall speed is{" "}
                      <span className="inline-block px-3 py-1 rounded-lg font-black text-lg bg-gradient-to-r from-orange-500/30 to-red-500/30 border border-orange-500/50" style={{ color: "oklch(0.85 0.15 30)" }}>
                        {results.vsBank.toFixed(0)} KIAS
                      </span>{" "}
                      <span className="text-sm">
                        ({results.vsTAS.toFixed(0)} KTAS)
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Share Button */}
              <ShareButton
                shareData={{
                  title: "José's V-Stall Calculator",
                  text: `${aircraft?.name}: Vs = ${results.vsBank.toFixed(0)} KIAS (${results.vsTAS.toFixed(0)} KTAS) at ${weightVal.toFixed(0)} lbs, ${bankVal.toFixed(0)}° bank, ${flaps} flaps`,
                }}
              />
            </>
          )}

          {/* Note */}
          <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-slate-900/40 to-slate-800/40 border-2 border-gray-700/50">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-gray-500/20 to-gray-600/20 border border-gray-500/30 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="oklch(0.65 0.02 240)" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "oklch(0.65 0.02 240)" }}>
                  Important Safety Information
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "oklch(0.7 0.02 240)" }}>
                  Stall speeds are calculated using aerodynamic formulas and aircraft performance data. Always refer to your aircraft&apos;s POH for official stall speeds. Bank angles above 45° significantly increase stall speed and should be avoided in normal operations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer description="V-Stall calculations based on aerodynamic theory and aircraft performance data" />
    </PageLayout>
  );
}
