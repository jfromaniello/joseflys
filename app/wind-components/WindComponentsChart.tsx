"use client";

import { useRef, useState } from "react";

/**
 * Wind component chart (same layout as the FAA / ANAC chart):
 * radial lines = angle between wind and runway, arcs = wind speed,
 * X axis = crosswind component, Y axis = headwind component.
 *
 * Drawn as plain SVG (not Recharts) so the arcs stay circular at any width.
 *
 * Interactive when `onChange` is given: drag the wind point (or click anywhere
 * on the chart) to move it freely, or drag the headwind / crosswind markers on
 * the axes to change one component while keeping the other.
 */

export interface WindComponentsChange {
  headwind: number; // kt, negative = tailwind
  crosswind: number; // kt, >= 0
}

type DragTarget = "point" | "headwind" | "crosswind";

interface WindComponentsChartProps {
  angle: number; // 0-180°
  windSpeed: number; // kt
  headwind: number; // kt, negative = tailwind
  crosswind: number; // kt, >= 0
  onChange?: (change: WindComponentsChange) => void;
}

const PLOT = 360; // Plot size (one quadrant) in SVG units
const MARGIN = { top: 40, right: 56, bottom: 52, left: 56 };

const COLORS = {
  minorGrid: "oklch(0.3 0.02 240)",
  arc: "oklch(0.5 0.04 240)",
  radial: "oklch(0.45 0.04 240)",
  axis: "oklch(0.65 0.02 240)",
  label: "oklch(0.6 0.02 240)",
  wind: "oklch(0.75 0.15 230)",
  headwind: "#22c55e",
  tailwind: "#ef4444",
  crosswind: "#f59e0b",
};

export function WindComponentsChart({ angle, windSpeed, headwind, crosswind, onChange }: WindComponentsChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  // While dragging, the chart range is frozen so the scale doesn't jump under the pointer
  // The component that stays fixed is captured at drag start, so it never drifts while dragging the other one
  const [drag, setDrag] = useState<{ target: DragTarget; maxSpeed: number; fixed: WindComponentsChange } | null>(
    null
  );

  // Chart range: at least 60 kt (like the printed chart), rounded up to the next 10
  const maxSpeed = drag?.maxSpeed ?? Math.max(60, Math.ceil(windSpeed / 10) * 10);
  const showTailwind = headwind < -1e-9;
  // In tailwind mode the 160°-180° labels sit at the bottom, so push the X axis labels below them
  const xLabelOffset = showTailwind ? 34 : 0;
  const minHeadwind = showTailwind ? -maxSpeed : 0;
  const scale = PLOT / maxSpeed;

  const width = MARGIN.left + PLOT + MARGIN.right;
  const plotHeight = (maxSpeed - minHeadwind) * scale;
  const height = MARGIN.top + plotHeight + MARGIN.bottom + xLabelOffset;

  const x = (xw: number) => MARGIN.left + xw * scale;
  const y = (hw: number) => MARGIN.top + (maxSpeed - hw) * scale;
  const ox = x(0);
  const oy = y(0);

  const maxAngle = showTailwind ? 180 : 90;
  const speedSteps = range(10, maxSpeed, 10);
  const angleSteps = range(0, maxAngle, 10);
  const minorSteps = range(5, maxSpeed, 5);

  const px = x(crosswind);
  const py = y(headwind);
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const longComponent = headwind >= 0 ? COLORS.headwind : COLORS.tailwind;

  // Pointer position in chart units (crosswind, headwind)
  const toChart = (e: React.PointerEvent): WindComponentsChange | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { crosswind: (pt.x - MARGIN.left) / scale, headwind: maxSpeed - (pt.y - MARGIN.top) / scale };
  };

  const applyDrag = (target: DragTarget, fixed: WindComponentsChange, e: React.PointerEvent) => {
    const p = toChart(e);
    if (!p || !onChange) return;
    let xw = Math.max(0, target === "headwind" ? fixed.crosswind : p.crosswind);
    let hw = target === "crosswind" ? fixed.headwind : p.headwind;
    hw = Math.min(maxSpeed, Math.max(-maxSpeed, hw));
    xw = Math.min(maxSpeed, xw);
    // Keep the wind inside the chart's outer arc
    const speed = Math.hypot(xw, hw);
    if (speed > maxSpeed) {
      xw = (xw * maxSpeed) / speed;
      hw = (hw * maxSpeed) / speed;
    }
    onChange({ headwind: hw, crosswind: xw });
  };

  const startDrag = (target: DragTarget) => (e: React.PointerEvent) => {
    if (!onChange) return;
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    const fixed = { headwind, crosswind };
    setDrag({ target, maxSpeed, fixed });
    applyDrag(target, fixed, e);
  };

  const handleProps = (target: DragTarget) =>
    onChange
      ? {
          onPointerDown: startDrag(target),
          style: { cursor: drag ? "grabbing" : "grab", touchAction: "none" } as const,
        }
      : {};

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full h-auto max-w-xl mx-auto block select-none ${onChange ? "cursor-crosshair touch-none" : ""}`}
      onPointerDown={startDrag("point")}
      onPointerMove={(e) => drag && applyDrag(drag.target, drag.fixed, e)}
      onPointerUp={() => setDrag(null)}
      onPointerCancel={() => setDrag(null)}
      role="img"
      aria-label={`Wind component chart: ${Math.round(windSpeed)} kt at ${Math.round(angle)}°`}
    >
      {/* Minor grid (graph paper) */}
      <g stroke={COLORS.minorGrid} strokeWidth={0.5}>
        {minorSteps.map((v) => (
          <line key={`vx${v}`} x1={x(v)} y1={y(maxSpeed)} x2={x(v)} y2={y(minHeadwind)} />
        ))}
        {range(minHeadwind + 5, maxSpeed, 5).map((v) => (
          <line key={`hy${v}`} x1={x(0)} y1={y(v)} x2={x(maxSpeed)} y2={y(v)} />
        ))}
      </g>

      {/* Wind speed arcs */}
      <g fill="none" stroke={COLORS.arc} strokeWidth={1}>
        {speedSteps.map((v) => (
          <path
            key={`arc${v}`}
            d={`M ${x(0)} ${y(v)} A ${v * scale} ${v * scale} 0 0 1 ${showTailwind ? `${x(0)} ${y(-v)}` : `${x(v)} ${y(0)}`}`}
          />
        ))}
      </g>

      {/* Angle radials + labels */}
      <g>
        {angleSteps.map((a) => {
          const ex = x(maxSpeed * Math.sin(rad(a)));
          const ey = y(maxSpeed * Math.cos(rad(a)));
          const lx = x((maxSpeed + 5) * Math.sin(rad(a)));
          const ly = y((maxSpeed + 5) * Math.cos(rad(a)));
          return (
            <g key={`rad${a}`}>
              <line x1={ox} y1={oy} x2={ex} y2={ey} stroke={COLORS.radial} strokeWidth={a % 90 === 0 ? 0 : 0.8} />
              <text x={lx} y={ly} fontSize={11} fill={COLORS.label} textAnchor="middle" dominantBaseline="middle">
                {a}°
              </text>
            </g>
          );
        })}
      </g>

      {/* Axes */}
      <g stroke={COLORS.axis} strokeWidth={1.5}>
        <line x1={ox} y1={y(maxSpeed)} x2={ox} y2={y(minHeadwind)} />
        <line x1={ox} y1={oy} x2={x(maxSpeed)} y2={oy} />
      </g>

      {/* Axis ticks */}
      <g fontSize={11} fill={COLORS.label}>
        {speedSteps.map((v) => (
          <text key={`xt${v}`} x={x(v)} y={y(minHeadwind) + 16 + xLabelOffset} textAnchor="middle">
            {v}
          </text>
        ))}
        {range(minHeadwind, maxSpeed, 10)
          .filter((v) => v !== 0)
          .map((v) => (
            <text key={`yt${v}`} x={ox - 8} y={y(v)} textAnchor="end" dominantBaseline="middle">
              {Math.abs(v)}
            </text>
          ))}
        <text x={ox - 8} y={oy} textAnchor="end" dominantBaseline="middle">
          0
        </text>
      </g>

      {/* Axis titles */}
      <text
        x={x(maxSpeed / 2)}
        y={y(minHeadwind) + 40 + xLabelOffset}
        fontSize={12}
        fill={COLORS.axis}
        textAnchor="middle"
        fontWeight={600}
      >
        CROSSWIND COMPONENT (kt)
      </text>
      <text
        transform={`translate(${MARGIN.left - 36} ${y(maxSpeed / 2)}) rotate(-90)`}
        fontSize={12}
        fill={COLORS.axis}
        textAnchor="middle"
        fontWeight={600}
      >
        HEADWIND COMPONENT (kt)
      </text>
      {showTailwind && (
        <text
          transform={`translate(${MARGIN.left - 36} ${y(-maxSpeed / 2)}) rotate(-90)`}
          fontSize={12}
          fill={COLORS.tailwind}
          textAnchor="middle"
          fontWeight={600}
        >
          TAILWIND COMPONENT (kt)
        </text>
      )}

      {/* Highlighted wind speed arc and angle radial */}
      {windSpeed > 0 && (
        <g fill="none" strokeDasharray="5 4" strokeWidth={1.5} stroke={COLORS.wind} opacity={0.6}>
          <path
            d={`M ${x(0)} ${y(windSpeed)} A ${windSpeed * scale} ${windSpeed * scale} 0 0 1 ${showTailwind ? `${x(0)} ${y(-windSpeed)}` : `${x(windSpeed)} ${y(0)}`}`}
          />
          <line x1={ox} y1={oy} x2={x(maxSpeed * Math.sin(rad(angle)))} y2={y(maxSpeed * Math.cos(rad(angle)))} />
        </g>
      )}

      {/* Component projections */}
      <line x1={px} y1={py} x2={ox} y2={py} stroke={longComponent} strokeWidth={2} strokeDasharray="6 4" />
      <line x1={px} y1={py} x2={px} y2={oy} stroke={COLORS.crosswind} strokeWidth={2} strokeDasharray="6 4" />

      {/* Wind vector */}
      <line x1={ox} y1={oy} x2={px} y2={py} stroke={COLORS.wind} strokeWidth={3} strokeLinecap="round" />

      {/* Component markers on axes (draggable along their axis) */}
      <g {...handleProps("headwind")}>
        <circle cx={ox} cy={py} r={16} fill="transparent" />
        <circle cx={ox} cy={py} r={drag?.target === "headwind" ? 8 : 6} fill={longComponent} stroke="#000" strokeWidth={1.5} />
      </g>
      <g {...handleProps("crosswind")}>
        <circle cx={px} cy={oy} r={16} fill="transparent" />
        <circle cx={px} cy={oy} r={drag?.target === "crosswind" ? 8 : 6} fill={COLORS.crosswind} stroke="#000" strokeWidth={1.5} />
      </g>

      {/* Live values while dragging */}
      {drag && (
        <g fontSize={12} fontWeight={700}>
          <text x={ox + 6} y={py - 8} fill={longComponent}>
            {Math.abs(headwind).toFixed(0)}
          </text>
          <text x={px + 6} y={oy - 8} fill={COLORS.crosswind}>
            {crosswind.toFixed(0)}
          </text>
          <text x={px + 12} y={py - 12} fill={COLORS.wind}>
            {Math.round(windSpeed)} kt @ {Math.round(angle)}°
          </text>
        </g>
      )}

      {/* Wind point (draggable) */}
      <g {...handleProps("point")}>
        <circle cx={px} cy={py} r={18} fill="transparent" />
        <circle cx={px} cy={py} r={drag?.target === "point" ? 10 : 8} fill={COLORS.wind} stroke="#000" strokeWidth={2} />
      </g>
    </svg>
  );
}

function range(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  for (let v = from; v <= to + 1e-9; v += step) out.push(v);
  return out;
}
