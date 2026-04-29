"use client";

import { useMemo } from "react";
import { airspeedCurve, type HoldMode } from "@/lib/machCalculations";

interface MachChartProps {
  altitudeFt: number;
  isaDevC: number;
  hold: HoldMode;
  casKt: number;
  mach: number;
  tasKt: number;
  maxAltFt: number;
}

const SPEED_X_MAX = 700; // kt — used by IAS and TAS curves
const MACH_X_MAX = 1.0; // M — used by the Mach curve (rescaled to share axis)

export function MachChart({
  altitudeFt,
  isaDevC,
  hold,
  casKt,
  mach,
  tasKt,
  maxAltFt,
}: MachChartProps) {
  const curve = useMemo(
    () =>
      airspeedCurve({
        fromFt: 0,
        toFt: maxAltFt,
        stepFt: 500,
        isaDevC,
        hold,
        casKt,
        mach,
      }),
    [hold, casKt, mach, isaDevC, maxAltFt]
  );

  // Plot geometry. Use viewBox so it scales responsively.
  const W = 760;
  const H = 360;
  const padL = 56;
  const padR = 56;
  const padT = 24;
  const padB = 44;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const xFromSpeed = (kt: number) => padL + (kt / SPEED_X_MAX) * plotW;
  const xFromMach = (m: number) => padL + (m / MACH_X_MAX) * plotW;
  const yFromAlt = (ft: number) => padT + plotH - (ft / maxAltFt) * plotH;

  const pathFor = (
    points: Array<{ x: number; y: number }>
  ): string => {
    if (points.length === 0) return "";
    return points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");
  };

  const casPoints = curve.map((p) => ({ x: xFromSpeed(p.cas), y: yFromAlt(p.altitudeFt) }));
  const tasPoints = curve.map((p) => ({ x: xFromSpeed(p.tas), y: yFromAlt(p.altitudeFt) }));
  const machPoints = curve.map((p) => ({ x: xFromMach(p.mach), y: yFromAlt(p.altitudeFt) }));
  const sosPoints = curve.map((p) => ({ x: xFromSpeed(p.speedOfSoundKt), y: yFromAlt(p.altitudeFt) }));
  const sosCurrentKt = curve.length
    ? curve[Math.min(curve.length - 1, Math.max(0, Math.round(altitudeFt / 500)))]?.speedOfSoundKt
    : 0;

  const yCurrent = yFromAlt(altitudeFt);

  // Speed axis ticks (bottom)
  const speedTicks = [0, 100, 200, 300, 400, 500, 600, 700];
  // Mach axis ticks (top)
  const machTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  // Altitude ticks
  const altTicks: number[] = [];
  for (let a = 0; a <= maxAltFt; a += 5000) altTicks.push(a);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Plot background */}
        <rect
          x={padL}
          y={padT}
          width={plotW}
          height={plotH}
          fill="oklch(0.18 0.04 250)"
          stroke="oklch(0.3 0.02 240)"
          strokeWidth={1}
        />

        {/* Vertical gridlines (speed) */}
        {speedTicks.map((s) => (
          <line
            key={`vg-${s}`}
            x1={xFromSpeed(s)}
            y1={padT}
            x2={xFromSpeed(s)}
            y2={padT + plotH}
            stroke="oklch(0.28 0.02 240)"
            strokeWidth={0.5}
          />
        ))}

        {/* Horizontal gridlines (altitude) */}
        {altTicks.map((a) => (
          <line
            key={`hg-${a}`}
            x1={padL}
            y1={yFromAlt(a)}
            x2={padL + plotW}
            y2={yFromAlt(a)}
            stroke="oklch(0.28 0.02 240)"
            strokeWidth={0.5}
          />
        ))}

        {/* Curves */}
        {/* Speed of sound — reference line, drawn first so others paint on top */}
        <path
          d={pathFor(sosPoints)}
          fill="none"
          stroke="oklch(0.7 0.08 60)"
          strokeWidth={1.5}
          strokeDasharray="2 4"
          opacity={0.7}
        />
        <path
          d={pathFor(casPoints)}
          fill="none"
          stroke="oklch(0.78 0.16 200)"
          strokeWidth={2.5}
        />
        <path
          d={pathFor(tasPoints)}
          fill="none"
          stroke="oklch(0.7 0.18 230)"
          strokeWidth={2.5}
        />
        <path
          d={pathFor(machPoints)}
          fill="none"
          stroke="oklch(0.75 0.18 140)"
          strokeWidth={2.5}
          strokeDasharray="6 3"
        />

        {/* Current altitude marker */}
        <line
          x1={padL}
          y1={yCurrent}
          x2={padL + plotW}
          y2={yCurrent}
          stroke="oklch(0.85 0.05 60)"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.7}
        />
        {/* Current points */}
        <circle
          cx={xFromSpeed(casKt)}
          cy={yCurrent}
          r={5}
          fill="oklch(0.78 0.16 200)"
          stroke="white"
          strokeWidth={1.5}
        />
        <circle
          cx={xFromSpeed(tasKt)}
          cy={yCurrent}
          r={5}
          fill="oklch(0.7 0.18 230)"
          stroke="white"
          strokeWidth={1.5}
        />
        <circle
          cx={xFromMach(mach)}
          cy={yCurrent}
          r={5}
          fill="oklch(0.75 0.18 140)"
          stroke="white"
          strokeWidth={1.5}
        />
        {/* Speed-of-sound dot (smaller, muted) */}
        <circle
          cx={xFromSpeed(sosCurrentKt)}
          cy={yCurrent}
          r={3.5}
          fill="oklch(0.7 0.08 60)"
          stroke="oklch(0.95 0.02 60)"
          strokeWidth={1}
          opacity={0.85}
        />

        {/* Y-axis (altitude) labels */}
        {altTicks.map((a) => (
          <text
            key={`yl-${a}`}
            x={padL - 8}
            y={yFromAlt(a) + 4}
            textAnchor="end"
            fontSize={11}
            fill="oklch(0.65 0.02 240)"
          >
            {a === 0 ? "0" : `FL${(a / 100).toFixed(0).padStart(3, "0")}`}
          </text>
        ))}

        {/* X-axis (speed, bottom) labels */}
        {speedTicks.map((s) => (
          <text
            key={`xl-${s}`}
            x={xFromSpeed(s)}
            y={padT + plotH + 16}
            textAnchor="middle"
            fontSize={11}
            fill="oklch(0.65 0.02 240)"
          >
            {s}
          </text>
        ))}
        <text
          x={padL + plotW / 2}
          y={padT + plotH + 34}
          textAnchor="middle"
          fontSize={11}
          fill="oklch(0.55 0.02 240)"
        >
          Speed (kt) — IAS / TAS
        </text>

        {/* X-axis (mach, top) labels */}
        {machTicks.map((m) => (
          <text
            key={`mt-${m}`}
            x={xFromMach(m)}
            y={padT - 8}
            textAnchor="middle"
            fontSize={11}
            fill="oklch(0.7 0.1 140)"
          >
            M{m.toFixed(1)}
          </text>
        ))}

        {/* Legend */}
        <g transform={`translate(${padL + 12}, ${padT + 12})`}>
          <rect
            x={-6}
            y={-6}
            width={150}
            height={80}
            fill="oklch(0.15 0.04 250 / 0.85)"
            stroke="oklch(0.3 0.02 240)"
            strokeWidth={0.5}
            rx={6}
          />
          <line x1={4} y1={6} x2={28} y2={6} stroke="oklch(0.78 0.16 200)" strokeWidth={2.5} />
          <text x={34} y={10} fontSize={11} fill="oklch(0.85 0.02 240)">
            IAS (CAS)
          </text>
          <line x1={4} y1={24} x2={28} y2={24} stroke="oklch(0.7 0.18 230)" strokeWidth={2.5} />
          <text x={34} y={28} fontSize={11} fill="oklch(0.85 0.02 240)">
            TAS
          </text>
          <line
            x1={4}
            y1={42}
            x2={28}
            y2={42}
            stroke="oklch(0.75 0.18 140)"
            strokeWidth={2.5}
            strokeDasharray="6 3"
          />
          <text x={34} y={46} fontSize={11} fill="oklch(0.85 0.02 240)">
            Mach (top axis)
          </text>
          <line
            x1={4}
            y1={60}
            x2={28}
            y2={60}
            stroke="oklch(0.7 0.08 60)"
            strokeWidth={1.5}
            strokeDasharray="2 4"
            opacity={0.85}
          />
          <text x={34} y={64} fontSize={11} fill="oklch(0.7 0.05 60)">
            Speed of sound
          </text>
        </g>
      </svg>
    </div>
  );
}
