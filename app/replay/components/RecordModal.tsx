"use client";

import { useEffect, useState } from "react";
import { SPEED_OPTIONS, VIEW_MODE_OPTIONS, type SpeedOption, type ViewMode } from "../types";
import { CHASE_DISTANCE_MAX, CHASE_DISTANCE_MIN } from "../useReplayPreferences";
import type { RecordingStatus, RecordOptions, RecordQuality } from "../useReplayRecorder";

interface RecordModalProps {
  status: RecordingStatus;
  progress: number;
  resultUrl: string | null;
  error: string | null;
  supported: boolean;
  onStart: (options: RecordOptions) => void;
  onClose: () => void;
  /** Aborts an in-progress recording and returns to the options screen. */
  onCancel: () => void;
  /** Live playback speed (shared with the gear menu). */
  speed: SpeedOption;
  onSpeedChange: (speed: SpeedOption) => void;
  /** Live camera mode (set up the shot from here). */
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  /** Live track-line visibility. */
  showTrack: boolean;
  onShowTrackChange: (value: boolean) => void;
  /** Live chase camera distance (metres). */
  chaseDistance: number;
  onChaseDistanceChange: (value: number) => void;
}

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="flex w-full items-center justify-between cursor-pointer">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <span className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-cyan-500" : "bg-slate-600"}`}>
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            on ? "left-[1.125rem]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

/** Pre-record options, live progress, and the finished-clip preview/download. */
export function RecordModal({
  status,
  progress,
  resultUrl,
  error,
  supported,
  onStart,
  onClose,
  onCancel,
  speed,
  onSpeedChange,
  viewMode,
  onViewModeChange,
  showTrack,
  onShowTrackChange,
  chaseDistance,
  onChaseDistanceChange,
}: RecordModalProps) {
  const [showTelemetry, setShowTelemetry] = useState(true);
  const [quality, setQuality] = useState<RecordQuality>("sharp");

  const busy = status === "recording" || status === "encoding";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Record replay"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Record this replay</h3>
            <p className="text-xs mt-1" style={{ color: "oklch(0.7 0.02 240)" }}>
              Plays the whole flight and saves an MP4 of the 3D view.
            </p>
          </div>
          {!busy ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 h-8 w-8 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
        </div>

        {!supported ? (
          <p className="text-sm text-amber-300">
            Recording to MP4 needs a modern browser (try Chrome or Edge).
          </p>
        ) : status === "error" ? (
          <p className="text-sm text-red-300">{error ?? "Something went wrong while recording."}</p>
        ) : status === "done" && resultUrl ? (
          <div className="space-y-3">
            <video src={resultUrl} controls className="w-full rounded-lg border border-slate-700 bg-black" />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-emerald-400">Saved to your downloads.</span>
              <a
                href={resultUrl}
                download
                className="rounded-md px-4 py-2 text-sm font-medium cursor-pointer transition-colors bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                Download again
              </a>
            </div>
          </div>
        ) : busy ? (
          <div className="space-y-3">
            <div className="text-sm text-slate-200">
              {status === "encoding" ? "Encoding video…" : `Recording… ${Math.round(progress * 100)}%`}
            </div>
            <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-[width] duration-150"
                style={{ width: `${Math.round((status === "encoding" ? 1 : progress) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">Keep this tab focused while recording.</p>
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-md px-4 py-2 text-sm font-medium cursor-pointer transition-colors bg-slate-700 hover:bg-slate-600 text-white"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Camera</div>
              <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-800/60 p-0.5">
                {VIEW_MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onViewModeChange(opt.value)}
                    className={`px-2 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                      viewMode === opt.value ? "bg-cyan-500 text-slate-950" : "text-gray-300 hover:bg-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {viewMode === "chase" || viewMode === "cinematic" ? (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    <span>Chase distance</span>
                    <span className="tabular-nums text-slate-300">{chaseDistance} m</span>
                  </div>
                  <input
                    type="range"
                    min={CHASE_DISTANCE_MIN}
                    max={CHASE_DISTANCE_MAX}
                    step={50}
                    value={chaseDistance}
                    onChange={(e) => onChaseDistanceChange(Number.parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              ) : null}
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Playback speed
              </div>
              <div className="grid grid-cols-4 gap-1 rounded-md bg-slate-800/60 p-0.5">
                {SPEED_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onSpeedChange(option)}
                    className={`px-2 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                      speed === option ? "bg-cyan-500 text-slate-950" : "text-gray-300 hover:bg-slate-700"
                    }`}
                  >
                    {option}x
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Quality
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-800/60 p-0.5">
                {([
                  { value: "sharp", label: "Sharp" },
                  { value: "fast", label: "Fast" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setQuality(opt.value)}
                    className={`px-2 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                      quality === opt.value ? "bg-cyan-500 text-slate-950" : "text-gray-300 hover:bg-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400 leading-tight">
                {quality === "sharp"
                  ? "Waits for terrain tiles to load each frame — crisp, but takes longer."
                  : "Real-time capture — quick, but fast terrain may look blurry while tiles load."}
              </p>
            </div>

            <div className="space-y-2.5 border-t border-slate-700 pt-3">
              <Toggle label="Telemetry HUD" on={showTelemetry} onToggle={() => setShowTelemetry((v) => !v)} />
              <Toggle label="Track line" on={showTrack} onToggle={() => onShowTrackChange(!showTrack)} />
            </div>

            <button
              type="button"
              onClick={() => onStart({ speed, showTelemetry, quality })}
              className="w-full rounded-md px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors bg-red-600 hover:bg-red-500 text-white"
            >
              Start recording
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
