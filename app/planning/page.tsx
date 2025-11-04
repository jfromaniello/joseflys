import { Suspense } from "react";
import type { Metadata } from "next";
import { PlanningCalculatorClient } from "./PlanningCalculatorClient";
import { PageLayout } from "../components/PageLayout";

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

export async function generateMetadata({ searchParams }: PlanningPageProps): Promise<Metadata> {
  const params = await searchParams;
  const mode = (params.mode || "time-speed-distance") as CalculatorMode;

  // Build dynamic OG image URL with query params
  const ogParams = new URLSearchParams();
  ogParams.set("mode", mode);

  if (mode === "time-speed-distance") {
    if (params.gs) ogParams.set("gs", params.gs);
    if (params.dist) ogParams.set("dist", params.dist);
    if (params.th) ogParams.set("th", params.th);
    if (params.tm) ogParams.set("tm", params.tm);
  } else {
    if (params.ff) ogParams.set("ff", params.ff);
    if (params.fu) ogParams.set("fu", params.fu);
    if (params.fth) ogParams.set("fth", params.fth);
    if (params.ftm) ogParams.set("ftm", params.ftm);
    if (params.fa) ogParams.set("fa", params.fa);
  }

  const hasParams = params.gs || params.dist || params.ff || params.fu;
  const ogImageUrl = hasParams
    ? `/api/og-planning?${ogParams.toString()}`
    : undefined;

  const modeTitle = mode === "fuel" ? "Fuel Consumption" : "Time, Speed & Distance";

  return {
    title: `Flight Planning Calculator - ${modeTitle} | José's Aviation Tools`,
    description: "Calculate time, speed, distance, and fuel consumption for flight planning. Essential aviation calculations for pilots and flight planners. Free online tool.",
    keywords: [
      "flight planning calculator",
      "time speed distance calculator",
      "fuel consumption calculator",
      "aviation calculator",
      "flight planning",
      "ground speed calculator",
      "fuel flow calculator",
      "endurance calculator",
      "aviation tools",
      "pilot calculator",
      "flight time calculator",
      "aviation fuel",
    ],
    authors: [{ name: "José", url: "https://twitter.com/jfroma" }],
    creator: "José",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title: `Flight Planning Calculator - ${modeTitle}`,
      description: "Calculate time, speed, distance, and fuel consumption for flight planning",
      type: "website",
      siteName: "José's Aviation Calculators",
      locale: "en_US",
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `Flight Planning Calculator - ${modeTitle}`,
      description: "Calculate time, speed, distance, and fuel consumption for flight planning",
      creator: "@jfroma",
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    alternates: {
      canonical: "/planning",
    },
    category: "Aviation",
  };
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
