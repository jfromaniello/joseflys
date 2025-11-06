import { Tooltip } from "@/app/components/Tooltip";

interface CourseSpeedInputsProps {
  trueHeading: string;
  setTrueHeading: (value: string) => void;
  tas: string;
  setTas: (value: string) => void;
}

export function CourseSpeedInputs({
  trueHeading,
  setTrueHeading,
  tas,
  setTas,
}: CourseSpeedInputsProps) {
  const handleHeadingBlur = () => {
    const num = parseFloat(trueHeading);
    if (!isNaN(num) && num >= 0 && num <= 360) {
      setTrueHeading(String(Math.round(num)).padStart(3, '0'));
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
        Course & Speed
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* True Heading */}
        <div>
          <label
            className="flex items-center text-sm font-medium mb-2"
            style={{ color: "oklch(0.72 0.015 240)" }}
          >
            True Heading
            <Tooltip content="Your desired track or course over the ground in true degrees (000-360). This is the direction you want to fly, not accounting for wind drift." />
          </label>
          <div className="relative">
            <input
              type="text"
              value={trueHeading}
              onChange={(e) => {
                const value = e.target.value;
                // Allow empty or valid numbers
                if (value === '' || /^\d{0,3}$/.test(value)) {
                  setTrueHeading(value);
                }
              }}
              onBlur={handleHeadingBlur}
              className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white"
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
        </div>

        {/* True Airspeed */}
        <div>
          <label
            className="flex items-center text-sm font-medium mb-2"
            style={{ color: "oklch(0.72 0.015 240)" }}
          >
            True Airspeed
            <Tooltip content="Your aircraft's actual speed through the air mass in knots. Use the TAS Calculator if you only have CAS, OAT, and altitude." />
          </label>
          <div className="relative">
            <input
              type="number"
              value={tas}
              onChange={(e) => setTas(e.target.value)}
              className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white"
              placeholder="100"
            />
            <span
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
              style={{ color: "white" }}
            >
              kt
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
