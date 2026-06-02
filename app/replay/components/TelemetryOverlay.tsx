import { formatCourse, formatVerticalSpeed, formatWind } from "@/lib/formatters";
import type { WindComponents } from "../replayMetrics";

interface TelemetryOverlayProps {
  speedKnots: number | null;
  altitudeFt: number | null;
  verticalSpeedFpm: number | null;
  trackDeg: number | null;
  /** Current circuit leg label (downwind/base/final), shown only when present. */
  stage?: string | null;
  /** Indicated airspeed (kt), shown only when the track records it. */
  iasKt?: number | null;
  /** True airspeed (kt), shown only when the track records it. */
  tasKt?: number | null;
  /** Wind direction (deg) the wind blows from, shown only when recorded. */
  windDirDeg?: number | null;
  /** Wind speed (kt), shown only when recorded. */
  windSpeedKt?: number | null;
  /** Head/cross components relative to the ground track, shown when available. */
  windComponents?: WindComponents | null;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold tabular-nums text-white leading-none">{value}</div>
    </div>
  );
}

/** Floating speed / altitude / vertical-speed readout pinned over the 3D globe. */
export function TelemetryOverlay({
  speedKnots,
  altitudeFt,
  verticalSpeedFpm,
  trackDeg,
  stage,
  iasKt,
  tasKt,
  windDirDeg,
  windSpeedKt,
  windComponents,
}: TelemetryOverlayProps) {
  const hasWind =
    windDirDeg !== null && windDirDeg !== undefined && windSpeedKt !== null && windSpeedKt !== undefined;

  return (
    <div className="absolute top-16 right-3 z-[600] flex flex-col gap-2 rounded-lg bg-slate-900/80 border border-slate-600 px-3 py-2 backdrop-blur min-w-[7rem]">
      <Field
        label={iasKt !== null && iasKt !== undefined ? "GS" : "Speed"}
        value={speedKnots !== null ? `${speedKnots.toFixed(0)} KT` : "--"}
      />
      {iasKt !== null && iasKt !== undefined ? (
        <Field label="IAS" value={`${Math.round(iasKt)} KT`} />
      ) : null}
      {tasKt !== null && tasKt !== undefined ? (
        <Field label="TAS" value={`${Math.round(tasKt)} KT`} />
      ) : null}
      <Field
        label="Altitude"
        value={altitudeFt !== null ? `${Math.round(altitudeFt).toLocaleString()} ft` : "--"}
      />
      <Field label="V/S" value={formatVerticalSpeed(verticalSpeedFpm)} />
      <Field label="Track" value={trackDeg !== null ? formatCourse(trackDeg) : "--"} />
      {hasWind ? <Field label="Wind" value={formatWind(windDirDeg, windSpeedKt, false)} /> : null}
      {windComponents ? (
        <Field
          label="HW / XW"
          value={`${windComponents.headwindKt >= 0 ? "H" : "T"}${Math.round(
            Math.abs(windComponents.headwindKt)
          )} · ${windComponents.crosswindSide}${Math.round(windComponents.crosswindKt)}`}
        />
      ) : null}
      {stage ? <Field label="Stage" value={stage} /> : null}
    </div>
  );
}
