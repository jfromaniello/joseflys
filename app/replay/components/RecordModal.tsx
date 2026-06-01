"use client";

import { useEffect, useState } from "react";
import { SPEED_OPTIONS, type SpeedOption } from "../types";
import type { RecordingStatus } from "../useReplayRecorder";

interface RecordModalProps {
  status: RecordingStatus;
  progress: number;
  resultUrl: string | null;
  error: string | null;
  supported: boolean;
  onStart: (speed: SpeedOption) => void;
  onClose: () => void;
}

const DEFAULT_SPEED: SpeedOption = 50;

/** Pre-record options, live progress, and the finished-clip preview/download. */
export function RecordModal({
  status,
  progress,
  resultUrl,
  error,
  supported,
  onStart,
  onClose,
}: RecordModalProps) {
  const [speed, setSpeed] = useState<SpeedOption>(DEFAULT_SPEED);

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
              Plays the whole flight and saves an MP4 with the 3D view and telemetry.
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
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Playback speed
              </div>
              <div className="grid grid-cols-4 gap-1 rounded-md bg-slate-800/60 p-0.5">
                {SPEED_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSpeed(option)}
                    className={`px-2 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                      speed === option ? "bg-cyan-500 text-slate-950" : "text-gray-300 hover:bg-slate-700"
                    }`}
                  >
                    {option}x
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400 leading-tight">
                Higher speed = shorter clip, but fast-moving terrain may look less sharp while tiles load.
                Cinematic camera makes the best clips.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onStart(speed)}
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
