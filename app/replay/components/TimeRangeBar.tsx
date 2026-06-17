"use client";

interface TimeRangeBarProps {
  /** Full track duration (ms); the selectable window spans [0, durationMs]. */
  durationMs: number;
  /** Current In handle, in elapsed ms from the track start. */
  rangeStartMs: number;
  /** Current Out handle, in elapsed ms from the track start. */
  rangeEndMs: number;
  /** Smallest allowed window (ms) between the two handles. */
  minWindowMs: number;
  onRangeStartChange: (ms: number) => void;
  onRangeEndChange: (ms: number) => void;
  /**
   * Called while dragging a handle with that handle's time (elapsed ms), so the
   * caller can live-seek the view behind the modal. The seek also drives the
   * background slider, telemetry, and circuit-phase highlighting.
   */
  onSeek?: (ms: number) => void;
}

/**
 * Two range inputs overlaid on one track: the In and Out handles share the same
 * bar. The handle in the right half is kept on top so it stays grabbable when
 * the two sit close together.
 */
export function TimeRangeBar({
  durationMs,
  rangeStartMs,
  rangeEndMs,
  minWindowMs,
  onRangeStartChange,
  onRangeEndChange,
  onSeek,
}: TimeRangeBarProps) {
  const windowMs = rangeEndMs - rangeStartMs;

  return (
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
        onChange={(e) => {
          const next = Math.min(Number(e.target.value), rangeEndMs - minWindowMs);
          onRangeStartChange(next);
          onSeek?.(next);
        }}
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
        onChange={(e) => {
          const next = Math.max(Number(e.target.value), rangeStartMs + minWindowMs);
          onRangeEndChange(next);
          onSeek?.(next);
        }}
        aria-label="Range end"
        className="range-dual"
        style={{ zIndex: rangeStartMs > durationMs / 2 ? 4 : 5 }}
      />
    </div>
  );
}
