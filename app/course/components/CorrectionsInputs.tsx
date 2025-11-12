"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Tooltip } from "@/app/components/Tooltip";
import {
  CompassDeviationModal,
  DeviationEntry,
} from "@/app/components/CompassDeviationModal";
import { AircraftPerformance } from "@/lib/aircraftPerformance";

interface CorrectionsInputsProps {
  magDev: string;
  setMagDev: (value: string) => void;
  deviationTable: DeviationEntry[];
  onDeviationTableChange: (entries: DeviationEntry[]) => void;
  aircraft?: AircraftPerformance | null;
  onAircraftChange?: (aircraft: AircraftPerformance | null) => void;
}

export function CorrectionsInputs({
  magDev,
  setMagDev,
  deviationTable,
  onDeviationTableChange,
  aircraft,
  onAircraftChange,
}: CorrectionsInputsProps) {
  const [isDeviationModalOpen, setIsDeviationModalOpen] = useState(false);

  const handleDeviationApply = (entries: DeviationEntry[], updatedAircraft?: AircraftPerformance) => {
    onDeviationTableChange(entries);
    if (onAircraftChange && updatedAircraft) {
      onAircraftChange(updatedAircraft);
    }
  };

  // Check if magnetic deviation is invalid (> 360 or < -360)
  const magDevNum = parseFloat(magDev);
  const isMagDevInvalid = !isNaN(magDevNum) && (magDevNum > 360 || magDevNum < -360);

  return (
    <div className="corrections-inputs">
      <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
        Corrections
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem] gap-x-4 gap-y-4 lg:items-center print:grid-cols-[auto_1fr]">
        {/* Magnetic Variation Label */}
        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          Magnetic Variation
          <Tooltip content="Optional: Local magnetic variation (east or west) in degrees. Found on aviation charts. Negative for east, positive for west. Leave empty if unknown." />
        </label>

        {/* Magnetic Variation Input */}
        <div className="relative">
          <input
            type="number"
            value={magDev}
            onChange={(e) => setMagDev(e.target.value)}
            className={`w-full px-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 ${
              isMagDevInvalid
                ? 'focus:ring-red-500/50 border-red-500'
                : 'focus:ring-sky-500/50 border-gray-600'
            } transition-all text-lg bg-slate-900/50 border-2 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right`}
            placeholder="Optional"
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
            style={{ color: "white" }}
          >
            °
          </span>
        </div>

        {/* Gap */}
        <div className="hidden lg:block print:hidden"></div>

        {/* Compass Deviation Label */}
        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0 print-hide-compass-deviation"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          Compass Deviation
          <Tooltip content="Optional: Add your aircraft's compass deviation table to calculate the actual Compass Course (CC) you need to fly. This accounts for magnetic interference in your specific aircraft. Click to enter deviation values from your aircraft's deviation card." />
        </label>

        {/* Compass Deviation Table Button */}
        <button
          onClick={() => setIsDeviationModalOpen(true)}
          className={`w-full px-4 py-3 rounded-xl transition-all text-base font-medium border-2 cursor-pointer print-hide-compass-deviation ${
            deviationTable.length > 0
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              : "border-gray-600 bg-slate-900/50 hover:border-sky-500/50 hover:bg-sky-500/5"
          }`}
          style={
            deviationTable.length === 0
              ? { color: "oklch(0.7 0.02 240)" }
              : undefined
          }
          suppressHydrationWarning
        >
          {deviationTable.length > 0 ? (
            <div className="flex flex-col items-center">
              <span>✓ Table Set</span>
              <span className="text-xs mt-0.5">{deviationTable.length} entries</span>
            </div>
          ) : (
            "Set Deviation Table"
          )}
        </button>
      </div>

      {/* Compass Deviation Modal - rendered as portal */}
      {typeof window !== 'undefined' && isDeviationModalOpen && createPortal(
        <CompassDeviationModal
          isOpen={isDeviationModalOpen}
          onClose={() => setIsDeviationModalOpen(false)}
          onApply={handleDeviationApply}
          initialEntries={deviationTable}
          initialAircraft={aircraft}
        />,
        document.body
      )}
    </div>
  );
}
