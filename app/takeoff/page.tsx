import { Suspense } from "react";
import { TakeoffCalculatorClient } from "./TakeoffCalculatorClient";

export { generateMetadata } from "./metadata";

interface TakeoffPageProps {
  searchParams: Promise<{
    aircraft?: string;   // Aircraft model code (e.g., "C150")
    plane?: string;      // Serialized aircraft data
    weight?: string;     // Takeoff weight (lbs)
    flaps?: string;      // Flap configuration: 0, 10, full
    pa?: string;         // Pressure altitude (ft)
    alt?: string;        // Field elevation (ft)
    qnh?: string;        // QNH (for altitude + QNH method)
    da?: string;         // Density altitude (ft, direct)
    oat?: string;        // Outside air temperature (°C)
    runway?: string;     // Runway length (ft)
    surface?: string;    // Surface type: dry-asphalt, wet-asphalt, dry-grass, wet-grass
    slope?: string;      // Runway slope (%)
    wind?: string;       // Headwind component (kt, negative = tailwind)
    obstacle?: string;   // Obstacle height (ft)
    ad?: string;         // Aerodrome ICAO code
    metar?: string;      // METAR reference: ICAO + day/time (e.g., "KJFK041051Z")
    rwy?: string;        // Selected runway end ID (e.g., "11")
  }>;
}

export default async function TakeoffPage({ searchParams }: TakeoffPageProps) {
  const params = await searchParams;

  // Default values
  const aircraft = params.aircraft || "C150";
  const plane = params.plane || "";
  const weight = params.weight || "";
  const flaps = params.flaps || "0";
  const pa = params.pa || "";
  const alt = params.alt || "";
  const qnh = params.qnh || "";
  const da = params.da || "";
  const oat = params.oat || "";
  const runway = params.runway || "";
  const surface = params.surface || "PG";
  const slope = params.slope || "0";
  const wind = params.wind || "0";
  const obstacle = params.obstacle || "50";
  const ad = params.ad || "";
  const metar = params.metar || "";
  const rwy = params.rwy || "";

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <TakeoffCalculatorClient
        initialAircraft={aircraft}
        initialPlane={plane}
        initialWeight={weight}
        initialFlaps={flaps}
        initialPA={pa}
        initialAlt={alt}
        initialQNH={qnh}
        initialDA={da}
        initialOAT={oat}
        initialRunway={runway}
        initialSurface={surface}
        initialSlope={slope}
        initialWind={wind}
        initialObstacle={obstacle}
        initialAerodrome={ad}
        initialMetarRef={metar}
        initialRunwayEnd={rwy}
      />
    </Suspense>
  );
}
