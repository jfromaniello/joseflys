"use client";

import { useState, useEffect, useRef } from "react";
import { Tooltip } from "./Tooltip";
import { formatDistance } from "@/lib/formatters";
import { calculatePA, calculateDA, calculateISATemp, calculatePAFromDA, isInHg } from "@/lib/isaCalculations";

export type AltitudeMode = "pa" | "qnh" | "da";

export interface AtmosphericConditionsData {
  // Input mode
  altitudeMode: AltitudeMode;

  // Raw input values (as strings, for form control)
  pressureAlt: string;
  altitude: string;
  qnh: string;
  densityAlt: string;
  oat: string;

  // Calculated values
  actualPA: number;
  actualDA: number;

  // Parsed values for convenience
  oatVal: number;
  paVal: number;
  altVal: number;
  qnhVal: number;
  daVal: number;
}

export interface AtmosphericPreset {
  altitudeMode?: AltitudeMode;
  altitude?: string;
  qnh?: string;
  oat?: string;
}

interface AtmosphericConditionsInputsProps {
  // Initial values (from URL params)
  initialAltitudeMode?: AltitudeMode;
  initialPressureAlt?: string;
  initialAltitude?: string;
  initialQNH?: string;
  initialDensityAlt?: string;
  initialOAT?: string;

  // External preset to apply (e.g., from METAR)
  preset?: AtmosphericPreset | null;

  // Callback when values change
  onChange: (data: AtmosphericConditionsData) => void;

  // Optional display settings
  showCalculatedValues?: boolean;

  // Validation errors (optional)
  errors?: Array<{ field: string; message: string }>;
}

export function AtmosphericConditionsInputs({
  initialAltitudeMode = "pa",
  initialPressureAlt = "",
  initialAltitude = "",
  initialQNH = "",
  initialDensityAlt = "",
  initialOAT = "",
  preset,
  onChange,
  showCalculatedValues = false,
  errors = [],
}: AtmosphericConditionsInputsProps) {
  // Internal state
  const [altitudeMode, setAltitudeMode] = useState<AltitudeMode>(initialAltitudeMode);
  const [pressureAlt, setPressureAlt] = useState(initialPressureAlt);
  const [altitude, setAltitude] = useState(initialAltitude);
  const [qnh, setQnh] = useState(initialQNH);
  const [densityAlt, setDensityAlt] = useState(initialDensityAlt);
  const [oat, setOat] = useState(initialOAT);

  // Store latest onChange ref to avoid dependency issues
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Apply external preset when it changes
  useEffect(() => {
    if (preset) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (preset.altitudeMode) setAltitudeMode(preset.altitudeMode);
      if (preset.altitude !== undefined) setAltitude(preset.altitude);
      if (preset.qnh !== undefined) setQnh(preset.qnh);
      if (preset.oat !== undefined) setOat(preset.oat);
    }
  }, [preset]);

  // Calculate derived values whenever inputs change
  useEffect(() => {
    // Parse values
    const paVal = parseFloat(pressureAlt);
    const altVal = parseFloat(altitude);
    const qnhVal = parseFloat(qnh);
    const daVal = parseFloat(densityAlt);
    const oatVal = parseFloat(oat);

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
      if (!isNaN(oatVal)) {
        actualPA = calculatePAFromDA(daVal, oatVal);
      } else {
        actualPA = daVal; // Without OAT, assume ISA conditions (PA = DA)
      }
    }

    // Call parent callback with all data
    onChangeRef.current({
      altitudeMode,
      pressureAlt,
      altitude,
      qnh,
      densityAlt,
      oat,
      actualPA,
      actualDA,
      oatVal,
      paVal,
      altVal,
      qnhVal,
      daVal,
    });
  }, [altitudeMode, pressureAlt, altitude, qnh, densityAlt, oat]);

  // Parse QNH value for format detection
  const qnhVal = parseFloat(qnh);
  const qnhFormat = !isNaN(qnhVal) && isInHg(qnhVal) ? "inHg" : "hPa";

  // Calculate displayed PA/DA for calculated values section
  let displayPA = 0;
  let displayDA = 0;

  const paVal2 = parseFloat(pressureAlt);
  const altVal = parseFloat(altitude);
  const qnhVal2 = parseFloat(qnh);
  const daVal = parseFloat(densityAlt);
  const oatVal = parseFloat(oat);

  if (altitudeMode === "pa" && !isNaN(paVal2)) {
    displayPA = paVal2;
    if (!isNaN(oatVal)) {
      const isaTemp = calculateISATemp(paVal2);
      displayDA = calculateDA(paVal2, oatVal, isaTemp);
    } else {
      displayDA = paVal2;
    }
  } else if (altitudeMode === "qnh" && !isNaN(altVal) && !isNaN(qnhVal2)) {
    displayPA = calculatePA(altVal, qnhVal2);
    if (!isNaN(oatVal)) {
      const isaTemp = calculateISATemp(displayPA);
      displayDA = calculateDA(displayPA, oatVal, isaTemp);
    } else {
      displayDA = displayPA;
    }
  } else if (altitudeMode === "da" && !isNaN(daVal)) {
    displayDA = daVal;
    if (!isNaN(oatVal)) {
      displayPA = calculatePAFromDA(daVal, oatVal);
    } else {
      displayPA = daVal;
    }
  }

  return (
    <div className="mb-8 pb-8 border-b border-gray-700/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30">
          <svg className="w-6 h-6" fill="none" stroke="oklch(0.7 0.15 200)" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "white" }}>
            Atmospheric Conditions
          </h2>
          <p className="text-sm" style={{ color: "oklch(0.65 0.02 240)" }}>
            Set altitude and temperature
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
                className="w-full h-[52px] px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 hover:border-gray-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
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
                Field Elevation
                <Tooltip content="Airport elevation above sea level" />
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={altitude}
                  onChange={(e) => setAltitude(e.target.value)}
                  className="w-full h-[52px] px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 hover:border-gray-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
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
                <Tooltip content="The barometric pressure setting. Enter in hPa (millibars) or inHg. Format is auto-detected (25-35 = inHg, otherwise hPa)." />
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={qnh}
                  onChange={(e) => setQnh(e.target.value)}
                  className="w-full h-[52px] px-4 pr-16 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 hover:border-gray-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                  placeholder="1013 or 29.92"
                />
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                  style={{ color: "oklch(0.55 0.02 240)" }}
                >
                  {qnhFormat}
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
                    : "border-gray-600 hover:border-gray-500 focus:ring-cyan-500/50"
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
            Outside Air Temperature
            <Tooltip content="Current temperature at the airport in degrees Celsius" />
          </label>
          <div className="relative">
            <input
              type="number"
              value={oat}
              onChange={(e) => setOat(e.target.value)}
              className="w-full h-[52px] px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 hover:border-gray-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
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

      {/* Calculated Values Display */}
      {showCalculatedValues && !isNaN(displayPA) && !isNaN(displayDA) && (
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.65 0.15 200)" }}>
              Pressure Altitude
            </p>
            <p className="text-2xl font-bold" style={{ color: "white" }}>
              {formatDistance(displayPA)} <span className="text-sm font-normal" style={{ color: "oklch(0.6 0.02 240)" }}>ft</span>
            </p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-teal-500/10 to-green-500/10 border border-teal-500/30">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.65 0.15 180)" }}>
              Density Altitude
            </p>
            <p className="text-2xl font-bold" style={{ color: "white" }}>
              {formatDistance(displayDA)} <span className="text-sm font-normal" style={{ color: "oklch(0.6 0.02 240)" }}>ft</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
