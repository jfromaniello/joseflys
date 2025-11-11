import { Tooltip } from "@/app/components/Tooltip";

interface AdditionalFuelInputProps {
  additionalFuel: string;
  setAdditionalFuel: (value: string) => void;
}

export function AdditionalFuelInput({
  additionalFuel,
  setAdditionalFuel,
}: AdditionalFuelInputProps) {
  // Check if section is empty for print
  const isEmpty = additionalFuel === '';

  return (
    <div className={`additional-fuel ${isEmpty ? 'print:hidden' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: "oklch(0.65 0.15 230)" }}
        >
          Additional Fuel
        </h3>
        <Tooltip content="Optional: Add extra regulatory fuel reserve in minutes (e.g., 30 min for holding, alternate, etc.). This will be added to total fuel: Additional Minutes × Fuel Flow." />
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

        {/* Fill remaining columns (3 columns: gap + label + input) */}
        <div className="hidden lg:block lg:col-span-3 print:hidden"></div>
      </div>
    </div>
  );
}
