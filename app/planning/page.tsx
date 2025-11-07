import { Suspense } from "react";
import { PlanningCalculatorClient } from "./PlanningCalculatorClient";
import { PageLayout } from "../components/PageLayout";

export { generateMetadata } from "./metadata";

type CalculatorMode = "time-speed-distance" | "fuel";

interface PlanningPageProps {
  searchParams: Promise<{
    mode?: string;
    gs?: string;
    dist?: string;
    th?: string;
    tm?: string;
    ff?: string;
    fu?: string;
    fth?: string;
    ftm?: string;
    fa?: string;
  }>;
}

export default async function PlanningPage({ searchParams }: PlanningPageProps) {
  const params = await searchParams;
  const mode = (params.mode || "time-speed-distance") as CalculatorMode;

  return (
    <Suspense
      fallback={
        <PageLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div
              className="text-lg font-medium"
              style={{ color: "oklch(0.72 0.015 240)" }}
            >
              Loading calculator...
            </div>
          </div>
        </PageLayout>
      }
    >
      <PlanningCalculatorClient
        initialMode={mode}
        initialGs={params.gs}
        initialDist={params.dist}
        initialTh={params.th}
        initialTm={params.tm}
        initialFf={params.ff}
        initialFu={params.fu}
        initialFth={params.fth}
        initialFtm={params.ftm}
        initialFa={params.fa}
      />
    </Suspense>
  );
}
