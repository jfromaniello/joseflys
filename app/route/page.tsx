import { Suspense } from "react";
import { RouteCalculatorClient } from "./RouteCalculatorClient";
import { parseMultipleLocationParams } from "@/lib/coordinateUrlParams";

export { generateMetadata } from "./metadata";

interface RoutePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RoutePage({
  searchParams,
}: RoutePageProps) {
  const params = await searchParams;

  // Convert to URLSearchParams for parsing
  const urlParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string') {
      urlParams.set(key, value);
    }
  });

  // Parse all location parameters using centralized function
  const { fromLat, fromLon, fromName, toLocations } = parseMultipleLocationParams(urlParams);

  // For backward compatibility with legacy single destination props
  const toLat = toLocations[0]?.lat;
  const toLon = toLocations[0]?.lon;
  const toName = toLocations[0]?.name;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <RouteCalculatorClient
        initialFromLat={fromLat}
        initialFromLon={fromLon}
        initialFromName={fromName}
        initialToLocations={toLocations.length > 0 ? toLocations : undefined}
        initialToLat={toLat}
        initialToLon={toLon}
        initialToName={toName}
      />
    </Suspense>
  );
}
