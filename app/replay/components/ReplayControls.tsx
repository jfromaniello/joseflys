"use client";

import { useEffect, useRef, useState } from "react";
import { formatUtc, formatUtcShort } from "../formatTime";
import {
  SPEED_OPTIONS,
  VIEW_MODE_OPTIONS,
  type MapStyle,
  type OrientationStatus,
  type SpeedOption,
  type ViewMode,
} from "../types";

interface ReplayControlsProps {
  isFullscreen: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  /** Elapsed ms within the track, clamped to its duration. */
  elapsedMs: number;
  endMs: number;
  currentTimeMs: number;
  durationMs: number;
  pointCount: number;
  onSliderChange: (value: number) => void;
  speed: SpeedOption;
  onSpeedChange: (speed: SpeedOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  mapStyle: MapStyle;
  onMapStyleChange: (style: MapStyle) => void;
  hasGoogleMapsKey: boolean;
  orientationStatus: OrientationStatus;
  headTrackingEnabled: boolean;
  onHeadTrackingToggle: () => void;
  showTrack: boolean;
  onShowTrackChange: (value: boolean) => void;
}

const MAP_STYLE_OPTIONS: { value: MapStyle; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "photorealistic", label: "Photoreal 3D" },
];

function viewModeHint(viewMode: ViewMode): string {
  switch (viewMode) {
    case "free":
      return "Manual camera. Drag to look around.";
    case "cinematic":
      return "Cinematic chase + side angles on turns.";
    case "cockpit":
      return "First-person view from the aircraft.";
  }
}

/**
 * Bottom playback bar: play/pause, current/end time, scrub slider, and a
 * settings dropdown for playback speed, camera mode, and map style. Manages its
 * own open/close (with click-outside) state for the dropdown.
 */
export function ReplayControls({
  isFullscreen,
  isPlaying,
  onTogglePlay,
  elapsedMs,
  endMs,
  currentTimeMs,
  durationMs,
  pointCount,
  onSliderChange,
  speed,
  onSpeedChange,
  viewMode,
  onViewModeChange,
  mapStyle,
  onMapStyleChange,
  hasGoogleMapsKey,
  orientationStatus,
  headTrackingEnabled,
  onHeadTrackingToggle,
  showTrack,
  onShowTrackChange,
}: ReplayControlsProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [settingsOpen]);

  const disabled = pointCount < 2 || durationMs <= 0;

  return (
    <div
      className={
        isFullscreen
          ? "absolute bottom-4 left-4 right-4 z-[600] flex items-center gap-3 rounded-lg bg-slate-900/85 border border-gray-700 px-3 py-2 backdrop-blur"
          : "mt-4 flex items-center gap-3 rounded-lg bg-slate-900/60 border border-gray-700 px-3 py-2"
      }
    >
      <button
        type="button"
        onClick={onTogglePlay}
        disabled={disabled}
        aria-label={isPlaying ? "Pause" : "Play"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white cursor-pointer transition-colors"
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <span className="text-xs tabular-nums shrink-0" style={{ color: "oklch(0.7 0.02 240)" }}>
        <span className="sm:hidden">{formatUtcShort(currentTimeMs)}</span>
        <span className="hidden sm:inline">{formatUtc(currentTimeMs)}</span>
      </span>

      <input
        type="range"
        min={0}
        max={Math.max(0, durationMs)}
        step={100}
        value={elapsedMs}
        onChange={(e) => onSliderChange(Number.parseInt(e.target.value, 10))}
        disabled={disabled}
        className="flex-1 min-w-0 accent-cyan-500 cursor-pointer disabled:cursor-not-allowed"
      />

      <span className="text-xs tabular-nums shrink-0" style={{ color: "oklch(0.6 0.02 240)" }}>
        <span className="sm:hidden">{formatUtcShort(endMs)}</span>
        <span className="hidden sm:inline">{formatUtc(endMs)}</span>
      </span>

      <div className="relative shrink-0" ref={settingsRef}>
        <button
          type="button"
          onClick={() => setSettingsOpen((prev) => !prev)}
          aria-label="Playback settings"
          aria-expanded={settingsOpen}
          title="Playback settings"
          className={`flex h-8 w-8 items-center justify-center rounded-md border text-xs cursor-pointer transition-colors ${
            settingsOpen || viewMode !== "free"
              ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
              : "bg-slate-800 border-slate-700 text-gray-300 hover:bg-slate-700"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
            />
          </svg>
        </button>

        {settingsOpen && (
          <div className="absolute right-0 bottom-full mb-2 w-64 rounded-lg bg-slate-900 border border-slate-600 shadow-xl z-50 p-3 space-y-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Playback Speed
              </div>
              <div className="grid grid-cols-4 gap-1 rounded-md bg-slate-800/60 p-0.5">
                {SPEED_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onSpeedChange(option);
                      setSettingsOpen(false);
                    }}
                    className={`px-2 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                      speed === option ? "bg-cyan-500 text-slate-950" : "text-gray-300 hover:bg-slate-700"
                    }`}
                  >
                    {option}x
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-700 pt-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Camera
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-md bg-slate-800/60 p-0.5">
                {VIEW_MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onViewModeChange(opt.value);
                      setSettingsOpen(false);
                    }}
                    disabled={pointCount < 2 && opt.value !== "free"}
                    className={`px-2 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors whitespace-nowrap text-center disabled:cursor-not-allowed disabled:opacity-50 ${
                      viewMode === opt.value ? "bg-cyan-500 text-slate-950" : "text-gray-300 hover:bg-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="mt-1.5 text-[10px] text-slate-400 leading-tight">{viewModeHint(viewMode)}</div>
              {viewMode === "cockpit" && orientationStatus !== "unavailable" ? (
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false);
                    onHeadTrackingToggle();
                  }}
                  className={`mt-2 w-full rounded-md text-xs font-semibold px-3 py-1.5 cursor-pointer transition-colors ${
                    headTrackingEnabled
                      ? "bg-slate-700 hover:bg-slate-600 text-white"
                      : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                  }`}
                >
                  {headTrackingEnabled ? "Disable head tracking" : "Enable head tracking"}
                </button>
              ) : null}
              {viewMode === "cockpit" && orientationStatus === "denied" ? (
                <div className="mt-1.5 text-[10px] text-amber-400 leading-tight">
                  Motion permission was denied. Reload to re-prompt.
                </div>
              ) : null}
            </div>

            <div className="border-t border-slate-700 pt-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Map Style
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-800/60 p-0.5">
                {MAP_STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onMapStyleChange(opt.value);
                      setSettingsOpen(false);
                    }}
                    disabled={opt.value === "photorealistic" && !hasGoogleMapsKey}
                    className={`px-2 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors whitespace-nowrap text-center disabled:cursor-not-allowed disabled:opacity-50 ${
                      mapStyle === opt.value ? "bg-cyan-500 text-slate-950" : "text-gray-300 hover:bg-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="mt-1.5 text-[10px] text-slate-400 leading-tight">
                {mapStyle === "standard"
                  ? "Satellite imagery + DEM terrain."
                  : "Google photorealistic 3D mesh (like Google Earth)."}
              </div>
            </div>

            <div className="border-t border-slate-700 pt-3">
              <button
                type="button"
                onClick={() => onShowTrackChange(!showTrack)}
                className="flex w-full items-center justify-between cursor-pointer"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Track line
                </span>
                <span
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    showTrack ? "bg-cyan-500" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                      showTrack ? "left-[1.125rem]" : "left-0.5"
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
