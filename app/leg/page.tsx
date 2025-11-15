import { ClientWrapper } from "./ClientWrapper";

export { generateMetadata } from "./metadata";

interface LegPageProps {
  searchParams: Promise<{
    wd?: string;
    ws?: string;
    th?: string;
    tas?: string;
    md?: string; // LEGACY: Magnetic deviation (old aviation convention: positive=W, negative=E)
    var?: string; // NEW: Magnetic variation (WMM convention: positive=E, negative=W)
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
    elapsedDist?: string; // Elapsed distance (NM from previous legs)
    prevFuel?: string; // Previous fuel used
    climbTas?: string; // Climb TAS
    climbDist?: string; // Climb distance
    climbFuel?: string; // Climb fuel used
    cwd?: string; // Climb wind direction
    cws?: string; // Climb wind speed
    descentTas?: string; // Descent TAS
    descentDist?: string; // Descent distance
    descentFuel?: string; // Descent fuel used
    dwd?: string; // Descent wind direction
    dws?: string; // Descent wind speed
    af?: string; // Additional fuel (minutes)
    alf?: string; // Approach & landing fuel (gallons)
    fp?: string; // Flight plan ID
    lid?: string; // Leg ID
    fc?: string; // From city name (from route lookup)
    tc?: string; // To city name (from route lookup)
  }>;
}

export default async function LegPage({ searchParams }: LegPageProps) {
  const params = await searchParams;
  const th = params.th || "";
  const tas = params.tas || "";
  const wd = params.wd || "";
  const ws = params.ws || "";

  // Prefer 'var' (WMM convention) over 'md' (legacy)
  // If 'md' exists, convert it: WMM = -legacy
  const magVar = params.var || (params.md ? String(-parseFloat(params.md)) : "");

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
  const elapsedDist = params.elapsedDist || "";
  const prevFuel = params.prevFuel || "";
  const climbTas = params.climbTas || "";
  const climbDist = params.climbDist || "";
  const climbFuel = params.climbFuel || "";
  const climbWd = params.cwd || "";
  const climbWs = params.cws || "";
  const descentTas = params.descentTas || "";
  const descentDist = params.descentDist || "";
  const descentFuel = params.descentFuel || "";
  const descentWd = params.dwd || "";
  const descentWs = params.dws || "";
  const additionalFuel = params.af || "";
  const approachLandingFuel = params.alf || "";
  const fp = params.fp || "";
  const lid = params.lid || "";
  const fromCity = params.fc || "";
  const toCity = params.tc || "";

  return (
    <ClientWrapper
      initialTh={th}
      initialTas={tas}
      initialWd={wd}
      initialWs={ws}
      initialMagVar={magVar}
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
      initialElapsedDist={elapsedDist}
      initialPrevFuel={prevFuel}
      initialClimbTas={climbTas}
      initialClimbDist={climbDist}
      initialClimbFuel={climbFuel}
      initialClimbWd={climbWd}
      initialClimbWs={climbWs}
      initialDescentTas={descentTas}
      initialDescentDist={descentDist}
      initialDescentFuel={descentFuel}
      initialDescentWd={descentWd}
      initialDescentWs={descentWs}
      initialAdditionalFuel={additionalFuel}
      initialApproachLandingFuel={approachLandingFuel}
      initialFlightPlanId={fp}
      initialLegId={lid}
      initialFromCity={fromCity}
      initialToCity={toCity}
    />
  );
}
