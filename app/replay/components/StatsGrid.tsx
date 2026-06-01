import { formatCourse, formatDistance, formatVerticalSpeed } from "@/lib/formatters";
import { StatCard } from "./StatCard";

interface StatsGridProps {
  speedKnots: number | null;
  altitudeFt: number | null;
  verticalSpeedFpm: number | null;
  trackDeg: number | null;
  totalDistanceNm: number;
  durationMs: number;
  pointCount: number;
  currentIndex: number;
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
}: StatsGridProps) {
  return (
    <>
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 items-stretch">
        <StatCard
          label="Speed"
          tooltip="Computed from 3D distance between adjacent GPX points divided by their timestamp delta. Close to ground speed — without wind or aircraft anemometer data it is impossible to derive TAS or other speeds that would be more useful."
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
