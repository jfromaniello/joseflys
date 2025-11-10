import { Tooltip } from "@/app/components/Tooltip";
import { CourseCalculations } from "@/lib/courseCalculations";
import { FuelUnit, getFuelResultUnit } from "@/lib/fuelConversion";

interface IntermediateResultsProps {
  results: CourseCalculations;
  fuelUnit: FuelUnit;
  fuelFlow?: number;
}

export function IntermediateResults({ results, fuelUnit, fuelFlow }: IntermediateResultsProps) {
  // Calculate leg-specific values (just for THIS leg, not including elapsed time)
  const legTimeMinutes = results.eta ? Math.round(results.eta * 60) : undefined;
  // Leg fuel is just fuelFlow * leg time (not total)
  const legFuel = fuelFlow !== undefined && results.eta !== undefined
    ? Math.round(fuelFlow * results.eta)
    : undefined;

  const hasClimbData = results.climbPhase !== undefined && results.cruisePhase !== undefined;

  return (
    <div className="print-page-break-before">
      <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
        Intermediate Values
      </h3>

      {/* Climb and Cruise Phase Breakdown (if climb data provided) */}
      {hasClimbData && (
        <div className="mb-4 p-4 rounded-lg bg-green-900/20 border border-green-500/30">
          <h4 className="text-xs font-semibold mb-3 uppercase tracking-wide text-center" style={{ color: "oklch(0.7 0.15 150)" }}>
            Flight Phase Breakdown
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {/* Climb Phase */}
            <div className="p-3 rounded-lg bg-slate-900/40 border border-gray-700">
              <p className="text-xs font-semibold mb-2 text-center" style={{ color: "oklch(0.7 0.15 150)" }}>
                CLIMB PHASE
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: "oklch(0.65 0.02 240)" }}>Distance:</span>
                  <span className="text-sm font-bold" style={{ color: "white" }}>
                    {results.climbPhase!.distance.toFixed(1)} NM
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: "oklch(0.65 0.02 240)" }}>GS:</span>
                  <span className="text-sm font-bold" style={{ color: "white" }}>
                    {Math.round(results.climbPhase!.groundSpeed)} KT
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: "oklch(0.65 0.02 240)" }}>Time:</span>
                  <span className="text-sm font-bold" style={{ color: "white" }}>
                    {Math.round(results.climbPhase!.time * 60)} min
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: "oklch(0.65 0.02 240)" }}>Fuel:</span>
                  <span className="text-sm font-bold" style={{ color: "white" }}>
                    {Math.round(results.climbPhase!.fuelUsed)} {getFuelResultUnit(fuelUnit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cruise Phase */}
            <div className="p-3 rounded-lg bg-slate-900/40 border border-gray-700">
              <p className="text-xs font-semibold mb-2 text-center" style={{ color: "oklch(0.65 0.15 230)" }}>
                CRUISE PHASE
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: "oklch(0.65 0.02 240)" }}>Distance:</span>
                  <span className="text-sm font-bold" style={{ color: "white" }}>
                    {results.cruisePhase!.distance.toFixed(1)} NM
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: "oklch(0.65 0.02 240)" }}>GS:</span>
                  <span className="text-sm font-bold" style={{ color: "white" }}>
                    {Math.round(results.groundSpeed)} KT
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: "oklch(0.65 0.02 240)" }}>Time:</span>
                  <span className="text-sm font-bold" style={{ color: "white" }}>
                    {Math.round(results.cruisePhase!.time * 60)} min
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: "oklch(0.65 0.02 240)" }}>Fuel:</span>
                  <span className="text-sm font-bold" style={{ color: "white" }}>
                    {Math.round(results.cruisePhase!.fuelUsed)} {getFuelResultUnit(fuelUnit)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* First Row - WCA, MH, Crosswind, Tailwind */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        {/* Wind Correction Angle */}
        <div className="p-3 rounded-lg bg-slate-900/30 border border-gray-700">
          <div className="flex items-center justify-center mb-1">
            <p className="text-xs font-medium" style={{ color: "white" }}>
              WCA
            </p>
            <Tooltip content="Wind Correction Angle: The angle you need to adjust your heading to compensate for wind drift. Positive (+) means turn right, negative (-) means turn left from your true heading." />
          </div>
          <p className="text-xl font-bold text-center" style={{ color: "white" }}>
            {results.windCorrectionAngle >= 0 ? "+" : ""}
            {Math.round(results.windCorrectionAngle)}°
          </p>
        </div>

        {/* Magnetic Heading */}
        <div className="p-3 rounded-lg bg-slate-900/30 border border-gray-700">
          <div className="flex items-center justify-center mb-1">
            <p className="text-xs font-medium" style={{ color: "white" }}>
              MH
            </p>
            <Tooltip content="Magnetic Heading: The heading after applying wind correction angle and magnetic deviation. This is used to calculate the final Compass Course." />
          </div>
          <p className="text-xl font-bold text-center" style={{ color: "white" }}>
            {String(Math.round(results.compassHeading)).padStart(3, '0')}°
          </p>
        </div>

        {/* Crosswind */}
        <div className="p-3 rounded-lg bg-slate-900/30 border border-gray-700">
          <div className="flex items-center justify-center mb-1">
            <p className="text-xs font-medium" style={{ color: "white" }}>
              Crosswind
            </p>
            <Tooltip content="The component of wind blowing perpendicular to your flight path. 'From right' means wind from your right, 'from left' means wind from your left." />
          </div>
          <p className="text-xl font-bold text-center" style={{ color: "white" }}>
            {Math.round(Math.abs(results.crosswind))} KT
          </p>
          <p className="text-xs text-center mt-0.5" style={{ color: "oklch(0.7 0.02 240)" }}>
            {results.crosswind > 0 ? "from right" : results.crosswind < 0 ? "from left" : "none"}
          </p>
        </div>

        {/* Headwind/Tailwind */}
        <div className="p-3 rounded-lg bg-slate-900/30 border border-gray-700">
          <div className="flex items-center justify-center mb-1">
            <p className="text-xs font-medium" style={{ color: "white" }}>
              {results.headwind <= 0 ? "Headwind" : "Tailwind"}
            </p>
            <Tooltip content="The component of wind blowing along your flight path. Headwind slows you down, tailwind speeds you up. This directly affects your ground speed." />
          </div>
          <p className="text-xl font-bold text-center" style={{ color: "white" }}>
            {Math.round(Math.abs(results.headwind))} KT
          </p>
        </div>
      </div>

      {/* Second Row - Leg Time, Leg Fuel, ETAS */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Leg Time */}
        <div className={`p-3 rounded-lg ${legTimeMinutes !== undefined ? 'bg-slate-900/30 border-gray-700' : 'bg-slate-900/20 border-gray-800'} border`}>
          <div className="flex items-center justify-center mb-1">
            <p className="text-xs font-medium" style={{ color: legTimeMinutes !== undefined ? "white" : "oklch(0.4 0.02 240)" }}>
              Leg Time
            </p>
            <Tooltip content="Flight time for this leg only (not including elapsed time from previous legs). Shown in minutes." />
          </div>
          <p className="text-xl font-bold text-center" style={{ color: legTimeMinutes !== undefined ? "white" : "oklch(0.35 0.02 240)" }}>
            {legTimeMinutes !== undefined ? `${legTimeMinutes} min` : '—'}
          </p>
        </div>

        {/* Leg Fuel */}
        <div className={`p-3 rounded-lg ${legFuel !== undefined ? 'bg-slate-900/30 border-gray-700' : 'bg-slate-900/20 border-gray-800'} border`}>
          <div className="flex items-center justify-center mb-1">
            <p className="text-xs font-medium" style={{ color: legFuel !== undefined ? "white" : "oklch(0.4 0.02 240)" }}>
              Leg Fuel
            </p>
            <Tooltip content="Fuel consumption for this leg only (not including previous legs). Based on fuel flow and leg time." />
          </div>
          <p className="text-xl font-bold text-center" style={{ color: legFuel !== undefined ? "white" : "oklch(0.35 0.02 240)" }}>
            {legFuel !== undefined ? `${legFuel} ${getFuelResultUnit(fuelUnit)}` : '—'}
          </p>
        </div>

        {/* ETAS */}
        <div className={`p-3 rounded-lg ${results.etas ? 'bg-slate-900/30 border-amber-500/30' : 'bg-slate-900/20 border-gray-800'} border`}>
          <div className="flex items-center justify-center mb-1">
            <p className="text-xs font-medium" style={{ color: results.etas ? "oklch(0.65 0.15 60)" : "oklch(0.4 0.02 240)" }}>
              ETAS
            </p>
            <Tooltip content="Effective True Air Speed - Your actual effective forward speed when flying at a large crab angle. ETAS = TAS × cos(WCA). Only calculated when wind correction angle exceeds 10°." />
          </div>
          <p className="text-xl font-bold text-center" style={{ color: results.etas ? "white" : "oklch(0.35 0.02 240)" }}>
            {results.etas ? `${Math.round(results.etas)} KT` : '—'}
          </p>
          <p className="text-xs text-center mt-0.5" style={{ color: "oklch(0.4 0.02 240)" }}>
            {results.etas ? 'WCA > 10°' : 'WCA ≤ 10°'}
          </p>
        </div>
      </div>
    </div>
  );
}
