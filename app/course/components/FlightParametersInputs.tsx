import { Tooltip } from "@/app/components/Tooltip";
import { getFuelResultUnit, FuelUnit } from "@/lib/fuelConversion";

interface FlightParametersInputsProps {
  departureTime: string;
  setDepartureTime: (value: string) => void;
  elapsedMinutes: string;
  setElapsedMinutes: (value: string) => void;
  previousFuelUsed: string;
  setPreviousFuelUsed: (value: string) => void;
  fuelUnit: FuelUnit;
}

export function FlightParametersInputs({
  departureTime,
  setDepartureTime,
  elapsedMinutes,
  setElapsedMinutes,
  previousFuelUsed,
  setPreviousFuelUsed,
  fuelUnit,
}: FlightParametersInputsProps) {
  const handleDepartureTimeChange = (value: string) => {
    // Allow only digits and limit to 4 characters
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    setDepartureTime(cleaned);
  };

  const formatDepartureTime = (value: string): string => {
    if (value.length === 0) return "";
    // Pad with zeros on the left if less than 4 digits
    return value.padStart(4, '0');
  };

  const handleDepartureTimeBlur = () => {
    if (departureTime.length > 0 && departureTime.length < 4) {
      setDepartureTime(formatDepartureTime(departureTime));
    }

    // Validate time
    if (departureTime.length === 4) {
      const hours = parseInt(departureTime.substring(0, 2), 10);
      const minutes = parseInt(departureTime.substring(2, 4), 10);

      if (hours > 23 || minutes > 59) {
        // Reset to valid time
        setDepartureTime("");
      }
    }
  };

  const isTimeValid = (): boolean => {
    if (departureTime.length === 0) return true;
    if (departureTime.length !== 4) return false;

    const hours = parseInt(departureTime.substring(0, 2), 10);
    const minutes = parseInt(departureTime.substring(2, 4), 10);

    return hours <= 23 && minutes <= 59;
  };

  return (
    <div className="flight-params-inputs">
      <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
        Flight Timeline
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem] gap-x-4 gap-y-4 lg:items-center">
        {/* Row 1: Departure Time and Elapsed Minutes */}

        {/* Departure Time Label */}
        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0 lg:col-span-1 col-span-1"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          Departure Time
          <Tooltip content="Enter departure time in 24-hour format (HHMM) without colon. Example: 1430 for 2:30 PM. This will calculate ETA times for waypoints and destination." />
        </label>

        {/* Departure Time Input */}
        <div className="relative lg:col-span-1 col-span-1">
          <input
            type="text"
            value={departureTime}
            onChange={(e) => handleDepartureTimeChange(e.target.value)}
            onBlur={handleDepartureTimeBlur}
            className={`w-full px-4 pr-14 py-3 rounded-xl focus:outline-none focus:ring-2 ${
              !isTimeValid()
                ? 'focus:ring-red-500/50 border-red-500'
                : 'focus:ring-sky-500/50 border-gray-600'
            } transition-all text-lg bg-slate-900/50 border-2 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right font-mono`}
            placeholder="HHMM"
            maxLength={4}
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
            style={{ color: "white" }}
          >
            24H
          </span>
        </div>

        {/* Gap */}
        <div className="hidden lg:block"></div>

        {/* Elapsed Minutes Label */}
        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0 lg:col-span-1 col-span-1"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          Elapsed Time
          <Tooltip content="Minutes already flown before starting this leg. Use this for multi-leg flights to track cumulative flight time and fuel consumption. Leave empty if this is your first leg." />
        </label>

        {/* Elapsed Minutes Input */}
        <div className="relative lg:col-span-1 col-span-1">
          <input
            type="number"
            value={elapsedMinutes}
            onChange={(e) => setElapsedMinutes(e.target.value)}
            className="w-full px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
            placeholder="0"
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

        {/* Row 2: Previous Fuel Used (aligned with Departure Time) */}

        {/* Force line break before this field in print */}
        <div className="hidden lg:hidden print:block print:w-full print:h-0"></div>

        {/* Previous Fuel Used Label */}
        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0 lg:col-span-1 col-span-1"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          Previous Fuel Used
          <Tooltip content="Fuel already consumed in previous legs. If specified, this value will be added to the fuel consumed in this leg. Leave empty to calculate fuel from elapsed time." />
        </label>

        {/* Previous Fuel Used Input */}
        <div className="relative lg:col-span-1 col-span-1">
          <input
            type="number"
            value={previousFuelUsed}
            onChange={(e) => setPreviousFuelUsed(e.target.value)}
            className="w-full px-4 pr-16 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
            placeholder="0"
            min="0"
            step="any"
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
            style={{ color: "white" }}
          >
            {getFuelResultUnit(fuelUnit)}
          </span>
        </div>
      </div>
    </div>
  );
}
