"use client";

import { useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Tooltip } from "./Tooltip";

export interface DeviationEntry {
  forHeading: number;
  steerHeading: number;
}

interface CompassDeviationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (entries: DeviationEntry[]) => void;
  initialEntries?: DeviationEntry[];
}

export function CompassDeviationModal({
  isOpen,
  onClose,
  onApply,
  initialEntries = [],
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
    const newEntries = [...entries];
    const num = parseFloat(value);
    newEntries[index][field] = isNaN(num) ? 0 : num;
    setEntries(newEntries);
  };

  const handleBlur = (index: number, field: "forHeading" | "steerHeading") => {
    const value = entries[index][field];
    if (value >= 0 && value <= 360) {
      const newEntries = [...entries];
      newEntries[index][field] = Math.round(value);
      setEntries(newEntries);
    }
  };

  const formatHeadingDisplay = (value: number): string => {
    return String(Math.round(value)).padStart(3, '0');
  };

  const handleApply = () => {
    // Sort entries by forHeading for proper interpolation
    const sortedEntries = [...entries].sort(
      (a, b) => a.forHeading - b.forHeading
    );
    onApply(sortedEntries);
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
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-slate-800 border border-gray-700 shadow-2xl transition-all">
                {/* Header */}
                <div className="bg-slate-800 border-b border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Dialog.Title
                      as="h2"
                      className="text-2xl font-bold"
                      style={{ color: "white" }}
                    >
                      Compass Deviation Table
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
                  <div className="flex items-start gap-2">
                    <Dialog.Description
                      as="p"
                      className="text-sm"
                      style={{ color: "oklch(0.6 0.02 240)" }}
                    >
                      Enter compass deviation values from your aircraft&apos;s deviation card
                    </Dialog.Description>
                    <Tooltip content="The deviation card shows the difference between magnetic heading and compass heading due to aircraft magnetic interference. 'For' is the magnetic heading you want to fly, 'Steer' is what the compass should read. Add at least 2 entries for interpolation." />
                  </div>
                </div>

        {/* Table */}
        <div className="p-6">
          <div className="space-y-3">
            {/* Table Rows */}
            {entries.map((entry, index) => (
              <div key={index} className="flex flex-wrap md:flex-nowrap items-center gap-3">
                {/* For Label + Input */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <label className="text-sm font-medium whitespace-nowrap" style={{ color: "oklch(0.65 0.15 230)" }}>
                    For
                  </label>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={formatHeadingDisplay(entry.forHeading)}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d{0,3}$/.test(value)) {
                          updateEntry(index, "forHeading", value);
                        }
                      }}
                      onBlur={() => handleBlur(index, "forHeading")}
                      onPaste={(e) => handlePaste(e, index, "forHeading")}
                      className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 ${
                        entry.forHeading > 360
                          ? 'focus:ring-red-500/50 border-red-500'
                          : 'focus:ring-sky-500/50 border-gray-600'
                      } transition-all text-lg bg-slate-900/50 border-2 text-white`}
                      placeholder="000"
                      maxLength={3}
                    />
                    <span
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                      style={{ color: "white" }}
                    >
                      °
                    </span>
                  </div>
                </div>

                {/* Steer Label + Input */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <label className="text-sm font-medium whitespace-nowrap" style={{ color: "oklch(0.65 0.15 230)" }}>
                    Steer
                  </label>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={formatHeadingDisplay(entry.steerHeading)}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d{0,3}$/.test(value)) {
                          updateEntry(index, "steerHeading", value);
                        }
                      }}
                      onBlur={() => handleBlur(index, "steerHeading")}
                      className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 ${
                        entry.steerHeading > 360
                          ? 'focus:ring-red-500/50 border-red-500'
                          : 'focus:ring-sky-500/50 border-gray-600'
                      } transition-all text-lg bg-slate-900/50 border-2 text-white`}
                      placeholder="000"
                      maxLength={3}
                    />
                    <span
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                      style={{ color: "white" }}
                    >
                      °
                    </span>
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeEntry(index)}
                  disabled={entries.length <= 2}
                  className="p-2 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  style={{ color: "oklch(0.65 0.15 10)" }}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={addEntry}
              className="flex-1 py-3 rounded-xl border-2 border-dashed border-gray-600 hover:border-sky-500/50 hover:bg-sky-500/5 transition-all font-medium cursor-pointer"
              style={{ color: "oklch(0.65 0.15 230)" }}
            >
              + Add Entry
            </button>
            <button
              onClick={handleCopyTable}
              className="px-6 py-3 rounded-xl border-2 border-gray-600 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all font-medium cursor-pointer relative"
              style={{ color: "oklch(0.7 0.15 150)" }}
            >
              {showCopiedMessage ? "✓ Copied!" : "📋 Copy Table"}
            </button>
          </div>

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
                    className="flex-1 py-3 px-6 rounded-xl font-medium border-2 border-sky-500 bg-sky-500/20 hover:bg-sky-500/30 transition-all cursor-pointer"
                    style={{ color: "oklch(0.8 0.15 230)" }}
                  >
                    Apply Deviation Table
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
