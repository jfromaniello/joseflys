import { Suspense } from "react";
import { TASCalculatorClient } from "./TASCalculatorClient";

export { generateMetadata } from "./metadata";

interface TASPageProps {
  searchParams: Promise<{
    cas?: string;
    oat?: string;
    pa?: string;   // Pressure altitude
    alt?: string;  // Altitude (for altitude + QNH method)
    qnh?: string;  // QNH (for altitude + QNH method)
  }>;
}

export default async function TASPage({ searchParams }: TASPageProps) {
  const params = await searchParams;
  const cas = params.cas || "90";
  const oat = params.oat || "8";

  // Handle both methods:
  // If 'pa' exists, use it as pressure altitude
  // If 'alt' and 'qnh' exist, use them for altitude + QNH method
  // Default to pressure altitude method with 4000 ft
  const pressureAlt = params.pa || "";
  const altitude = params.alt || "";
  const qnh = params.qnh || "";

  // If no params provided, default to pressure altitude mode
  const defaultPressureAlt = (!params.pa && !params.alt && !params.qnh) ? "4000" : "";

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <TASCalculatorClient
        initialCas={cas}
        initialOat={oat}
        initialPressureAlt={pressureAlt || defaultPressureAlt}
        initialAltitude={altitude}
        initialQnh={qnh}
      />
    </Suspense>
  );
}
