"use client";

import { useEffect, useState } from "react";
import {
  HUD_EXPORT_FPS_OPTIONS,
  RECORD_RESOLUTIONS,
  recordOutputSize,
  type HudExportFps,
  type RecordResolution,
} from "../types";
import type { HudExportOptions, HudExportStatus, HudOverlayKind } from "../useHudExport";
import { formatUtc } from "../formatTime";

const ASPECT_OPTIONS: { value: "16:9" | "9:16"; label: string }[] = [
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
];

/** Smallest exportable window (ms): keeps a couple of frames at any FPS. */
const MIN_WINDOW_MS = 1000;

interface HudExportModalProps {
  status: HudExportStatus;
  progress: number;
  /** Estimated seconds remaining, when known. */
  etaSeconds: number | null;
  fillUrl: string | null;
  matteUrl: string | null;
  fillName: string | null;
  matteName: string | null;
  error: string | null;
  supported: boolean;
  /** Whether the track has avionics data for the glass-cockpit PFD overlay. */
  pfdAvailable: boolean;
  /** Suggested flight title (registration + date/time + departure aerodrome). */
  defaultTitle: string;
  /** Absolute UTC start of the track (ms), for the time-range readout. */
  trackStartMs: number;
  /** Full track duration (ms); the exportable window spans [0, durationMs]. */
  durationMs: number;
  onStart: (options: HudExportOptions) => void;
  onClose: () => void;
  /** Aborts an in-progress export and returns to the options screen. */
  onCancel: () => void;
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

/** Pre-export options, live progress, and the finished fill/matte downloads. */
export function HudExportModal({
  status,
  progress,
  etaSeconds,
  fillUrl,
  matteUrl,
  fillName,
  matteName,
  error,
  supported,
  pfdAvailable,
  defaultTitle,
  trackStartMs,
  durationMs,
  onStart,
  onClose,
  onCancel,
}: HudExportModalProps) {
  const [overlay, setOverlay] = useState<HudOverlayKind>(pfdAvailable ? "pfd" : "hud");
  const [fps, setFps] = useState<HudExportFps>(30);
  const [aspect, setAspect] = useState<"16:9" | "9:16">("16:9");
  const [resolution, setResolution] = useState<RecordResolution>("1080p");
  const [showTitle, setShowTitle] = useState(true);
  const [title, setTitle] = useState(defaultTitle);
  const [watermark, setWatermark] = useState(true);
  // Exported window, in elapsed ms from the track start; defaults to the whole flight.
  const [rangeStartMs, setRangeStartMs] = useState(0);
  const [rangeEndMs, setRangeEndMs] = useState(durationMs);

  const outputSize = recordOutputSize(aspect, resolution);
  const windowMs = rangeEndMs - rangeStartMs;
  const isFullRange = rangeStartMs <= 0 && rangeEndMs >= durationMs;

  const busy = status === "exporting" || status === "encoding";

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
      aria-label="Export HUD overlay"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Export HUD overlay</h3>
            <p className="text-xs mt-1" style={{ color: "oklch(0.7 0.02 240)" }}>
              Renders the telemetry overlay alone (no 3D map) for compositing over your real flight footage.
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
            Exporting to MP4 needs a modern browser (try Chrome or Edge).
          </p>
        ) : status === "error" ? (
          <p className="text-sm text-red-300">{error ?? "Something went wrong while exporting."}</p>
        ) : status === "done" && fillUrl && matteUrl ? (
          <div className="space-y-3">
            <video
              src={fillUrl}
              controls
              className="w-full max-h-[45vh] object-contain rounded-lg border border-slate-700 bg-black"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-emerald-400">
                Saved to your downloads. If your browser blocked one, use the buttons.
              </span>
              <div className="flex gap-2">
                <a
                  href={fillUrl}
                  download={fillName ?? "hud-fill.mp4"}
                  className="rounded-md px-3 py-2 text-sm font-medium cursor-pointer transition-colors bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  Fill
                </a>
                <a
                  href={matteUrl}
                  download={matteName ?? "hud-matte.mp4"}
                  className="rounded-md px-3 py-2 text-sm font-medium cursor-pointer transition-colors bg-slate-700 hover:bg-slate-600 text-white"
                >
                  Matte
                </a>
              </div>
            </div>
            <MatteWorkflowHint />
          </div>
        ) : busy ? (
          <div className="space-y-3">
            <div className="text-sm text-slate-200">
              {status === "encoding"
                ? "Finalizing videos…"
                : `Exporting… ${Math.round(progress * 100)}%${etaSeconds !== null ? ` · ${formatEta(etaSeconds)} left` : ""}`}
            </div>
            <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-[width] duration-150"
                style={{ width: `${Math.round((status === "encoding" ? 1 : progress) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Renders offline, several times faster than real time. You can switch tabs, but don&apos;t close
              this one.
            </p>
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
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Overlay</div>
              <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-800/60 p-0.5">
                <button
                  type="button"
                  disabled={!pfdAvailable}
                  onClick={() => setOverlay("pfd")}
                  title={pfdAvailable ? undefined : "Needs an avionics log (Garmin CSV)"}
                  className={`px-2 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    overlay === "pfd" ? "bg-cyan-500 text-slate-950" : "text-gray-300 hover:bg-slate-700"
                  }`}
                >
                  Glass cockpit
                </button>
                <button
                  type="button"
                  onClick={() => setOverlay("hud")}
                  className={`px-2 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                    overlay === "hud" ? "bg-cyan-500 text-slate-950" : "text-gray-300 hover:bg-slate-700"
                  }`}
                >
                  Simple HUD
                </button>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Frame rate
              </div>
              <div className="grid grid-cols-4 gap-1 rounded-md bg-slate-800/60 p-0.5">
                {HUD_EXPORT_FPS_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFps(option)}
                    className={`px-2 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                      fps === option ? "bg-cyan-500 text-slate-950" : "text-gray-300 hover:bg-slate-700"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400 leading-tight">
                Match your camera&apos;s frame rate. Time always runs at 1× so the burned-in UTC clock lines up
                with your footage.
              </p>
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Format
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-800/60 p-0.5">
                {ASPECT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAspect(opt.value)}
                    className={`px-2 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                      aspect === opt.value ? "bg-cyan-500 text-slate-950" : "text-gray-300 hover:bg-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-2 gap-1 rounded-md bg-slate-800/60 p-0.5">
                {RECORD_RESOLUTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setResolution(opt)}
                    className={`px-2 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                      resolution === opt ? "bg-cyan-500 text-slate-950" : "text-gray-300 hover:bg-slate-700"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {outputSize ? (
                <p className="mt-1.5 text-[11px] text-slate-400 leading-tight">
                  Exports two {outputSize.width}×{outputSize.height} MP4s: the overlay over black (fill) and its
                  transparency as white-on-black (matte).
                </p>
              ) : null}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Time range
                </span>
                {!isFullRange ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRangeStartMs(0);
                      setRangeEndMs(durationMs);
                    }}
                    className="text-[10px] font-medium text-cyan-400 hover:text-cyan-300 cursor-pointer"
                  >
                    Full flight
                  </button>
                ) : null}
              </div>
              {/* Two range inputs overlaid on one bar: the In and Out handles
                  share the same track. The handle in the right half is kept on
                  top so it stays grabbable when the two sit close together. */}
              <div className="relative h-4">
                <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-700" />
                <div
                  className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-cyan-500"
                  style={{
                    left: `${durationMs > 0 ? (rangeStartMs / durationMs) * 100 : 0}%`,
                    width: `${durationMs > 0 ? (windowMs / durationMs) * 100 : 100}%`,
                  }}
                />
                <input
                  type="range"
                  min={0}
                  max={durationMs}
                  step={1000}
                  value={rangeStartMs}
                  onChange={(e) =>
                    setRangeStartMs(Math.min(Number(e.target.value), rangeEndMs - MIN_WINDOW_MS))
                  }
                  aria-label="Range start"
                  className="range-dual"
                  style={{ zIndex: rangeStartMs > durationMs / 2 ? 5 : 4 }}
                />
                <input
                  type="range"
                  min={0}
                  max={durationMs}
                  step={1000}
                  value={rangeEndMs}
                  onChange={(e) =>
                    setRangeEndMs(Math.max(Number(e.target.value), rangeStartMs + MIN_WINDOW_MS))
                  }
                  aria-label="Range end"
                  className="range-dual"
                  style={{ zIndex: rangeStartMs > durationMs / 2 ? 4 : 5 }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400 leading-tight tabular-nums">
                {formatUtc(trackStartMs + rangeStartMs)} – {formatUtc(trackStartMs + rangeEndMs)} UTC ·{" "}
                {formatWindow(windowMs)} clip
                {isFullRange ? null : " (faster than the full flight)"}
              </p>
            </div>

            <div className="space-y-2.5 border-t border-slate-700 pt-3">
              <Toggle label="Flight title" on={showTitle} onToggle={() => setShowTitle((v) => !v)} />
              {showTitle ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={defaultTitle || "Flight title"}
                  aria-label="Flight title"
                  className="w-full rounded-md bg-slate-800/60 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
              ) : null}
              <Toggle label="joseflys.com watermark" on={watermark} onToggle={() => setWatermark((v) => !v)} />
            </div>

            <MatteWorkflowHint />

            <button
              type="button"
              onClick={() =>
                onStart({
                  overlay,
                  fps,
                  aspect,
                  resolution,
                  title: showTitle && title.trim() ? title.trim() : null,
                  watermark,
                  rangeStartMs,
                  rangeEndMs,
                })
              }
              className="w-full rounded-md px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              Export overlay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Formats an ETA as "45s" or "12 min". */
function formatEta(seconds: number): string {
  if (seconds < 90) return `${Math.max(1, Math.round(seconds / 5) * 5)}s`;
  return `${Math.round(seconds / 60)} min`;
}

/** Formats a window length (ms) as "45s", "5 min 30s", or "1 h 12 min". */
function formatWindow(ms: number): string {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return s > 0 ? `${m} min ${s}s` : `${m} min`;
  return `${s}s`;
}

/** Explains how to use the fill + matte pair in an editor, with the ProRes one-liner. */
function MatteWorkflowHint() {
  return (
    <details className="rounded-md bg-slate-800/60 px-3 py-2 text-[11px] text-slate-400 leading-relaxed">
      <summary className="cursor-pointer font-medium text-slate-300">How to composite the overlay</summary>
      <div className="mt-2 space-y-2">
        <p>
          Put the <span className="text-slate-200">fill</span> clip over your footage and use the{" "}
          <span className="text-slate-200">matte</span> clip as its alpha: in DaVinci Resolve, right-click the
          fill clip in the Media Pool → Add Matte, or use a MatteControl / Channel Booleans node in Fusion. In
          Premiere, apply Track Matte Key (Luma). Line up the burned-in UTC clock with your camera&apos;s
          recording time.
        </p>
        <p>
          To bake a single transparent ProRes 4444 file locally with ffmpeg:
        </p>
        <code className="block overflow-x-auto rounded bg-slate-950/80 px-2 py-1.5 font-mono text-[10px] text-slate-300 whitespace-pre">
          ffmpeg -i hud-fill.mp4 -i hud-matte.mp4 -filter_complex &quot;[0][1]alphamerge&quot; -c:v prores_ks
          -profile:v 4444 -pix_fmt yuva444p10le hud.mov
        </code>
      </div>
    </details>
  );
}
