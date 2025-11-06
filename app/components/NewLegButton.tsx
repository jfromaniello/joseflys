"use client";

interface NewLegButtonProps {
  magDev: string;
  departureTime: string;
  deviationTable: string;
  fuelFlow: string;
  tas: string;
  speedUnit: string;
  fuelUnit: string;
  elapsedMinutes: number;
}

export function NewLegButton({
  magDev,
  departureTime,
  deviationTable,
  fuelFlow,
  tas,
  speedUnit,
  fuelUnit,
  elapsedMinutes,
}: NewLegButtonProps) {
  const handleNewLeg = () => {
    // Build URL with parameters for next leg
    const params = new URLSearchParams();

    // Carry over these values
    if (magDev) params.set("md", magDev);
    if (departureTime) params.set("depTime", departureTime);
    if (deviationTable) params.set("devTable", deviationTable);
    if (fuelFlow) params.set("ff", fuelFlow);
    if (tas) params.set("tas", tas);
    if (speedUnit && speedUnit !== 'kt') params.set("unit", speedUnit);
    if (fuelUnit && fuelUnit !== 'gph') params.set("funit", fuelUnit);

    // Set elapsed minutes
    params.set("elapsedMin", elapsedMinutes.toString());

    // Open new tab with carried-over parameters
    const newUrl = `/course?${params.toString()}`;
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
