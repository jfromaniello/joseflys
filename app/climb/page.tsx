import { Suspense } from "react";
import { ClimbCalculatorClient } from "./ClimbCalculatorClient";

export { generateMetadata } from "./metadata";

interface ClimbPageProps {
  searchParams: Promise<{
    curr?: string;
    tgt?: string;
    da?: string;
    wt?: string;
    th?: string;
    wd?: string;
    ws?: string;
    ac?: string;
  }>;
}

export default async function ClimbPage({ searchParams }: ClimbPageProps) {
  const params = await searchParams;
  const currentAlt = params.curr || "2000";
  const targetAlt = params.tgt || "6000";
  const densityAlt = params.da || "3000";
  const weight = params.wt || "1500";
  const trueHeading = params.th || "090";
  const windDir = params.wd || "";
  const windSpeed = params.ws || "";
  const aircraft = params.ac || "C150";

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <ClimbCalculatorClient
        initialCurrentAlt={currentAlt}
        initialTargetAlt={targetAlt}
        initialDA={densityAlt}
        initialWeight={weight}
        initialTH={trueHeading}
        initialWD={windDir}
        initialWS={windSpeed}
        initialAircraft={aircraft}
      />
    </Suspense>
  );
}
