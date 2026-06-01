import { formatCourse, formatVerticalSpeed } from "@/lib/formatters";

interface TelemetryOverlayProps {
  speedKnots: number | null;
  altitudeFt: number | null;
  verticalSpeedFpm: number | null;
  trackDeg: number | null;
  /** Current circuit leg label (downwind/base/final), shown only when present. */
  stage?: string | null;
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
}: TelemetryOverlayProps) {
  return (
    <div className="absolute top-16 right-3 z-[600] flex flex-col gap-2 rounded-lg bg-slate-900/80 border border-slate-600 px-3 py-2 backdrop-blur min-w-[7rem]">
      <Field label="Speed" value={speedKnots !== null ? `${speedKnots.toFixed(0)} KT` : "--"} />
      <Field
        label="Altitude"
        value={altitudeFt !== null ? `${Math.round(altitudeFt).toLocaleString()} ft` : "--"}
      />
      <Field label="V/S" value={formatVerticalSpeed(verticalSpeedFpm)} />
      <Field label="Track" value={trackDeg !== null ? formatCourse(trackDeg) : "--"} />
      {stage ? <Field label="Stage" value={stage} /> : null}
    </div>
  );
}
