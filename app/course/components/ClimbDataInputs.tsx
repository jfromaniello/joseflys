import { Tooltip } from "@/app/components/Tooltip";
import { SpeedUnit } from "./CourseSpeedInputs";
import { FuelUnit } from "./RangeFuelInputs";
import { getSpeedUnitLabel } from "@/lib/speedConversion";
import { getFuelResultUnit } from "@/lib/fuelConversion";
import { parseDirection } from "@/lib/formatters";

interface ClimbDataInputsProps {
  climbTas: string;
  setClimbTas: (value: string) => void;
  climbDistance: string;
  setClimbDistance: (value: string) => void;
  climbFuelUsed: string;
  setClimbFuelUsed: (value: string) => void;
  climbWindDir: string;
  setClimbWindDir: (value: string) => void;
  climbWindSpeed: string;
  setClimbWindSpeed: (value: string) => void;
  speedUnit: SpeedUnit;
  fuelUnit: FuelUnit;
}

export function ClimbDataInputs({
  climbTas,
  setClimbTas,
  climbDistance,
  setClimbDistance,
  climbFuelUsed,
  setClimbFuelUsed,
  climbWindDir,
  setClimbWindDir,
  climbWindSpeed,
  setClimbWindSpeed,
  speedUnit,
  fuelUnit,
}: ClimbDataInputsProps) {
  // Get unit labels from conversion utilities
  const speedUnitLabel = getSpeedUnitLabel(speedUnit);
  const fuelUnitLabel = getFuelResultUnit(fuelUnit);

  // Check if any field has data
  const hasAnyData = climbTas !== '' || climbDistance !== '' || climbFuelUsed !== '';

  // Wind validation: if one wind field has data, both are required
  const hasWindData = climbWindDir !== '' || climbWindSpeed !== '';
  const isWindRequired = hasWindData;

  // Auto-format wind direction to 3 digits on blur
  const handleWindDirBlur = () => {
    const formatted = parseDirection(climbWindDir);
    if (formatted && formatted !== climbWindDir) {
      setClimbWindDir(formatted);
    }
  };

  // If any field has data, all become required
  const isRequired = hasAnyData;

  // Check if section is empty for print
  const isEmpty = climbTas === '' && climbDistance === '' && climbFuelUsed === '';

  // Handle paste detection for JSON data
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');

    // Try to parse as JSON
    try {
      const data = JSON.parse(pastedText);

      // Check if it has the expected climb data structure
      if (data.climbTas !== undefined && data.climbDistance !== undefined && data.climbFuel !== undefined) {
        e.preventDefault(); // Prevent default paste behavior

        // Fill all three fields
        setClimbTas(data.climbTas.toString());
        setClimbDistance(data.climbDistance.toString());
        setClimbFuelUsed(data.climbFuel.toString());
      }
    } catch {
      // Not JSON or invalid format, allow normal paste
      return;
    }
  };

  return (
    <div className={`climb-data ${isEmpty ? 'print:hidden' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: "oklch(0.65 0.15 230)" }}
        >
          Climb Data
        </h3>
        <Tooltip content="Optional: Enter climb phase data manually or paste from Climb Calculator into the first field." />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem] gap-x-4 gap-y-4 lg:items-center print:grid-cols-[auto_1fr]">
        {/* Row 1: Climb TAS and Climb Distance */}
        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          Climb TAS
          <Tooltip content="True Airspeed during the climb phase. Used to calculate ground speed and time spent climbing." />
        </label>

        <div className="relative">
          <input
            type="number"
            value={climbTas}
            onChange={(e) => setClimbTas(e.target.value)}
            onPaste={handlePaste}
            className={`w-full px-4 pr-14 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all text-lg bg-slate-900/50 border-2 text-white text-right ${
              isRequired && climbTas === ''
                ? 'border-red-500/70 focus:ring-red-500/50'
                : 'border-gray-600 focus:ring-sky-500/50'
            }`}
            placeholder={isRequired ? "Required" : "Optional"}
            min="0"
            step="1"
            required={isRequired}
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
            style={{ color: "white" }}
          >
            {speedUnitLabel}
          </span>
        </div>

        {/* Gap column */}
        <div className="hidden lg:block print:hidden"></div>

        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          Climb Distance
          <Tooltip content="Horizontal distance covered during the climb phase. This will be subtracted from the total leg distance to calculate cruise distance." />
        </label>

        <div className="relative">
          <input
            type="number"
            value={climbDistance}
            onChange={(e) => setClimbDistance(e.target.value)}
            className={`w-full px-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all text-lg bg-slate-900/50 border-2 text-white text-right ${
              isRequired && climbDistance === ''
                ? 'border-red-500/70 focus:ring-red-500/50'
                : 'border-gray-600 focus:ring-sky-500/50'
            }`}
            placeholder={isRequired ? "Required" : "Optional"}
            min="0"
            step="0.1"
            required={isRequired}
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
            style={{ color: "white" }}
          >
            NM
          </span>
        </div>

        {/* Row 2: Climb Fuel Used (below Climb TAS) */}

        {/* Force line break before this field in print */}
        <div className="hidden print:block print:w-full print:h-0"></div>

        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          Climb Fuel Used
          <Tooltip content="Total fuel consumed during the climb phase. This will be added to the leg's total fuel consumption." />
        </label>

        <div className="relative">
          <input
            type="number"
            value={climbFuelUsed}
            onChange={(e) => setClimbFuelUsed(e.target.value)}
            className={`w-full px-4 pr-14 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all text-lg bg-slate-900/50 border-2 text-white text-right ${
              isRequired && climbFuelUsed === ''
                ? 'border-red-500/70 focus:ring-red-500/50'
                : 'border-gray-600 focus:ring-sky-500/50'
            }`}
            placeholder={isRequired ? "Required" : "Optional"}
            min="0"
            step="0.1"
            required={isRequired}
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
            style={{ color: "white" }}
          >
            {fuelUnitLabel}
          </span>
        </div>

        {/* Gap column */}
        <div className="hidden lg:block print:hidden"></div>

        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          Climb Wind
          <Tooltip content="Optional: Wind during climb phase. If specified, overrides general wind for climb calculations. Both direction and speed must be provided." />
        </label>

        <div className="grid grid-cols-2 gap-x-2 lg:grid-cols-[5rem_6.5rem] print:flex print:gap-2">
          <div className="relative">
            <input
              type="text"
              value={climbWindDir}
              onChange={(e) => {
                const value = e.target.value;
                // Allow empty or valid numbers
                if (value === '' || /^\d{0,3}$/.test(value)) {
                  setClimbWindDir(value);
                }
              }}
              onBlur={handleWindDirBlur}
              className={`w-full px-3 pr-6 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all text-lg bg-slate-900/50 border-2 text-white text-right ${
                isWindRequired && climbWindDir === ''
                  ? 'border-red-500/70 focus:ring-red-500/50'
                  : 'border-gray-600 focus:ring-sky-500/50'
              }`}
              placeholder="000"
              maxLength={3}
            />
            <span
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
              style={{ color: "white" }}
            >
              °
            </span>
          </div>
          <div className="relative">
            <input
              type="number"
              value={climbWindSpeed}
              onChange={(e) => setClimbWindSpeed(e.target.value)}
              className={`w-full px-3 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all text-lg bg-slate-900/50 border-2 text-white text-right ${
                isWindRequired && climbWindSpeed === ''
                  ? 'border-red-500/70 focus:ring-red-500/50'
                  : 'border-gray-600 focus:ring-sky-500/50'
              }`}
              placeholder=""
              min="0"
              step="1"
            />
            <span
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
              style={{ color: "white" }}
            >
              KT
            </span>
          </div>
        </div>
      </div>

      {/* Validation warning for climb data */}
      {isRequired && (climbTas === '' || climbDistance === '' || climbFuelUsed === '') && (
        <div className="mt-3 p-3 rounded-lg bg-yellow-900/20 border border-yellow-500/30 print:hidden">
          <p className="text-xs" style={{ color: "oklch(0.75 0.15 85)" }}>
            <span className="font-semibold">⚠ All climb fields are required:</span> When you enter data in any climb field, all three fields (TAS, Distance, and Fuel) must be completed for accurate calculations.
          </p>
        </div>
      )}

      {/* Validation warning for climb wind */}
      {isWindRequired && (climbWindDir === '' || climbWindSpeed === '') && (
        <div className="mt-3 p-3 rounded-lg bg-yellow-900/20 border border-yellow-500/30 print:hidden">
          <p className="text-xs" style={{ color: "oklch(0.75 0.15 85)" }}>
            <span className="font-semibold">⚠ Both climb wind fields are required:</span> When you enter climb wind direction or speed, both fields must be completed.
          </p>
        </div>
      )}
    </div>
  );
}
