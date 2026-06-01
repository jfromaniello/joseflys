"use client";

import type { CircuitAnalysis, CircuitPhase } from "../patternAnalysis";

interface CircuitTimelineProps {
  analysis: CircuitAnalysis;
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
  maneuvering: { label: "—", color: "#1e293b" },
};

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
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-100 truncate">
        {value}
      </div>
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

const METERS_PER_NM = 1852;

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
 * Aerodrome + circuit readout for a GPX replay: an identity header, a grid of
 * per-pass quality stats (runway, circuit side, pattern altitude, downwind
 * separation), and a clickable colored strip of the circuit legs aligned to the
 * playback timeline. The strip seeks on click; the current leg is outlined and
 * named in the header. Approach low-points are marked beneath.
 */
export function CircuitTimeline({
  analysis,
  startMs,
  durationMs,
  currentTimeMs,
  onSeek,
}: CircuitTimelineProps) {
  if (durationMs <= 0) return null;

  const pct = (ms: number) => `${Math.max(0, Math.min(1, (ms - startMs) / durationMs)) * 100}%`;
  const {
    aerodrome,
    activeRunway,
    flownSide,
    publishedSide,
    patternAltitudeFtAgl,
    standardPatternAltitudeFtAgl,
    downwindSeparationM,
    typicalDownwindSeparationNm,
  } = analysis;

  const sideMatches = flownSide && publishedSide ? flownSide === publishedSide : null;

  // Show the circuit the playhead is on (latest one started); before the first
  // circuit, fall back to the flight-wide median.
  const { circuits } = analysis;
  let activePass = -1;
  for (let i = 0; i < circuits.length; i += 1) {
    if (currentTimeMs >= circuits[i].startMs) activePass = i;
  }
  const activeCircuit = activePass >= 0 ? circuits[activePass] : null;
  const altFt = activeCircuit?.altitudeFtAgl ?? patternAltitudeFtAgl;
  const sepM = activeCircuit?.separationM ?? downwindSeparationM;
  const passLabel =
    circuits.length > 1
      ? activeCircuit
        ? `Circuit ${activePass + 1}/${circuits.length}`
        : `Avg of ${circuits.length}`
      : null;

  const sepNm = sepM != null ? sepM / METERS_PER_NM : null;
  const alt = altFt != null ? altitudeVerdict(altFt, standardPatternAltitudeFtAgl) : null;
  const sep = sepNm != null ? separationVerdict(sepNm, typicalDownwindSeparationNm) : null;

  // Current leg, for the header indicator.
  const currentSeg = analysis.segments.find(
    (s) => currentTimeMs >= s.startMs && currentTimeMs <= s.endMs
  );
  const currentMeta = currentSeg ? PHASE_META[currentSeg.phase] : null;

  const runwayLengthM = aerodrome.lengthFt ? Math.round(aerodrome.lengthFt * 0.3048) : null;

  return (
    <div className="mt-4 rounded-lg bg-slate-900/60 border border-gray-700">
      {/* Header: aerodrome identity + current leg + pass */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-slate-700/70 px-4 py-2.5">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-base font-bold text-cyan-300">{aerodrome.code}</span>
          <span className="truncate text-xs text-slate-400">{aerodrome.name}</span>
        </div>
        <div className="flex items-center gap-3">
          {currentMeta && currentSeg?.phase !== "maneuvering" ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-200">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: currentMeta.color }}
              />
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

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 sm:grid-cols-4">
        <StatCell
          label="Runway"
          value={activeRunway.id}
          sub={runwayLengthM ? `${runwayLengthM.toLocaleString()} m` : null}
        />
        <StatCell
          label="Circuit"
          value={`${formatSide(flownSide)} hand`}
          sub={
            publishedSide
              ? sideMatches
                ? "matches published"
                : `published ${formatSide(publishedSide).toLowerCase()}`
              : null
          }
          subTone={publishedSide ? (sideMatches ? "good" : "warn") : "muted"}
        />
        {alt ? (
          <StatCell
            label="Pattern alt"
            value={`${Math.round(altFt as number).toLocaleString()} ft AGL`}
            sub={alt.verdict}
            subTone={alt.tone}
            title={`Altitude flown on downwind, measured above the aerodrome (AGL) — the field is ~${Math.round(
              aerodrome.elevationFt
            ).toLocaleString()} ft, so ${standardPatternAltitudeFtAgl.toLocaleString()} ft AGL ≈ ${Math.round(
              aerodrome.elevationFt + standardPatternAltitudeFtAgl
            ).toLocaleString()} ft MSL. 1000 ft AGL is the common reference (FAA AIM, widely taught); Argentina doesn't fix one nationally — the AIP/VAC may publish a value per aerodrome.`}
          />
        ) : null}
        {sep ? (
          <StatCell
            label="Downwind"
            value={`${(sepNm as number).toFixed(2)} NM`}
            sub={sep.verdict}
            subTone={sep.tone}
            title={`Lateral distance from the extended runway centerline on downwind. ~0.5–1 NM is the typical international light-aircraft pattern width. Regional teaching varies — Argentine aeroclubs fly a tighter ~500 m (≈0.27 NM): the runway at ¾ up the C150 wing strut. (${Math.round(
              sepM as number
            ).toLocaleString()} m here.)`}
          />
        ) : null}
      </div>

      {/* Leg strip */}
      <div className="px-4 pb-3">
        <div className="relative flex h-7 w-full overflow-hidden rounded">
          {analysis.segments.map((seg, i) => {
            const meta = PHASE_META[seg.phase];
            const isCurrent = currentTimeMs >= seg.startMs && currentTimeMs <= seg.endMs;
            const widthMs = Math.max(1, seg.endMs - seg.startMs);
            return (
              <button
                key={`${seg.startMs}-${i}`}
                type="button"
                onClick={() => onSeek(seg.startMs - startMs)}
                title={`${meta.label} (${Math.round(widthMs / 1000)}s)`}
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
          {/* Current-time marker */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-white"
            style={{ left: pct(currentTimeMs) }}
          />
        </div>

        {/* Approach markers */}
        {analysis.approaches.length > 0 ? (
          <div className="relative mt-1 h-3 w-full">
            {analysis.approaches.map((ap, i) => (
              <button
                key={`${ap.timeMs}-${i}`}
                type="button"
                onClick={() => onSeek(ap.timeMs - startMs)}
                className="absolute -translate-x-1/2 cursor-pointer text-[10px] leading-none text-slate-400 hover:text-slate-200"
                style={{ left: pct(ap.timeMs) }}
                aria-label={`Jump to approach ${i + 1}`}
                title={`Approach ${i + 1}: ${ap.glideAngleDeg?.toFixed(1) ?? "?"}° glide, ${
                  ap.finalSpeedKt?.toFixed(0) ?? "?"
                } kt${ap.touched ? ", touchdown" : ", low pass"}`}
              >
                ▴
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
