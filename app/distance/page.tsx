import { Suspense } from "react";
import { DistanceCalculatorClient } from "./DistanceCalculatorClient";

export { generateMetadata } from "./metadata";

interface DistancePageProps {
  searchParams: Promise<{
    fromLat?: string;
    fromLon?: string;
    fromName?: string;
    toLat?: string;
    toLon?: string;
    toName?: string;
  }>;
}

export default async function DistancePage({
  searchParams,
}: DistancePageProps) {
  const params = await searchParams;
  const fromLat = params.fromLat;
  const fromLon = params.fromLon;
  const fromName = params.fromName;
  const toLat = params.toLat;
  const toLon = params.toLon;
  const toName = params.toName;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <DistanceCalculatorClient
        initialFromLat={fromLat}
        initialFromLon={fromLon}
        initialFromName={fromName}
        initialToLat={toLat}
        initialToLon={toLon}
        initialToName={toName}
      />
    </Suspense>
  );
}
