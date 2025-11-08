import { Suspense } from "react";
import { LegPlannerClient } from "./LegPlannerClient";

export { generateMetadata } from "./metadata";

interface LegPageProps {
  searchParams: Promise<{
    wd?: string;
    ws?: string;
    th?: string;
    tas?: string;
    md?: string;
    dist?: string;
    ff?: string;
    devTable?: string; // JSON encoded deviation table
    desc?: string; // Optional description
    unit?: string; // Speed unit (kt, kmh, mph)
    funit?: string; // Fuel unit (gph, lph, pph, kgh)
    waypoints?: string; // JSON encoded waypoints
    depTime?: string; // Departure time HHMM
    elapsedMin?: string; // Elapsed minutes
    prevFuel?: string; // Previous fuel used
  }>;
}

export default async function LegPage({ searchParams }: LegPageProps) {
  const params = await searchParams;
  const th = params.th || "";
  const tas = params.tas || "";
  const wd = params.wd || "";
  const ws = params.ws || "";
  const md = params.md || "";
  const dist = params.dist || "";
  const ff = params.ff || "";
  const devTable = params.devTable || "";
  const desc = params.desc || "";
  const unit = params.unit || "kt";
  const funit = params.funit || "gph";
  const waypoints = params.waypoints || "";
  const depTime = params.depTime || "";
  const elapsedMin = params.elapsedMin || "";
  const prevFuel = params.prevFuel || "";

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <LegPlannerClient
        initialTh={th}
        initialTas={tas}
        initialWd={wd}
        initialWs={ws}
        initialMd={md}
        initialDist={dist}
        initialFf={ff}
        initialDevTable={devTable}
        initialDesc={desc}
        initialSpeedUnit={unit}
        initialFuelUnit={funit}
        initialWaypoints={waypoints}
        initialDepTime={depTime}
        initialElapsedMin={elapsedMin}
        initialPrevFuel={prevFuel}
      />
    </Suspense>
  );
}
