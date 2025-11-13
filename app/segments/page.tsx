import { Suspense } from "react";
import { SegmentsCalculatorClient } from "./SegmentsCalculatorClient";
import { parseMultipleLocationParams } from "@/lib/coordinateUrlParams";

export { generateMetadata } from "./metadata";

interface SegmentsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SegmentsPage({
  searchParams,
}: SegmentsPageProps) {
  const params = await searchParams;

  // Convert to URLSearchParams for parsing
  const urlParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === "string") {
      urlParams.set(key, value);
    }
  });

  // Parse location parameters
  const { fromLat, fromLon, fromName, toLocations } =
    parseMultipleLocationParams(urlParams);

  // For segments, we only use the first destination
  const toLat = toLocations[0]?.lat;
  const toLon = toLocations[0]?.lon;
  const toName = toLocations[0]?.name;

  // Parse segment count (default 10 segments)
  const segmentCount = urlParams.get("seg") || "10";

  // Parse view mode (2d or 3d)
  const viewMode = urlParams.get("view") || undefined;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <SegmentsCalculatorClient
        initialFromLat={fromLat}
        initialFromLon={fromLon}
        initialFromName={fromName}
        initialToLat={toLat}
        initialToLon={toLon}
        initialToName={toName}
        initialSegmentCount={segmentCount}
        initialViewMode={viewMode}
      />
    </Suspense>
  );
}
