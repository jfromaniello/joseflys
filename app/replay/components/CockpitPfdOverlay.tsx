"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EngineRanges } from "../replayMetrics";
import {
  buildPfdScene,
  PFD_FONT_FAMILY,
  type PfdArc,
  type PfdData,
  type PfdNode,
  type PfdTransform,
} from "../pfdScene";

interface CockpitPfdOverlayProps {
  /** Values sampled at the current playback time (see `samplePfdData`). */
  data: PfdData;
  /** Gauge scales for the EIS strip, derived from the track. */
  engineRanges: EngineRanges;
}

const DEG_TO_RAD = Math.PI / 180;

function transformAttr(transforms?: PfdTransform[]): string | undefined {
  if (!transforms || transforms.length === 0) return undefined;
  return transforms
    .map((t) => {
      if (t.op === "translate") return `translate(${t.x} ${t.y})`;
      if (t.op === "rotate") return `rotate(${t.deg} ${t.cx} ${t.cy})`;
      return `translate(${t.cx} ${t.cy}) scale(${t.factor}) translate(${-t.cx} ${-t.cy})`;
    })
    .join(" ");
}

function arcD(arc: PfdArc): string {
  const start = {
    x: arc.cx + arc.r * Math.cos(arc.startDeg * DEG_TO_RAD),
    y: arc.cy + arc.r * Math.sin(arc.startDeg * DEG_TO_RAD),
  };
  const end = {
    x: arc.cx + arc.r * Math.cos(arc.endDeg * DEG_TO_RAD),
    y: arc.cy + arc.r * Math.sin(arc.endDeg * DEG_TO_RAD),
  };
  const large = arc.endDeg - arc.startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${arc.r} ${arc.r} 0 ${large} 1 ${end.x} ${end.y}`;
}

function pointsAttr(points: [number, number][]): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

/** Recursive SVG rasterizer for the PFD scene; canvas twin in `pfdCanvas.ts`. */
function SceneNode({ node }: { node: PfdNode }) {
  switch (node.kind) {
    case "group":
      return (
        <g transform={transformAttr(node.transforms)} opacity={node.opacity}>
          {node.children.map((child, i) => (
            <SceneNode key={i} node={child} />
          ))}
        </g>
      );
    case "rect":
      return (
        <rect
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          rx={node.rx}
          fill={node.fill}
          stroke={node.stroke}
          strokeWidth={node.strokeWidth}
        />
      );
    case "line":
      return <line x1={node.x1} y1={node.y1} x2={node.x2} y2={node.y2} stroke={node.stroke} strokeWidth={node.strokeWidth} />;
    case "polyline":
      return (
        <polyline
          points={pointsAttr(node.points)}
          fill="none"
          stroke={node.stroke}
          strokeWidth={node.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "polygon":
      return (
        <polygon
          points={pointsAttr(node.points)}
          fill={node.fill ?? "none"}
          stroke={node.stroke}
          strokeWidth={node.strokeWidth}
        />
      );
    case "circle":
      return (
        <circle
          cx={node.cx}
          cy={node.cy}
          r={node.r}
          fill={node.fill ?? "none"}
          stroke={node.stroke}
          strokeWidth={node.strokeWidth}
        />
      );
    case "arc":
      return (
        <path
          d={arcD(node)}
          fill="none"
          stroke={node.stroke}
          strokeWidth={node.strokeWidth}
          strokeLinecap={node.round ? "round" : "butt"}
        />
      );
    case "text":
      return (
        <text
          x={node.x}
          y={node.y}
          textAnchor={node.anchor}
          fontSize={node.size}
          fontWeight={node.weight}
          fill={node.fill}
        >
          {node.text}
        </text>
      );
  }
}

/**
 * G3X-inspired glass-cockpit overlay for the cockpit view. The layout and every
 * instrument live in `pfdScene.ts` as a renderer-agnostic scene — this
 * component measures the viewport and rasterizes it to SVG; video recording
 * rasterizes the same scene to canvas, so the MP4 matches the screen.
 */
export function CockpitPfdOverlay({ data, engineRanges }: CockpitPfdOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scene = useMemo(
    () => (size ? buildPfdScene(size.width, size.height, data, engineRanges) : null),
    [size, data, engineRanges]
  );

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-[550] select-none">
      {scene && size ? (
        <svg
          width={size.width}
          height={size.height}
          className="tabular-nums"
          style={{ fontFamily: PFD_FONT_FAMILY }}
          aria-label="Flight instruments"
        >
          <SceneNode node={scene} />
        </svg>
      ) : null}
    </div>
  );
}
