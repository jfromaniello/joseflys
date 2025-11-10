import { Tooltip } from "@/app/components/Tooltip";
import { SpeedUnit, getSpeedUnitLabel } from "@/lib/speedConversion";

export type { SpeedUnit };

interface CourseSpeedInputsProps {
  trueHeading: string;
  setTrueHeading: (value: string) => void;
  tas: string;
  setTas: (value: string) => void;
  speedUnit: SpeedUnit;
  setSpeedUnit: (unit: SpeedUnit) => void;
}

export function CourseSpeedInputs({
  trueHeading,
  setTrueHeading,
  tas,
  setTas,
  speedUnit,
  setSpeedUnit,
}: CourseSpeedInputsProps) {
  const handleHeadingBlur = () => {
    const num = parseFloat(trueHeading);
    if (!isNaN(num) && num >= 0 && num <= 360) {
      setTrueHeading(String(Math.round(num)).padStart(3, '0'));
    }
  };

  const headingNum = parseFloat(trueHeading);
  const isHeadingInvalid = !isNaN(headingNum) && headingNum > 360;

  return (
    <div className="course-speed-inputs">
      <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
        Course & Speed
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_6rem_5rem] gap-x-4 gap-y-4 lg:items-center print:grid-cols-[auto_1fr]">
        {/* True Heading Label */}
        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          True Heading
          <Tooltip content="Your desired track or course over the ground in true degrees (000-360). This is the direction you want to fly, not accounting for wind drift." />
        </label>

        {/* True Heading Input */}
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
            className={`w-full px-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 ${
              isHeadingInvalid
                ? 'focus:ring-red-500/50 border-red-500'
                : 'focus:ring-sky-500/50 border-gray-600'
            } transition-all text-lg bg-slate-900/50 border-2 text-white text-right`}
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

        {/* Gap */}
        <div className="hidden lg:block print:hidden"></div>

        {/* True Airspeed Label */}
        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          True Airspeed
          <Tooltip content="Your aircraft's actual speed through the air mass. Corrected for Pressure Altitude and Outside Indicated Air Temperature. Use the TAS Calculator if you only have CAS. Select your preferred units." />
        </label>

        {/* Container for input + selector on mobile */}
        <div className="grid grid-cols-[1fr_auto] gap-x-4 lg:contents print:grid">
          {/* True Airspeed Input */}
          <input
            type="number"
            value={tas}
            onChange={(e) => setTas(e.target.value)}
            className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
            placeholder="100"
          />

          {/* Speed Unit Selector */}
          <select
            value={speedUnit}
            onChange={(e) => setSpeedUnit(e.target.value as SpeedUnit)}
            className="w-[5.5rem] lg:w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white cursor-pointer appearance-none"
            style={{
              backgroundImage: 'none',
            }}
          >
            <option value="kt">KT</option>
            <option value="kmh">km/h</option>
            <option value="mph">mph</option>
          </select>
        </div>
      </div>
    </div>
  );
}
