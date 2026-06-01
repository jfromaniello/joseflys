"use client";

import { formatUtcShort } from "../formatTime";
import type { Landing } from "../patternAnalysis";

interface CircuitTableProps {
  landings: Landing[];
  /** Track start (ms) — used to convert absolute times into seek offsets. */
  startMs: number;
  currentTimeMs: number;
  /** Seeks playback to an elapsed offset (ms from track start). */
  onSeek: (elapsedMs: number) => void;
}

const METERS_PER_NM = 1852;

function kt(value: number | null): string {
  return value != null ? `${Math.round(value)} kt` : "–";
}

/**
 * Per-landing breakdown. One row per landing across every aerodrome visited:
 * number, aerodrome, time, downwind separation, pattern altitude, and the
 * ground speeds flown on the downwind / base / final legs (dashes when a leg
 * wasn't flown, e.g. a straight-in arrival). Clicking a row seeks playback to
 * the start of that landing's downwind (or base/final).
 */
export function CircuitTable({ landings, startMs, currentTimeMs, onSeek }: CircuitTableProps) {
  if (landings.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg bg-slate-900/60 border border-gray-700">
      <div className="border-b border-slate-700/70 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-slate-200">
          Landings <span className="font-normal text-slate-500">· {landings.length}</span>
        </h3>
        <p className="text-[11px] text-slate-500">Click a row to jump to that approach.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Aerodrome</th>
              <th className="px-3 py-2 font-semibold">Time</th>
              <th className="px-3 py-2 font-semibold text-right">Downwind sep</th>
              <th className="px-3 py-2 font-semibold text-right">Pattern alt</th>
              <th className="px-3 py-2 font-semibold text-right">DW spd</th>
              <th className="px-3 py-2 font-semibold text-right">Base spd</th>
              <th className="px-3 py-2 font-semibold text-right">Final spd</th>
            </tr>
          </thead>
          <tbody>
            {landings.map((l) => {
              const isCurrent = currentTimeMs >= l.startMs && currentTimeMs <= l.endMs;
              return (
                <tr
                  key={l.index}
                  onClick={() => onSeek(l.startMs - startMs)}
                  className={`cursor-pointer border-t border-slate-800 transition-colors hover:bg-slate-800/60 ${
                    isCurrent ? "bg-cyan-500/10" : ""
                  }`}
                >
                  <td className="px-3 py-2 font-semibold text-slate-300">{l.index}</td>
                  <td className="px-3 py-2">
                    <span className="font-semibold text-cyan-300">{l.aerodromeCode}</span>
                    {l.touched ? null : (
                      <span className="ml-1.5 text-[10px] text-slate-500">(low pass)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-slate-400">{formatUtcShort(l.timeMs)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-200">
                    {l.separationM != null ? `${(l.separationM / METERS_PER_NM).toFixed(2)} NM` : "–"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-200">
                    {l.altitudeFtAgl != null ? `${Math.round(l.altitudeFtAgl).toLocaleString()} ft` : "–"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-300">{kt(l.speedsKt.downwind)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-300">{kt(l.speedsKt.base)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-300">{kt(l.speedsKt.final)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-1.5 text-right text-[10px] text-slate-600">
        Speeds are GPS ground speed (kt), not airspeed.
      </div>
    </div>
  );
}
