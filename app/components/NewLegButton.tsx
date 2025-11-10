"use client";

/**
 * Props for the NewLegButton component
 * Used to create a new leg with parameters carried over from the current leg
 */
interface NewLegButtonProps {
  /** Magnetic deviation in degrees (e.g., "-5" for 5° East) */
  magDev: string;
  /** Departure time in HHMM format (e.g., "1430" for 2:30 PM) */
  departureTime: string;
  /** Compressed deviation table data to be carried over to the new leg */
  deviationTable: string;
  /** Serialized aircraft data to be carried over to the new leg */
  plane?: string;
  /** Fuel flow rate (e.g., "8" for 8 GPH/LPH/PPH/KGH) */
  fuelFlow: string;
  /** True airspeed (e.g., "120" for 120 KT) */
  tas: string;
  /** Speed unit selected (kt, kmh, or mph) */
  speedUnit: string;
  /** Fuel flow unit selected (gph, lph, pph, or kgh) */
  fuelUnit: string;
  /** Total elapsed minutes at the end of current leg (cumulative flight time) */
  elapsedMinutes: number;
  /** Wind direction in degrees (e.g., "180" for wind from south) */
  windDir: string;
  /** Wind speed in knots (e.g., "25") */
  windSpeed: string;
  /** Total fuel used at the end of current leg (rounded to nearest integer in new leg) */
  fuelUsed?: number;
}

export function NewLegButton({
  magDev,
  departureTime,
  deviationTable,
  plane,
  fuelFlow,
  tas,
  speedUnit,
  fuelUnit,
  elapsedMinutes,
  windDir,
  windSpeed,
  fuelUsed,
}: NewLegButtonProps) {
  const handleNewLeg = () => {
    // Build URL with parameters for next leg
    const params = new URLSearchParams();

    // Carry over these values
    if (magDev) params.set("md", magDev);
    if (departureTime) params.set("depTime", departureTime);

    // Prioritize plane (includes deviation table) over legacy devTable param
    if (plane) {
      params.set("plane", plane);
    } else if (deviationTable) {
      params.set("devTable", deviationTable);
    }

    if (fuelFlow) params.set("ff", fuelFlow);
    if (tas) params.set("tas", tas);
    if (speedUnit && speedUnit !== 'kt') params.set("unit", speedUnit);
    if (fuelUnit && fuelUnit !== 'gph') params.set("funit", fuelUnit);

    // Carry over wind parameters (assume wind remains constant)
    if (windDir) params.set("wd", windDir);
    if (windSpeed) params.set("ws", windSpeed);

    // Set elapsed minutes
    params.set("elapsedMin", elapsedMinutes.toString());

    // Set previous fuel used (total fuel used from current leg) - rounded to nearest integer
    if (fuelUsed !== undefined && fuelUsed > 0) {
      params.set("prevFuel", Math.round(fuelUsed).toString());
    }

    // Open new tab with carried-over parameters
    const newUrl = `/leg?${params.toString()}`;
    window.open(newUrl, '_blank');
  };

  return (
    <button
      onClick={handleNewLeg}
      className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl border-2 border-sky-500/50 bg-sky-500/10 hover:bg-sky-500/20 transition-all font-medium cursor-pointer"
      style={{ color: "oklch(0.8 0.15 230)" }}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
      Create Next Leg
      <span className="text-xs opacity-75">(opens in new tab)</span>
    </button>
  );
}
