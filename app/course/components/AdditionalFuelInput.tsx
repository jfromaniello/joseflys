import { Tooltip } from "@/app/components/Tooltip";

interface AdditionalFuelInputProps {
  additionalFuel: string;
  setAdditionalFuel: (value: string) => void;
  approachLandingFuel?: string;
  setApproachLandingFuel?: (value: string) => void;
  hasDescentData?: boolean;
}

export function AdditionalFuelInput({
  additionalFuel,
  setAdditionalFuel,
  approachLandingFuel,
  setApproachLandingFuel,
  hasDescentData,
}: AdditionalFuelInputProps) {
  // Check if section is empty for print
  const isEmpty = additionalFuel === '' && (!hasDescentData || approachLandingFuel === '');

  return (
    <div className={`additional-fuel ${isEmpty ? 'print:hidden' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: "oklch(0.65 0.15 230)" }}
        >
          Additional Fuel
        </h3>
        <Tooltip content="Optional: Add extra regulatory fuel reserves. Reserve Time is typically used for alternate legs. Approach & Landing Fuel is for final legs with descent data." />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem] gap-x-4 gap-y-4 lg:items-center print:grid-cols-[auto_1fr]">
        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          Reserve Time
          <Tooltip content="Additional fuel reserve in minutes. Typically used for regulatory reserves (e.g., 30 or 45 minutes), alternate fuel, or holding fuel." />
        </label>

        <div className="relative">
          <input
            type="number"
            value={additionalFuel}
            onChange={(e) => setAdditionalFuel(e.target.value)}
            className="w-full px-4 pr-14 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all text-lg bg-slate-900/50 border-2 text-white text-right border-gray-600 focus:ring-sky-500/50"
            placeholder="Optional"
            min="0"
            step="1"
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
            style={{ color: "white" }}
          >
            min
          </span>
        </div>

        {/* Show approach & landing fuel only if descent data exists */}
        {hasDescentData && approachLandingFuel !== undefined && setApproachLandingFuel ? (
          <>
            {/* Gap Column */}
            <div className="hidden lg:block print:hidden"></div>

            <label
              className="flex items-center text-sm font-medium mb-2 lg:mb-0"
              style={{ color: "oklch(0.72 0.015 240)" }}
            >
              APP & Landing Fuel
              <Tooltip content="Fuel consumed during approach and landing phases in gallons. This is added to the total fuel for final legs." />
            </label>

            <div className="relative">
              <input
                type="number"
                value={approachLandingFuel}
                onChange={(e) => setApproachLandingFuel(e.target.value)}
                className="w-full px-4 pr-14 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all text-lg bg-slate-900/50 border-2 text-white text-right border-gray-600 focus:ring-sky-500/50"
                placeholder="Optional"
                min="0"
                step="0.1"
              />
              <span
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                style={{ color: "white" }}
              >
                GAL
              </span>
            </div>
          </>
        ) : (
          // Fill remaining columns if no descent data (3 columns: gap + label + input)
          <div className="hidden lg:block lg:col-span-3 print:hidden"></div>
        )}
      </div>
    </div>
  );
}
