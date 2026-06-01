"use client";

import type { ShareStatus } from "../shareReplay";

interface ReplayToolbarProps {
  pointCount: number;
  /** Name of a shared GPX, when viewing a `/replay/:id` link. */
  initialGpxName?: string;
  onNewGpx: () => void;
  onShare: () => void;
  canShare: boolean;
  shareStatus: ShareStatus;
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

function description(pointCount: number, initialGpxName?: string): string {
  if (pointCount === 0) {
    return "Upload a GPX file with timestamps to animate position in 3D. Controls support 10x, 50x, and 100x playback speeds.";
  }
  if (initialGpxName) {
    return "Shared replay. Use the slider and play controls below.";
  }
  return "Use the slider and play controls below. Load a different file anytime.";
}

/** Header row: title, contextual hint, and (once a track is loaded) New GPX / Share actions. */
export function ReplayToolbar({
  pointCount,
  initialGpxName,
  onNewGpx,
  onShare,
  canShare,
  shareStatus,
}: ReplayToolbarProps) {
  return (
    <div className="mb-6 pb-6 border-b border-gray-700 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2 text-white">Flight Track Replay</h2>
        <p className="text-sm" style={{ color: "oklch(0.7 0.02 240)" }}>
          {description(pointCount, initialGpxName)}
        </p>
      </div>
      {pointCount > 0 ? (
        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={onNewGpx}
            title="Load a different GPX file"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors bg-slate-700 hover:bg-slate-600 text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h7l2 2h7v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 11v6M9 14h6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="hidden sm:inline">New GPX</span>
          </button>
          <button
            type="button"
            onClick={onShare}
            disabled={!canShare || shareStatus === "loading"}
            title="Copy a shareable link to current position"
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
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
      ) : null}
    </div>
  );
}
