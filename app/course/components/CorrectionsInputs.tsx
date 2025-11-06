"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Tooltip } from "@/app/components/Tooltip";
import {
  CompassDeviationModal,
  DeviationEntry,
} from "@/app/components/CompassDeviationModal";

interface CorrectionsInputsProps {
  magDev: string;
  setMagDev: (value: string) => void;
  deviationTable: DeviationEntry[];
  onDeviationTableChange: (entries: DeviationEntry[]) => void;
}

export function CorrectionsInputs({
  magDev,
  setMagDev,
  deviationTable,
  onDeviationTableChange,
}: CorrectionsInputsProps) {
  const [isDeviationModalOpen, setIsDeviationModalOpen] = useState(false);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
        Corrections
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Magnetic Deviation */}
        <div>
          <label
            className="flex items-center text-sm font-medium mb-2"
            style={{ color: "oklch(0.72 0.015 240)" }}
          >
            Magnetic Deviation
            <Tooltip content="Optional: Local magnetic variation (east or west) in degrees. Found on aviation charts. Negative for east, positive for west. Leave empty if unknown." />
          </label>
          <div className="relative">
            <input
              type="number"
              value={magDev}
              onChange={(e) => setMagDev(e.target.value)}
              className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
              placeholder="Optional"
            />
            <span
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
              style={{ color: "white" }}
            >
              °
            </span>
          </div>
        </div>

        {/* Compass Deviation Table Button */}
        <div>
          <label
            className="flex items-center text-sm font-medium mb-2"
            style={{ color: "oklch(0.72 0.015 240)" }}
          >
            Compass Deviation
            <Tooltip content="Optional: Add your aircraft's compass deviation table to calculate the actual Compass Course (CC) you need to fly. This accounts for magnetic interference in your specific aircraft. Click to enter deviation values from your aircraft's deviation card." />
          </label>
          <button
            onClick={() => setIsDeviationModalOpen(true)}
            className={`w-full px-4 py-3 rounded-xl transition-all text-base font-medium border-2 cursor-pointer ${
              deviationTable.length > 0
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                : "border-gray-600 bg-slate-900/50 hover:border-sky-500/50 hover:bg-sky-500/5"
            }`}
            style={
              deviationTable.length === 0
                ? { color: "oklch(0.7 0.02 240)" }
                : undefined
            }
          >
            {deviationTable.length > 0
              ? `✓ Table Set (${deviationTable.length} entries)`
              : "Set Deviation Table"}
          </button>
        </div>
      </div>

      {/* Compass Deviation Modal - rendered as portal */}
      {typeof window !== 'undefined' && isDeviationModalOpen && createPortal(
        <CompassDeviationModal
          isOpen={isDeviationModalOpen}
          onClose={() => setIsDeviationModalOpen(false)}
          onApply={onDeviationTableChange}
          initialEntries={deviationTable}
        />,
        document.body
      )}
    </div>
  );
}
