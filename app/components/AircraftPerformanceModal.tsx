"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from "@headlessui/react";
import { Tooltip } from "./Tooltip";
import {
  AircraftPerformance,
  ResolvedAircraftPerformance,
  ClimbPerformance,
  PRESET_AIRCRAFT,
  createEmptyAircraftWithClimb,
} from "@/lib/aircraft";
import { saveAircraft, loadCustomAircraft, updateAircraft, resolveAircraft } from "@/lib/aircraftStorage";

interface AircraftPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (aircraft: ResolvedAircraftPerformance) => void;
  initialAircraft?: ResolvedAircraftPerformance;
}

export function AircraftPerformanceModal({
  isOpen,
  onClose,
  onApply,
  initialAircraft,
}: AircraftPerformanceModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("C150");
  const [aircraft, setAircraft] = useState<AircraftPerformance>(
    initialAircraft || PRESET_AIRCRAFT[0]
  );
  const [isCustom, setIsCustom] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [customAircraft, setCustomAircraft] = useState<AircraftPerformance[]>([]);

  // Track previous modal state to detect open transition
  const prevIsOpenRef = useRef(false);

  // Load custom aircraft when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCustomAircraft().then(loaded => {
        setCustomAircraft(loaded);
      });
    }
  }, [isOpen]);

  // Reset form when modal opens or initialAircraft changes
  useEffect(() => {
    // Only reset when modal transitions from closed to open, or initialAircraft changes
    if ((isOpen && !prevIsOpenRef.current) || initialAircraft) {
      if (initialAircraft) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAircraft(initialAircraft);
        const preset = PRESET_AIRCRAFT.find((ac) => ac.model === initialAircraft.model);
        if (preset) {
          setSelectedPreset(preset.model);
          setIsCustom(false);
        } else {
          setIsCustom(true);
        }
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialAircraft]);

  const handlePresetChange = (model: string) => {
    if (model === "CUSTOM") {
      setIsCustom(true);
      setIsEditing(true);
      setAircraft(createEmptyAircraftWithClimb());
    } else {
      // Check presets first
      const preset = PRESET_AIRCRAFT.find((ac) => ac.model === model);
      if (preset) {
        setIsCustom(false);
        setIsEditing(false);
        setAircraft(JSON.parse(JSON.stringify(preset))); // Deep copy to allow editing
        setSelectedPreset(model);
      } else {
        // Check custom aircraft
        const custom = customAircraft.find((ac) => ac.model === model);
        if (custom) {
          setIsCustom(true);
          setIsEditing(false);
          const aircraftCopy = JSON.parse(JSON.stringify(custom));
          // Ensure weights object exists
          if (!aircraftCopy.weights) {
            aircraftCopy.weights = {
              emptyWeight: 1200,
              standardWeight: 2000,
              maxGrossWeight: 2200,
            };
          }
          setAircraft(aircraftCopy);
          setSelectedPreset(model);
        }
      }
    }
  };

  const handleApply = () => {
    let savedAircraft = aircraft;

    if (isCustom || isEditing) {
      // Check if this is an existing custom aircraft being edited
      const existingCustom = customAircraft.find(ac => ac.model === aircraft.model);

      if (existingCustom) {
        // Update existing aircraft
        const updated = updateAircraft(aircraft.model, aircraft);
        if (updated) {
          savedAircraft = updated;
        }
      } else {
        // Save as new aircraft
        savedAircraft = saveAircraft(aircraft);
      }
    }

    // Always resolve aircraft before passing to caller (in case it has inheritance)
    onApply(resolveAircraft(savedAircraft));
    onClose();
  };

  const addRow = () => {
    const lastRow = aircraft.climbTable?.[aircraft.climbTable.length - 1];
    // Get unique OAT values
    const existingOATs = [...new Set((aircraft.climbTable || []).map(r => r.oat))].sort((a, b) => a - b);
    const lastOAT = existingOATs.length > 0 ? existingOATs[existingOATs.length - 1] : 20;

    const newRow: ClimbPerformance = {
      pressureAltitude: lastRow?.pressureAltitude ? lastRow.pressureAltitude + 2000 : 0,
      oat: lastOAT,
      timeFromSL: lastRow?.timeFromSL ? lastRow.timeFromSL + 5 : 0,
      fuelFromSL: lastRow?.fuelFromSL ? lastRow.fuelFromSL + 1 : 0,
      distanceFromSL: lastRow?.distanceFromSL ? lastRow.distanceFromSL + 5 : 0,
    };

    setAircraft({
      ...aircraft,
      climbTable: [...(aircraft.climbTable || []), newRow],
    });
  };

  const removeRow = (index: number) => {
    if (aircraft.climbTable && aircraft.climbTable.length > 1) {
      setAircraft({
        ...aircraft,
        climbTable: aircraft.climbTable.filter((_, i) => i !== index),
      });
    }
  };

  const updateRow = (index: number, field: keyof ClimbPerformance, value: number) => {
    if (!aircraft.climbTable) return;
    const newTable = [...aircraft.climbTable];
    newTable[index] = { ...newTable[index], [field]: value };
    setAircraft({ ...aircraft, climbTable: newTable });
  };

  // Get unique OAT values for display
  const uniqueOATs = aircraft.climbTable
    ? [...new Set(aircraft.climbTable.map(r => r.oat))].sort((a, b) => a - b)
    : [];

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
              <DialogPanel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-slate-800 shadow-2xl transition-all border border-gray-700">
                {/* Header */}
                <div className="bg-slate-800 border-b border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <DialogTitle
                      as="h2"
                      className="text-2xl font-bold"
                      style={{ color: "white" }}
                    >
                      Aircraft Performance Table
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
                    POH-style climb performance table indexed by Pressure Altitude × OAT
                  </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  {/* Aircraft Selection */}
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block" style={{ color: "oklch(0.72 0.015 240)" }}>
                        Select Aircraft
                      </label>
                      <select
                        value={isCustom ? (customAircraft.some(ac => ac.model === aircraft.model) ? aircraft.model : "CUSTOM") : selectedPreset}
                        onChange={(e) => handlePresetChange(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white cursor-pointer"
                      >
                        {PRESET_AIRCRAFT.map((ac) => (
                          <option key={ac.model} value={ac.model}>
                            {ac.name}
                          </option>
                        ))}
                        {customAircraft.length > 0 && (
                          <optgroup label="Custom Aircraft" style={{ color: "oklch(0.75 0.15 150)" }}>
                            {customAircraft.map((ac) => (
                              <option key={ac.model} value={ac.model} style={{ color: "oklch(0.75 0.15 150)" }}>
                                {ac.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <option value="CUSTOM">+ New Custom Aircraft</option>
                      </select>
                    </div>
                    {!isCustom && !isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-3 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 hover:text-amber-200 transition-all cursor-pointer border border-amber-500/30 text-sm font-medium whitespace-nowrap"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {/* Aircraft Info */}
                  {(isCustom || isEditing) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block" style={{ color: "oklch(0.72 0.015 240)" }}>
                          Aircraft Name
                        </label>
                        <input
                          type="text"
                          value={aircraft.name}
                          onChange={(e) => setAircraft({ ...aircraft, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 flex items-center" style={{ color: "oklch(0.72 0.015 240)" }}>
                          Standard Weight
                          <Tooltip content="The weight at which the performance table is valid (lbs)" />
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={aircraft.weights?.standardWeight}
                            onChange={(e) =>
                              setAircraft({
                                ...aircraft,
                                weights: {
                                  ...aircraft.weights,
                                  emptyWeight: aircraft.weights?.emptyWeight || 0,
                                  maxGrossWeight: aircraft.weights?.maxGrossWeight || 0,
                                  standardWeight: parseFloat(e.target.value)
                                }
                              })
                            }
                            className="w-full px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white text-right"
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
                        <label className="text-sm font-medium mb-2 flex items-center" style={{ color: "oklch(0.72 0.015 240)" }}>
                          Max Gross Weight
                          <Tooltip content="Maximum certified takeoff weight (lbs)" />
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={aircraft.weights?.maxGrossWeight}
                            onChange={(e) =>
                              setAircraft({
                                ...aircraft,
                                weights: {
                                  ...aircraft.weights,
                                  emptyWeight: aircraft.weights?.emptyWeight || 0,
                                  standardWeight: aircraft.weights?.standardWeight,
                                  maxGrossWeight: parseFloat(e.target.value)
                                }
                              })
                            }
                            className="w-full px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white text-right"
                          />
                          <span
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                            style={{ color: "oklch(0.55 0.02 240)" }}
                          >
                            lbs
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Performance Table */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <label className="text-sm font-medium flex items-center" style={{ color: "oklch(0.72 0.015 240)" }}>
                          Climb Performance Table
                          <Tooltip content="Cumulative climb data from Sea Level, indexed by Pressure Altitude × OAT. Values are subtracted to calculate climb between any two altitudes." />
                        </label>
                        {uniqueOATs.length > 0 && (
                          <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.02 240)" }}>
                            OAT columns: {uniqueOATs.join('°C, ')}°C
                          </p>
                        )}
                      </div>
                      {(isCustom || isEditing) && (
                        <button
                          onClick={addRow}
                          className="text-sm px-3 py-1.5 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 hover:text-sky-200 border border-sky-500/30 transition-all cursor-pointer"
                        >
                          + Add Row
                        </button>
                      )}
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-gray-600 bg-slate-900/50">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-800/80">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium" style={{ color: "oklch(0.7 0.02 240)" }}>
                              PA (ft)
                            </th>
                            <th className="px-3 py-2 text-left font-medium" style={{ color: "oklch(0.7 0.02 240)" }}>
                              OAT (°C)
                            </th>
                            <th className="px-3 py-2 text-left font-medium" style={{ color: "oklch(0.7 0.02 240)" }}>
                              Time (min)
                            </th>
                            <th className="px-3 py-2 text-left font-medium" style={{ color: "oklch(0.7 0.02 240)" }}>
                              Fuel (gal)
                            </th>
                            <th className="px-3 py-2 text-left font-medium" style={{ color: "oklch(0.7 0.02 240)" }}>
                              Dist (NM)
                            </th>
                            {(isCustom || isEditing) && (
                              <th className="px-3 py-2 text-left font-medium" style={{ color: "oklch(0.7 0.02 240)" }}>
                                Actions
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {(aircraft.climbTable || []).map((row, index) => (
                            <tr key={index} className="border-t border-gray-700/50">
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={row.pressureAltitude}
                                  onChange={(e) =>
                                    updateRow(index, "pressureAltitude", parseFloat(e.target.value))
                                  }
                                  disabled={!isCustom && !isEditing}
                                  className="w-full px-2 py-1.5 rounded text-sm bg-slate-800 border border-gray-600 text-white text-right disabled:opacity-50 disabled:bg-transparent disabled:border-transparent"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={row.oat}
                                  onChange={(e) =>
                                    updateRow(index, "oat", parseFloat(e.target.value))
                                  }
                                  disabled={!isCustom && !isEditing}
                                  className="w-full px-2 py-1.5 rounded text-sm bg-slate-800 border border-gray-600 text-white text-right disabled:opacity-50 disabled:bg-transparent disabled:border-transparent"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={row.timeFromSL}
                                  onChange={(e) =>
                                    updateRow(index, "timeFromSL", parseFloat(e.target.value))
                                  }
                                  disabled={!isCustom && !isEditing}
                                  className="w-full px-2 py-1.5 rounded text-sm bg-slate-800 border border-gray-600 text-white text-right disabled:opacity-50 disabled:bg-transparent disabled:border-transparent"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={row.fuelFromSL}
                                  onChange={(e) =>
                                    updateRow(index, "fuelFromSL", parseFloat(e.target.value))
                                  }
                                  disabled={!isCustom && !isEditing}
                                  className="w-full px-2 py-1.5 rounded text-sm bg-slate-800 border border-gray-600 text-white text-right disabled:opacity-50 disabled:bg-transparent disabled:border-transparent"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={row.distanceFromSL}
                                  onChange={(e) =>
                                    updateRow(index, "distanceFromSL", parseFloat(e.target.value))
                                  }
                                  disabled={!isCustom && !isEditing}
                                  className="w-full px-2 py-1.5 rounded text-sm bg-slate-800 border border-gray-600 text-white text-right disabled:opacity-50 disabled:bg-transparent disabled:border-transparent"
                                />
                              </td>
                              {(isCustom || isEditing) && (
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => removeRow(index)}
                                    disabled={(aircraft.climbTable?.length || 0) === 1}
                                    className="px-2 py-1 rounded text-xs bg-red-600/30 hover:bg-red-600/50 text-red-300 hover:text-red-200 border border-red-500/30 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    Remove
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Info Note */}
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                    <p className="text-xs leading-relaxed" style={{ color: "oklch(0.7 0.15 230)" }}>
                      <span className="font-semibold">POH Format:</span> This table uses cumulative values from Sea Level. To calculate climb between two altitudes, the calculator subtracts the lower altitude values from the higher. Example: Climb 2000→6000 ft at 20°C = values at 6000ft minus values at 2000ft. Always verify with your POH.
                    </p>
                  </div>
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
                    className="flex-1 py-3 px-6 rounded-xl font-medium border-2 border-sky-500 bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 hover:text-sky-200 transition-all cursor-pointer"
                  >
                    Apply Performance Data
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
