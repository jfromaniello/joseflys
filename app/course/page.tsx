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
    devTable?: string; // JSON encoded deviation table
    desc?: string; // Optional description
    unit?: string; // Speed unit (kt, kmh, mph)
    funit?: string; // Fuel unit (gph, lph, pph, kgh)
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
  const desc = params.desc || "";

  // Build dynamic OG image URL with query params
  const hasParams = wd || ws || th || tas;
  const ogImageUrl = hasParams
    ? `/api/og-course?wd=${wd}&ws=${ws}&th=${th}&tas=${tas}&md=${md}&dist=${dist}&ff=${ff}${desc ? `&desc=${encodeURIComponent(desc)}` : ""}`
    : undefined;

  const title = desc
    ? `${desc} | José's Aviation Calculators`
    : "Course Calculator - Compass Course & Ground Speed | José's Aviation Calculators";

  return {
    title,
    description: "Calculate compass course, ground speed, and navigation parameters with wind correction. Includes compass deviation correction for accurate flight planning. Free online course calculator for pilots.",
    keywords: [
      "course calculator",
      "compass course",
      "compass course calculator",
      "ground speed calculator",
      "wind correction angle",
      "WCA calculator",
      "wind triangle",
      "compass heading calculator",
      "compass deviation",
      "magnetic deviation",
      "flight planning calculator",
      "aviation calculator",
      "pilot calculator",
      "navigation calculator",
      "crosswind calculator",
      "headwind calculator",
      "ETAS calculator",
      "effective true airspeed",
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
      title: "Course Calculator - Compass Course & Ground Speed",
      description: "Calculate compass course and ground speed with wind correction and compass deviation for accurate flight planning",
      type: "website",
      siteName: "José's Aviation Calculators",
      locale: "en_US",
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: "Course Calculator - Compass Course & Ground Speed",
      description: "Calculate compass course and ground speed with wind correction and compass deviation for accurate flight planning",
      creator: "@jfroma",
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    alternates: {
      canonical: "/course",
    },
    category: "Aviation",
  };
}

export default async function WindsPage({ searchParams }: WindsPageProps) {
  const params = await searchParams;
  const th = params.th || "360";
  const tas = params.tas || "100";
  const wd = params.wd || "";
  const ws = params.ws || "";
  const md = params.md || "";
  const dist = params.dist || "";
  const ff = params.ff || "";
  const devTable = params.devTable || "";
  const desc = params.desc || "";
  const unit = params.unit || "kt";
  const funit = params.funit || "gph";

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <WindCalculatorClient
        initialTh={th}
        initialTas={tas}
        initialWd={wd}
        initialWs={ws}
        initialMd={md}
        initialDist={dist}
        initialFf={ff}
        initialDevTable={devTable}
        initialDesc={desc}
        initialSpeedUnit={unit}
        initialFuelUnit={funit}
      />
    </Suspense>
  );
}
