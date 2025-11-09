"use client";

import { useState, useEffect, Fragment } from "react";
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from "@headlessui/react";
import { Tooltip } from "./Tooltip";
import { calculateISA, isInHg, isValidQNH, getQNHRange } from "@/lib/isaCalculations";

interface DensityAltitudeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (densityAltitude: number) => void;
  initialElevation?: number;
}

export function DensityAltitudeModal({
  isOpen,
  onClose,
  onApply,
  initialElevation = 0,
}: DensityAltitudeModalProps) {
  const [elevation, setElevation] = useState<string>(initialElevation.toString());
  const [qnh, setQnh] = useState<string>("1013");
  const [temp, setTemp] = useState<string>("15");

  useEffect(() => {
    setElevation(initialElevation.toString());
  }, [initialElevation]);

  // Parse values
  const elevVal = parseFloat(elevation);
  const qnhVal = parseFloat(qnh);
  const tempVal = parseFloat(temp);

  // Detect QNH format independently
  const qnhFormat = !isNaN(qnhVal) && isInHg(qnhVal) ? "inHg" : "hPa";

  // Calculate results
  const hasValidInputs = !isNaN(elevVal) && !isNaN(qnhVal) && !isNaN(tempVal);

  const results = hasValidInputs ? calculateISA(elevVal, qnhVal, tempVal) : null;

  const isaTemp = results?.isaTemp ?? null;
  const pa = results?.pressureAltitude ?? null;
  const da = results?.densityAltitude ?? null;

  const handleApply = () => {
    if (da !== null) {
      onApply(Math.round(da));
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start sm:items-center justify-center p-4 pt-20 sm:pt-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-slate-800 shadow-2xl transition-all border border-gray-700">
                {/* Header */}
                <div className="bg-slate-800 border-b border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <DialogTitle
                      as="h2"
                      className="text-2xl font-bold"
                      style={{ color: "white" }}
                    >
                      Calculate Density Altitude
                    </DialogTitle>
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
                  <p className="text-sm" style={{ color: "oklch(0.6 0.02 240)" }}>
                    Calculate density altitude using ISA standard atmosphere
                  </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  {/* Input Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Elevation Input */}
                    <div>
                      <label
                        className="flex items-center text-sm font-medium mb-2"
                        style={{ color: "oklch(0.72 0.015 240)" }}
                      >
                        Elevation
                        <Tooltip content="The altitude of the aerodrome or location above mean sea level in feet." />
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={elevation}
                          onChange={(e) => setElevation(e.target.value)}
                          className="w-full px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white text-right"
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

                    {/* QNH Input */}
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
                          className="w-full px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white text-right"
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

                    {/* Temperature Input */}
                    <div>
                      <label
                        className="flex items-center text-sm font-medium mb-2"
                        style={{ color: "oklch(0.72 0.015 240)" }}
                      >
                        Actual Temperature
                        <Tooltip content="The actual outside air temperature in degrees Celsius at the current location." />
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={temp}
                          onChange={(e) => setTemp(e.target.value)}
                          className="w-full px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white text-right"
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

                  {/* QNH Validation Warning */}
                  {!isNaN(qnhVal) && qnh && !isValidQNH(qnhVal) && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                      <p className="text-xs leading-relaxed" style={{ color: "oklch(0.75 0.15 15)" }}>
                        <span className="font-semibold">⚠️ Invalid QNH:</span> The value {qnhVal.toFixed(2)} {qnhFormat} is outside the typical range.
                        Expected range: {getQNHRange(qnhVal).min} - {getQNHRange(qnhVal).max} {getQNHRange(qnhVal).unit}.
                      </p>
                    </div>
                  )}

                  {/* Results */}
                  {hasValidInputs && isaTemp !== null && pa !== null && da !== null && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* ISA Temperature Result */}
                      <div className="p-4 rounded-xl text-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
                        <div className="text-xs text-gray-400 mb-1">ISA Temperature</div>
                        <div className="text-2xl font-bold text-white">
                          {isaTemp.toFixed(1)}°C
                        </div>
                      </div>

                      {/* Pressure Altitude Result */}
                      <div className="p-4 rounded-xl text-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
                        <div className="text-xs text-gray-400 mb-1">Pressure Altitude</div>
                        <div className="text-2xl font-bold text-white">{pa.toFixed(0)} ft</div>
                      </div>

                      {/* Density Altitude Result */}
                      <div className="p-4 rounded-xl text-center bg-linear-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30">
                        <div className="text-xs text-amber-400 mb-1 font-semibold">
                          Density Altitude
                        </div>
                        <div className="text-2xl font-bold text-white">{da.toFixed(0)} ft</div>
                      </div>
                    </div>
                  )}

                  {/* Performance Note */}
                  {hasValidInputs && da !== null && elevVal !== null && da > elevVal + 1000 && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: "oklch(0.7 0.1 30)" }}
                      >
                        <span className="font-semibold">High Density Altitude:</span> Aircraft
                        performance will be reduced. Expect longer takeoff rolls, reduced climb
                        rate, and decreased engine performance.
                      </p>
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
                    disabled={da === null}
                    className="flex-1 py-3 px-6 rounded-xl font-medium border-2 border-sky-500 bg-sky-500/20 hover:bg-sky-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: "oklch(0.8 0.15 230)" }}
                  >
                    Apply Density Altitude
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
