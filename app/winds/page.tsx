import { Suspense } from "react";
import type { Metadata } from "next";
import { WindCalculatorClient } from "./WindCalculatorClient";

interface WindsPageProps {
  searchParams: Promise<{
    wd?: string;
    ws?: string;
    th?: string;
    tas?: string;
    md?: string;
    dist?: string;
    ff?: string;
  }>;
}

export async function generateMetadata({ searchParams }: WindsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const wd = params.wd || "";
  const ws = params.ws || "";
  const th = params.th || "";
  const tas = params.tas || "";
  const md = params.md || "";
  const dist = params.dist || "";
  const ff = params.ff || "";

  // Build dynamic OG image URL with query params
  const hasParams = wd || ws || th || tas;
  const ogImageUrl = hasParams
    ? `/api/og-wind?wd=${wd}&ws=${ws}&th=${th}&tas=${tas}&md=${md}&dist=${dist}&ff=${ff}`
    : undefined;

  return {
    title: "Wind Calculator - Wind Correction Angle & Ground Speed | José's Aviation Calculators",
    description: "Calculate wind correction angle (WCA), ground speed, compass heading, headwind, crosswind, and ETAS for accurate flight planning. Free online wind triangle calculator for pilots.",
    keywords: [
      "wind calculator",
      "wind correction angle",
      "WCA calculator",
      "ground speed calculator",
      "wind triangle",
      "crosswind calculator",
      "headwind calculator",
      "compass heading calculator",
      "flight planning calculator",
      "aviation calculator",
      "pilot calculator",
      "magnetic deviation",
      "ETAS calculator",
      "effective true airspeed",
      "wind component calculator",
      "navigation calculator",
      "aviation tools",
      "pilot tools",
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
      title: "Wind Calculator - Wind Correction Angle & Ground Speed",
      description: "Calculate wind correction angle, ground speed, compass heading, and wind components for flight planning",
      type: "website",
      siteName: "José's Aviation Calculators",
      locale: "en_US",
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: "Wind Calculator - Wind Correction Angle & Ground Speed",
      description: "Calculate wind correction angle, ground speed, compass heading, and wind components for flight planning",
      creator: "@jfroma",
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    alternates: {
      canonical: "/winds",
    },
    category: "Aviation",
  };
}

export default async function WindsPage({ searchParams }: WindsPageProps) {
  const params = await searchParams;
  const wd = params.wd || "270";
  const ws = params.ws || "20";
  const th = params.th || "360";
  const tas = params.tas || "100";
  const md = params.md || "0";
  const dist = params.dist || "";
  const ff = params.ff || "";

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <WindCalculatorClient
        initialWd={wd}
        initialWs={ws}
        initialTh={th}
        initialTas={tas}
        initialMd={md}
        initialDist={dist}
        initialFf={ff}
      />
    </Suspense>
  );
}
