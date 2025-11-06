import { Tooltip } from "@/app/components/Tooltip";
import { WindCalculations } from "@/lib/windCalculations";

interface IntermediateResultsProps {
  results: WindCalculations;
}

export function IntermediateResults({ results }: IntermediateResultsProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
        Intermediate Values
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Wind Correction Angle */}
        <div className="p-3 rounded-lg bg-slate-900/30 border border-gray-700">
          <div className="flex items-center justify-center mb-1">
            <p className="text-xs font-medium" style={{ color: "oklch(0.55 0.02 240)" }}>
              WCA
            </p>
            <Tooltip content="Wind Correction Angle: The angle you need to adjust your heading to compensate for wind drift. Positive (+) means turn right, negative (-) means turn left from your true heading." />
          </div>
          <p className="text-xl font-bold text-center" style={{ color: "oklch(0.7 0.02 240)" }}>
            {results.windCorrectionAngle >= 0 ? "+" : ""}
            {Math.round(results.windCorrectionAngle)}°
          </p>
        </div>

        {/* Magnetic Heading */}
        <div className="p-3 rounded-lg bg-slate-900/30 border border-gray-700">
          <div className="flex items-center justify-center mb-1">
            <p className="text-xs font-medium" style={{ color: "oklch(0.55 0.02 240)" }}>
              MH
            </p>
            <Tooltip content="Magnetic Heading: The heading after applying wind correction angle and magnetic variation. This is used to calculate the final Compass Course." />
          </div>
          <p className="text-xl font-bold text-center" style={{ color: "oklch(0.7 0.02 240)" }}>
            {String(Math.round(results.compassHeading)).padStart(3, '0')}°
          </p>
        </div>

        {/* ETAS - only shown when active */}
        <div className={`p-3 rounded-lg ${results.etas ? 'bg-slate-900/30 border-amber-500/30' : 'bg-slate-900/20 border-gray-800'} border`}>
          <div className="flex items-center justify-center mb-1">
            <p className="text-xs font-medium" style={{ color: results.etas ? "oklch(0.65 0.15 60)" : "oklch(0.4 0.02 240)" }}>
              ETAS
            </p>
            <Tooltip content="Effective True Air Speed - Your actual effective forward speed when flying at a large crab angle. ETAS = TAS × cos(WCA). Only calculated when wind correction angle exceeds 10°." />
          </div>
          <p className="text-xl font-bold text-center" style={{ color: results.etas ? "oklch(0.7 0.02 240)" : "oklch(0.35 0.02 240)" }}>
            {results.etas ? `${Math.round(results.etas)} kt` : '—'}
          </p>
          <p className="text-xs text-center mt-0.5" style={{ color: "oklch(0.4 0.02 240)" }}>
            {results.etas ? 'WCA > 10°' : 'WCA ≤ 10°'}
          </p>
        </div>

        {/* Crosswind */}
        <div className="p-3 rounded-lg bg-slate-900/30 border border-gray-700">
          <div className="flex items-center justify-center mb-1">
            <p className="text-xs font-medium" style={{ color: "oklch(0.55 0.02 240)" }}>
              Crosswind
            </p>
            <Tooltip content="The component of wind blowing perpendicular to your flight path. 'From right' means wind from your right, 'from left' means wind from your left." />
          </div>
          <p className="text-xl font-bold text-center" style={{ color: "oklch(0.7 0.02 240)" }}>
            {Math.round(Math.abs(results.crosswind))} kt
          </p>
          <p className="text-xs text-center mt-0.5" style={{ color: "oklch(0.5 0.02 240)" }}>
            {results.crosswind > 0 ? "from right" : results.crosswind < 0 ? "from left" : "none"}
          </p>
        </div>

        {/* Headwind/Tailwind */}
        <div className="p-3 rounded-lg bg-slate-900/30 border border-gray-700">
          <div className="flex items-center justify-center mb-1">
            <p className="text-xs font-medium" style={{ color: "oklch(0.55 0.02 240)" }}>
              {results.headwind <= 0 ? "Headwind" : "Tailwind"}
            </p>
            <Tooltip content="The component of wind blowing along your flight path. Headwind slows you down, tailwind speeds you up. This directly affects your ground speed." />
          </div>
          <p className="text-xl font-bold text-center" style={{ color: "oklch(0.7 0.02 240)" }}>
            {Math.round(Math.abs(results.headwind))} kt
          </p>
        </div>
      </div>
    </div>
  );
}
