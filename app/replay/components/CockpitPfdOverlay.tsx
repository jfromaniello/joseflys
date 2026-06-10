"use client";

import { formatCorrection, formatCourse, formatWind } from "@/lib/formatters";
import type { EngineSample } from "../replayMetrics";
import { computeTapeTicks, headingTickLabel } from "../pfdMath";

interface CockpitPfdOverlayProps {
  /** Indicated airspeed (kt); when absent the speed tape falls back to GS. */
  iasKt: number | null;
  groundSpeedKt: number | null;
  tasKt: number | null;
  /** GPS altitude (ft MSL). */
  altitudeFt: number | null;
  /** Vertical speed (fpm), recorded or GPS-derived. */
  vsFpm: number | null;
  /** Magnetic heading (deg); falls back to magnetic track when not recorded. */
  headingDeg: number | null;
  /** Recorded bank angle (deg, right positive); hides the bank arc when null. */
  rollDeg: number | null;
  /** Recorded pitch (deg, nose-up positive). */
  pitchDeg: number | null;
  windDirDeg: number | null;
  windSpeedKt: number | null;
  oatC: number | null;
  aglFt: number | null;
  /** Engine (EIS) readouts; `null` when the track has no engine feed. */
  engine: EngineSample | null;
}

// Tape strip background — translucent so the scenery stays visible behind it.
const STRIP_FILL = "rgba(15, 23, 42, 0.45)";
const LENS_FILL = "rgba(2, 6, 23, 0.85)";
const TICK_COLOR = "rgba(255, 255, 255, 0.85)";
const LABEL_COLOR = "rgba(255, 255, 255, 0.9)";
const ACCENT_YELLOW = "#facc15";
const WIND_MAGENTA = "#e879f9";

const TAPE_H = 300;

const SPEED_W = 72;
const PX_PER_KT = 6;

const ALT_W = 80;
const PX_PER_FT = 0.5;

const VSI_W = 26;
const VSI_H = 200;
const VSI_MAX_FPM = 2000;

const DEG_TO_RAD = Math.PI / 180;

/**
 * Airspeed tape (left edge). Values increase upward; the lens shows the current
 * value rounded to the knot. When IAS is not recorded the tape shows ground
 * speed and says so, rather than passing GS off as airspeed.
 */
function SpeedTape({ iasKt, groundSpeedKt }: { iasKt: number | null; groundSpeedKt: number | null }) {
  const value = iasKt ?? groundSpeedKt;
  const ticks = value === null ? [] : computeTapeTicks(value, TAPE_H, PX_PER_KT, 5, 10, 0);
  const lensY = TAPE_H / 2;

  return (
    <svg width={SPEED_W + 14} height={TAPE_H} className="tabular-nums" aria-label="Airspeed tape">
      <rect x={0} y={0} width={SPEED_W} height={TAPE_H} fill={STRIP_FILL} rx={4} />
      {ticks.map((tick) => (
        <g key={tick.value}>
          <line
            x1={SPEED_W - (tick.major ? 12 : 7)}
            y1={tick.y}
            x2={SPEED_W}
            y2={tick.y}
            stroke={TICK_COLOR}
            strokeWidth={tick.major ? 2 : 1}
          />
          {tick.major ? (
            <text
              x={SPEED_W - 17}
              y={tick.y + 4.5}
              textAnchor="end"
              fontSize={14}
              fontWeight={600}
              fill={LABEL_COLOR}
            >
              {tick.value}
            </text>
          ) : null}
        </g>
      ))}
      {/* Current-value lens with a pointer toward the screen center. */}
      <polygon
        points={`2,${lensY - 17} ${SPEED_W},${lensY - 17} ${SPEED_W},${lensY - 6} ${SPEED_W + 12},${lensY} ${SPEED_W},${lensY + 6} ${SPEED_W},${lensY + 17} 2,${lensY + 17}`}
        fill={LENS_FILL}
        stroke="rgba(255,255,255,0.7)"
        strokeWidth={1.5}
      />
      <text
        x={SPEED_W - 14}
        y={lensY + 7}
        textAnchor="end"
        fontSize={20}
        fontWeight={700}
        fill="#fff"
      >
        {value === null ? "--" : Math.round(value)}
      </text>
      <text x={8} y={lensY + 5} fontSize={10} fontWeight={600} fill="rgba(148,163,184,1)">
        {iasKt === null ? "GS" : "IAS"}
      </text>
    </svg>
  );
}

/**
 * Altitude tape (right edge), mirrored from the speed tape: ticks on the left
 * side, lens pointer toward the screen center. Lens value rounds to 10 ft.
 */
function AltitudeTape({ altitudeFt }: { altitudeFt: number | null }) {
  const ticks = altitudeFt === null ? [] : computeTapeTicks(altitudeFt, TAPE_H, PX_PER_FT, 50, 100);
  const lensY = TAPE_H / 2;

  return (
    <svg width={ALT_W + 14} height={TAPE_H} className="tabular-nums" aria-label="Altitude tape">
      <rect x={14} y={0} width={ALT_W} height={TAPE_H} fill={STRIP_FILL} rx={4} />
      {ticks.map((tick) => (
        <g key={tick.value}>
          <line
            x1={14}
            y1={tick.y}
            x2={14 + (tick.major ? 12 : 7)}
            y2={tick.y}
            stroke={TICK_COLOR}
            strokeWidth={tick.major ? 2 : 1}
          />
          {tick.major ? (
            <text
              x={14 + 17}
              y={tick.y + 4.5}
              textAnchor="start"
              fontSize={13}
              fontWeight={600}
              fill={LABEL_COLOR}
            >
              {tick.value.toLocaleString()}
            </text>
          ) : null}
        </g>
      ))}
      <polygon
        points={`${ALT_W + 12},${lensY - 17} 14,${lensY - 17} 14,${lensY - 6} 2,${lensY} 14,${lensY + 6} 14,${lensY + 17} ${ALT_W + 12},${lensY + 17}`}
        fill={LENS_FILL}
        stroke="rgba(255,255,255,0.7)"
        strokeWidth={1.5}
      />
      <text
        x={ALT_W + 4}
        y={lensY + 7}
        textAnchor="end"
        fontSize={19}
        fontWeight={700}
        fill="#fff"
      >
        {altitudeFt === null ? "--" : (Math.round(altitudeFt / 10) * 10).toLocaleString()}
      </text>
      {/* Units caption pinned to the tape top, backed so tick labels can't collide. */}
      <rect x={14} y={0} width={ALT_W} height={15} fill={LENS_FILL} rx={4} />
      <text
        x={14 + ALT_W / 2}
        y={11}
        textAnchor="middle"
        fontSize={9}
        fontWeight={600}
        fill="rgba(148,163,184,1)"
      >
        FT MSL
      </text>
    </svg>
  );
}

/**
 * Vertical speed indicator: a slim strip whose pointer moves linearly up to
 * ±2,000 fpm, with a numeric readout (rounded to 50 fpm) when climbing or
 * descending more than 100 fpm.
 */
function Vsi({ vsFpm }: { vsFpm: number | null }) {
  const pxPerFpm = VSI_H / 2 / VSI_MAX_FPM;
  const clamped = vsFpm === null ? 0 : Math.max(-VSI_MAX_FPM, Math.min(VSI_MAX_FPM, vsFpm));
  const pointerY = VSI_H / 2 - clamped * pxPerFpm;
  const showReadout = vsFpm !== null && Math.abs(vsFpm) >= 100;
  // Keep the readout inside the strip when the pointer nears either end.
  const readoutY = Math.max(12, Math.min(VSI_H - 6, pointerY - 8));

  return (
    <svg width={VSI_W + 18} height={VSI_H} className="tabular-nums" aria-label="Vertical speed indicator">
      <rect x={0} y={0} width={VSI_W} height={VSI_H} fill={STRIP_FILL} rx={4} />
      {[2000, 1000, -1000, -2000].map((v) => (
        <g key={v}>
          <line
            x1={0}
            y1={VSI_H / 2 - v * pxPerFpm}
            x2={6}
            y2={VSI_H / 2 - v * pxPerFpm}
            stroke={TICK_COLOR}
            strokeWidth={1.5}
          />
          <text
            x={9}
            y={VSI_H / 2 - v * pxPerFpm + 4}
            fontSize={10}
            fontWeight={600}
            fill={LABEL_COLOR}
          >
            {Math.abs(v) / 1000}
          </text>
        </g>
      ))}
      <line x1={0} y1={VSI_H / 2} x2={9} y2={VSI_H / 2} stroke={TICK_COLOR} strokeWidth={2} />
      {vsFpm !== null ? (
        <polygon
          points={`1,${pointerY} 11,${pointerY - 6} 11,${pointerY + 6}`}
          fill="#fff"
          stroke="rgba(2,6,23,0.8)"
          strokeWidth={1}
        />
      ) : null}
      {showReadout ? (
        <text x={13} y={readoutY} fontSize={11} fontWeight={700} fill="#fff">
          {Math.abs(Math.round(vsFpm / 50) * 50)}
        </text>
      ) : null}
    </svg>
  );
}

const ARC_CX = 120;
const ARC_CY = 130;
const ARC_R = 108;
const ARC_TICKS = [-60, -45, -30, -20, -10, 10, 20, 30, 45, 60];

function arcPoint(angleDeg: number, radius: number): { x: number; y: number } {
  return {
    x: ARC_CX + radius * Math.sin(angleDeg * DEG_TO_RAD),
    y: ARC_CY - radius * Math.cos(angleDeg * DEG_TO_RAD),
  };
}

/**
 * Bank-angle arc (top center): a fixed roll scale with a yellow pointer that
 * rotates with the recorded bank, plus a small digital pitch readout. Drawn
 * without a background strip to stay unobtrusive over the scenery.
 */
function BankArc({ rollDeg, pitchDeg }: { rollDeg: number; pitchDeg: number | null }) {
  const start = arcPoint(-60, ARC_R);
  const end = arcPoint(60, ARC_R);

  return (
    <svg width={240} height={96} className="tabular-nums" aria-label="Bank angle indicator">
      <path
        d={`M ${start.x} ${start.y} A ${ARC_R} ${ARC_R} 0 0 1 ${end.x} ${end.y}`}
        fill="none"
        stroke={TICK_COLOR}
        strokeWidth={1.5}
      />
      {ARC_TICKS.map((angle) => {
        const major = Math.abs(angle) % 30 === 0;
        const inner = arcPoint(angle, ARC_R);
        const outer = arcPoint(angle, ARC_R + (major ? 12 : 7));
        return (
          <line
            key={angle}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke={TICK_COLOR}
            strokeWidth={major ? 2 : 1.5}
          />
        );
      })}
      {/* Fixed zero reference at the arc apex. */}
      <polygon
        points={`${ARC_CX},${ARC_CY - ARC_R} ${ARC_CX - 6},${ARC_CY - ARC_R - 12} ${ARC_CX + 6},${ARC_CY - ARC_R - 12}`}
        fill="#fff"
        stroke="rgba(2,6,23,0.7)"
        strokeWidth={1}
      />
      {/* Roll pointer rotating with bank (right wing down = clockwise). */}
      <g transform={`rotate(${rollDeg} ${ARC_CX} ${ARC_CY})`}>
        <polygon
          points={`${ARC_CX},${ARC_CY - ARC_R + 2} ${ARC_CX - 7},${ARC_CY - ARC_R + 16} ${ARC_CX + 7},${ARC_CY - ARC_R + 16}`}
          fill={ACCENT_YELLOW}
          stroke="rgba(2,6,23,0.8)"
          strokeWidth={1}
        />
      </g>
      {pitchDeg !== null ? (
        <>
          <text x={ARC_CX} y={66} textAnchor="middle" fontSize={9} fontWeight={600} fill="rgba(148,163,184,1)">
            PITCH
          </text>
          <text x={ARC_CX} y={82} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff">
            {formatCorrection(pitchDeg, 0)}
          </text>
        </>
      ) : null}
    </svg>
  );
}

const ROSE_W = 170;
const ROSE_CX = ROSE_W / 2;
const ROSE_CY = 108;
const ROSE_R = 78;
const ROSE_H = ROSE_CY + ROSE_R + 4;
const ROSE_DEGS = Array.from({ length: 36 }, (_, i) => i * 10);

/**
 * Compass rose (bottom center): a rotating card under a fixed lubber line and
 * heading lens, G3X-style. When the track records wind, a magenta arrow shows
 * the direction the wind blows across the rose, with the numbers top-left.
 */
function HeadingRose({
  headingDeg,
  windDirDeg,
  windSpeedKt,
}: {
  headingDeg: number;
  windDirDeg: number | null;
  windSpeedKt: number | null;
}) {
  const hasWind = windDirDeg !== null && windSpeedKt !== null && windSpeedKt > 0;

  return (
    <svg width={ROSE_W} height={ROSE_H} className="tabular-nums" aria-label="Heading rose">
      <circle cx={ROSE_CX} cy={ROSE_CY} r={ROSE_R} fill={STRIP_FILL} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
      {/* Rotating compass card. */}
      <g transform={`rotate(${-headingDeg} ${ROSE_CX} ${ROSE_CY})`}>
        {ROSE_DEGS.map((deg) => {
          const major = deg % 30 === 0;
          const label = major ? headingTickLabel(deg) : null;
          return (
            <g key={deg} transform={`rotate(${deg} ${ROSE_CX} ${ROSE_CY})`}>
              <line
                x1={ROSE_CX}
                y1={ROSE_CY - ROSE_R}
                x2={ROSE_CX}
                y2={ROSE_CY - ROSE_R + (major ? 9 : 5)}
                stroke={TICK_COLOR}
                strokeWidth={major ? 2 : 1}
              />
              {label ? (
                <text
                  x={ROSE_CX}
                  y={ROSE_CY - ROSE_R + 22}
                  textAnchor="middle"
                  fontSize={label.length === 1 ? 13 : 11}
                  fontWeight={label.length === 1 ? 700 : 600}
                  fill={LABEL_COLOR}
                >
                  {label}
                </text>
              ) : null}
            </g>
          );
        })}
      </g>
      {/* Wind vector: points the direction the wind blows, relative to the nose. */}
      {hasWind ? (
        <>
          <g transform={`rotate(${windDirDeg - headingDeg} ${ROSE_CX} ${ROSE_CY})`}>
            <line
              x1={ROSE_CX}
              y1={ROSE_CY - 18}
              x2={ROSE_CX}
              y2={ROSE_CY + 12}
              stroke={WIND_MAGENTA}
              strokeWidth={2.5}
            />
            <polygon
              points={`${ROSE_CX},${ROSE_CY + 20} ${ROSE_CX - 5},${ROSE_CY + 10} ${ROSE_CX + 5},${ROSE_CY + 10}`}
              fill={WIND_MAGENTA}
            />
          </g>
          <rect x={0} y={ROSE_CY - ROSE_R - 8} width={58} height={16} fill={LENS_FILL} rx={3} />
          <text
            x={29}
            y={ROSE_CY - ROSE_R + 4}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill={WIND_MAGENTA}
          >
            {formatWind(windDirDeg, windSpeedKt, false)}
          </text>
        </>
      ) : null}
      {/* Fixed lubber line + heading lens. */}
      <polygon
        points={`${ROSE_CX},${ROSE_CY - ROSE_R + 10} ${ROSE_CX - 6},${ROSE_CY - ROSE_R - 2} ${ROSE_CX + 6},${ROSE_CY - ROSE_R - 2}`}
        fill="#fff"
        stroke="rgba(2,6,23,0.7)"
        strokeWidth={1}
      />
      <rect
        x={ROSE_CX - 31}
        y={0}
        width={62}
        height={20}
        fill={LENS_FILL}
        stroke="rgba(255,255,255,0.7)"
        strokeWidth={1.5}
        rx={3}
      />
      <text x={ROSE_CX} y={15} textAnchor="middle" fontSize={15} fontWeight={700} fill="#fff">
        {formatCourse(headingDeg)}
      </text>
    </svg>
  );
}

function AuxField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-xs font-semibold tabular-nums text-white">{value}</span>
    </div>
  );
}

/** Compact engine (EIS) readout block; renders only the fields the log records. */
function EngineBlock({ engine }: { engine: EngineSample }) {
  const rows: { label: string; value: string }[] = [];
  if (engine.rpm !== null) rows.push({ label: "RPM", value: `${Math.round(engine.rpm)}` });
  if (engine.manifoldInHg !== null)
    rows.push({ label: "MAP", value: `${engine.manifoldInHg.toFixed(1)} inHg` });
  if (engine.fuelFlowGph !== null)
    rows.push({ label: "FF", value: `${engine.fuelFlowGph.toFixed(1)} GPH` });
  if (engine.fuelPressPsi !== null)
    rows.push({ label: "Fuel P", value: `${engine.fuelPressPsi.toFixed(1)} PSI` });
  if (engine.oilTempF !== null) rows.push({ label: "Oil T", value: `${Math.round(engine.oilTempF)}°F` });
  if (engine.oilPressPsi !== null)
    rows.push({ label: "Oil P", value: `${Math.round(engine.oilPressPsi)} PSI` });
  if (engine.coolantTempF !== null)
    rows.push({ label: "Coolant", value: `${Math.round(engine.coolantTempF)}°F` });
  if (engine.egtMaxF !== null) rows.push({ label: "EGT", value: `${Math.round(engine.egtMaxF)}°F` });
  if (engine.chtMaxF !== null) rows.push({ label: "CHT", value: `${Math.round(engine.chtMaxF)}°F` });
  if (engine.volts !== null) rows.push({ label: "Volts", value: `${engine.volts.toFixed(1)} V` });
  if (engine.amps !== null) rows.push({ label: "Amps", value: `${Math.round(engine.amps)} A` });

  if (rows.length === 0) return null;

  // Two columns keep the block short enough to clear the altitude tape above it.
  return (
    <div className="w-64 rounded-md bg-slate-900/45 border border-white/10 px-2.5 py-1.5 backdrop-blur-[2px]">
      <div className="text-[9px] font-bold uppercase tracking-wider text-cyan-300/80 mb-0.5">Engine</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {rows.map((row) => (
          <AuxField key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
    </div>
  );
}

/**
 * G3X-inspired glass-cockpit overlay for the cockpit view: airspeed tape (left),
 * altitude tape + VSI (right), bank arc (top), compass rose with wind (bottom),
 * waterline symbol (center), and air-data / engine readout blocks. Everything is
 * semi-transparent so the out-the-window scenery stays visible. Purely
 * presentational — all values are sampled at the current playback time by the
 * caller.
 */
export function CockpitPfdOverlay({
  iasKt,
  groundSpeedKt,
  tasKt,
  altitudeFt,
  vsFpm,
  headingDeg,
  rollDeg,
  pitchDeg,
  windDirDeg,
  windSpeedKt,
  oatC,
  aglFt,
  engine,
}: CockpitPfdOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[550] select-none">
      {rollDeg !== null ? (
        <div className="absolute left-1/2 top-2 -translate-x-1/2">
          <BankArc rollDeg={rollDeg} pitchDeg={pitchDeg} />
        </div>
      ) : null}

      <div className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2">
        <SpeedTape iasKt={iasKt} groundSpeedKt={groundSpeedKt} />
      </div>

      <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
        <AltitudeTape altitudeFt={altitudeFt} />
        <Vsi vsFpm={vsFpm} />
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-90">
        <WaterlineSymbol />
      </div>

      {headingDeg !== null ? (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 scale-90 sm:scale-100 origin-bottom">
          <HeadingRose headingDeg={headingDeg} windDirDeg={windDirDeg} windSpeedKt={windSpeedKt} />
        </div>
      ) : null}

      <div className="absolute bottom-16 left-2 sm:left-3 w-36 rounded-md bg-slate-900/45 border border-white/10 px-2.5 py-1.5 space-y-0.5 backdrop-blur-[2px]">
        {groundSpeedKt !== null && iasKt !== null ? (
          <AuxField label="GS" value={`${Math.round(groundSpeedKt)} KT`} />
        ) : null}
        {tasKt !== null ? <AuxField label="TAS" value={`${Math.round(tasKt)} KT`} /> : null}
        {oatC !== null ? <AuxField label="OAT" value={`${Math.round(oatC)}°C`} /> : null}
        {aglFt !== null ? <AuxField label="AGL" value={`${Math.round(aglFt).toLocaleString()} ft`} /> : null}
      </div>

      {engine ? (
        <div className="absolute bottom-16 right-2 sm:right-3">
          <EngineBlock engine={engine} />
        </div>
      ) : null}
    </div>
  );
}

/** Fixed yellow waterline (aircraft reference) symbol at the screen center. */
function WaterlineSymbol() {
  const wing = "M -46 0 L -18 0 L -11 9";
  const wingMirror = "M 46 0 L 18 0 L 11 9";
  return (
    <svg width={100} height={26} viewBox="-50 -10 100 26" aria-hidden="true">
      {[wing, wingMirror].map((d) => (
        <g key={d}>
          <path d={d} fill="none" stroke="rgba(2,6,23,0.8)" strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
          <path d={d} fill="none" stroke={ACCENT_YELLOW} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
      <circle cx={0} cy={0} r={4} fill="none" stroke="rgba(2,6,23,0.8)" strokeWidth={5} />
      <circle cx={0} cy={0} r={4} fill="none" stroke={ACCENT_YELLOW} strokeWidth={2.5} />
    </svg>
  );
}
