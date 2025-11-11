"use client";

import dynamic from "next/dynamic";

const LegPlannerClient = dynamic(() => import("./LegPlannerClient").then(mod => ({ default: mod.LegPlannerClient })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
      <div className="text-slate-400 text-lg">Loading...</div>
    </div>
  ),
});

interface ClientWrapperProps {
  initialTh: string;
  initialTas: string;
  initialWd: string;
  initialWs: string;
  initialMd: string;
  initialDist: string;
  initialFf: string;
  initialDevTable: string;
  initialPlane: string;
  initialDesc: string;
  initialSpeedUnit: string;
  initialFuelUnit: string;
  initialWaypoints: string;
  initialDepTime: string;
  initialElapsedMin: string;
  initialPrevFuel: string;
  initialClimbTas: string;
  initialClimbDist: string;
  initialClimbFuel: string;
  initialClimbWd: string;
  initialClimbWs: string;
  initialDescentTas: string;
  initialDescentDist: string;
  initialDescentFuel: string;
  initialDescentWd: string;
  initialDescentWs: string;
  initialAdditionalFuel: string;
  initialFlightPlanId: string;
  initialLegId: string;
}

export function ClientWrapper(props: ClientWrapperProps) {
  return <LegPlannerClient {...props} />;
}
