import { Suspense } from "react";
import { MachExplorerClient } from "./MachExplorerClient";

export { generateMetadata } from "./metadata";

interface MachPageProps {
  searchParams: Promise<{
    mode?: string;
    cas?: string;
    mach?: string;
    alt?: string;
    dt?: string;
  }>;
}

export default async function MachPage({ searchParams }: MachPageProps) {
  const params = await searchParams;
  const mode = params.mode === "mach" ? "mach" : "cas";
  const cas = params.cas || "250";
  const mach = params.mach || "0.78";
  const alt = params.alt || "35000";
  const dt = params.dt || "0";

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <MachExplorerClient
        initialMode={mode}
        initialCas={cas}
        initialMach={mach}
        initialAlt={alt}
        initialDt={dt}
      />
    </Suspense>
  );
}
