import { Tooltip } from "@/app/components/Tooltip";
import { CourseCalculations } from "@/lib/courseCalculations";
import { DeviationEntry } from "@/app/components/CompassDeviationModal";
import { ShareButton } from "@/app/components/ShareButton";
import { SpeedUnit } from "./CourseSpeedInputs";
import { FuelUnit } from "./RangeFuelInputs";
import { getSpeedUnitLabel } from "@/lib/speedConversion";
import { getFuelResultUnit } from "@/lib/fuelConversion";

interface PrimaryResultsProps {
  results: CourseCalculations;
  compassCourse: number | null;
  deviationTable: DeviationEntry[];
  windDir: string;
  windSpeed: string;
  trueHeading: string;
  speedUnit: SpeedUnit;
  fuelUnit: FuelUnit;
  departureTime?: string;
  elapsedMinutes?: number;
}

export function PrimaryResults({
  results,
  compassCourse,
  deviationTable,
  windDir,
  windSpeed,
  trueHeading,
  speedUnit,
  fuelUnit,
  departureTime,
  elapsedMinutes,
}: PrimaryResultsProps) {
  // Calculate actual ETA if departure time is provided
  const calculateETA = (): string | undefined => {
    if (!departureTime || departureTime.length !== 4 || results.eta === undefined) {
      return undefined;
    }

    const hours = parseInt(departureTime.substring(0, 2), 10);
    const minutes = parseInt(departureTime.substring(2, 4), 10);
    const totalMinutesFromDeparture = hours * 60 + minutes;

    // Add elapsed minutes from previous legs
    const elapsedMins = elapsedMinutes || 0;

    // Add this leg's time in minutes
    const legMinutes = Math.round(results.eta * 60);

    const etaMinutes = totalMinutesFromDeparture + elapsedMins + legMinutes;
    const etaHours = Math.floor(etaMinutes / 60) % 24;
    const etaMins = etaMinutes % 60;

    return `${String(etaHours).padStart(2, '0')}:${String(etaMins).padStart(2, '0')}`;
  };

  // Calculate total fuel including elapsed time
  const calculateTotalFuel = (): number | undefined => {
    if (results.fuelUsed === undefined) {
      return undefined;
    }

    // results.fuelUsed already includes elapsed time in the calculation
    // because it's calculated from total cumulative time
    return results.fuelUsed;
  };

  const etaDisplay = calculateETA();
  const totalFuel = calculateTotalFuel();

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
        Results
      </h3>

      <div className="space-y-4">
        {/* Primary Results - Ground Speed and Compass Course */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 primary-results-grid">
          {/* Ground Speed */}
          <div className="p-6 rounded-xl text-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
            <div className="flex items-center justify-center mb-2">
              <p
                className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                style={{ color: "oklch(0.65 0.15 230)" }}
              >
                Ground Speed
              </p>
              <Tooltip content="Ground Speed (GS) is your actual speed over the ground, accounting for wind. This is what determines your actual time en route. When WCA > 10°, GS is calculated using ETAS for improved accuracy." />
            </div>
            <p
              className="text-3xl sm:text-4xl font-bold"
              style={{ color: "white" }}
            >
              {Math.round(results.groundSpeed)}
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: "oklch(0.6 0.02 240)" }}
            >
              {getSpeedUnitLabel(speedUnit)}
            </p>
          </div>

          {/* Compass Course */}
          <div className="p-6 rounded-xl text-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
            <div className="flex items-center justify-center mb-2">
              <p
                className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                style={{ color: "oklch(0.65 0.15 230)" }}
              >
                Compass Course
              </p>
              <Tooltip content="The actual heading to fly on your aircraft's compass. If you have a deviation table set, this is corrected for compass deviation. Otherwise, this equals your magnetic heading." />
            </div>
            <p
              className="text-3xl sm:text-4xl font-bold"
              style={{ color: "white" }}
            >
              {compassCourse !== null ? `${String(Math.round(compassCourse)).padStart(3, '0')}°` : "—"}
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: "oklch(0.6 0.02 240)" }}
            >
              {compassCourse !== null && deviationTable.length > 0
                ? "Calculated using your deviation table"
                : "set deviation table"}
            </p>
          </div>
        </div>

        {/* ETA and Fuel Results - always shown, active when inputs provided */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 primary-results-grid">
          {/* ETA */}
          <div className={`p-6 rounded-xl text-center ${results.eta !== undefined ? 'bg-linear-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/30' : 'bg-slate-900/30 border-gray-700'} border`}>
            <div className="flex items-center justify-center mb-2">
              <p
                className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                style={{ color: results.eta !== undefined ? "oklch(0.7 0.15 150)" : "oklch(0.45 0.02 240)" }}
              >
                ETA
              </p>
              <Tooltip content="Estimated Time of Arrival. When departure time is set, shows actual arrival time (HHMM format). Without departure time, shows flight duration in hours and minutes. Includes elapsed time from previous legs." />
            </div>
            <p
              className="text-3xl sm:text-4xl font-bold"
              style={{ color: results.eta !== undefined ? "white" : "oklch(0.35 0.02 240)" }}
            >
              {etaDisplay
                ? etaDisplay
                : results.eta !== undefined
                ? `${Math.floor(results.eta)}:${String(Math.round((results.eta % 1) * 60)).padStart(2, '0')}`
                : '—'}
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: "oklch(0.45 0.02 240)" }}
            >
              {etaDisplay ? '24h time' : results.eta !== undefined ? 'hours' : 'enter distance'}
            </p>
          </div>

          {/* Fuel Used */}
          <div className={`p-6 rounded-xl text-center ${totalFuel !== undefined ? 'bg-linear-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/30' : 'bg-slate-900/30 border-gray-700'} border`}>
            <div className="flex items-center justify-center mb-2">
              <p
                className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                style={{ color: totalFuel !== undefined ? "oklch(0.7 0.15 150)" : "oklch(0.45 0.02 240)" }}
              >
                Total Fuel Used
              </p>
              <Tooltip content="Total cumulative fuel consumption including this leg and any previous legs (based on elapsed time). Units match your fuel flow input. Always add reserves as required by regulations! Requires Distance and Fuel Flow inputs." />
            </div>
            <p
              className="text-3xl sm:text-4xl font-bold"
              style={{ color: totalFuel !== undefined ? "white" : "oklch(0.35 0.02 240)" }}
            >
              {totalFuel !== undefined ? Math.round(totalFuel) : '—'}
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: "oklch(0.45 0.02 240)" }}
            >
              {totalFuel !== undefined ? getFuelResultUnit(fuelUnit) : 'enter dist & FF'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
