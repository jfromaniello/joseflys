import { Tooltip } from "@/app/components/Tooltip";
import { CourseCalculations } from "@/lib/courseCalculations";
import { FuelUnit, getFuelResultUnit } from "@/lib/fuelConversion";
import { formatCourse, formatAngle, formatCorrection } from "@/lib/formatters";

interface IntermediateResultsProps {
  results: CourseCalculations;
  fuelUnit: FuelUnit;
  fuelFlow?: number;
}

interface IntermediateResultsExtendedProps extends IntermediateResultsProps {
  trueCourse?: number;
  magVar?: number;
}

export function IntermediateResults({ results, fuelUnit, trueCourse, magVar }: IntermediateResultsExtendedProps) {
  // Calculate leg-specific values (just for THIS leg, not including elapsed time)
  const legTimeMinutes = results.eta ? Math.round(results.eta * 60) : undefined;
  // Use the pre-calculated leg fuel from results (includes all leg fuel components)
  const legFuel = results.legFuelUsed;

  const hasPhaseData = results.climbPhase !== undefined || results.descentPhase !== undefined;
  const hasClimbData = results.climbPhase !== undefined;
  const hasDescentData = results.descentPhase !== undefined;
  const hasCruiseData = results.cruisePhase !== undefined;

  // Determine grid columns based on phases present
  const phaseCount = (hasClimbData ? 1 : 0) + (hasCruiseData ? 1 : 0) + (hasDescentData ? 1 : 0);
  const gridCols = phaseCount === 3 ? 'grid-cols-3' : 'grid-cols-2';

  // Calculate compass deviation (difference between MH and CC)
  // Handle angle wrapping (e.g., if MH=359° and CC=001°, dev should be +2° not -358°)
  const calculateDeviation = (cc: number, mh: number): number => {
    let dev = cc - mh;
    // Normalize to -180 to +180 range
    if (dev > 180) dev -= 360;
    if (dev < -180) dev += 360;
    return dev;
  };

  const compassDeviation = results.hasDeviationTable
    ? calculateDeviation(results.compassCourse, results.magneticHeading)
    : 0;

  return (
    <div className="print-page-break-before">
      <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
        Intermediate Values
      </h3>

      {/* Course Calculation Flow Diagram */}
      <div className="mb-4 p-4 rounded-lg bg-slate-900/40 border border-sky-500/30">
        <h4 className="text-xs font-semibold mb-3 uppercase tracking-wide text-center" style={{ color: "oklch(0.65 0.15 230)" }}>
          Course Calculation Flow
        </h4>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center">
          {/* True Course */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="px-3 py-2 rounded bg-sky-500/20 border border-sky-500/50">
              <div className="text-[10px] font-medium mb-0.5" style={{ color: "oklch(0.65 0.15 230)" }}>TC</div>
              <div className="text-sm font-bold" style={{ color: "oklch(0.9 0.15 230)" }}>
                {trueCourse !== undefined ? formatCourse(trueCourse) : '—'}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-1">
              <div className="w-px h-8 bg-sky-400/40 sm:hidden"></div>
              <div className="h-px w-8 bg-sky-400/40 hidden sm:block"></div>
              <div className="text-xs font-medium text-left" style={{ color: "oklch(0.6 0.02 240)" }}>
                <div className="text-[9px] opacity-70">VAR</div>
                <div>{magVar !== undefined ? formatAngle(magVar, 1) : '—'}</div>
              </div>
              <span className="hidden sm:inline text-sky-400 text-lg">→</span>
              <span className="sm:hidden text-sky-400 text-lg">↓</span>
            </div>
          </div>

          {/* Magnetic Course */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="px-3 py-2 rounded bg-purple-500/20 border border-purple-500/50">
              <div className="text-[10px] font-medium mb-0.5" style={{ color: "oklch(0.65 0.15 300)" }}>MC</div>
              <div className="text-sm font-bold" style={{ color: "oklch(0.85 0.15 300)" }}>
                {formatCourse(results.magneticCourse)}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-1">
              <div className="w-px h-8 bg-sky-400/40 sm:hidden"></div>
              <div className="h-px w-8 bg-sky-400/40 hidden sm:block"></div>
              <div className="text-xs font-medium text-left" style={{ color: "oklch(0.6 0.02 240)" }}>
                <div className="text-[9px] opacity-70">WCA</div>
                <div>{formatCorrection(results.windCorrectionAngle, 0)}</div>
              </div>
              <span className="hidden sm:inline text-sky-400 text-lg">→</span>
              <span className="sm:hidden text-sky-400 text-lg">↓</span>
            </div>
          </div>

          {/* Magnetic Heading */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="px-3 py-2 rounded bg-amber-500/20 border border-amber-500/50">
              <div className="text-[10px] font-medium mb-0.5" style={{ color: "oklch(0.65 0.15 60)" }}>MH</div>
              <div className="text-sm font-bold" style={{ color: "oklch(0.85 0.15 60)" }}>
                {formatCourse(results.magneticHeading)}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-1">
              <div className="w-px h-8 bg-sky-400/40 sm:hidden"></div>
              <div className="h-px w-8 bg-sky-400/40 hidden sm:block"></div>
              <div className="text-xs font-medium text-left" style={{ color: "oklch(0.6 0.02 240)" }}>
                <div className="text-[9px] opacity-70">Dev</div>
                <div>{results.hasDeviationTable ? formatCorrection(compassDeviation, 0) : '0°'}</div>
              </div>
              <span className="hidden sm:inline text-sky-400 text-lg">→</span>
              <span className="sm:hidden text-sky-400 text-lg">↓</span>
            </div>
          </div>

          {/* Compass Course */}
          <div className="px-3 py-2 rounded bg-green-500/20 border border-green-500/50">
            <div className="text-[10px] font-medium mb-0.5" style={{ color: "oklch(0.65 0.15 150)" }}>CC</div>
            <div className="text-sm font-bold" style={{ color: "oklch(0.8 0.15 150)" }}>
              {formatCourse(results.compassCourse)}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs" style={{ color: "oklch(0.6 0.02 240)" }}>
            <div><span className="font-semibold" style={{ color: "oklch(0.8 0.15 230)" }}>TC:</span> True Course</div>
            <div><span className="font-semibold" style={{ color: "oklch(0.75 0.15 300)" }}>MC:</span> Magnetic Course</div>
            <div>
              <span className="font-semibold" style={{ color: "oklch(0.75 0.15 60)" }}>MH:</span> Magnetic Heading
              <span className="text-[10px] italic block sm:inline sm:ml-1">(aka &ldquo;True Heading&rdquo;)</span>
            </div>
            <div><span className="font-semibold" style={{ color: "oklch(0.7 0.15 150)" }}>CC:</span> Compass Course</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mt-2" style={{ color: "oklch(0.6 0.02 240)" }}>
            <div><span className="font-semibold">VAR:</span> Magnetic Variation</div>
            <div><span className="font-semibold">WCA:</span> Wind Correction Angle</div>
            <div><span className="font-semibold">Dev:</span> Compass Deviation</div>
          </div>
        </div>
      </div>

      {/* Flight Phase Breakdown (if climb or descent data provided) */}
      {hasPhaseData && (
        <div className="mb-4 p-4 rounded-lg bg-green-900/20 border border-green-500/30">
          <h4 className="text-xs font-semibold mb-3 uppercase tracking-wide text-center" style={{ color: "oklch(0.7 0.15 150)" }}>
            Flight Phase Breakdown
          </h4>
          <div className={`grid ${gridCols} gap-3`}>
            {/* Climb Phase */}
            {hasClimbData && (
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
                      {results.climbPhase!.fuelUsed.toFixed(1)} {getFuelResultUnit(fuelUnit)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Cruise Phase */}
            {hasCruiseData && (
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
                      {results.cruisePhase!.fuelUsed.toFixed(1)} {getFuelResultUnit(fuelUnit)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Descent Phase */}
            {hasDescentData && (
              <div className="p-3 rounded-lg bg-slate-900/40 border border-gray-700">
                <p className="text-xs font-semibold mb-2 text-center" style={{ color: "oklch(0.7 0.15 30)" }}>
                  DESCENT PHASE
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: "oklch(0.65 0.02 240)" }}>Distance:</span>
                    <span className="text-sm font-bold" style={{ color: "white" }}>
                      {results.descentPhase!.distance.toFixed(1)} NM
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: "oklch(0.65 0.02 240)" }}>GS:</span>
                    <span className="text-sm font-bold" style={{ color: "white" }}>
                      {Math.round(results.descentPhase!.groundSpeed)} KT
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: "oklch(0.65 0.02 240)" }}>Time:</span>
                    <span className="text-sm font-bold" style={{ color: "white" }}>
                      {Math.round(results.descentPhase!.time * 60)} min
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: "oklch(0.65 0.02 240)" }}>Fuel:</span>
                    <span className="text-sm font-bold" style={{ color: "white" }}>
                      {results.descentPhase!.fuelUsed.toFixed(1)} {getFuelResultUnit(fuelUnit)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Intermediate Values - Single Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
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
            <Tooltip content="Fuel consumption for this leg only. Based on fuel flow and leg time. It does not include previous legs and reserve fuel." />
          </div>
          <p className="text-xl font-bold text-center" style={{ color: legFuel !== undefined ? "white" : "oklch(0.35 0.02 240)" }}>
            {legFuel !== undefined ? `${legFuel.toFixed(1)} ${getFuelResultUnit(fuelUnit)}` : '—'}
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
