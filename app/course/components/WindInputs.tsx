import { Tooltip } from "@/app/components/Tooltip";
import { parseDirection } from "@/lib/formatters";

interface WindInputsProps {
  windDir: string;
  setWindDir: (value: string) => void;
  windSpeed: string;
  setWindSpeed: (value: string) => void;
}

export function WindInputs({
  windDir,
  setWindDir,
  windSpeed,
  setWindSpeed,
}: WindInputsProps) {
  const handleWindDirBlur = () => {
    const formatted = parseDirection(windDir);
    if (formatted && formatted !== windDir) {
      setWindDir(formatted);
    }
  };

  // Check if wind fields have incomplete data
  const hasWindDir = windDir.trim() !== '';
  const hasWindSpeed = windSpeed.trim() !== '';
  const isWindIncomplete = (hasWindDir && !hasWindSpeed) || (!hasWindDir && hasWindSpeed);

  // Check if wind direction is invalid (> 360)
  const windDirNum = parseFloat(windDir);
  const isWindDirInvalid = !isNaN(windDirNum) && windDirNum > 360;

  return (
    <div className="wind-inputs">
      <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
        Wind
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem] gap-x-4 gap-y-4 lg:items-center print:grid-cols-[auto_1fr]">
        {/* Wind Direction Label */}
        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          Wind Direction
          <Tooltip content="Optional: The direction the wind is coming FROM in degrees (000°-360°). For example, 270° means wind from the west. Leave empty if no wind." />
        </label>

        {/* Wind Direction Input */}
        <div className="relative">
          <input
            type="text"
            value={windDir}
            onChange={(e) => {
              const value = e.target.value;
              // Allow empty or valid numbers
              if (value === '' || /^\d{0,3}$/.test(value)) {
                setWindDir(value);
              }
            }}
            onBlur={handleWindDirBlur}
            className={`w-full px-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 ${
              (isWindIncomplete && !hasWindDir) || isWindDirInvalid
                ? 'focus:ring-red-500/50 border-red-500'
                : 'focus:ring-sky-500/50 border-gray-600'
            } transition-all text-lg bg-slate-900/50 border-2 text-white text-right`}
            placeholder="Optional"
            maxLength={3}
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
            style={{ color: "white" }}
          >
            °
          </span>
        </div>

        {/* Gap */}
        <div className="hidden lg:block print:hidden"></div>

        {/* Wind Speed Label */}
        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          Wind Speed
          <Tooltip content="Optional: The wind speed in KT (knots). Leave empty if no wind." />
        </label>

        {/* Wind Speed Input */}
        <div className="relative">
          <input
            type="number"
            value={windSpeed}
            onChange={(e) => setWindSpeed(e.target.value)}
            className={`w-full px-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 ${
              isWindIncomplete && !hasWindSpeed
                ? 'focus:ring-red-500/50 border-red-500'
                : 'focus:ring-sky-500/50 border-gray-600'
            } transition-all text-lg bg-slate-900/50 border-2 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right`}
            placeholder="Optional"
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
  );
}
