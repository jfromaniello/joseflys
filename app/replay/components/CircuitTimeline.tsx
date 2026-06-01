"use client";

import type { CircuitPhase, FlightCircuits } from "../analysis";

interface CircuitTimelineProps {
  flight: FlightCircuits;
  startMs: number;
  durationMs: number;
  currentTimeMs: number;
  /** Seeks playback to an elapsed offset (ms from track start). */
  onSeek: (elapsedMs: number) => void;
}

interface PhaseMeta {
  label: string;
  color: string;
}

/** Display label + color per circuit phase. */
const PHASE_META: Record<CircuitPhase, PhaseMeta> = {
  taxi: { label: "Taxi", color: "#475569" },
  takeoff: { label: "Takeoff", color: "#f97316" },
  upwind: { label: "Upwind", color: "#eab308" },
  crosswind: { label: "Crosswind", color: "#14b8a6" },
  downwind: { label: "Downwind", color: "#3b82f6" },
  base: { label: "Base", color: "#a855f7" },
  final: { label: "Final", color: "#ef4444" },
  landing: { label: "Landing", color: "#22c55e" },
  maneuvering: { label: "En route", color: "#1e293b" },
};

const METERS_PER_NM = 1852;

function formatSide(side: "left" | "right" | null): string {
  if (side === "left") return "Left";
  if (side === "right") return "Right";
  return "—";
}

type Tone = "good" | "warn" | "muted";

const TONE_CLASS: Record<Tone, string> = {
  good: "text-emerald-400",
  warn: "text-amber-400",
  muted: "text-slate-400",
};

/** A stat cell: small label, prominent value, and a colored sub-line/verdict. */
function StatCell({
  label,
  value,
  sub,
  subTone = "muted",
  title,
}: {
  label: string;
  value: string;
  sub?: string | null;
  subTone?: Tone;
  title?: string;
}) {
  return (
    <div className="min-w-0" title={title}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-100 truncate">{value}</div>
      {sub ? (
        <div className={`text-[11px] leading-tight truncate ${TONE_CLASS[subTone]}`}>{sub}</div>
      ) : null}
    </div>
  );
}

/** Verdict for pattern altitude vs the 1000 ft AGL reference (±150 ft = on it). */
function altitudeVerdict(altFt: number, refFt: number): { verdict: string; tone: Tone } {
  const diff = altFt - refFt;
  if (Math.abs(diff) <= 150) return { verdict: `≈ ${refFt.toLocaleString()} ft ref`, tone: "good" };
  return {
    verdict: `${Math.round(Math.abs(diff)).toLocaleString()} ft ${diff < 0 ? "below" : "above"} ${refFt.toLocaleString()} ref`,
    tone: "warn",
  };
}

/** Verdict for downwind separation (NM) vs the typical international band. */
function separationVerdict(
  nm: number,
  [min, max]: readonly [number, number]
): { verdict: string; tone: Tone } {
  if (nm < min) return { verdict: "tighter than typical", tone: "warn" };
  if (nm > max) return { verdict: "wider than typical", tone: "warn" };
  return { verdict: "typical", tone: "good" };
}

/**
 * Flight-wide circuit readout: a header for the aerodrome/leg the playhead is
 * on, per-landing quality stats, and a single combined leg strip across every
 * aerodrome visited. Clicking a leg seeks; the current leg is outlined.
 */
export function CircuitTimeline({
  flight,
  startMs,
  durationMs,
  currentTimeMs,
  onSeek,
}: CircuitTimelineProps) {
  if (durationMs <= 0 || flight.analyses.length === 0) return null;

  const pct = (ms: number) => `${Math.max(0, Math.min(1, (ms - startMs) / durationMs)) * 100}%`;

  // Current leg + aerodrome from the merged strip.
  const currentSeg = flight.segments.find(
    (s) => currentTimeMs >= s.startMs && currentTimeMs <= s.endMs
  );
  const currentMeta = currentSeg ? PHASE_META[currentSeg.phase] : null;

  // Current landing (latest started) → per-pass stats and field context.
  let activePass = -1;
  for (let i = 0; i < flight.landings.length; i += 1) {
    if (currentTimeMs >= flight.landings[i].startMs) activePass = i;
  }
  const landing = activePass >= 0 ? flight.landings[activePass] : null;

  const fieldCode = currentSeg?.aerodromeCode || landing?.aerodromeCode || flight.analyses[0]?.aerodrome.code;
  const analysis = flight.analyses.find((a) => a.aerodrome.code === fieldCode) ?? flight.analyses[0];

  const passLabel =
    flight.landings.length > 1 && landing ? `Landing ${activePass + 1}/${flight.landings.length}` : null;

  const altFt = landing?.altitudeFtAgl ?? null;
  const sepNm = landing?.separationM != null ? landing.separationM / METERS_PER_NM : null;
  const alt = altFt != null ? altitudeVerdict(altFt, analysis.standardPatternAltitudeFtAgl) : null;
  const sep = sepNm != null ? separationVerdict(sepNm, analysis.typicalDownwindSeparationNm) : null;
  const sideMatches =
    analysis.flownSide && analysis.publishedSide
      ? analysis.flownSide === analysis.publishedSide
      : null;

  return (
    <div className="mt-4 rounded-lg bg-slate-900/60 border border-gray-700">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-slate-700/70 px-4 py-2.5">
        <div className="flex items-baseline gap-2 min-w-0">
          {currentSeg?.aerodromeCode || landing ? (
            <>
              <span className="text-base font-bold text-cyan-300">{analysis.aerodrome.code}</span>
              <span className="truncate text-xs text-slate-400">{analysis.aerodrome.name}</span>
            </>
          ) : (
            <span className="text-sm font-semibold text-slate-400">En route</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {currentMeta && currentSeg?.phase !== "maneuvering" ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-200">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: currentMeta.color }} />
              {currentMeta.label}
            </span>
          ) : null}
          {passLabel ? (
            <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
              {passLabel}
            </span>
          ) : null}
        </div>
      </div>

      {/* Stat grid (current landing's field) */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 sm:grid-cols-4">
        <StatCell
          label="Runway"
          value={analysis.activeRunway.id}
          sub={analysis.aerodrome.lengthFt ? `${Math.round(analysis.aerodrome.lengthFt * 0.3048).toLocaleString()} m` : null}
        />
        <StatCell
          label="Circuit"
          value={`${formatSide(analysis.flownSide)} hand`}
          sub={
            analysis.publishedSide
              ? sideMatches
                ? "matches published"
                : `published ${formatSide(analysis.publishedSide).toLowerCase()}`
              : null
          }
          subTone={analysis.publishedSide ? (sideMatches ? "good" : "warn") : "muted"}
        />
        <StatCell
          label="Pattern alt"
          value={altFt != null ? `${Math.round(altFt).toLocaleString()} ft AGL` : "–"}
          sub={alt?.verdict}
          subTone={alt?.tone}
          title={`Altitude flown on downwind (AGL). The field is ~${Math.round(
            analysis.fieldElevationFt
          ).toLocaleString()} ft, so ${analysis.standardPatternAltitudeFtAgl.toLocaleString()} ft AGL ≈ ${Math.round(
            analysis.fieldElevationFt + analysis.standardPatternAltitudeFtAgl
          ).toLocaleString()} ft MSL. 1000 ft AGL is the common reference (FAA AIM, widely taught); Argentina doesn't fix one nationally.`}
        />
        <StatCell
          label="Downwind"
          value={sepNm != null ? `${sepNm.toFixed(2)} NM` : "–"}
          sub={sep?.verdict}
          subTone={sep?.tone}
          title={`Lateral distance from the extended runway centerline on downwind. ~0.5–1 NM is the typical international light-aircraft pattern width. Regional teaching varies — Argentine aeroclubs fly a tighter ~500 m (≈0.27 NM): the runway at ¾ up the C150 wing strut.${
            landing?.separationM != null ? ` (${Math.round(landing.separationM).toLocaleString()} m here.)` : ""
          }`}
        />
      </div>

      {/* Combined leg strip */}
      <div className="px-4 pb-3">
        <div className="relative flex h-7 w-full overflow-hidden rounded">
          {flight.segments.map((seg, i) => {
            const meta = PHASE_META[seg.phase];
            const isCurrent = currentTimeMs >= seg.startMs && currentTimeMs <= seg.endMs;
            const widthMs = Math.max(1, seg.endMs - seg.startMs);
            const where = seg.aerodromeCode ? ` @ ${seg.aerodromeCode}` : "";
            return (
              <button
                key={`${seg.startMs}-${i}`}
                type="button"
                onClick={() => onSeek(seg.startMs - startMs)}
                title={`${meta.label}${where} (${Math.round(widthMs / 1000)}s)`}
                aria-label={`Jump to ${meta.label}`}
                style={{ flexGrow: widthMs, backgroundColor: meta.color }}
                className={`relative min-w-0 cursor-pointer transition-opacity hover:opacity-90 ${
                  isCurrent ? "ring-2 ring-inset ring-white/80" : ""
                }`}
              >
                <span className="pointer-events-none absolute inset-0 hidden items-center justify-center truncate px-1 text-[10px] font-semibold text-white/95 sm:flex">
                  {seg.phase === "maneuvering" ? "" : meta.label}
                </span>
              </button>
            );
          })}
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-white"
            style={{ left: pct(currentTimeMs) }}
          />
        </div>
      </div>
    </div>
  );
}
