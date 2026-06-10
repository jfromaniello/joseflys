"use client";

import type { EngineSample, EngineRanges, GaugeRange } from "../replayMetrics";

const GAUGE_GREEN = "#4ade80";
const TRACK_COLOR = "rgba(51, 65, 85, 0.7)";

function fraction(value: number, range: GaugeRange): number {
  if (range.max <= range.min) return 0;
  return Math.max(0, Math.min(1, (value - range.min) / (range.max - range.min)));
}

const ARC_START = 135;
const ARC_SWEEP = 270;

function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

/**
 * Round G3X-style gauge: a 270° dial whose green band fills with the current
 * value and a white needle, with the value printed underneath.
 */
function ArcGauge({
  label,
  value,
  range,
  decimals = 0,
}: {
  label: string;
  value: number;
  range: GaugeRange;
  decimals?: number;
}) {
  const f = fraction(value, range);
  const needleDeg = ARC_START + ARC_SWEEP * f;
  const needleOuter = polar(34, 32, 25, needleDeg);
  const needleInner = polar(34, 32, 8, needleDeg);

  return (
    <div className="flex flex-col items-center">
      <svg width={68} height={52} aria-label={`${label} gauge`}>
        <path d={arcPath(34, 32, 25, ARC_START, ARC_START + ARC_SWEEP)} fill="none" stroke={TRACK_COLOR} strokeWidth={6} />
        {f > 0 ? (
          <path
            d={arcPath(34, 32, 25, ARC_START, needleDeg)}
            fill="none"
            stroke={GAUGE_GREEN}
            strokeWidth={6}
            strokeLinecap="round"
          />
        ) : null}
        <line
          x1={needleInner.x}
          y1={needleInner.y}
          x2={needleOuter.x}
          y2={needleOuter.y}
          stroke="#fff"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center leading-none">
        <div className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
        <div className="text-sm font-bold tabular-nums text-white">{value.toFixed(decimals)}</div>
      </div>
    </div>
  );
}

/** Horizontal G3X-style bar: label/value row over a green fill with a pointer. */
function BarGauge({
  label,
  value,
  range,
  decimals = 0,
}: {
  label: string;
  value: number;
  range: GaugeRange;
  decimals?: number;
}) {
  const pct = fraction(value, range) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        <span className="text-[11px] font-bold tabular-nums text-white">{value.toFixed(decimals)}</span>
      </div>
      <div className="relative mt-0.5 h-1.5 rounded-sm" style={{ backgroundColor: TRACK_COLOR }}>
        <div
          className="absolute inset-y-0 left-0 rounded-sm"
          style={{ width: `${pct}%`, backgroundColor: GAUGE_GREEN }}
        />
        <div
          className="absolute -top-1 h-0 w-0 -translate-x-1/2 border-x-4 border-t-[5px] border-x-transparent border-t-white"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Vertical G3X-style EIS strip: round RPM/MAP gauges on top, bar gauges for
 * flow, pressures and temperatures below, and the electrical bus at the bottom.
 * Renders only the fields the log records; gauge scales come from the track's
 * own operating range (see `computeEngineRanges`).
 */
export function EngineStrip({ engine, ranges }: { engine: EngineSample; ranges: EngineRanges }) {
  const bars: { key: keyof EngineSample; label: string; decimals?: number }[] = [
    { key: "fuelFlowGph", label: "Fuel GPH", decimals: 1 },
    { key: "fuelPressPsi", label: "Fuel PSI", decimals: 1 },
    { key: "oilPressPsi", label: "Oil PSI" },
    { key: "oilTempF", label: "Oil °F" },
    { key: "coolantTempF", label: "Coolant °F" },
    { key: "egtMaxF", label: "EGT °F" },
    { key: "chtMaxF", label: "CHT °F" },
  ];

  return (
    <div className="w-28 rounded-md bg-slate-900/45 border border-white/10 px-2 py-2 backdrop-blur-[2px] space-y-1.5">
      {engine.rpm !== null && ranges.rpm ? (
        <ArcGauge label="RPM" value={engine.rpm} range={ranges.rpm} />
      ) : null}
      {engine.manifoldInHg !== null && ranges.manifoldInHg ? (
        <ArcGauge label="Man inHg" value={engine.manifoldInHg} range={ranges.manifoldInHg} decimals={1} />
      ) : null}
      {bars.map(({ key, label, decimals }) => {
        const value = engine[key];
        const range = ranges[key];
        return value !== null && range ? (
          <BarGauge key={key} label={label} value={value} range={range} decimals={decimals} />
        ) : null;
      })}
      {engine.volts !== null || engine.amps !== null ? (
        <div className="flex items-baseline justify-between border-t border-white/10 pt-1">
          <span className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">Bus</span>
          <span className="text-[11px] font-bold tabular-nums text-white">
            {engine.volts !== null ? `${engine.volts.toFixed(1)}V` : ""}
            {engine.volts !== null && engine.amps !== null ? " · " : ""}
            {engine.amps !== null ? `${Math.round(engine.amps)}A` : ""}
          </span>
        </div>
      ) : null}
    </div>
  );
}
