import { Tooltip } from "@/app/components/Tooltip";
import { WaypointResult } from "@/lib/courseCalculations";
import { FuelUnit, getFuelResultUnit } from "@/lib/fuelConversion";

interface WaypointsResultsProps {
  waypointResults: WaypointResult[];
  fuelUnit: FuelUnit;
  showFuel: boolean;
  showETA: boolean;
}

export function WaypointsResults({
  waypointResults,
  fuelUnit,
  showFuel,
  showETA,
}: WaypointsResultsProps) {
  if (waypointResults.length === 0) {
    return null;
  }

  const formatETA = (eta?: string): string => {
    if (!eta || eta.length !== 4) return "—";
    const hours = eta.substring(0, 2);
    const minutes = eta.substring(2, 4);
    return `${hours}:${minutes}`;
  };

  return (
    <div className="print-page-break-before">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
          Flight Checkpoints
        </h3>
        <Tooltip content="Time and fuel calculations for each checkpoint along your route. Times are shown in whole minutes. ETA is displayed when departure time is set." />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th
                className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide"
                style={{ color: "oklch(0.65 0.15 230)" }}
              >
                Checkpoint
              </th>
              <th
                className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wide"
                style={{ color: "oklch(0.65 0.15 230)" }}
              >
                Distance
              </th>
              <th
                className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wide"
                style={{ color: "oklch(0.65 0.15 230)" }}
              >
                Leg Time
              </th>
              <th
                className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wide"
                style={{ color: "oklch(0.65 0.15 230)" }}
              >
                Total Time
              </th>
              {showETA && (
                <th
                  className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "oklch(0.65 0.15 230)" }}
                >
                  ETA
                </th>
              )}
              {showFuel && (
                <th
                  className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "oklch(0.65 0.15 230)" }}
                >
                  Fuel Used
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {waypointResults.map((waypoint, index) => (
              <tr
                key={index}
                className="border-b border-gray-700/50 hover:bg-slate-700/30 transition-colors"
              >
                <td
                  className="py-3 px-4 font-medium"
                  style={{ color: "white" }}
                >
                  {waypoint.name}
                </td>
                <td
                  className="py-3 px-4 text-right font-mono"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  {waypoint.distance.toFixed(1)} NM
                </td>
                <td
                  className="py-3 px-4 text-right font-mono"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  {waypoint.timeSinceLast} min
                </td>
                <td
                  className="py-3 px-4 text-right font-mono font-semibold"
                  style={{ color: "oklch(0.8 0.15 230)" }}
                >
                  {waypoint.cumulativeTime} min
                </td>
                {showETA && (
                  <td
                    className="py-3 px-4 text-right font-mono font-semibold"
                    style={{ color: "oklch(0.7 0.15 150)" }}
                  >
                    {formatETA(waypoint.eta)}
                  </td>
                )}
                {showFuel && (
                  <td
                    className="py-3 px-4 text-right font-mono font-semibold"
                    style={{ color: "oklch(0.7 0.15 150)" }}
                  >
                    {waypoint.fuelUsed !== undefined
                      ? `${waypoint.fuelUsed} ${getFuelResultUnit(fuelUnit)}`
                      : "—"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info Note */}
      <div className="mt-4 p-4 rounded-xl bg-slate-900/30 border border-gray-700">
        <p
          className="text-xs leading-relaxed"
          style={{ color: "oklch(0.6 0.02 240)" }}
        >
          <span className="font-semibold">Leg Time:</span> Minutes from previous waypoint or start.{" "}
          <span className="font-semibold">Total Time:</span> Cumulative minutes including elapsed time from previous legs.
          {showFuel && (
            <>
              {" "}<span className="font-semibold">Fuel Used:</span> Cumulative fuel consumption to this waypoint.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
