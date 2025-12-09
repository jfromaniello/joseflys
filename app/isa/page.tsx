import { Suspense } from "react";
import { ISACalculatorClient } from "./ISACalculatorClient";

export { generateMetadata } from "./metadata";

interface ISAPageProps {
  searchParams: Promise<{
    elev?: string;
    qnh?: string;
    temp?: string;
    explain?: string;
  }>;
}

export default async function ISAPage({ searchParams }: ISAPageProps) {
  const params = await searchParams;
  const elevation = params.elev || "";
  const qnh = params.qnh || "";
  const temp = params.temp || "";
  const showExplanation = params.explain === "1";

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <ISACalculatorClient
        initialElevation={elevation}
        initialQnh={qnh}
        initialTemp={temp}
        initialShowExplanation={showExplanation}
      />
    </Suspense>
  );
}
