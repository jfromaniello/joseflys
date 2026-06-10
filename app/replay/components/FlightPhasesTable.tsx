"use client";

import { useState } from "react";
import { formatUtcShort } from "../formatTime";
import { CollapsibleHeader } from "./CollapsibleHeader";
import type { FlightMarker, FlightPhase, FlightPhaseType } from "../analysis";

interface FlightPhasesTableProps {
  phases: FlightPhase[];
  markers: FlightMarker[];
  startMs: number;
  currentTimeMs: number;
  /** Seeks playback to an elapsed offset (ms from track start). */
  onSeek: (elapsedMs: number) => void;
}

const PHASE_META: Record<FlightPhaseType, { label: string; color: string }> = {
  taxi: { label: "Taxi", color: "#475569" },
  climb: { label: "Climb", color: "#22c55e" },
  cruise: { label: "Cruise", color: "#3b82f6" },
  descent: { label: "Descent", color: "#f97316" },
};

const MARKER_LABEL: Record<FlightMarker["type"], string> = {
  takeoff: "Takeoff",
  toc: "TOC",
  tod: "TOD",
  landing: "Landing",
};

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

/**
 * Whole-flight phase breakdown. One row per vertical phase (taxi / climb /
 * cruise / descent) with its time, duration, altitude change, mean vertical
 * speed, and distance. Rows are badged with the takeoff / top-of-climb /
 * top-of-descent / landing marker that begins them, and clicking a row seeks
 * playback to the start of that phase.
 */
export function FlightPhasesTable({
  phases,
  markers,
  startMs,
  currentTimeMs,
  onSeek,
}: FlightPhasesTableProps) {
  const [collapsed, setCollapsed] = useState(false);
  if (phases.length === 0) return null;

  const markerAt = (ms: number) => markers.find((m) => m.timeMs === ms);

  return (
    <div className="rounded-lg bg-slate-900/60 border border-gray-700">
      <CollapsibleHeader
        title="Flight phases"
        count={phases.length}
        hint="Click a row to jump to that phase."
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />

      {collapsed ? null : (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-2 py-2 font-semibold">Phase</th>
              <th className="px-2 py-2 font-semibold">Time</th>
              <th className="px-2 py-2 font-semibold text-right">Duration</th>
              <th className="px-2 py-2 font-semibold text-right">Altitude</th>
              <th className="px-2 py-2 font-semibold text-right">Avg V/S</th>
              <th className="px-2 py-2 font-semibold text-right">Distance</th>
            </tr>
          </thead>
          <tbody>
            {phases.map((ph, i) => {
              const meta = PHASE_META[ph.type];
              const marker = markerAt(ph.startMs);
              const isCurrent = currentTimeMs >= ph.startMs && currentTimeMs <= ph.endMs;
              const vs = Math.round(ph.avgVsFpm);
              return (
                <tr
                  key={`${ph.startMs}-${i}`}
                  onClick={() => onSeek(ph.startMs - startMs)}
                  className={`cursor-pointer border-t border-slate-800 transition-colors hover:bg-slate-800/60 ${
                    isCurrent ? "bg-cyan-500/10" : ""
                  }`}
                >
                  <td className="px-2 py-2">
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-200">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                      {meta.label}
                    </span>
                    {marker ? (
                      <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-cyan-300">
                        {MARKER_LABEL[marker.type]}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 tabular-nums text-slate-400">{formatUtcShort(ph.startMs)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-300">
                    {formatDuration(ph.endMs - ph.startMs)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-200">
                    {Math.round(ph.startAltFt).toLocaleString()} → {Math.round(ph.endAltFt).toLocaleString()} ft
                  </td>
                  <td
                    className={`px-2 py-2 text-right tabular-nums ${
                      vs > 50 ? "text-emerald-400" : vs < -50 ? "text-orange-400" : "text-slate-400"
                    }`}
                  >
                    {vs > 0 ? "+" : ""}
                    {vs.toLocaleString()} fpm
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-300">
                    {ph.distanceNm.toFixed(1)} NM
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
