"use client";

import { ResolvedAircraftPerformance } from "@/lib/aircraft";

interface AircraftSelectorProps {
  aircraft: ResolvedAircraftPerformance | null;
  onClick: () => void;
  /** Show climb table info instead of engine info */
  showClimbInfo?: boolean;
}

/**
 * Clickable aircraft display that triggers the aircraft selector modal.
 * Shows aircraft details when selected, or a placeholder when empty.
 */
export function AircraftSelector({
  aircraft,
  onClick,
  showClimbInfo = false,
}: AircraftSelectorProps) {
  // Count unique OAT values in climb table
  const uniqueOATs = aircraft?.climbTable
    ? [...new Set(aircraft.climbTable.map((r) => r.oat))].sort((a, b) => a - b)
    : [];

  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-slate-600 text-white text-left cursor-pointer hover:border-slate-500"
    >
      {aircraft ? (
        <div>
          <div className="font-medium">{aircraft.name}</div>
          <div className="text-sm text-slate-400">
            {showClimbInfo ? (
              <>
                {aircraft.climbTable?.length || 0} data points
                {uniqueOATs.length > 0 && ` · OAT: ${uniqueOATs.join("°, ")}°C`}
              </>
            ) : (
              <>
                {aircraft.engine.ratedHP} HP | {aircraft.engine.usableFuelGallons} gal usable
              </>
            )}
          </div>
        </div>
      ) : (
        <span className="text-slate-400">Click to select aircraft...</span>
      )}
    </button>
  );
}
