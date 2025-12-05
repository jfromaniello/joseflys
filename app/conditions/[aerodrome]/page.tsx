import { Suspense } from "react";
import { ConditionsClient } from "./ConditionsClient";
import type { Metadata } from "next";

interface ConditionsPageProps {
  params: Promise<{
    aerodrome: string;
  }>;
}

export async function generateMetadata({ params }: ConditionsPageProps): Promise<Metadata> {
  const { aerodrome } = await params;
  return {
    title: `${aerodrome.toUpperCase()} Conditions | JoseFlys`,
    description: `Current weather, METAR, and runway information for ${aerodrome.toUpperCase()}`,
  };
}

export default async function ConditionsDetailPage({ params }: ConditionsPageProps) {
  const { aerodrome } = await params;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <ConditionsClient aerodromeCode={aerodrome.toUpperCase()} />
    </Suspense>
  );
}
