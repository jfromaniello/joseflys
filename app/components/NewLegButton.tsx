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
  /** Flight plan ID if this leg belongs to a flight plan */
  flightPlanId?: string;
  /** Flight plan name for display purposes */
  flightPlanName?: string;
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
  flightPlanId,
  flightPlanName,
}: NewLegButtonProps) {
  const handleNewLeg = () => {
    // Use shared utility to build next leg URL
    const { buildNextLegUrl } = require("@/lib/nextLegParams");

    const url = buildNextLegUrl({
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
      flightPlanId,
    });

    // Open new tab with carried-over parameters
    window.open(url, '_blank');
  };

  return (
    <button
      onClick={handleNewLeg}
      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-600 hover:border-gray-500 hover:bg-slate-700/50 transition-all cursor-pointer"
      style={{ color: "oklch(0.7 0.02 240)" }}
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
      <span className="text-sm font-medium">Add New Leg</span>
    </button>
  );
}
