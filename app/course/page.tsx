import { redirect } from "next/navigation";
import { ClientWrapper } from "./ClientWrapper";

export { generateMetadata } from "./metadata";

interface WindsPageProps {
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

export default async function WindsPage({ searchParams }: WindsPageProps) {
  const params = await searchParams;

  // Check if any leg-specific parameters are present
  // These are parameters that are only used in the leg planner
  const hasLegSpecificParams =
    params.dist ||
    params.ff ||
    params.funit ||
    params.waypoints ||
    params.depTime ||
    params.elapsedMin ||
    params.prevFuel;

  // If leg-specific params are present, redirect to /leg with all params
  if (hasLegSpecificParams) {
    const queryParams = new URLSearchParams();
    if (params.th) queryParams.set("th", params.th);
    if (params.tas) queryParams.set("tas", params.tas);
    if (params.wd) queryParams.set("wd", params.wd);
    if (params.ws) queryParams.set("ws", params.ws);
    if (params.md) queryParams.set("md", params.md);
    if (params.dist) queryParams.set("dist", params.dist);
    if (params.ff) queryParams.set("ff", params.ff);
    if (params.devTable) queryParams.set("devTable", params.devTable);
    if (params.desc) queryParams.set("desc", params.desc);
    if (params.unit) queryParams.set("unit", params.unit);
    if (params.funit) queryParams.set("funit", params.funit);
    if (params.waypoints) queryParams.set("waypoints", params.waypoints);
    if (params.depTime) queryParams.set("depTime", params.depTime);
    if (params.elapsedMin) queryParams.set("elapsedMin", params.elapsedMin);
    if (params.prevFuel) queryParams.set("prevFuel", params.prevFuel);

    redirect(`/leg?${queryParams.toString()}`);
  }

  const th = params.th || "";
  const tas = params.tas || "";
  const wd = params.wd || "";
  const ws = params.ws || "";
  const md = params.md || "";
  const devTable = params.devTable || "";
  const desc = params.desc || "";
  const unit = params.unit || "kt";

  return (
    <ClientWrapper
      initialTh={th}
      initialTas={tas}
      initialWd={wd}
      initialWs={ws}
      initialMd={md}
      initialDist=""
      initialFf=""
      initialDevTable={devTable}
      initialDesc={desc}
      initialSpeedUnit={unit}
      initialFuelUnit="gph"
      initialWaypoints=""
      initialDepTime=""
      initialElapsedMin=""
      initialPrevFuel=""
    />
  );
}
