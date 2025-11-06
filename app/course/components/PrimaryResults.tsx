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
  ogImageUrl?: string;
  speedUnit: SpeedUnit;
  fuelUnit: FuelUnit;
}

export function PrimaryResults({
  results,
  compassCourse,
  deviationTable,
  windDir,
  windSpeed,
  trueHeading,
  ogImageUrl,
  speedUnit,
  fuelUnit,
}: PrimaryResultsProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
        Results
      </h3>

      <div className="space-y-4">
        {/* Primary Results - Ground Speed and Compass Course */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* ETA */}
          <div className={`p-6 rounded-xl text-center ${results.eta !== undefined ? 'bg-linear-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/30' : 'bg-slate-900/30 border-gray-700'} border`}>
            <div className="flex items-center justify-center mb-2">
              <p
                className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                style={{ color: results.eta !== undefined ? "oklch(0.7 0.15 150)" : "oklch(0.45 0.02 240)" }}
              >
                ETA
              </p>
              <Tooltip content="Estimated Time of Arrival based on your ground speed and distance. Displayed in hours and minutes format (e.g., 1:30 means 1 hour and 30 minutes). Accounts for wind effects on your ground speed. Requires Distance input." />
            </div>
            <p
              className="text-3xl sm:text-4xl font-bold"
              style={{ color: results.eta !== undefined ? "white" : "oklch(0.35 0.02 240)" }}
            >
              {results.eta !== undefined
                ? `${Math.floor(results.eta)}:${String(Math.round((results.eta % 1) * 60)).padStart(2, '0')}`
                : '—'}
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: "oklch(0.45 0.02 240)" }}
            >
              {results.eta !== undefined ? 'hours' : 'enter distance'}
            </p>
          </div>

          {/* Fuel Used */}
          <div className={`p-6 rounded-xl text-center ${results.fuelUsed !== undefined ? 'bg-linear-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/30' : 'bg-slate-900/30 border-gray-700'} border`}>
            <div className="flex items-center justify-center mb-2">
              <p
                className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                style={{ color: results.fuelUsed !== undefined ? "oklch(0.7 0.15 150)" : "oklch(0.45 0.02 240)" }}
              >
                Fuel Used
              </p>
              <Tooltip content="Estimated fuel consumption for this leg based on your fuel flow rate and flight time. Units match your fuel flow input (gallons, liters, kg, etc.). Always add reserves as required by regulations! Requires Distance and Fuel Flow inputs." />
            </div>
            <p
              className="text-3xl sm:text-4xl font-bold"
              style={{ color: results.fuelUsed !== undefined ? "white" : "oklch(0.35 0.02 240)" }}
            >
              {results.fuelUsed !== undefined ? Math.round(results.fuelUsed) : '—'}
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: "oklch(0.45 0.02 240)" }}
            >
              {results.fuelUsed !== undefined ? getFuelResultUnit(fuelUnit) : 'enter dist & FF'}
            </p>
          </div>
        </div>

        {/* Share Button */}
        <div className="pt-2">
          <ShareButton
            shareData={{
              title: "José's Course Calculator",
              text: `Wind: ${windDir}° at ${windSpeed} kt, Heading: ${trueHeading}° → GS: ${results?.groundSpeed.toFixed(1)} kt`,
              url: typeof window !== "undefined" ? window.location.href : "",
            }}
            ogImageUrl={ogImageUrl}
          />
        </div>
      </div>
    </div>
  );
}
