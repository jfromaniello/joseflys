import { Tooltip } from "@/app/components/Tooltip";
import { WaypointResult } from "@/lib/courseCalculations";
import { FuelUnit, getFuelResultUnit } from "@/lib/fuelConversion";
import { formatDistance, formatFuel, MAX_FUEL_PRECISION, MAX_DISTANCE_PRECISION } from "@/lib/formatters";

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
          Leg Timeline
        </h3>
        <Tooltip content="Time and fuel calculations for each checkpoint along your route. 'Leg' shows segment values from previous waypoint. 'Total' shows accumulated values from departure." />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            {/* Main header row */}
            <tr className="border-b border-gray-700">
              <th
                className="text-left py-2 px-4 text-xs font-semibold uppercase tracking-wide"
                style={{ color: "oklch(0.65 0.15 230)" }}
                rowSpan={2}
              >
                Checkpoint
              </th>
              <th
                className="text-center py-2 px-4 text-xs font-semibold uppercase tracking-wide border-l border-gray-700/50"
                style={{ color: "oklch(0.65 0.15 230)" }}
                colSpan={2}
              >
                Distance
              </th>
              <th
                className="text-center py-2 px-4 text-xs font-semibold uppercase tracking-wide border-l border-gray-700/50"
                style={{ color: "oklch(0.65 0.15 150)" }}
                colSpan={2}
              >
                Time
              </th>
              {showFuel && (
                <th
                  className="text-center py-2 px-4 text-xs font-semibold uppercase tracking-wide border-l border-gray-700/50"
                  style={{ color: "oklch(0.65 0.15 50)" }}
                  colSpan={2}
                >
                  Fuel
                </th>
              )}
            </tr>
            {/* Sub-header row */}
            <tr className="border-b border-gray-700">
              {/* Distance sub-headers */}
              <th
                className="text-right py-2 px-4 text-xs font-medium uppercase tracking-wide border-l border-gray-700/50"
                style={{ color: "oklch(0.55 0.15 230)" }}
              >
                Leg
              </th>
              <th
                className="text-right py-2 px-4 text-xs font-medium uppercase tracking-wide"
                style={{ color: "oklch(0.55 0.15 230)" }}
              >
                Total
              </th>
              {/* Time sub-headers */}
              <th
                className="text-right py-2 px-4 text-xs font-medium uppercase tracking-wide border-l border-gray-700/50"
                style={{ color: "oklch(0.55 0.15 150)" }}
              >
                Leg
              </th>
              <th
                className="text-right py-2 px-4 text-xs font-medium uppercase tracking-wide"
                style={{ color: "oklch(0.55 0.15 150)" }}
              >
                Total
              </th>
              {/* Fuel sub-headers */}
              {showFuel && (
                <>
                  <th
                    className="text-right py-2 px-4 text-xs font-medium uppercase tracking-wide border-l border-gray-700/50"
                    style={{ color: "oklch(0.55 0.15 50)" }}
                  >
                    Leg
                  </th>
                  <th
                    className="text-right py-2 px-4 text-xs font-medium uppercase tracking-wide"
                    style={{ color: "oklch(0.55 0.15 50)" }}
                  >
                    Total
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {waypointResults.map((waypoint, index) => (
              <tr
                key={index}
                className="border-b border-gray-700/50 hover:bg-slate-700/30 transition-colors"
              >
                {/* Checkpoint Name + ETA */}
                <td className="py-3 px-4">
                  <div className="flex flex-col">
                    <span className="font-medium" style={{ color: "white" }}>
                      {waypoint.name}
                    </span>
                    {showETA && waypoint.eta && (
                      <span
                        className="text-xs mt-0.5"
                        style={{ color: "oklch(0.55 0.15 150)" }}
                      >
                        {formatETA(waypoint.eta)}
                      </span>
                    )}
                  </div>
                </td>

                {/* Distance - Leg */}
                <td
                  className="py-3 px-4 text-right font-mono border-l border-gray-700/50"
                  style={{ color: "oklch(0.7 0.12 230)" }}
                  title={`${formatDistance(waypoint.distanceSinceLast, MAX_DISTANCE_PRECISION)} NM`}
                >
                  {formatDistance(waypoint.distanceSinceLast)} NM
                </td>
                {/* Distance - Total */}
                <td
                  className="py-3 px-4 text-right font-mono font-semibold"
                  style={{ color: "oklch(0.75 0.15 230)" }}
                  title={`${formatDistance(waypoint.distance, MAX_DISTANCE_PRECISION)} NM`}
                >
                  {formatDistance(waypoint.distance)} NM
                </td>

                {/* Time - Leg */}
                <td
                  className="py-3 px-4 text-right font-mono border-l border-gray-700/50"
                  style={{ color: "oklch(0.7 0.12 150)" }}
                >
                  {waypoint.timeSinceLast} min
                </td>
                {/* Time - Total */}
                <td
                  className="py-3 px-4 text-right font-mono font-semibold"
                  style={{ color: "oklch(0.75 0.15 150)" }}
                >
                  {waypoint.cumulativeTime} min
                </td>

                {/* Fuel - Leg */}
                {showFuel && (
                  <>
                    <td
                      className="py-3 px-4 text-right font-mono border-l border-gray-700/50"
                      style={{ color: "oklch(0.7 0.12 50)" }}
                      title={waypoint.fuelSinceLast !== undefined
                        ? formatFuel(waypoint.fuelSinceLast, getFuelResultUnit(fuelUnit), MAX_FUEL_PRECISION)
                        : undefined}
                    >
                      {waypoint.fuelSinceLast !== undefined
                        ? formatFuel(waypoint.fuelSinceLast, getFuelResultUnit(fuelUnit))
                        : "—"}
                    </td>
                    {/* Fuel - Total */}
                    <td
                      className="py-3 px-4 text-right font-mono font-semibold"
                      style={{ color: "oklch(0.75 0.15 50)" }}
                      title={waypoint.fuelUsed !== undefined
                        ? formatFuel(waypoint.fuelUsed, getFuelResultUnit(fuelUnit), MAX_FUEL_PRECISION)
                        : undefined}
                    >
                      {waypoint.fuelUsed !== undefined
                        ? formatFuel(waypoint.fuelUsed, getFuelResultUnit(fuelUnit))
                        : "—"}
                    </td>
                  </>
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
          <span className="font-semibold">Leg:</span> Distance, time, and fuel from the previous waypoint.{" "}
          <span className="font-semibold">Total:</span> Accumulated values from departure including elapsed time and fuel from previous legs.
        </p>
      </div>
    </div>
  );
}
