"use client";

import { useState, useEffect, Fragment } from "react";
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle, DialogDescription } from "@headlessui/react";
import { Tooltip } from "./Tooltip";
import {
  loadCustomAircraft,
  saveAircraft,
  updateAircraft,
} from "@/lib/aircraftStorage";
import {
  AircraftPerformance,
  createEmptyAircraft,
  PRESET_AIRCRAFT,
  DeviationEntry,
} from "@/lib/aircraft";

// Re-export DeviationEntry for backward compatibility
export type { DeviationEntry };

interface CompassDeviationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (entries: DeviationEntry[], aircraft?: AircraftPerformance) => void;
  initialEntries?: DeviationEntry[];
  initialAircraft?: AircraftPerformance | null;
}

export function CompassDeviationModal({
  isOpen,
  onClose,
  onApply,
  initialEntries = [],
  initialAircraft = null,
}: CompassDeviationModalProps) {
  const [entries, setEntries] = useState<DeviationEntry[]>(
    initialEntries.length > 0
      ? initialEntries
      : [
          { forHeading: 0, steerHeading: 0 },
          { forHeading: 30, steerHeading: 30 },
        ]
  );
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [customAircraft, setCustomAircraft] = useState<AircraftPerformance[]>([]);
  const [selectedAircraftModel, setSelectedAircraftModel] = useState<string>("");
  const [newAircraftName, setNewAircraftName] = useState<string>("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [editingFields, setEditingFields] = useState<Set<string>>(new Set()); // Track which fields are being edited

  // Load custom aircraft when modal opens
  useEffect(() => {
    if (isOpen) {
      const loaded = loadCustomAircraft();
      setCustomAircraft(loaded);

      // If initialAircraft is provided, use it
      if (initialAircraft) {
        setIsCreatingNew(false);
        setSelectedAircraftModel(initialAircraft.model);
        if (initialAircraft.deviationTable && initialAircraft.deviationTable.length > 0) {
          setEntries(initialAircraft.deviationTable);
        }
      } else if (loaded.length === 0) {
        // No aircraft saved, start in creation mode
        setIsCreatingNew(true);
        setSelectedAircraftModel("");
      } else {
        // Has aircraft, select first one by default
        setIsCreatingNew(false);
        setSelectedAircraftModel(loaded[0].model);
        // Load deviation table from selected aircraft if it exists
        if (loaded[0].deviationTable && loaded[0].deviationTable.length > 0) {
          setEntries(loaded[0].deviationTable);
        }
      }
    }
  }, [isOpen, initialAircraft]);

  // Update entries when aircraft selection changes
  const handleAircraftChange = (model: string) => {
    if (model === "NEW") {
      setIsCreatingNew(true);
      setSelectedAircraftModel("");
      setNewAircraftName("");
      // Reset to default entries
      setEntries([
        { forHeading: 0, steerHeading: 0 },
        { forHeading: 30, steerHeading: 30 },
      ]);
    } else {
      setIsCreatingNew(false);
      setSelectedAircraftModel(model);
      // Load deviation table from selected aircraft
      const aircraft = customAircraft.find(ac => ac.model === model);
      if (aircraft?.deviationTable && aircraft.deviationTable.length > 0) {
        setEntries(aircraft.deviationTable);
      } else {
        // Aircraft has no deviation table, start with defaults
        setEntries([
          { forHeading: 0, steerHeading: 0 },
          { forHeading: 30, steerHeading: 30 },
        ]);
      }
    }
  };

  const addEntry = () => {
    setEntries([...entries, { forHeading: 0, steerHeading: 0 }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 2) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (
    index: number,
    field: "forHeading" | "steerHeading",
    value: string
  ) => {
    const fieldKey = `${index}-${field}`;
    // Mark as editing (user started typing)
    setEditingFields(prev => new Set(prev).add(fieldKey));

    const newEntries = [...entries];
    const num = parseFloat(value);
    newEntries[index][field] = isNaN(num) ? 0 : num;
    setEntries(newEntries);
  };

  const handleFocus = (index: number, field: "forHeading" | "steerHeading", e: React.FocusEvent<HTMLInputElement>) => {
    setFocusedField(`${index}-${field}`);
    // Select all text for easy replacement
    e.target.select();
  };

  const handleBlur = (index: number, field: "forHeading" | "steerHeading") => {
    setFocusedField(null);
    const value = entries[index][field];
    const fieldKey = `${index}-${field}`;

    // Stop editing mode
    setEditingFields(prev => {
      const next = new Set(prev);
      next.delete(fieldKey);
      return next;
    });

    if (value > 360 || value < 0) {
      // Mark as error
      setErrors(prev => new Set(prev).add(fieldKey));
    } else {
      // Remove error if valid
      setErrors(prev => {
        const next = new Set(prev);
        next.delete(fieldKey);
        return next;
      });

      // Round the value
      const newEntries = [...entries];
      newEntries[index][field] = Math.round(value);
      setEntries(newEntries);
    }
  };

  const hasErrors = errors.size > 0;

  const getDisplayValue = (index: number, field: "forHeading" | "steerHeading"): string => {
    const value = entries[index][field];
    const fieldKey = `${index}-${field}`;
    const isEditing = editingFields.has(fieldKey);

    if (isEditing) {
      // User is actively typing, show raw value without padding
      return String(Math.round(value));
    } else {
      // Not editing (either not focused, or just focused but not typed yet)
      // Show formatted value (padded to 3 digits)
      return String(Math.round(value)).padStart(3, '0');
    }
  };

  const handleApply = () => {
    // Sort entries by forHeading for proper interpolation
    const sortedEntries = [...entries].sort(
      (a, b) => a.forHeading - b.forHeading
    );

    let savedAircraft: AircraftPerformance | undefined;

    if (isCreatingNew) {
      // Create new aircraft with deviation table
      if (!newAircraftName.trim()) {
        alert("Please enter an aircraft name");
        return;
      }

      const newAircraft = createEmptyAircraft(newAircraftName);
      newAircraft.deviationTable = sortedEntries;
      savedAircraft = saveAircraft(newAircraft);
    } else {
      // Update existing aircraft with deviation table
      if (selectedAircraftModel) {
        const updated = updateAircraft(selectedAircraftModel, {
          deviationTable: sortedEntries,
        });
        if (updated) {
          savedAircraft = updated;
        }
      }
    }

    onApply(sortedEntries, savedAircraft);
    onClose();
  };

  const handleCopyTable = async () => {
    const json = JSON.stringify(entries, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("Failed to copy table");
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number, field: "forHeading" | "steerHeading") => {
    const pastedText = e.clipboardData.getData("text");

    // Try to parse as JSON array
    try {
      const parsed = JSON.parse(pastedText);

      // Check if it's an array of deviation entries
      if (Array.isArray(parsed) && parsed.length > 0) {
        const isValidFormat = parsed.every(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            typeof item.forHeading === "number" &&
            typeof item.steerHeading === "number"
        );

        if (isValidFormat) {
          e.preventDefault(); // Prevent default paste
          setEntries(parsed);
          return;
        }
      }
    } catch {
      // Not JSON, allow normal paste behavior
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
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
              <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-slate-800 border border-gray-700 shadow-2xl transition-all">
                {/* Header */}
                <div className="bg-slate-800 border-b border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <DialogTitle
                      as="h2"
                      className="text-2xl font-bold"
                      style={{ color: "white" }}
                    >
                      Compass Deviation Table
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
                  <div className="flex items-start gap-2">
                    <DialogDescription
                      as="p"
                      className="text-sm"
                      style={{ color: "oklch(0.6 0.02 240)" }}
                    >
                      Enter compass deviation values from your aircraft&apos;s deviation card
                    </DialogDescription>
                    <Tooltip content="The deviation card shows the difference between magnetic heading and compass heading due to aircraft magnetic interference. 'For' is the magnetic heading you want to fly, 'Steer' is what the compass should read. Add at least 2 entries for interpolation." />
                  </div>
                </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Aircraft Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium mb-2 flex items-center" style={{ color: "oklch(0.72 0.015 240)" }}>
              Aircraft
              <Tooltip content="Select an existing aircraft or create a new one. Deviation table will be saved with the aircraft." />
            </label>

            {!isCreatingNew ? (
              <div className="flex gap-3">
                <select
                  value={selectedAircraftModel}
                  onChange={(e) => handleAircraftChange(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white cursor-pointer"
                >
                  {customAircraft.map((ac) => (
                    <option key={ac.model} value={ac.model}>
                      {ac.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleAircraftChange("NEW")}
                  className="px-4 py-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 transition-all cursor-pointer border border-sky-500/30 text-sm font-medium whitespace-nowrap"
                  style={{ color: "oklch(0.8 0.15 230)" }}
                >
                  + New
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={newAircraftName}
                  onChange={(e) => setNewAircraftName(e.target.value)}
                  placeholder="Enter aircraft name (e.g., N12345)"
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white"
                />
                {customAircraft.length > 0 && (
                  <button
                    onClick={() => handleAircraftChange(customAircraft[0].model)}
                    className="text-sm px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                    style={{ color: "oklch(0.65 0.15 230)" }}
                  >
                    ← Back to selection
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Deviation Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
                Deviation Table
              </h3>
              <button
                onClick={addEntry}
                className="text-sm px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 transition-colors cursor-pointer"
                style={{ color: "oklch(0.8 0.15 230)" }}
              >
                + Add Entry
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-600 bg-slate-900/50">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/80">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: "oklch(0.7 0.02 240)" }}>
                      For (°)
                    </th>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: "oklch(0.7 0.02 240)" }}>
                      Steer (°)
                    </th>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: "oklch(0.7 0.02 240)" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => (
                    <tr key={index} className="border-t border-gray-700/50">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={getDisplayValue(index, "forHeading")}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d{0,3}$/.test(value)) {
                              updateEntry(index, "forHeading", value || '0');
                            }
                          }}
                          onFocus={(e) => handleFocus(index, "forHeading", e)}
                          onBlur={() => handleBlur(index, "forHeading")}
                          onPaste={(e) => handlePaste(e, index, "forHeading")}
                          className={`w-full px-2 py-1.5 rounded text-sm bg-slate-800 border text-white text-right ${
                            errors.has(`${index}-forHeading`)
                              ? 'border-red-500 border-2'
                              : 'border-gray-600'
                          }`}
                          placeholder="000"
                          maxLength={3}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={getDisplayValue(index, "steerHeading")}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d{0,3}$/.test(value)) {
                              updateEntry(index, "steerHeading", value || '0');
                            }
                          }}
                          onFocus={(e) => handleFocus(index, "steerHeading", e)}
                          onBlur={() => handleBlur(index, "steerHeading")}
                          className={`w-full px-2 py-1.5 rounded text-sm bg-slate-800 border text-white text-right ${
                            errors.has(`${index}-steerHeading`)
                              ? 'border-red-500 border-2'
                              : 'border-gray-600'
                          }`}
                          placeholder="000"
                          maxLength={3}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => removeEntry(index)}
                          disabled={entries.length <= 2}
                          className="px-2 py-1 rounded text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Copy Button */}
          <div className="mt-4">
            <button
              onClick={handleCopyTable}
              className="w-full px-6 py-3 rounded-xl border-2 border-gray-600 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all font-medium cursor-pointer"
              style={{ color: "oklch(0.7 0.15 150)" }}
            >
              {showCopiedMessage ? "✓ Copied!" : "📋 Copy Table"}
            </button>
          </div>

          {/* Error/Info Note */}
          {hasErrors && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-sm font-semibold" style={{ color: "oklch(0.8 0.15 10)" }}>
                ⚠️ Invalid values detected
              </p>
              <p className="text-xs mt-1" style={{ color: "oklch(0.7 0.1 10)" }}>
                Heading values must be between 0° and 360°. Please correct the highlighted fields.
              </p>
            </div>
          )}

          {/* Info Note */}
          <div className="mt-6 p-4 rounded-xl bg-slate-900/50 border border-gray-700">
            <p
              className="text-sm leading-relaxed"
              style={{ color: "oklch(0.6 0.02 240)" }}
            >
              <span className="font-semibold">Tips:</span>
            </p>
            <ul className="text-sm leading-relaxed mt-2 space-y-1" style={{ color: "oklch(0.6 0.02 240)" }}>
              <li>• Add entries at key compass points (N, E, S, W) for better accuracy</li>
              <li>• Use <span className="font-semibold">Copy Table</span> to save your deviation table as JSON</li>
              <li>• Paste JSON in any <span className="font-semibold">For</span> field to quickly load a saved table</li>
              <li>• Minimum 2 entries required for interpolation</li>
            </ul>
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
                    disabled={hasErrors}
                    className="flex-1 py-3 px-6 rounded-xl font-medium border-2 border-sky-500 bg-sky-500/20 hover:bg-sky-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: "oklch(0.8 0.15 230)" }}
                  >
                    Apply Deviation Table
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
