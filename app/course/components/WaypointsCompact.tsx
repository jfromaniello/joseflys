import { WaypointResult } from "@/lib/courseCalculations";
import { FuelUnit, getFuelResultUnit } from "@/lib/fuelConversion";
import { formatDistance, formatFuel } from "@/lib/formatters";

interface WaypointsCompactProps {
  waypointResults: WaypointResult[];
  fuelUnit: FuelUnit;
  showFuel: boolean;
}

export function WaypointsCompact({
  waypointResults,
  fuelUnit,
  showFuel,
}: WaypointsCompactProps) {
  if (waypointResults.length === 0) {
    return null;
  }

  const formatETA = (eta?: string): string => {
    if (!eta || eta.length !== 4) return "—";
    const hours = eta.substring(0, 2);
    const minutes = eta.substring(2, 4);
    return `${hours}:${minutes}`;
  };

  const formatValue = (leg: number | undefined, total: number, _decimals: number = 0): string => {
    if (leg === undefined) {
      return formatDistance(total);
    }
    return `${formatDistance(leg)} → ${formatDistance(total)}`;
  };

  return (
    <>
      {/* Mobile/Tablet: Compact stacked layout */}
      <div className="block lg:hidden space-y-3">
        {waypointResults.map((waypoint, index) => (
          <div
            key={index}
            className="py-2 px-3 rounded-lg bg-slate-900/30 hover:bg-slate-700/30 transition-colors border border-slate-700/40"
          >
            {/* Line 1: Name + Distance */}
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="font-semibold text-sm" style={{ color: "white" }}>
                {waypoint.name}
              </span>
              <span
                className="text-xs font-mono whitespace-nowrap"
                style={{ color: "oklch(0.7 0.12 230)" }}
              >
                {formatValue(waypoint.distanceSinceLast, waypoint.distance)} NM
              </span>
            </div>

            {/* Line 2: ETA + Time */}
            <div className="flex items-baseline justify-between gap-2">
              <span
                className="text-xs"
                style={{ color: "oklch(0.55 0.15 150)" }}
              >
                {waypoint.eta ? formatETA(waypoint.eta) : "—"}
              </span>
              <span
                className="text-xs font-mono whitespace-nowrap"
                style={{ color: "oklch(0.7 0.12 150)" }}
              >
                {formatValue(waypoint.timeSinceLast, waypoint.cumulativeTime, 0)} min
              </span>
            </div>

            {/* Line 3: Fuel (only if available and showFuel is true) */}
            {showFuel && waypoint.fuelUsed !== undefined && (
              <div className="flex items-baseline justify-end gap-2 mt-1">
                <span
                  className="text-xs font-mono whitespace-nowrap"
                  style={{ color: "oklch(0.7 0.12 50)" }}
                >
                  {waypoint.fuelSinceLast !== undefined
                    ? `${formatFuel(waypoint.fuelSinceLast, getFuelResultUnit(fuelUnit))} → ${formatFuel(waypoint.fuelUsed, getFuelResultUnit(fuelUnit))}`
                    : formatFuel(waypoint.fuelUsed, getFuelResultUnit(fuelUnit))}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: Table-like grid layout */}
      <div className="hidden lg:block">
        <div className="space-y-2">
          {waypointResults.map((waypoint, index) => (
            <div
              key={index}
              className={`grid gap-x-6 py-3 px-4 rounded-lg bg-slate-900/30 hover:bg-slate-700/30 transition-colors border border-slate-700/40 ${
                showFuel && waypoint.fuelUsed !== undefined
                  ? "grid-cols-[1fr_auto_auto_auto_auto_auto_auto]"
                  : "grid-cols-[1fr_auto_auto_auto_auto]"
              }`}
            >
              {/* Name and ETA */}
              <div className="flex flex-col justify-center">
                <div className="font-semibold text-sm" style={{ color: "white" }}>
                  {waypoint.name}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.15 150)" }}>
                  {formatETA(waypoint.eta)}
                </div>
              </div>

              {/* Distance Leg */}
              <div className="flex flex-col items-end">
                <div className="text-xs uppercase tracking-wide" style={{ color: "oklch(0.5 0.15 230)" }}>
                  Dist Leg
                </div>
                <div className="text-sm font-mono mt-0.5" style={{ color: "oklch(0.7 0.12 230)" }}>
                  {formatDistance(waypoint.distanceSinceLast)} NM
                </div>
              </div>

              {/* Distance Total */}
              <div className="flex flex-col items-end">
                <div className="text-xs uppercase tracking-wide" style={{ color: "oklch(0.5 0.15 230)" }}>
                  Dist Total
                </div>
                <div className="text-sm font-mono font-semibold mt-0.5" style={{ color: "oklch(0.75 0.15 230)" }}>
                  {formatDistance(waypoint.distance)} NM
                </div>
              </div>

              {/* Time Leg */}
              <div className="flex flex-col items-end">
                <div className="text-xs uppercase tracking-wide" style={{ color: "oklch(0.5 0.15 150)" }}>
                  Time Leg
                </div>
                <div className="text-sm font-mono mt-0.5" style={{ color: "oklch(0.7 0.12 150)" }}>
                  {waypoint.timeSinceLast} min
                </div>
              </div>

              {/* Time Total */}
              <div className="flex flex-col items-end">
                <div className="text-xs uppercase tracking-wide" style={{ color: "oklch(0.5 0.15 150)" }}>
                  Time Total
                </div>
                <div className="text-sm font-mono font-semibold mt-0.5" style={{ color: "oklch(0.75 0.15 150)" }}>
                  {waypoint.cumulativeTime} min
                </div>
              </div>

              {/* Fuel Leg (if available) */}
              {showFuel && waypoint.fuelUsed !== undefined && (
                <div className="flex flex-col items-end">
                  <div className="text-xs uppercase tracking-wide" style={{ color: "oklch(0.5 0.15 50)" }}>
                    Fuel Leg
                  </div>
                  <div className="text-sm font-mono mt-0.5" style={{ color: "oklch(0.7 0.12 50)" }}>
                    {waypoint.fuelSinceLast !== undefined
                      ? formatFuel(waypoint.fuelSinceLast, getFuelResultUnit(fuelUnit))
                      : "—"}
                  </div>
                </div>
              )}

              {/* Fuel Total (if available) */}
              {showFuel && waypoint.fuelUsed !== undefined && (
                <div className="flex flex-col items-end">
                  <div className="text-xs uppercase tracking-wide" style={{ color: "oklch(0.5 0.15 50)" }}>
                    Fuel Total
                  </div>
                  <div className="text-sm font-mono font-semibold mt-0.5" style={{ color: "oklch(0.75 0.15 50)" }}>
                    {formatFuel(waypoint.fuelUsed, getFuelResultUnit(fuelUnit))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
