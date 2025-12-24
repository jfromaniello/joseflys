import { Suspense } from "react";
import { SkyArtClient } from "./SkyArtClient";
import { getTemplateById, skyArtTemplates } from "@/lib/skyArtTemplates";

export { generateMetadata } from "./metadata";

interface SkyArtPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SkyArtPage({ searchParams }: SkyArtPageProps) {
  const params = await searchParams;

  // Parse URL parameters
  const templateId = typeof params.t === "string" ? params.t : skyArtTemplates[0].id;
  const lat = typeof params.lat === "string" ? parseFloat(params.lat) : undefined;
  const lon = typeof params.lon === "string" ? parseFloat(params.lon) : undefined;
  const width = typeof params.w === "string" ? parseFloat(params.w) : undefined;
  const rotation = typeof params.r === "string" ? parseFloat(params.r) : undefined;
  const locationName = typeof params.loc === "string" ? params.loc : undefined;

  // Validate template
  const template = getTemplateById(templateId);
  const validTemplateId = template ? templateId : skyArtTemplates[0].id;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <SkyArtClient
        initialTemplateId={validTemplateId}
        initialLat={lat}
        initialLon={lon}
        initialWidth={width}
        initialRotation={rotation}
        initialLocationName={locationName}
      />
    </Suspense>
  );
}
