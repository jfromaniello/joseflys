import { Tooltip } from "@/app/components/Tooltip";

interface CourseInputProps {
  trueHeading: string;
  setTrueHeading: (value: string) => void;
}

export function CourseInput({
  trueHeading,
  setTrueHeading,
}: CourseInputProps) {
  return (
    <div className="course-input">
      <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
        Course
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem] gap-x-4 gap-y-4 lg:items-center">
        {/* True Heading Label */}
        <label
          className="flex items-center text-sm font-medium mb-2 lg:mb-0"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          True Heading
          <Tooltip content="Direction you intend to fly during climb (true heading, 0-360°)" />
        </label>

        {/* True Heading Input */}
        <div className="relative">
          <input
            type="number"
            value={trueHeading}
            onChange={(e) => setTrueHeading(e.target.value)}
            className="w-full px-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white text-right"
            placeholder="090"
            min="0"
            max="360"
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
            style={{ color: "white" }}
          >
            °
          </span>
        </div>

        {/* Empty remaining columns */}
        <div className="hidden lg:block lg:col-span-3"></div>
      </div>
    </div>
  );
}
