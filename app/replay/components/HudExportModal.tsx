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
import { NATIVE_HELPER_PORT, type UseNativeOverlayExportResult } from "../useNativeOverlayExport";
import type { OverlayMotion } from "../overlayFrame";
import { formatUtc } from "../formatTime";

const MOTION_OPTIONS: { value: OverlayMotion; label: string }[] = [
  { value: "smooth", label: "Smooth" },
  { value: "medium", label: "Medium" },
  { value: "stepped", label: "Stepped" },
];

const ASPECT_OPTIONS: { value: "16:9" | "9:16"; label: string }[] = [
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
];

/** Smallest exportable window (ms): keeps a couple of frames at any FPS. */
const MIN_WINDOW_MS = 1000;

/** Where the exported video comes out: in-browser MP4 pair, or native ProRes. */
type OutputMode = "mp4" | "native";

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
  /** Native ProRes export (streams frames to the local helper). */
  native: UseNativeOverlayExportResult;
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

/** Pre-export options, live progress, and the finished result. */
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
  native,
  onStart,
  onClose,
  onCancel,
}: HudExportModalProps) {
  const [outputMode, setOutputMode] = useState<OutputMode>("mp4");
  const [overlay, setOverlay] = useState<HudOverlayKind>(pfdAvailable ? "pfd" : "hud");
  const [fps, setFps] = useState<HudExportFps>(30);
  const [aspect, setAspect] = useState<"16:9" | "9:16">("16:9");
  const [resolution, setResolution] = useState<RecordResolution>("1080p");
  const [motion, setMotion] = useState<OverlayMotion>("smooth");
  const [showTitle, setShowTitle] = useState(true);
  const [title, setTitle] = useState(defaultTitle);
  const [watermark, setWatermark] = useState(true);
  // Exported window, in elapsed ms from the track start; defaults to the whole flight.
  const [rangeStartMs, setRangeStartMs] = useState(0);
  const [rangeEndMs, setRangeEndMs] = useState(durationMs);
  const [port, setPort] = useState(NATIVE_HELPER_PORT);

  const outputSize = recordOutputSize(aspect, resolution);
  const windowMs = rangeEndMs - rangeStartMs;
  const isFullRange = rangeStartMs <= 0 && rangeEndMs >= durationMs;

  const busyMp4 = status === "exporting" || status === "encoding";
  const busyNative = native.status === "exporting";
  const busy = busyMp4 || busyNative;

  // Which screen to show: an active export takes over; otherwise options.
  const view =
    native.status === "exporting"
      ? "native-progress"
      : native.status === "done"
        ? "native-done"
        : native.status === "error"
          ? "native-error"
          : busyMp4
            ? "mp4-progress"
            : status === "done"
              ? "mp4-done"
              : status === "error"
                ? "mp4-error"
                : "options";

  // Poll the local helper while the native tab is open and idle.
  const { probeHelper } = native;
  useEffect(() => {
    if (outputMode !== "native" || view !== "options") return;
    void probeHelper(port);
    const id = setInterval(() => probeHelper(port), 2000);
    return () => clearInterval(id);
  }, [outputMode, view, port, probeHelper]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const buildOptions = (): HudExportOptions => ({
    overlay,
    fps,
    aspect,
    resolution,
    title: showTitle && title.trim() ? title.trim() : null,
    watermark,
    rangeStartMs,
    rangeEndMs,
    motion,
  });

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

        {view === "native-progress" ? (
          <div className="space-y-3">
            <div className="text-sm text-slate-200">
              Streaming to local helper… {Math.round(native.progress * 100)}%
              {native.etaSeconds !== null ? ` · ${formatEta(native.etaSeconds)} left` : ""}
            </div>
            <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-[width] duration-150"
                style={{ width: `${Math.round(native.progress * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Frames are encoding in native ffmpeg on your machine. Keep this tab open.
            </p>
            <button
              type="button"
              onClick={native.cancel}
              className="w-full rounded-md px-4 py-2 text-sm font-medium cursor-pointer transition-colors bg-slate-700 hover:bg-slate-600 text-white"
            >
              Cancel
            </button>
          </div>
        ) : view === "native-done" ? (
          <div className="space-y-3">
            <div className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-2.5">
              <p className="text-sm font-medium text-emerald-300">✓ ProRes file written by the helper.</p>
              {native.output ? (
                <p className="mt-1 break-all font-mono text-[11px] text-slate-300">{native.output}</p>
              ) : null}
              {native.bytes != null ? (
                <p className="mt-0.5 text-[11px] text-slate-400">{formatBytes(native.bytes)}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-md px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              Done
            </button>
          </div>
        ) : view === "native-error" ? (
          <div className="space-y-3">
            <p className="text-sm text-red-300">{native.error ?? "Native export failed."}</p>
            <button
              type="button"
              onClick={native.reset}
              className="w-full rounded-md px-4 py-2 text-sm font-medium cursor-pointer transition-colors bg-slate-700 hover:bg-slate-600 text-white"
            >
              Back
            </button>
          </div>
        ) : view === "mp4-error" ? (
          <p className="text-sm text-red-300">{error ?? "Something went wrong while exporting."}</p>
        ) : view === "mp4-done" && fillUrl && matteUrl ? (
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
        ) : view === "mp4-progress" ? (
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
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Output
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-800/60 p-0.5">
                <button
                  type="button"
                  onClick={() => setOutputMode("mp4")}
                  className={`px-2 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                    outputMode === "mp4" ? "bg-cyan-500 text-slate-950" : "text-gray-300 hover:bg-slate-700"
                  }`}
                >
                  MP4 pair
                </button>
                <button
                  type="button"
                  onClick={() => setOutputMode("native")}
                  className={`px-2 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                    outputMode === "native" ? "bg-cyan-500 text-slate-950" : "text-gray-300 hover:bg-slate-700"
                  }`}
                >
                  Native ProRes
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400 leading-tight">
                {outputMode === "mp4"
                  ? "Two MP4s (fill + matte) — works in any Chromium browser, no install."
                  : "One transparent ProRes 4444 .mov via a tiny local helper — faster, single file, true alpha."}
              </p>
            </div>

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
                Overlay motion
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-md bg-slate-800/60 p-0.5">
                {MOTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMotion(opt.value)}
                    className={`px-2 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                      motion === opt.value ? "bg-cyan-500 text-slate-950" : "text-gray-300 hover:bg-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400 leading-tight">
                {motion === "smooth"
                  ? "Renders every frame — smoothest motion, slowest export."
                  : motion === "medium"
                    ? "Renders ~half the frames and duplicates the rest — ≈2× faster, still fluid."
                    : "Renders one frame per second (the log's true rate) and holds it — fastest, telemetry ticks once a second."}
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
                  {outputMode === "mp4"
                    ? `Exports two ${outputSize.width}×${outputSize.height} MP4s: the overlay over black (fill) and its transparency as white-on-black (matte).`
                    : `Exports one ${outputSize.width}×${outputSize.height} ProRes 4444 .mov with a real alpha channel.`}
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

            {outputMode === "mp4" ? (
              <>
                <MatteWorkflowHint />
                {!supported ? (
                  <p className="text-sm text-amber-300">
                    In-browser MP4 export needs a modern browser (try Chrome or Edge). Or use Native ProRes.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => onStart(buildOptions())}
                    className="w-full rounded-md px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors bg-cyan-600 hover:bg-cyan-500 text-white"
                  >
                    Export overlay
                  </button>
                )}
              </>
            ) : (
              <NativeExportFooter
                helper={native.helper}
                port={port}
                onPortChange={setPort}
                onExport={() => native.startExport({ ...buildOptions(), port })}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Helper-status panel, the npx command, and the native export button. */
function NativeExportFooter({
  helper,
  port,
  onPortChange,
  onExport,
}: {
  helper: UseNativeOverlayExportResult["helper"];
  port: number;
  onPortChange: (port: number) => void;
  onExport: () => void;
}) {
  const command = port === NATIVE_HELPER_PORT ? "npx joseflys-overlay-generator" : `npx joseflys-overlay-generator -p ${port}`;
  const online = helper.status === "online";

  const dot =
    helper.status === "online"
      ? "bg-emerald-400"
      : helper.status === "checking" || helper.status === "unknown"
        ? "bg-amber-400"
        : "bg-slate-500";

  return (
    <div className="space-y-3 border-t border-slate-700 pt-3">
      <div>
        <p className="text-[11px] text-slate-400 leading-relaxed mb-1.5">
          Run this in a terminal and keep it open, then click Export:
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded bg-slate-950/80 px-2 py-1.5 font-mono text-[11px] text-slate-200 whitespace-pre">
            {command}
          </code>
          <button
            type="button"
            onClick={() => void navigator.clipboard?.writeText(command)}
            className="shrink-0 rounded-md bg-slate-700 px-2.5 py-1.5 text-[11px] font-medium text-white cursor-pointer hover:bg-slate-600"
          >
            Copy
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          {helper.status === "online"
            ? `Helper connected${helper.version ? ` (v${helper.version})` : ""}`
            : helper.status === "offline"
              ? "Helper not detected"
              : "Looking for helper…"}
        </span>
        <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
          Port
          <input
            type="number"
            value={port}
            onChange={(e) => onPortChange(Number(e.target.value) || NATIVE_HELPER_PORT)}
            className="w-16 rounded bg-slate-800/60 border border-slate-700 px-1.5 py-0.5 text-right text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={!online || helper.busy}
        onClick={onExport}
        title={online ? undefined : "Start the helper first"}
        className="w-full rounded-md px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-40 bg-cyan-600 hover:bg-cyan-500 text-white"
      >
        {helper.busy ? "Helper busy…" : "Export to ProRes"}
      </button>
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

/** Formats a byte count as "12.3 MB" / "1.2 GB". */
function formatBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} KB`;
  return `${n} B`;
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
