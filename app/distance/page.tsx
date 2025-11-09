import { Suspense } from "react";
import { DistanceCalculatorClient } from "./DistanceCalculatorClient";
import { parseLocationParams } from "@/lib/coordinateUrlParams";

export { generateMetadata } from "./metadata";

interface DistancePageProps {
  searchParams: Promise<{
    fromLat?: string;
    fromLon?: string;
    fromName?: string;
    toLat?: string;
    toLon?: string;
    toName?: string;
    from?: string;
    to?: string;
    s?: string;
  }>;
}

export default async function DistancePage({
  searchParams,
}: DistancePageProps) {
  const params = await searchParams;

  // Convert to URLSearchParams for parsing
  const urlParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) urlParams.set(key, value);
  });

  // Parse using utility (supports both old and new formats)
  const { fromLat, fromLon, fromName, toLat, toLon, toName } = parseLocationParams(urlParams);

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
