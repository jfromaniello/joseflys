/**
 * Declarative scene for the glass-cockpit (PFD) overlay.
 *
 * Every instrument is built as a tree of plain shapes (rects, lines, polygons,
 * arcs, text) positioned in CSS pixels. The same scene is rasterized by two
 * renderers — SVG for the live view (`CockpitPfdOverlay`) and canvas 2D for
 * video recording (`pfdCanvas.ts`) — so the recorded overlay always matches
 * what's on screen. Keep this module free of React/DOM.
 */

import { formatCorrection, formatCourse, formatWind } from "@/lib/formatters";
import {
  computeAltitudeFt,
  computeGroundSpeed,
  computeTrackHeadingDeg,
  computeVerticalSpeedFpm,
  findPointIndexByTime,
  hasEngineData,
  sampleEngine,
  sampleTelemetry,
  type EngineRanges,
  type EngineSample,
  type GaugeRange,
} from "./replayMetrics";
import { sampleMagneticHeadingDeg } from "./aircraftAttitude";
import { sampleField } from "./cameraMath";
import { computeTapeTicks, headingTickLabel } from "./pfdMath";
import type { ReplayPoint } from "./types";

// --- Scene model ---------------------------------------------------------

export type PfdTransform =
  | { op: "translate"; x: number; y: number }
  | { op: "rotate"; deg: number; cx: number; cy: number }
  | { op: "scale"; factor: number; cx: number; cy: number };

export interface PfdRect {
  kind: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  rx?: number;
  stroke?: string;
  strokeWidth?: number;
}

export interface PfdLine {
  kind: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
}

export interface PfdPolygon {
  kind: "polygon";
  points: [number, number][];
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface PfdPolyline {
  kind: "polyline";
  points: [number, number][];
  stroke: string;
  strokeWidth: number;
}

export interface PfdCircle {
  kind: "circle";
  cx: number;
  cy: number;
  r: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

/** Circular arc stroke; angles in degrees, 0° = +x axis, increasing clockwise on screen. */
export interface PfdArc {
  kind: "arc";
  cx: number;
  cy: number;
  r: number;
  startDeg: number;
  endDeg: number;
  stroke: string;
  strokeWidth: number;
  round?: boolean;
}

/** Text positioned by its baseline (like SVG `<text>`). */
export interface PfdText {
  kind: "text";
  x: number;
  y: number;
  text: string;
  size: number;
  weight: number;
  fill: string;
  anchor: "start" | "middle" | "end";
}

export interface PfdGroup {
  kind: "group";
  transforms?: PfdTransform[];
  opacity?: number;
  children: PfdNode[];
}

export type PfdNode =
  | PfdRect
  | PfdLine
  | PfdPolygon
  | PfdPolyline
  | PfdCircle
  | PfdArc
  | PfdText
  | PfdGroup;

export const PFD_FONT_FAMILY =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

// --- Palette / metrics (shared by every instrument) -----------------------

const STRIP_FILL = "rgba(15, 23, 42, 0.45)";
const LENS_FILL = "rgba(2, 6, 23, 0.85)";
const TICK_COLOR = "rgba(255, 255, 255, 0.85)";
const LABEL_COLOR = "rgba(255, 255, 255, 0.9)";
const MUTED_COLOR = "rgba(148, 163, 184, 1)";
const PANEL_BORDER = "rgba(255, 255, 255, 0.1)";
const LENS_BORDER = "rgba(255, 255, 255, 0.7)";
const OUTLINE_DARK = "rgba(2, 6, 23, 0.8)";
const ACCENT_YELLOW = "#facc15";
const WIND_MAGENTA = "#e879f9";
const GAUGE_GREEN = "#4ade80";
const GAUGE_TRACK = "rgba(51, 65, 85, 0.7)";

const TAPE_H = 300;
const SPEED_W = 72;
const PX_PER_KT = 6;
const ALT_W = 80;
const PX_PER_FT = 0.5;
const VSI_W = 26;
const VSI_H = 200;
const VSI_MAX_FPM = 2000;

const DEG_TO_RAD = Math.PI / 180;

function group(children: PfdNode[], transforms?: PfdTransform[], opacity?: number): PfdGroup {
  return { kind: "group", transforms, opacity, children };
}

function translate(x: number, y: number): PfdTransform {
  return { op: "translate", x, y };
}

// --- Per-frame data -------------------------------------------------------

/** Everything the PFD shows at one instant of the replay. */
export interface PfdData {
  iasKt: number | null;
  groundSpeedKt: number | null;
  tasKt: number | null;
  altitudeFt: number | null;
  vsFpm: number | null;
  headingDeg: number | null;
  rollDeg: number | null;
  pitchDeg: number | null;
  latAccG: number | null;
  windDirDeg: number | null;
  windSpeedKt: number | null;
  oatC: number | null;
  aglFt: number | null;
  engine: EngineSample | null;
}

/**
 * Samples all PFD inputs at `timeMs`: recorded avionics fields where present,
 * GPS-derived fallbacks elsewhere (ground speed, vertical speed, magnetic
 * track when no heading is recorded).
 */
export function samplePfdData(points: ReplayPoint[], timeMs: number): PfdData {
  const telemetry = sampleTelemetry(points, timeMs);
  const index = findPointIndexByTime(points, timeMs);
  return {
    iasKt: telemetry.iasKt,
    groundSpeedKt: telemetry.groundSpeedKt ?? computeGroundSpeed(points, index).knots,
    tasKt: telemetry.tasKt,
    altitudeFt: computeAltitudeFt(points, index, timeMs),
    vsFpm: telemetry.vsFpm ?? computeVerticalSpeedFpm(points, index, timeMs),
    headingDeg: sampleMagneticHeadingDeg(points, timeMs) ?? computeTrackHeadingDeg(points, timeMs),
    rollDeg: sampleField(points, timeMs, "rollDeg"),
    pitchDeg: sampleField(points, timeMs, "pitchDeg"),
    latAccG: sampleField(points, timeMs, "latAccG"),
    windDirDeg: telemetry.windDirDeg,
    windSpeedKt: telemetry.windSpeedKt,
    oatC: telemetry.oatC,
    aglFt: telemetry.aglFt,
    engine: hasEngineData(points) ? sampleEngine(points, timeMs) : null,
  };
}

// --- Airspeed tape (left) --------------------------------------------------

function buildSpeedTape(iasKt: number | null, groundSpeedKt: number | null): PfdNode[] {
  const value = iasKt ?? groundSpeedKt;
  const ticks = value === null ? [] : computeTapeTicks(value, TAPE_H, PX_PER_KT, 5, 10, 0);
  const lensY = TAPE_H / 2;
  const nodes: PfdNode[] = [
    { kind: "rect", x: 0, y: 0, width: SPEED_W, height: TAPE_H, fill: STRIP_FILL, rx: 4 },
  ];

  for (const tick of ticks) {
    nodes.push({
      kind: "line",
      x1: SPEED_W - (tick.major ? 12 : 7),
      y1: tick.y,
      x2: SPEED_W,
      y2: tick.y,
      stroke: TICK_COLOR,
      strokeWidth: tick.major ? 2 : 1,
    });
    if (tick.major) {
      nodes.push({
        kind: "text",
        x: SPEED_W - 17,
        y: tick.y + 4.5,
        text: String(tick.value),
        size: 14,
        weight: 600,
        fill: LABEL_COLOR,
        anchor: "end",
      });
    }
  }

  nodes.push(
    {
      kind: "polygon",
      points: [
        [2, lensY - 17],
        [SPEED_W, lensY - 17],
        [SPEED_W, lensY - 6],
        [SPEED_W + 12, lensY],
        [SPEED_W, lensY + 6],
        [SPEED_W, lensY + 17],
        [2, lensY + 17],
      ],
      fill: LENS_FILL,
      stroke: LENS_BORDER,
      strokeWidth: 1.5,
    },
    {
      kind: "text",
      x: SPEED_W - 14,
      y: lensY + 7,
      text: value === null ? "--" : String(Math.round(value)),
      size: 20,
      weight: 700,
      fill: "#fff",
      anchor: "end",
    },
    {
      kind: "text",
      x: 8,
      y: lensY + 5,
      text: iasKt === null ? "GS" : "IAS",
      size: 10,
      weight: 600,
      fill: MUTED_COLOR,
      anchor: "start",
    }
  );

  return nodes;
}

// --- Altitude tape (right) --------------------------------------------------

function buildAltitudeTape(altitudeFt: number | null): PfdNode[] {
  const ticks = altitudeFt === null ? [] : computeTapeTicks(altitudeFt, TAPE_H, PX_PER_FT, 50, 100);
  const lensY = TAPE_H / 2;
  const nodes: PfdNode[] = [
    { kind: "rect", x: 14, y: 0, width: ALT_W, height: TAPE_H, fill: STRIP_FILL, rx: 4 },
  ];

  for (const tick of ticks) {
    nodes.push({
      kind: "line",
      x1: 14,
      y1: tick.y,
      x2: 14 + (tick.major ? 12 : 7),
      y2: tick.y,
      stroke: TICK_COLOR,
      strokeWidth: tick.major ? 2 : 1,
    });
    if (tick.major) {
      nodes.push({
        kind: "text",
        x: 14 + 17,
        y: tick.y + 4.5,
        text: tick.value.toLocaleString("en-US"),
        size: 13,
        weight: 600,
        fill: LABEL_COLOR,
        anchor: "start",
      });
    }
  }

  nodes.push(
    {
      kind: "polygon",
      points: [
        [ALT_W + 12, lensY - 17],
        [14, lensY - 17],
        [14, lensY - 6],
        [2, lensY],
        [14, lensY + 6],
        [14, lensY + 17],
        [ALT_W + 12, lensY + 17],
      ],
      fill: LENS_FILL,
      stroke: LENS_BORDER,
      strokeWidth: 1.5,
    },
    {
      kind: "text",
      x: ALT_W + 4,
      y: lensY + 7,
      text:
        altitudeFt === null ? "--" : (Math.round(altitudeFt / 10) * 10).toLocaleString("en-US"),
      size: 19,
      weight: 700,
      fill: "#fff",
      anchor: "end",
    },
    // Units caption pinned to the tape top, backed so tick labels can't collide.
    { kind: "rect", x: 14, y: 0, width: ALT_W, height: 15, fill: LENS_FILL, rx: 4 },
    {
      kind: "text",
      x: 14 + ALT_W / 2,
      y: 11,
      text: "FT MSL",
      size: 9,
      weight: 600,
      fill: MUTED_COLOR,
      anchor: "middle",
    }
  );

  return nodes;
}

// --- Vertical speed indicator ------------------------------------------------

function buildVsi(vsFpm: number | null): PfdNode[] {
  const pxPerFpm = VSI_H / 2 / VSI_MAX_FPM;
  const clamped = vsFpm === null ? 0 : Math.max(-VSI_MAX_FPM, Math.min(VSI_MAX_FPM, vsFpm));
  const pointerY = VSI_H / 2 - clamped * pxPerFpm;
  const showReadout = vsFpm !== null && Math.abs(vsFpm) >= 100;
  const readoutY = Math.max(12, Math.min(VSI_H - 6, pointerY - 8));

  const nodes: PfdNode[] = [
    { kind: "rect", x: 0, y: 0, width: VSI_W, height: VSI_H, fill: STRIP_FILL, rx: 4 },
  ];

  for (const v of [2000, 1000, -1000, -2000]) {
    const y = VSI_H / 2 - v * pxPerFpm;
    nodes.push(
      { kind: "line", x1: 0, y1: y, x2: 6, y2: y, stroke: TICK_COLOR, strokeWidth: 1.5 },
      {
        kind: "text",
        x: 9,
        y: y + 4,
        text: String(Math.abs(v) / 1000),
        size: 10,
        weight: 600,
        fill: LABEL_COLOR,
        anchor: "start",
      }
    );
  }
  nodes.push({
    kind: "line",
    x1: 0,
    y1: VSI_H / 2,
    x2: 9,
    y2: VSI_H / 2,
    stroke: TICK_COLOR,
    strokeWidth: 2,
  });

  if (vsFpm !== null) {
    nodes.push({
      kind: "polygon",
      points: [
        [1, pointerY],
        [11, pointerY - 6],
        [11, pointerY + 6],
      ],
      fill: "#fff",
      stroke: OUTLINE_DARK,
      strokeWidth: 1,
    });
  }
  if (showReadout) {
    nodes.push({
      kind: "text",
      x: 13,
      y: readoutY,
      text: String(Math.abs(Math.round(vsFpm / 50) * 50)),
      size: 11,
      weight: 700,
      fill: "#fff",
      anchor: "start",
    });
  }

  return nodes;
}

// --- Bank arc + slip/skid ------------------------------------------------------

const ARC_CX = 120;
const ARC_CY = 130;
const ARC_R = 108;
const ARC_TICKS = [-60, -45, -30, -20, -10, 10, 20, 30, 45, 60];
const SLIP_FULL_SCALE_G = 0.2;
const SLIP_MAX_PX = 18;

function arcPoint(angleDeg: number, radius: number): { x: number; y: number } {
  return {
    x: ARC_CX + radius * Math.sin(angleDeg * DEG_TO_RAD),
    y: ARC_CY - radius * Math.cos(angleDeg * DEG_TO_RAD),
  };
}

function buildBankArc(rollDeg: number, pitchDeg: number | null, latAccG: number | null): PfdNode[] {
  const nodes: PfdNode[] = [
    // -60..+60 from straight up; "arc" angles are measured from the +x axis.
    {
      kind: "arc",
      cx: ARC_CX,
      cy: ARC_CY,
      r: ARC_R,
      startDeg: -150,
      endDeg: -30,
      stroke: TICK_COLOR,
      strokeWidth: 1.5,
    },
  ];

  for (const angle of ARC_TICKS) {
    const major = Math.abs(angle) % 30 === 0;
    const inner = arcPoint(angle, ARC_R);
    const outer = arcPoint(angle, ARC_R + (major ? 12 : 7));
    nodes.push({
      kind: "line",
      x1: inner.x,
      y1: inner.y,
      x2: outer.x,
      y2: outer.y,
      stroke: TICK_COLOR,
      strokeWidth: major ? 2 : 1.5,
    });
  }

  // Fixed zero reference at the arc apex.
  nodes.push({
    kind: "polygon",
    points: [
      [ARC_CX, ARC_CY - ARC_R],
      [ARC_CX - 6, ARC_CY - ARC_R - 12],
      [ARC_CX + 6, ARC_CY - ARC_R - 12],
    ],
    fill: "#fff",
    stroke: "rgba(2,6,23,0.7)",
    strokeWidth: 1,
  });

  const slipOffset =
    latAccG === null
      ? 0
      : (Math.max(-SLIP_FULL_SCALE_G, Math.min(SLIP_FULL_SCALE_G, latAccG)) / SLIP_FULL_SCALE_G) *
        SLIP_MAX_PX;

  const pointer: PfdNode[] = [
    {
      kind: "polygon",
      points: [
        [ARC_CX, ARC_CY - ARC_R + 2],
        [ARC_CX - 7, ARC_CY - ARC_R + 16],
        [ARC_CX + 7, ARC_CY - ARC_R + 16],
      ],
      fill: ACCENT_YELLOW,
      stroke: OUTLINE_DARK,
      strokeWidth: 1,
    },
  ];
  if (latAccG !== null) {
    // Slip/skid brick: slides toward the lateral acceleration, like the ball.
    pointer.push(
      group(
        [
          {
            kind: "polygon",
            points: [
              [ARC_CX - 9, ARC_CY - ARC_R + 19],
              [ARC_CX + 9, ARC_CY - ARC_R + 19],
              [ARC_CX + 6, ARC_CY - ARC_R + 27],
              [ARC_CX - 6, ARC_CY - ARC_R + 27],
            ],
            fill: ACCENT_YELLOW,
            stroke: OUTLINE_DARK,
            strokeWidth: 1,
          },
        ],
        [translate(slipOffset, 0)]
      )
    );
  }
  // Roll pointer rotating with bank (right wing down = clockwise).
  nodes.push(group(pointer, [{ op: "rotate", deg: rollDeg, cx: ARC_CX, cy: ARC_CY }]));

  if (pitchDeg !== null) {
    nodes.push(
      {
        kind: "text",
        x: ARC_CX,
        y: 66,
        text: "PITCH",
        size: 9,
        weight: 600,
        fill: MUTED_COLOR,
        anchor: "middle",
      },
      {
        kind: "text",
        x: ARC_CX,
        y: 82,
        text: formatCorrection(pitchDeg, 0),
        size: 13,
        weight: 700,
        fill: "#fff",
        anchor: "middle",
      }
    );
  }

  return nodes;
}

// --- Compass rose -----------------------------------------------------------

const ROSE_W = 170;
const ROSE_CX = ROSE_W / 2;
const ROSE_CY = 108;
const ROSE_R = 78;
export const ROSE_H = ROSE_CY + ROSE_R + 4;
const ROSE_DEGS = Array.from({ length: 36 }, (_, i) => i * 10);

function buildHeadingRose(
  headingDeg: number,
  windDirDeg: number | null,
  windSpeedKt: number | null
): PfdNode[] {
  const hasWind = windDirDeg !== null && windSpeedKt !== null && windSpeedKt > 0;
  const nodes: PfdNode[] = [
    {
      kind: "circle",
      cx: ROSE_CX,
      cy: ROSE_CY,
      r: ROSE_R,
      fill: STRIP_FILL,
      stroke: "rgba(255,255,255,0.25)",
      strokeWidth: 1,
    },
  ];

  // Rotating compass card: every tick is its own rotation around the center.
  const card: PfdNode[] = [];
  for (const deg of ROSE_DEGS) {
    const major = deg % 30 === 0;
    const label = major ? headingTickLabel(deg) : null;
    const tick: PfdNode[] = [
      {
        kind: "line",
        x1: ROSE_CX,
        y1: ROSE_CY - ROSE_R,
        x2: ROSE_CX,
        y2: ROSE_CY - ROSE_R + (major ? 9 : 5),
        stroke: TICK_COLOR,
        strokeWidth: major ? 2 : 1,
      },
    ];
    if (label) {
      tick.push({
        kind: "text",
        x: ROSE_CX,
        y: ROSE_CY - ROSE_R + 22,
        text: label,
        size: label.length === 1 ? 13 : 11,
        weight: label.length === 1 ? 700 : 600,
        fill: LABEL_COLOR,
        anchor: "middle",
      });
    }
    card.push(group(tick, [{ op: "rotate", deg, cx: ROSE_CX, cy: ROSE_CY }]));
  }
  nodes.push(group(card, [{ op: "rotate", deg: -headingDeg, cx: ROSE_CX, cy: ROSE_CY }]));

  // Wind vector: the arrow arrives at the aircraft (center dot) from the rose
  // bearing the wind blows FROM — its tail sits on the card mark matching the
  // direction readout (e.g. tail on 104 for "104°/6").
  if (hasWind) {
    nodes.push(
      group(
        [
          {
            kind: "line",
            x1: ROSE_CX,
            y1: ROSE_CY - 34,
            x2: ROSE_CX,
            y2: ROSE_CY - 10,
            stroke: WIND_MAGENTA,
            strokeWidth: 2.5,
          },
          {
            kind: "polygon",
            points: [
              [ROSE_CX, ROSE_CY - 2],
              [ROSE_CX - 5.5, ROSE_CY - 12],
              [ROSE_CX + 5.5, ROSE_CY - 12],
            ],
            fill: WIND_MAGENTA,
          },
        ],
        [{ op: "rotate", deg: windDirDeg - headingDeg, cx: ROSE_CX, cy: ROSE_CY }]
      ),
      { kind: "circle", cx: ROSE_CX, cy: ROSE_CY, r: 3, fill: WIND_MAGENTA },
      { kind: "rect", x: 0, y: ROSE_CY - ROSE_R - 8, width: 58, height: 16, fill: LENS_FILL, rx: 3 },
      {
        kind: "text",
        x: 29,
        y: ROSE_CY - ROSE_R + 4,
        text: formatWind(windDirDeg, windSpeedKt, false),
        size: 10,
        weight: 700,
        fill: WIND_MAGENTA,
        anchor: "middle",
      }
    );
  }

  // Fixed lubber line + heading lens.
  nodes.push(
    {
      kind: "polygon",
      points: [
        [ROSE_CX, ROSE_CY - ROSE_R + 10],
        [ROSE_CX - 6, ROSE_CY - ROSE_R - 2],
        [ROSE_CX + 6, ROSE_CY - ROSE_R - 2],
      ],
      fill: "#fff",
      stroke: "rgba(2,6,23,0.7)",
      strokeWidth: 1,
    },
    {
      kind: "rect",
      x: ROSE_CX - 31,
      y: 0,
      width: 62,
      height: 20,
      fill: LENS_FILL,
      stroke: LENS_BORDER,
      strokeWidth: 1.5,
      rx: 3,
    },
    {
      kind: "text",
      x: ROSE_CX,
      y: 15,
      text: formatCourse(headingDeg),
      size: 15,
      weight: 700,
      fill: "#fff",
      anchor: "middle",
    }
  );

  return nodes;
}

// --- Waterline symbol ---------------------------------------------------------

/** Fixed yellow aircraft reference, drawn around (0, 0). */
function buildWaterline(): PfdNode[] {
  const wings: [number, number][][] = [
    [
      [-46, 0],
      [-18, 0],
      [-11, 9],
    ],
    [
      [46, 0],
      [18, 0],
      [11, 9],
    ],
  ];
  const nodes: PfdNode[] = [];
  for (const points of wings) {
    nodes.push(
      { kind: "polyline", points, stroke: OUTLINE_DARK, strokeWidth: 5.5 },
      { kind: "polyline", points, stroke: ACCENT_YELLOW, strokeWidth: 3 }
    );
  }
  nodes.push(
    { kind: "circle", cx: 0, cy: 0, r: 4, stroke: OUTLINE_DARK, strokeWidth: 5 },
    { kind: "circle", cx: 0, cy: 0, r: 4, stroke: ACCENT_YELLOW, strokeWidth: 2.5 }
  );
  return nodes;
}

// --- Air-data block (GS / TAS / OAT / AGL) --------------------------------------

const AUX_W = 144;
const AUX_ROW_H = 14;

function auxRow(y: number, label: string, value: string): PfdNode[] {
  return [
    { kind: "text", x: 10, y, text: label.toUpperCase(), size: 9, weight: 600, fill: MUTED_COLOR, anchor: "start" },
    { kind: "text", x: AUX_W - 10, y, text: value, size: 12, weight: 600, fill: "#fff", anchor: "end" },
  ];
}

function buildAuxBlock(data: PfdData): { nodes: PfdNode[]; height: number } | null {
  const rows: [string, string][] = [];
  if (data.groundSpeedKt !== null && data.iasKt !== null) {
    rows.push(["GS", `${Math.round(data.groundSpeedKt)} KT`]);
  }
  if (data.tasKt !== null) rows.push(["TAS", `${Math.round(data.tasKt)} KT`]);
  if (data.oatC !== null) rows.push(["OAT", `${Math.round(data.oatC)}°C`]);
  if (data.aglFt !== null) rows.push(["AGL", `${Math.round(data.aglFt).toLocaleString("en-US")} ft`]);
  if (rows.length === 0) return null;

  const height = rows.length * AUX_ROW_H + 12;
  const nodes: PfdNode[] = [
    {
      kind: "rect",
      x: 0,
      y: 0,
      width: AUX_W,
      height,
      fill: STRIP_FILL,
      rx: 6,
      stroke: PANEL_BORDER,
      strokeWidth: 1,
    },
  ];
  rows.forEach(([label, value], i) => {
    nodes.push(...auxRow(18 + i * AUX_ROW_H, label, value));
  });
  return { nodes, height };
}

// --- Engine (EIS) strip ----------------------------------------------------------

const EIS_W = 112;
const EIS_PAD = 8;
const EIS_CONTENT_W = EIS_W - EIS_PAD * 2;
const EIS_ARC_START = 135;
const EIS_ARC_SWEEP = 270;

function gaugeFraction(value: number, range: GaugeRange): number {
  if (range.max <= range.min) return 0;
  return Math.max(0, Math.min(1, (value - range.min) / (range.max - range.min)));
}

function eisPolar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = deg * DEG_TO_RAD;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Round dial with a green value band and white needle; ~78px tall. */
function buildArcGauge(
  y: number,
  label: string,
  value: number,
  range: GaugeRange,
  decimals: number
): { nodes: PfdNode[]; height: number } {
  const cx = EIS_W / 2;
  const cy = y + 28;
  const r = 25;
  const f = gaugeFraction(value, range);
  const needleDeg = EIS_ARC_START + EIS_ARC_SWEEP * f;
  const outer = eisPolar(cx, cy, r, needleDeg);
  const inner = eisPolar(cx, cy, 8, needleDeg);

  const nodes: PfdNode[] = [
    {
      kind: "arc",
      cx,
      cy,
      r,
      startDeg: EIS_ARC_START,
      endDeg: EIS_ARC_START + EIS_ARC_SWEEP,
      stroke: GAUGE_TRACK,
      strokeWidth: 6,
    },
  ];
  if (f > 0) {
    nodes.push({
      kind: "arc",
      cx,
      cy,
      r,
      startDeg: EIS_ARC_START,
      endDeg: needleDeg,
      stroke: GAUGE_GREEN,
      strokeWidth: 6,
      round: true,
    });
  }
  nodes.push(
    { kind: "line", x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, stroke: "#fff", strokeWidth: 2 },
    { kind: "text", x: cx, y: y + 56, text: label.toUpperCase(), size: 8, weight: 600, fill: MUTED_COLOR, anchor: "middle" },
    { kind: "text", x: cx, y: y + 70, text: value.toFixed(decimals), size: 14, weight: 700, fill: "#fff", anchor: "middle" }
  );
  return { nodes, height: 78 };
}

/** Label/value row over a green fill bar with a white pointer; ~22px tall. */
function buildBarGauge(
  y: number,
  label: string,
  value: number,
  range: GaugeRange,
  decimals: number
): { nodes: PfdNode[]; height: number } {
  const f = gaugeFraction(value, range);
  const barY = y + 14;
  const pointerX = EIS_PAD + EIS_CONTENT_W * f;

  const nodes: PfdNode[] = [
    { kind: "text", x: EIS_PAD, y: y + 9, text: label.toUpperCase(), size: 8, weight: 600, fill: MUTED_COLOR, anchor: "start" },
    { kind: "text", x: EIS_W - EIS_PAD, y: y + 10, text: value.toFixed(decimals), size: 11, weight: 700, fill: "#fff", anchor: "end" },
    { kind: "rect", x: EIS_PAD, y: barY, width: EIS_CONTENT_W, height: 6, fill: GAUGE_TRACK, rx: 2 },
  ];
  if (f > 0) {
    nodes.push({ kind: "rect", x: EIS_PAD, y: barY, width: EIS_CONTENT_W * f, height: 6, fill: GAUGE_GREEN, rx: 2 });
  }
  nodes.push({
    kind: "polygon",
    points: [
      [pointerX - 4, barY - 4],
      [pointerX + 4, barY - 4],
      [pointerX, barY + 1],
    ],
    fill: "#fff",
  });
  return { nodes, height: 26 };
}

const EIS_BARS: { key: keyof EngineSample; label: string; decimals: number }[] = [
  { key: "fuelFlowGph", label: "Fuel GPH", decimals: 1 },
  { key: "fuelPressPsi", label: "Fuel PSI", decimals: 1 },
  { key: "oilPressPsi", label: "Oil PSI", decimals: 0 },
  { key: "oilTempF", label: "Oil °F", decimals: 0 },
  { key: "coolantTempF", label: "Coolant °F", decimals: 0 },
  { key: "egtMaxF", label: "EGT °F", decimals: 0 },
  { key: "chtMaxF", label: "CHT °F", decimals: 0 },
];

function buildEngineStrip(
  engine: EngineSample,
  ranges: EngineRanges
): { nodes: PfdNode[]; height: number } {
  const content: PfdNode[] = [];
  let y = EIS_PAD;

  const arcs: { key: "rpm" | "manifoldInHg"; label: string; decimals: number }[] = [
    { key: "rpm", label: "RPM", decimals: 0 },
    { key: "manifoldInHg", label: "Man inHg", decimals: 1 },
  ];
  for (const { key, label, decimals } of arcs) {
    const value = engine[key];
    const range = ranges[key];
    if (value === null || !range) continue;
    const gauge = buildArcGauge(y, label, value, range, decimals);
    content.push(...gauge.nodes);
    y += gauge.height + 6;
  }

  for (const { key, label, decimals } of EIS_BARS) {
    const value = engine[key];
    const range = ranges[key];
    if (value === null || !range) continue;
    const gauge = buildBarGauge(y, label, value, range, decimals);
    content.push(...gauge.nodes);
    y += gauge.height + 4;
  }

  if (engine.volts !== null || engine.amps !== null) {
    y += 2;
    content.push({ kind: "line", x1: EIS_PAD, y1: y, x2: EIS_W - EIS_PAD, y2: y, stroke: PANEL_BORDER, strokeWidth: 1 });
    const parts: string[] = [];
    if (engine.volts !== null) parts.push(`${engine.volts.toFixed(1)}V`);
    if (engine.amps !== null) parts.push(`${Math.round(engine.amps)}A`);
    content.push(
      { kind: "text", x: EIS_PAD, y: y + 13, text: "BUS", size: 8, weight: 600, fill: MUTED_COLOR, anchor: "start" },
      { kind: "text", x: EIS_W - EIS_PAD, y: y + 14, text: parts.join(" · "), size: 11, weight: 700, fill: "#fff", anchor: "end" }
    );
    y += 18;
  }

  const height = y + EIS_PAD;
  return {
    nodes: [
      {
        kind: "rect",
        x: 0,
        y: 0,
        width: EIS_W,
        height,
        fill: STRIP_FILL,
        rx: 6,
        stroke: PANEL_BORDER,
        strokeWidth: 1,
      },
      ...content,
    ],
    height,
  };
}

// --- Layout -------------------------------------------------------------------

/**
 * Lays the whole PFD out for a viewport of `width`×`height` CSS pixels,
 * mirroring the live overlay's responsive rules (margins, the EIS strip only
 * on ≥768px wide views, the rose shrinking slightly on narrow ones).
 */
export function buildPfdScene(
  width: number,
  height: number,
  data: PfdData,
  ranges: EngineRanges
): PfdGroup {
  const margin = width >= 640 ? 12 : 8;
  const showEngine = data.engine !== null && width >= 768;
  const nodes: PfdNode[] = [];

  if (data.rollDeg !== null) {
    nodes.push(group(buildBankArc(data.rollDeg, data.pitchDeg, data.latAccG), [translate(width / 2 - 120, 8)]));
  }

  let speedLeft = margin;
  if (showEngine && data.engine) {
    const strip = buildEngineStrip(data.engine, ranges);
    nodes.push(group(strip.nodes, [translate(margin, (height - strip.height) / 2)]));
    speedLeft = 136;
  }

  nodes.push(group(buildSpeedTape(data.iasKt, data.groundSpeedKt), [translate(speedLeft, height / 2 - TAPE_H / 2)]));

  const altLeft = width - margin - (ALT_W + 14) - 4 - (VSI_W + 18);
  nodes.push(
    group(buildAltitudeTape(data.altitudeFt), [translate(altLeft, height / 2 - TAPE_H / 2)]),
    group(buildVsi(data.vsFpm), [translate(altLeft + ALT_W + 14 + 4, height / 2 - VSI_H / 2)])
  );

  nodes.push(group(buildWaterline(), [translate(width / 2, height / 2 - 3)], 0.9));

  if (data.headingDeg !== null) {
    const roseScale = width >= 640 ? 1 : 0.9;
    const transforms: PfdTransform[] = [translate(width / 2 - ROSE_W / 2, height - 64 - ROSE_H)];
    if (roseScale !== 1) {
      transforms.push({ op: "scale", factor: roseScale, cx: ROSE_W / 2, cy: ROSE_H });
    }
    nodes.push(group(buildHeadingRose(data.headingDeg, data.windDirDeg, data.windSpeedKt), transforms));
  }

  const aux = buildAuxBlock(data);
  if (aux) {
    nodes.push(group(aux.nodes, [translate(width - margin - AUX_W, height - 64 - aux.height)]));
  }

  return group(nodes);
}
