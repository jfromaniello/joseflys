import { Tooltip } from "@/app/components/Tooltip";
import { FuelUnit } from "@/lib/fuelConversion";

export type { FuelUnit };

interface RangeFuelInputsProps {
  distance: string;
  setDistance: (value: string) => void;
  fuelFlow: string;
  setFuelFlow: (value: string) => void;
  fuelUnit: FuelUnit;
  setFuelUnit: (unit: FuelUnit) => void;
  onWaypointsClick?: () => void;
  waypointsCount?: number;
}

export function RangeFuelInputs({
  distance,
  setDistance,
  fuelFlow,
  setFuelFlow,
  fuelUnit,
  setFuelUnit,
  onWaypointsClick,
  waypointsCount = 0,
}: RangeFuelInputsProps) {
  return (
    <div className="range-fuel-inputs">
      <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
        Range & Fuel
      </h3>

      {/* First Row: Distance + Waypoints Button */}
      <div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem] gap-x-4 gap-y-4 lg:items-center mb-4">
        {/* Distance Label */}
        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0 lg:col-span-1 col-span-1"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          Distance
          <Tooltip content="Flight distance in nautical miles. When provided, this calculator will compute your Estimated Time of Arrival (ETA). Add Fuel Flow to also calculate total fuel consumption." />
        </label>

        {/* Distance Input */}
        <div className="relative lg:col-span-1 col-span-1">
          <input
            type="number"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className="w-full px-4 pr-11 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
            placeholder="Optional"
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
            style={{ color: "white" }}
          >
            NM
          </span>
        </div>

        {/* Gap */}
        <div className="hidden lg:block"></div>

        {/* Waypoints Label */}
        {onWaypointsClick && (
          <label
            className="flex items-center text-sm font-medium mb-2 lg:mb-0 lg:col-span-1 col-span-1 print-hide-waypoints"
            style={{ color: "oklch(0.72 0.015 240)" }}
          >
            Waypoints
            <Tooltip content="Define checkpoints along your route to track estimated times and fuel consumption at specific points. Perfect for VFR navigation planning!" />
          </label>
        )}

        {/* Waypoints Button */}
        {onWaypointsClick && (
          <button
            onClick={onWaypointsClick}
            className={`w-full px-4 py-3 rounded-xl transition-all text-base font-medium border-2 cursor-pointer print-hide-waypoints ${
              waypointsCount > 0
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                : "border-gray-600 bg-slate-900/50 hover:border-sky-500/50 hover:bg-sky-500/5"
            }`}
            style={
              waypointsCount === 0
                ? { color: "oklch(0.7 0.02 240)" }
                : undefined
            }
          >
            {waypointsCount > 0 ? (
              <div className="flex flex-col items-center">
                <span>✓ Waypoints Set</span>
                <span className="text-xs mt-0.5">{waypointsCount} waypoint{waypointsCount !== 1 ? 's' : ''}</span>
              </div>
            ) : (
              "Set Waypoints"
            )}
          </button>
        )}
      </div>

      {/* Second Row: Fuel Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-[10.5rem_6rem_5rem] gap-x-4 gap-y-4 lg:items-center">
        {/* Fuel Flow Label */}
        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0 lg:col-span-1 col-span-1"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          Fuel Flow
          <Tooltip content="Your aircraft's fuel consumption rate per hour. Select your preferred units. Find this in your POH or flight manual." />
        </label>

        {/* Container for input + selector on mobile */}
        <div className="grid grid-cols-[1fr_auto] gap-x-4 lg:contents">
          {/* Fuel Flow Input */}
          <input
            type="number"
            value={fuelFlow}
            onChange={(e) => setFuelFlow(e.target.value)}
            className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
            placeholder="Opt."
          />

          {/* Fuel Unit Selector */}
          <select
            value={fuelUnit}
            onChange={(e) => setFuelUnit(e.target.value as FuelUnit)}
            className="w-22 lg:w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white cursor-pointer appearance-none"
          >
            <option value="gph">GPH</option>
            <option value="lph">LPH</option>
            <option value="pph">PPH</option>
            <option value="kgh">KG/H</option>
          </select>
        </div>
      </div>
    </div>
  );
}
