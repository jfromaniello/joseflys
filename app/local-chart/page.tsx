import { Suspense } from "react";
import { LocalChartClient } from "./LocalChartClient";
import { parseMultipleLocationParams } from "@/lib/coordinateUrlParams";

export { generateMetadata } from "./metadata";

interface LocalChartPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LocalChartPage({
  searchParams,
}: LocalChartPageProps) {
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

  // Parse map mode
  const mapMode = (params.mode === 'mercator' ? 'mercator' : 'utm') as 'utm' | 'mercator';

  // Parse print scale (default: WAC = 1,000,000)
  const printScale = params.scale ? parseInt(params.scale as string, 10) : 1000000;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <LocalChartClient
        initialFromLat={fromLat}
        initialFromLon={fromLon}
        initialFromName={fromName}
        initialToLocations={toLocations.length > 0 ? toLocations : undefined}
        initialMapMode={mapMode}
        initialPrintScale={printScale}
      />
    </Suspense>
  );
}
