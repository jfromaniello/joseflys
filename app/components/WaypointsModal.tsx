"use client";

import { useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Tooltip } from "./Tooltip";
import { Waypoint } from "@/lib/courseCalculations";

interface WaypointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (waypoints: Waypoint[]) => void;
  initialWaypoints?: Waypoint[];
  totalDistance?: number;
}

export function WaypointsModal({
  isOpen,
  onClose,
  onApply,
  initialWaypoints = [],
  totalDistance,
}: WaypointsModalProps) {
  const [waypoints, setWaypoints] = useState<Waypoint[]>(
    initialWaypoints.length > 0
      ? initialWaypoints
      : [{ name: "", distance: 0 }]
  );
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);

  const addWaypoint = () => {
    setWaypoints([...waypoints, { name: "", distance: 0 }]);
  };

  const removeWaypoint = (index: number) => {
    if (waypoints.length > 1) {
      setWaypoints(waypoints.filter((_, i) => i !== index));
    }
  };

  const updateWaypoint = (
    index: number,
    field: keyof Waypoint,
    value: string | number
  ) => {
    const newWaypoints = [...waypoints];
    if (field === "name") {
      newWaypoints[index][field] = value as string;
    } else {
      const num = typeof value === "string" ? parseFloat(value) : value;
      newWaypoints[index][field] = isNaN(num) ? 0 : num;
    }
    setWaypoints(newWaypoints);
  };

  const handleBlur = (index: number) => {
    const value = waypoints[index].distance;
    const newWaypoints = [...waypoints];
    newWaypoints[index].distance = Math.max(0, Math.round(value * 10) / 10);
    setWaypoints(newWaypoints);
  };

  const handleApply = () => {
    // Filter out empty waypoints and sort by distance
    const validWaypoints = waypoints
      .filter((wp) => wp.name.trim() !== "" && wp.distance > 0)
      .sort((a, b) => a.distance - b.distance);

    onApply(validWaypoints);
    onClose();
  };

  const handleCopyTable = async () => {
    const json = JSON.stringify(waypoints, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("Failed to copy table");
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData("text");

    // Try to parse as JSON array
    try {
      const parsed = JSON.parse(pastedText);

      // Check if it's an array of waypoints
      if (Array.isArray(parsed) && parsed.length > 0) {
        const isValidFormat = parsed.every(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            typeof item.name === "string" &&
            typeof item.distance === "number"
        );

        if (isValidFormat) {
          e.preventDefault(); // Prevent default paste
          setWaypoints(parsed);
          return;
        }
      }
    } catch {
      // Not JSON, allow normal paste behavior
    }
  };

  const isDistanceValid = (distance: number): boolean => {
    if (!totalDistance) return true;
    return distance <= totalDistance;
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
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-slate-800 border border-gray-700 shadow-2xl transition-all">
                {/* Header */}
                <div className="bg-slate-800 border-b border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Dialog.Title
                      as="h2"
                      className="text-2xl font-bold"
                      style={{ color: "white" }}
                    >
                      Waypoints / Checkpoints
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
                      Define notable points along your route for time and fuel calculations
                      {totalDistance && ` (Total distance: ${totalDistance} NM)`}
                    </Dialog.Description>
                    <Tooltip content="Add waypoints or checkpoints to track your progress during the flight. The calculator will show estimated time and fuel consumption for each point. Perfect for VFR navigation!" />
                  </div>
                </div>

        {/* Table */}
        <div className="p-6">
          <div className="space-y-3">
            {/* Table Rows */}
            {waypoints.map((waypoint, index) => (
              <div key={index} className="flex flex-wrap md:flex-nowrap items-center gap-3">
                {/* Name Input */}
                <div className="flex items-center gap-2 flex-[2] min-w-0">
                  <label className="text-sm font-medium whitespace-nowrap" style={{ color: "oklch(0.65 0.15 230)" }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={waypoint.name}
                    onChange={(e) => updateWaypoint(index, "name", e.target.value)}
                    onPaste={handlePaste}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white"
                    placeholder="e.g., River Crossing"
                  />
                </div>

                {/* Distance Input */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <label className="text-sm font-medium whitespace-nowrap" style={{ color: "oklch(0.65 0.15 230)" }}>
                    Distance
                  </label>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={waypoint.distance || ""}
                      onChange={(e) => updateWaypoint(index, "distance", e.target.value)}
                      onBlur={() => handleBlur(index)}
                      className={`w-full px-4 pr-11 py-3 rounded-xl focus:outline-none focus:ring-2 ${
                        !isDistanceValid(waypoint.distance)
                          ? 'focus:ring-red-500/50 border-red-500'
                          : 'focus:ring-sky-500/50 border-gray-600'
                      } transition-all text-lg bg-slate-900/50 border-2 text-white text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]`}
                      placeholder="0"
                      step="0.1"
                    />
                    <span
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                      style={{ color: "white" }}
                    >
                      NM
                    </span>
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeWaypoint(index)}
                  disabled={waypoints.length <= 1}
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
              onClick={addWaypoint}
              className="flex-1 py-3 rounded-xl border-2 border-dashed border-gray-600 hover:border-sky-500/50 hover:bg-sky-500/5 transition-all font-medium cursor-pointer"
              style={{ color: "oklch(0.65 0.15 230)" }}
            >
              + Add Waypoint
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
              <li>• Distance is from the start of the leg (cumulative)</li>
              <li>• Waypoints will be automatically sorted by distance</li>
              <li>• Use <span className="font-semibold">Copy Table</span> to save your waypoints as JSON</li>
              <li>• Paste JSON in the <span className="font-semibold">Name</span> field to quickly load saved waypoints</li>
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
                    Apply Waypoints
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
