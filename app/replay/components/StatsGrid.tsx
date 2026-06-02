import { formatCourse, formatDistance, formatVerticalSpeed, formatWind } from "@/lib/formatters";
import { StatCard } from "./StatCard";
import type { WindComponents } from "../replayMetrics";

interface StatsGridProps {
  speedKnots: number | null;
  altitudeFt: number | null;
  verticalSpeedFpm: number | null;
  trackDeg: number | null;
  totalDistanceNm: number;
  durationMs: number;
  pointCount: number;
  currentIndex: number;
  /** Whether the track carries avionics telemetry (drives the extra cards). */
  hasRichTelemetry?: boolean;
  iasKt?: number | null;
  tasKt?: number | null;
  windDirDeg?: number | null;
  windSpeedKt?: number | null;
  windComponents?: WindComponents | null;
}

/** Two grids of {@link StatCard}s summarizing live telemetry and track totals. */
export function StatsGrid({
  speedKnots,
  altitudeFt,
  verticalSpeedFpm,
  trackDeg,
  totalDistanceNm,
  durationMs,
  pointCount,
  currentIndex,
  hasRichTelemetry = false,
  iasKt,
  tasKt,
  windDirDeg,
  windSpeedKt,
  windComponents,
}: StatsGridProps) {
  const hasWind =
    windDirDeg !== null && windDirDeg !== undefined && windSpeedKt !== null && windSpeedKt !== undefined;

  return (
    <>
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 items-stretch">
        <StatCard
          label={hasRichTelemetry ? "Ground Speed" : "Speed"}
          tooltip={
            hasRichTelemetry
              ? "GPS ground speed recorded by the avionics."
              : "Computed from 3D distance between adjacent GPX points divided by their timestamp delta. Close to ground speed — without wind or aircraft anemometer data it is impossible to derive TAS or other speeds that would be more useful."
          }
          value={speedKnots !== null ? `${speedKnots.toFixed(1)} KT` : "--"}
        />
        <StatCard
          label="Current Altitude"
          tooltip="GPX altitude is sampled at points. During playback, altitude is linearly interpolated between the current point and the next point by time."
          value={altitudeFt !== null ? `${Math.round(altitudeFt).toLocaleString()} ft` : "--"}
        />
        <StatCard
          label="Vertical Speed"
          tooltip="Climb (+) or descent (−) rate in feet per minute, smoothed over a ~5-second window centered on the current point to reduce GPS altitude noise."
          value={formatVerticalSpeed(verticalSpeedFpm)}
        />
        <StatCard
          label="Track"
          tooltip="Magnetic course over ground, derived from the GPS motion heading (true) and corrected with the WMM magnetic declination at the current position — what you would compare against runways and charts."
          value={trackDeg !== null ? formatCourse(trackDeg) : "--"}
        />
      </div>

      {hasRichTelemetry ? (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 items-stretch">
          <StatCard
            label="Indicated Airspeed"
            tooltip="Indicated airspeed (IAS) recorded by the air-data computer — what the airspeed indicator shows in the cockpit."
            value={iasKt !== null && iasKt !== undefined ? `${Math.round(iasKt)} KT` : "--"}
          />
          <StatCard
            label="True Airspeed"
            tooltip="True airspeed (TAS) — IAS corrected for pressure altitude and temperature; the aircraft's actual speed through the air mass."
            value={tasKt !== null && tasKt !== undefined ? `${Math.round(tasKt)} KT` : "--"}
          />
          <StatCard
            label="Wind"
            tooltip="Wind the avionics computed from the difference between true airspeed/heading and GPS ground speed/track. Shown as direction it blows from / speed."
            value={hasWind ? formatWind(windDirDeg, windSpeedKt) : "--"}
          />
          <StatCard
            label="Head / Crosswind"
            tooltip="Wind decomposed relative to your ground track: head (H) or tail (T) component, then crosswind magnitude with the side it blows from (L/R)."
            value={
              windComponents
                ? `${windComponents.headwindKt >= 0 ? "H" : "T"}${Math.round(
                    Math.abs(windComponents.headwindKt)
                  )} · ${windComponents.crosswindSide}${Math.round(windComponents.crosswindKt)} KT`
                : "--"
            }
          />
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 items-stretch">
        <StatCard
          label="Track Distance"
          value={pointCount > 1 ? `${formatDistance(totalDistanceNm, 1)} NM` : "0 NM"}
        />
        <StatCard
          label="Replay Duration"
          value={durationMs > 0 ? `${Math.round(durationMs / 60000)} min` : "0 min"}
        />
        <StatCard label="Track Points" value={pointCount.toString()} />
        <StatCard label="Current Point" value={pointCount > 0 ? (currentIndex + 1).toString() : "0"} />
      </div>
    </>
  );
}
