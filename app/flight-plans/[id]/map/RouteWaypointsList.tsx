"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface LocationData {
  name: string;
  lat: number;
  lon: number;
  isFlyOver?: boolean;
  distance?: number;
  cumulativeTime?: number;
}

interface RouteWaypointsListProps {
  locations: LocationData[];
}

// Format cumulative time: "[X h] Y min" without zero padding
function formatCumulativeTime(minutes?: number): string | null {
  if (minutes === undefined || minutes === null) return null;

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours > 0) {
    return `${hours} h ${mins} min`;
  } else {
    return `${mins} min`;
  }
}

export function RouteWaypointsList({ locations }: RouteWaypointsListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-6 p-4 rounded-xl bg-slate-900/30 border border-gray-700 print:mb-3 print:p-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-sm font-semibold uppercase tracking-wide cursor-pointer print:pointer-events-none"
        style={{ color: "oklch(0.65 0.15 230)" }}
      >
        <span>Route Waypoints ({locations.length})</span>
        {isExpanded ? (
          <ChevronDownIcon className="w-5 h-5 print:hidden" />
        ) : (
          <ChevronRightIcon className="w-5 h-5 print:hidden" />
        )}
      </button>

      {/* Always show in print, toggle on screen */}
      <div className={`mt-3 print:block ${isExpanded ? "block" : "hidden"}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
          {locations.map((loc, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border print:p-2 ${
                loc.isFlyOver
                  ? "bg-purple-900/20 border-purple-500/30"
                  : "bg-slate-800/50 border-slate-700/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs text-white print:w-5 print:h-5"
                  style={{
                    backgroundColor: loc.isFlyOver ? "#a855f7" : "oklch(0.5 0.15 230)"
                  }}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-white truncate block print:text-xs">
                    {loc.name.split(",")[0]}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {loc.distance !== undefined && (
                      <span className="text-xs font-medium text-emerald-400 print:text-[10px]">
                        {loc.distance.toFixed(1)} NM
                      </span>
                    )}
                    {formatCumulativeTime(loc.cumulativeTime) && (
                      <span className="text-xs font-medium text-sky-400 print:text-[10px]">
                        {formatCumulativeTime(loc.cumulativeTime)}
                      </span>
                    )}
                  </div>
                </div>
                {loc.isFlyOver && (
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 print:hidden shrink-0">
                    Ref
                  </span>
                )}
              </div>
              <div className="text-xs print:text-[10px]" style={{ color: "oklch(0.6 0.02 240)" }}>
                {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
