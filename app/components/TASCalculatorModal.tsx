"use client";

import { useState, useEffect, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Tooltip } from "./Tooltip";
import { calculateTAS } from "@/lib/tasCalculations";
import { SpeedUnit } from "../course/components/CourseSpeedInputs";
import { toKnots, fromKnots } from "@/lib/speedConversion";

interface TASCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: { tas: number; speedUnit: SpeedUnit }) => void;
  description?: string;
  initialSpeedUnit?: SpeedUnit;
  applyButtonText?: string;
}

export function TASCalculatorModal({
  isOpen,
  onClose,
  onApply,
  description,
  initialSpeedUnit = 'kt',
  applyButtonText = 'Apply',
}: TASCalculatorModalProps) {
  const [cas, setCas] = useState("");
  const [oat, setOat] = useState("");
  const [altitude, setAltitude] = useState("");
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>(initialSpeedUnit);

  // Update speed unit when initialSpeedUnit changes
  useEffect(() => {
    setSpeedUnit(initialSpeedUnit);
  }, [initialSpeedUnit]);

  // Calculate TAS (always calculate in knots internally)
  const casVal = parseFloat(cas);
  const oatVal = parseFloat(oat);
  const altVal = parseFloat(altitude);

  // Convert CAS to knots for calculation
  const casInKnots = !isNaN(casVal) ? toKnots(casVal, speedUnit) : NaN;

  const tasInKnots =
    !isNaN(casInKnots) && !isNaN(oatVal) && !isNaN(altVal)
      ? calculateTAS(casInKnots, oatVal, altVal)
      : null;

  // Convert result back to selected unit for display
  const tasInSelectedUnit = tasInKnots !== null ? fromKnots(tasInKnots, speedUnit) : null;

  const handleApply = () => {
    if (tasInSelectedUnit !== null) {
      onApply({
        tas: Math.round(tasInSelectedUnit),
        speedUnit: speedUnit,
      });
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start sm:items-center justify-center p-4 pt-20 sm:pt-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-slate-800 shadow-2xl transition-all border border-gray-700">
                {/* Header */}
                <div className="bg-slate-800 border-b border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Dialog.Title
                      as="h2"
                      className="text-2xl font-bold"
                      style={{ color: "white" }}
                    >
                      Calculate True Airspeed
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      className="p-2 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                      style={{ color: "oklch(0.6 0.02 240)" }}
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  {description && (
                    <p className="text-sm" style={{ color: "oklch(0.6 0.02 240)" }}>
                      {description}
                    </p>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  {/* Speed Unit Selector */}
                  <div className="flex items-center gap-3 mb-2">
                    <label className="text-sm font-medium text-gray-300">
                      Speed Unit:
                    </label>
                    <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-1">
                      <button
                        onClick={() => setSpeedUnit('kt')}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                          speedUnit === 'kt'
                            ? "bg-sky-500/20 text-sky-400"
                            : "text-gray-400 hover:text-gray-300"
                        }`}
                      >
                        kt
                      </button>
                      <button
                        onClick={() => setSpeedUnit('kmh')}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                          speedUnit === 'kmh'
                            ? "bg-sky-500/20 text-sky-400"
                            : "text-gray-400 hover:text-gray-300"
                        }`}
                      >
                        km/h
                      </button>
                      <button
                        onClick={() => setSpeedUnit('mph')}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                          speedUnit === 'mph'
                            ? "bg-sky-500/20 text-sky-400"
                            : "text-gray-400 hover:text-gray-300"
                        }`}
                      >
                        mph
                      </button>
                    </div>
                  </div>

                  {/* Input Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* CAS Input */}
                    <div>
                      <label
                        className="flex items-center text-sm font-medium mb-2"
                        style={{ color: "oklch(0.72 0.015 240)" }}
                      >
                        Calibrated Airspeed
                        <Tooltip content="The airspeed reading from your airspeed indicator, corrected for instrument and position errors." />
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={cas}
                          onChange={(e) => setCas(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
                          placeholder="90"
                        />
                        <span
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                          style={{ color: "oklch(0.55 0.02 240)" }}
                        >
                          {speedUnit}
                        </span>
                      </div>
                    </div>

                    {/* OAT Input */}
                    <div>
                      <label
                        className="flex items-center text-sm font-medium mb-2"
                        style={{ color: "oklch(0.72 0.015 240)" }}
                      >
                        Outside Air Temp
                        <Tooltip content="The actual air temperature outside the aircraft in Celsius." />
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={oat}
                          onChange={(e) => setOat(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
                          placeholder="8"
                        />
                        <span
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                          style={{ color: "oklch(0.55 0.02 240)" }}
                        >
                          °C
                        </span>
                      </div>
                    </div>

                    {/* Altitude Input */}
                    <div>
                      <label
                        className="flex items-center text-sm font-medium mb-2"
                        style={{ color: "oklch(0.72 0.015 240)" }}
                      >
                        Pressure Altitude
                        <Tooltip content="Altitude above standard pressure (29.92 inHg). Set your altimeter to 29.92 and read the indicated altitude." />
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={altitude}
                          onChange={(e) => setAltitude(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
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
                  </div>

                  {/* Result */}
                  {tasInSelectedUnit !== null && (
                    <div className="p-6 rounded-xl text-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
                      <div className="text-sm text-gray-400 mb-1">True Airspeed</div>
                      <div className="text-4xl font-bold text-white">
                        {tasInSelectedUnit.toFixed(2)} {speedUnit}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="bg-slate-800 border-t border-gray-700 p-6 flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 px-6 rounded-xl font-medium border-2 border-gray-600 hover:bg-slate-700 transition-all cursor-pointer"
                    style={{ color: "white" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={tasInSelectedUnit === null}
                    className="flex-1 py-3 px-6 rounded-xl font-medium border-2 border-sky-500 bg-sky-500/20 hover:bg-sky-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: "oklch(0.8 0.15 230)" }}
                  >
                    {applyButtonText}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
