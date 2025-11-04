import { Tooltip } from "@/app/components/Tooltip";

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
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
        Wind
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Wind Direction */}
        <div>
          <label
            className="flex items-center text-sm font-medium mb-2"
            style={{ color: "oklch(0.72 0.015 240)" }}
          >
            Wind Direction
            <Tooltip content="Optional: The direction the wind is coming FROM in degrees (0-360). For example, 270° means wind from the west. Leave empty if no wind." />
          </label>
          <div className="relative">
            <input
              type="number"
              value={windDir}
              onChange={(e) => setWindDir(e.target.value)}
              className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
              placeholder="Optional"
              min="0"
              max="360"
            />
            <span
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
              style={{ color: "oklch(0.55 0.02 240)" }}
            >
              °
            </span>
          </div>
        </div>

        {/* Wind Speed */}
        <div>
          <label
            className="flex items-center text-sm font-medium mb-2"
            style={{ color: "oklch(0.72 0.015 240)" }}
          >
            Wind Speed
            <Tooltip content="Optional: The wind speed in knots. Leave empty if no wind." />
          </label>
          <div className="relative">
            <input
              type="number"
              value={windSpeed}
              onChange={(e) => setWindSpeed(e.target.value)}
              className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
              placeholder="Optional"
            />
            <span
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
              style={{ color: "oklch(0.55 0.02 240)" }}
            >
              kt
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
