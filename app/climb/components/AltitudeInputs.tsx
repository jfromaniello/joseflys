import { Tooltip } from "@/app/components/Tooltip";

interface AltitudeInputsProps {
  currentAlt: string;
  setCurrentAlt: (value: string) => void;
  targetAlt: string;
  setTargetAlt: (value: string) => void;
  densityAlt: string;
  setDensityAlt: (value: string) => void;
  onDACalculatorClick: () => void;
}

export function AltitudeInputs({
  currentAlt,
  setCurrentAlt,
  targetAlt,
  setTargetAlt,
  densityAlt,
  setDensityAlt,
  onDACalculatorClick,
}: AltitudeInputsProps) {
  return (
    <div className="altitude-inputs">
      <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
        Altitude & Atmospheric Conditions
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem] gap-x-4 gap-y-4 lg:items-center">
        {/* Row 1: Current Altitude (left) | Target Altitude (right) */}
        {/* Current Altitude Label */}
        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          Current Altitude
          <Tooltip content="Your current altitude (typically departure elevation) in feet MSL" />
        </label>

        {/* Current Altitude Input */}
        <div className="relative">
          <input
            type="number"
            value={currentAlt}
            onChange={(e) => setCurrentAlt(e.target.value)}
            className="w-full px-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white text-right"
            placeholder="2000"
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
            style={{ color: "white" }}
          >
            ft
          </span>
        </div>

        {/* Gap */}
        <div className="hidden lg:block"></div>

        {/* Target Altitude Label */}
        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          Target Altitude
          <Tooltip content="Your target cruise altitude in feet MSL" />
        </label>

        {/* Target Altitude Input */}
        <div className="relative">
          <input
            type="number"
            value={targetAlt}
            onChange={(e) => setTargetAlt(e.target.value)}
            className="w-full px-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white text-right"
            placeholder="6000"
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
            style={{ color: "white" }}
          >
            ft
          </span>
        </div>

        {/* Row 2: Density Altitude (left) | empty (right) */}
        {/* Density Altitude Label */}
        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          Density Altitude
          <Tooltip content="Density altitude at departure. Affects climb performance significantly." />
        </label>

        {/* Density Altitude Input with Calculator Button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              value={densityAlt}
              onChange={(e) => setDensityAlt(e.target.value)}
              className="w-full px-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white text-right"
              placeholder="3000"
            />
            <span
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
              style={{ color: "white" }}
            >
              ft
            </span>
          </div>
          <button
            onClick={onDACalculatorClick}
            className="px-3 py-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 transition-all cursor-pointer border border-sky-500/30 shrink-0"
            title="Calculate Density Altitude"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="oklch(0.8 0.15 230)"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>

        {/* Empty remaining columns in row 2 */}
        <div className="hidden lg:block lg:col-span-3"></div>
      </div>
    </div>
  );
}
