import { Suspense } from "react";
import { WindComponentsClient } from "./WindComponentsClient";

export { generateMetadata } from "./metadata";

interface WindComponentsPageProps {
  searchParams: Promise<{
    m?: string;
    hdg?: string;
    rwy?: string;
    wd?: string;
    ws?: string;
    ang?: string;
    explain?: string;
  }>;
}

export default async function WindComponentsPage({ searchParams }: WindComponentsPageProps) {
  const params = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <WindComponentsClient
        initialMode={params.m === "a" ? "relative" : "direction"}
        initialRefType={params.rwy !== undefined ? "rwy" : "hdg"}
        initialReference={params.rwy ?? params.hdg ?? ""}
        initialWindDir={params.wd || ""}
        initialWindSpeed={params.ws || ""}
        initialAngle={params.ang || ""}
        initialShowExplanation={params.explain === "1"}
      />
    </Suspense>
  );
}
