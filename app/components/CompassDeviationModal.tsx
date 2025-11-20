"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from "@headlessui/react";
import Link from "next/link";
import {
  loadCustomAircraft,
  resolveAircraft,
} from "@/lib/aircraftStorage";
import {
  ResolvedAircraftPerformance,
  DeviationEntry,
} from "@/lib/aircraft";

// Re-export DeviationEntry for backward compatibility
export type { DeviationEntry };

interface CompassDeviationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (entries: DeviationEntry[], aircraft?: ResolvedAircraftPerformance) => void;
  initialEntries?: DeviationEntry[];
  initialAircraft?: ResolvedAircraftPerformance | null;
}

export function CompassDeviationModal({
  isOpen,
  onClose,
  onApply,
  initialAircraft = null,
}: CompassDeviationModalProps) {
  const [customAircraft, setCustomAircraft] = useState<ResolvedAircraftPerformance[]>([]);
  const [selectedAircraftModel, setSelectedAircraftModel] = useState<string>("");

  // Track previous modal state
  const prevIsOpenRef = useRef(false);

  // Load custom aircraft when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCustomAircraft().then(loaded => {
        const filtered = loaded
          .filter(ac => ac.deviationTable && ac.deviationTable.length > 0) // Only show aircraft with deviation tables
          .map(ac => resolveAircraft(ac));
        setCustomAircraft(filtered);
      });
    }
  }, [isOpen]);

  // Initialize selected aircraft when modal opens
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      // If initialAircraft is provided and has a deviation table, use it
      if (initialAircraft && initialAircraft.deviationTable && initialAircraft.deviationTable.length > 0) {
        // Safe: Synchronizing with external system (modal state transition)
        // Only runs on closed → open transition (tracked by prevIsOpenRef)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedAircraftModel(initialAircraft.model);
      } else if (customAircraft.length > 0) {
        // Select first aircraft by default
        setSelectedAircraftModel(customAircraft[0].model);
      } else {
        setSelectedAircraftModel("");
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialAircraft, customAircraft]);

  const handleApply = () => {
    const selectedAircraft = customAircraft.find(ac => ac.model === selectedAircraftModel);

    if (selectedAircraft && selectedAircraft.deviationTable) {
      // Sort entries by forHeading for proper interpolation
      const sortedEntries = [...selectedAircraft.deviationTable].sort(
        (a, b) => a.forHeading - b.forHeading
      );
      onApply(sortedEntries, selectedAircraft);
      onClose();
    }
  };

  const selectedAircraft = customAircraft.find(ac => ac.model === selectedAircraftModel);

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
                      Compass Deviation Table
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
                    Select an aircraft with a deviation table from your custom aircraft
                  </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  {customAircraft.length === 0 ? (
                    /* No aircraft with deviation tables */
                    <div className="text-center py-8">
                      <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-slate-400 text-lg mb-2">No aircraft with deviation tables</p>
                      <p className="text-slate-500 text-sm mb-4">
                        Create a custom aircraft in My Planes and add a deviation table
                      </p>
                      <Link
                        href="/my-planes"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors cursor-pointer"
                      >
                        Go to My Planes
                      </Link>
                    </div>
                  ) : (
                    <>
                      {/* Aircraft Selection */}
                      <div>
                        <label className="text-sm font-medium mb-2 block text-slate-300">
                          Aircraft
                        </label>
                        <select
                          value={selectedAircraftModel}
                          onChange={(e) => setSelectedAircraftModel(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-slate-600 text-white cursor-pointer"
                        >
                          {customAircraft.map((ac) => (
                            <option key={ac.model} value={ac.model}>
                              {ac.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Deviation Table Preview */}
                      {selectedAircraft && selectedAircraft.deviationTable && (
                        <div className="bg-slate-900/50 rounded-xl border border-slate-700 p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">{selectedAircraft.name}</h3>
                            <Link
                              href={`/aircraft/${selectedAircraftModel}`}
                              className="text-sm px-3 py-1.5 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 hover:text-sky-200 border border-sky-500/30 transition-all cursor-pointer"
                            >
                              Edit Aircraft
                            </Link>
                          </div>

                          {/* Deviation Table */}
                          <div>
                            <p className="text-xs text-slate-400 mb-2">Compass Deviation Table</p>
                            <div className="overflow-x-auto rounded-lg border border-slate-700">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-800">
                                  <tr className="border-b border-slate-700">
                                    <th className="px-3 py-2 text-left text-slate-300 font-medium text-xs">For (°)</th>
                                    <th className="px-3 py-2 text-left text-slate-300 font-medium text-xs">Steer (°)</th>
                                    <th className="px-3 py-2 text-left text-slate-300 font-medium text-xs">Deviation</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedAircraft.deviationTable.map((entry, index) => {
                                    const deviation = entry.steerHeading - entry.forHeading;
                                    return (
                                      <tr key={index} className="border-b border-slate-700/50">
                                        <td className="px-3 py-2 text-white">{String(entry.forHeading).padStart(3, '0')}°</td>
                                        <td className="px-3 py-2 text-white">{String(entry.steerHeading).padStart(3, '0')}°</td>
                                        <td className="px-3 py-2 text-slate-400">
                                          {deviation > 0 ? '+' : ''}{deviation}°
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Link to create new aircraft */}
                      <div className="text-center">
                        <Link
                          href="/my-planes"
                          className="text-sm text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                        >
                          + Manage Aircraft in My Planes
                        </Link>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer */}
                {customAircraft.length > 0 && (
                  <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
                    <button
                      onClick={onClose}
                      className="px-6 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApply}
                      disabled={!selectedAircraftModel}
                      className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
