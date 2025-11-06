import { Tooltip } from "@/app/components/Tooltip";

interface RangeFuelInputsProps {
  distance: string;
  setDistance: (value: string) => void;
  fuelFlow: string;
  setFuelFlow: (value: string) => void;
}

export function RangeFuelInputs({
  distance,
  setDistance,
  fuelFlow,
  setFuelFlow,
}: RangeFuelInputsProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
        Range & Fuel
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem] gap-x-4 gap-y-4 lg:items-center">
        {/* Distance Label */}
        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          Distance
          <Tooltip content="Flight distance in nautical miles. When provided, this calculator will compute your Estimated Time of Arrival (ETA). Add Fuel Flow to also calculate total fuel consumption." />
        </label>

        {/* Distance Input */}
        <div className="relative">
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

        {/* Fuel Flow Label */}
        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          Fuel Flow
          <Tooltip content="Your aircraft's fuel consumption rate per hour (e.g., 8.5 gal/hr, 32 L/hr, or 24 kg/hr). The unit doesn't matter - fuel used will be in the same units. Find this in your POH or flight manual." />
        </label>

        {/* Fuel Flow Input */}
        <div className="relative">
          <input
            type="number"
            value={fuelFlow}
            onChange={(e) => setFuelFlow(e.target.value)}
            className="w-full px-4 pr-11 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
            placeholder="Optional"
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
            style={{ color: "white" }}
          >
            u/h
          </span>
        </div>
      </div>
    </div>
  );
}
