"use client";

import { useState, useEffect, Fragment } from "react";
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from "@headlessui/react";
import Link from "next/link";
import { ResolvedAircraftPerformance, PRESET_AIRCRAFT } from "@/lib/aircraft";
import { loadCustomAircraft, getAircraftByModel, resolveAircraft } from "@/lib/aircraftStorage";

interface AircraftSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (aircraft: ResolvedAircraftPerformance) => void;
  initialAircraft?: ResolvedAircraftPerformance;
}

export function AircraftSelectorModal({
  isOpen,
  onClose,
  onApply,
  initialAircraft,
}: AircraftSelectorModalProps) {
  const [selectedModel, setSelectedModel] = useState<string>(initialAircraft?.model || "C150");
  const [customAircraft, setCustomAircraft] = useState<ResolvedAircraftPerformance[]>([]);

  // Load custom aircraft from localStorage when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCustomAircraft().then(loaded => {
        setCustomAircraft(loaded.map(ac => resolveAircraft(ac)));
        if (initialAircraft) {
          setSelectedModel(initialAircraft.model);
        }
      });
    }
  }, [isOpen, initialAircraft]);

  const handleApply = () => {
    const aircraft = getAircraftByModel(selectedModel);
    if (aircraft) {
      onApply(aircraft);
      onClose();
    }
  };

  const selectedAircraft = getAircraftByModel(selectedModel);
  const isPreset = PRESET_AIRCRAFT.some((preset) => preset.model === selectedModel);

  return (
    <Transition show={isOpen} as={Fragment}>
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-slate-800 shadow-xl transition-all border border-slate-700">
                {/* Header */}
                <div className="p-6 border-b border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <DialogTitle className="text-2xl font-bold text-white">
                      Select Aircraft
                    </DialogTitle>
                    <button
                      onClick={onClose}
                      className="p-2 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer text-slate-400"
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
                  <p className="text-sm text-slate-400">
                    Choose from preset aircraft or your custom aircraft
                  </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  {/* Aircraft Selection */}
                  <div>
                    <label className="text-sm font-medium mb-2 block text-slate-300">
                      Aircraft
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-slate-600 text-white cursor-pointer"
                    >
                      <optgroup label="Preset Aircraft">
                        {PRESET_AIRCRAFT.map((ac) => (
                          <option key={ac.model} value={ac.model}>
                            {ac.name}
                          </option>
                        ))}
                      </optgroup>
                      {customAircraft.length > 0 && (
                        <optgroup label="Custom Aircraft" className="text-sky-400">
                          {customAircraft.map((ac) => (
                            <option key={ac.model} value={ac.model} className="text-sky-400">
                              {ac.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>

                  {/* Aircraft Info Preview */}
                  {selectedAircraft && (
                    <div className="bg-slate-900/50 rounded-xl border border-slate-700 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">{selectedAircraft.name}</h3>
                        {!isPreset && (
                          <Link
                            href={`/aircraft/${selectedModel}`}
                            className="text-sm px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors"
                          >
                            Edit Aircraft
                          </Link>
                        )}
                      </div>

                      {/* Weight Info */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Empty Weight</p>
                          <p className="text-white font-medium">{selectedAircraft.weights.emptyWeight} lbs</p>
                        </div>
                        {selectedAircraft.weights.standardWeight && (
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Standard Weight</p>
                            <p className="text-white font-medium">{selectedAircraft.weights.standardWeight} lbs</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Max Gross Weight</p>
                          <p className="text-white font-medium">{selectedAircraft.weights.maxGrossWeight} lbs</p>
                        </div>
                      </div>

                      {/* Climb Table Preview */}
                      {selectedAircraft.climbTable && selectedAircraft.climbTable.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-400 mb-2">Climb Performance Table</p>
                          <div className="overflow-x-auto rounded-lg border border-slate-700">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-800">
                                <tr className="border-b border-slate-700">
                                  <th className="px-3 py-2 text-left text-slate-300 font-medium text-xs">From (ft)</th>
                                  <th className="px-3 py-2 text-left text-slate-300 font-medium text-xs">To (ft)</th>
                                  <th className="px-3 py-2 text-left text-slate-300 font-medium text-xs">ROC (fpm)</th>
                                  <th className="px-3 py-2 text-left text-slate-300 font-medium text-xs">TAS (KT)</th>
                                  <th className="px-3 py-2 text-left text-slate-300 font-medium text-xs">Fuel (gph)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedAircraft.climbTable.map((segment, index) => (
                                  <tr key={index} className="border-b border-slate-700/50">
                                    <td className="px-3 py-2 text-white">{segment.altitudeFrom}</td>
                                    <td className="px-3 py-2 text-white">{segment.altitudeTo}</td>
                                    <td className="px-3 py-2 text-white">{segment.rateOfClimb}</td>
                                    <td className="px-3 py-2 text-white">{segment.climbTAS}</td>
                                    <td className="px-3 py-2 text-white">{segment.fuelFlow}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Link to create new aircraft */}
                  <div className="text-center">
                    <Link
                      href="/my-planes"
                      className="text-sm text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      + Create New Aircraft
                    </Link>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white transition-all cursor-pointer"
                  >
                    Apply
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
