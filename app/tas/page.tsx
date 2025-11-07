import { Suspense } from "react";
import { TASCalculatorClient } from "./TASCalculatorClient";

export { generateMetadata } from "./metadata";

interface TASPageProps {
  searchParams: Promise<{
    cas?: string;
    oat?: string;
    alt?: string;
  }>;
}

export default async function TASPage({ searchParams }: TASPageProps) {
  const params = await searchParams;
  const cas = params.cas || "90";
  const oat = params.oat || "8";
  const alt = params.alt || "4000";

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
        initialAlt={alt}
      />
    </Suspense>
  );
}
