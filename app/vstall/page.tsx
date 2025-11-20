import { Suspense } from "react";
import { VStallCalculatorClient } from "./VStallCalculatorClient";

export { generateMetadata } from "./metadata";

interface VStallPageProps {
  searchParams: Promise<{
    aircraft?: string;
    weight?: string;
    pa?: string;      // Pressure altitude
    alt?: string;     // Altitude (for altitude + QNH method)
    qnh?: string;     // QNH (for altitude + QNH method)
    da?: string;      // Density altitude (direct)
    oat?: string;     // Outside air temperature
    flaps?: string;   // Flap configuration: clean, takeoff, landing
    bank?: string;    // Bank angle in degrees
  }>;
}

export default async function VStallPage({ searchParams }: VStallPageProps) {
  const params = await searchParams;

  // Default values
  const aircraft = params.aircraft || "C150";
  const weight = params.weight || "";
  const pa = params.pa || "";
  const alt = params.alt || "";
  const qnh = params.qnh || "";
  const da = params.da || "";
  const oat = params.oat || "";
  const flaps = params.flaps || "clean";
  const bank = params.bank || "0";

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <VStallCalculatorClient
        initialAircraft={aircraft}
        initialWeight={weight}
        initialPA={pa}
        initialAlt={alt}
        initialQNH={qnh}
        initialDA={da}
        initialOAT={oat}
        initialFlaps={flaps}
        initialBank={bank}
      />
    </Suspense>
  );
}
