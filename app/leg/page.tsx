import { ClientWrapper } from "./ClientWrapper";

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
    devTable?: string; // JSON encoded deviation table (legacy)
    plane?: string; // Serialized aircraft data (new format)
    desc?: string; // Optional description
    unit?: string; // Speed unit (kt, kmh, mph)
    funit?: string; // Fuel unit (gph, lph, pph, kgh)
    waypoints?: string; // JSON encoded waypoints
    depTime?: string; // Departure time HHMM
    elapsedMin?: string; // Elapsed minutes
    prevFuel?: string; // Previous fuel used
    climbTas?: string; // Climb TAS
    climbDist?: string; // Climb distance
    climbFuel?: string; // Climb fuel used
    fp?: string; // Flight plan ID
    lid?: string; // Leg ID
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
  const plane = params.plane || "";
  const desc = params.desc || "";
  const unit = params.unit || "kt";
  const funit = params.funit || "gph";
  const waypoints = params.waypoints || "";
  const depTime = params.depTime || "";
  const elapsedMin = params.elapsedMin || "";
  const prevFuel = params.prevFuel || "";
  const climbTas = params.climbTas || "";
  const climbDist = params.climbDist || "";
  const climbFuel = params.climbFuel || "";
  const fp = params.fp || "";
  const lid = params.lid || "";

  return (
    <ClientWrapper
      initialTh={th}
      initialTas={tas}
      initialWd={wd}
      initialWs={ws}
      initialMd={md}
      initialDist={dist}
      initialFf={ff}
      initialDevTable={devTable}
      initialPlane={plane}
      initialDesc={desc}
      initialSpeedUnit={unit}
      initialFuelUnit={funit}
      initialWaypoints={waypoints}
      initialDepTime={depTime}
      initialElapsedMin={elapsedMin}
      initialPrevFuel={prevFuel}
      initialClimbTas={climbTas}
      initialClimbDist={climbDist}
      initialClimbFuel={climbFuel}
      initialFlightPlanId={fp}
      initialLegId={lid}
    />
  );
}
