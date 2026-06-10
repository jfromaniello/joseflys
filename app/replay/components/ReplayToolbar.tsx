"use client";

import type { ShareStatus } from "../shareReplay";

interface ReplayToolbarProps {
  /** Name of the loaded track file (uploaded or shared). */
  trackName?: string;
  onNewGpx: () => void;
  onShare: () => void;
  canShare: boolean;
  shareStatus: ShareStatus;
  onRecord: () => void;
  /** Hidden when MP4 recording isn't supported by the browser. */
  canRecord: boolean;
}

function shareLabel(status: ShareStatus): string {
  switch (status) {
    case "loading":
      return "Creating link…";
    case "copied":
      return "Link copied!";
    case "error":
      return "Share failed";
    default:
      return "Share";
  }
}

/** Compact app bar: page title, loaded track name, and New GPX / Record / Share actions. */
export function ReplayToolbar({
  trackName,
  onNewGpx,
  onShare,
  canShare,
  shareStatus,
  onRecord,
  canRecord,
}: ReplayToolbarProps) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-gray-800 bg-slate-900/70 px-3 sm:px-4">
      <div className="flex min-w-0 items-baseline gap-2.5">
        <h1 className="shrink-0 text-sm font-bold text-white">GPX Replay 3D</h1>
        {trackName ? (
          <span className="truncate text-xs" style={{ color: "oklch(0.62 0.02 240)" }} title={trackName}>
            {trackName}
          </span>
        ) : null}
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <button
          type="button"
          onClick={onNewGpx}
          title="Load a different GPX file"
          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors bg-slate-700 hover:bg-slate-600 text-white"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h7l2 2h7v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 11v6M9 14h6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="hidden sm:inline">New GPX</span>
        </button>
        {canRecord ? (
          <button
            type="button"
            onClick={onRecord}
            title="Record this replay as an MP4 video"
            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors bg-slate-700 hover:bg-slate-600 text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
            </svg>
            <span className="hidden sm:inline">Record</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={onShare}
          disabled={!canShare || shareStatus === "loading"}
          title="Copy a shareable link to current position"
          className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            shareStatus === "error" ? "bg-red-600 text-white" : "bg-cyan-600 hover:bg-cyan-500 text-white"
          }`}
        >
          {shareStatus === "loading" ? (
            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
            </svg>
          )}
          <span className="hidden sm:inline">{shareLabel(shareStatus)}</span>
        </button>
      </div>
    </div>
  );
}
