import { Suspense } from "react";
import type { Metadata } from "next";
import { TASCalculatorClient } from "./TASCalculatorClient";

interface TASPageProps {
  searchParams: Promise<{
    cas?: string;
    oat?: string;
    alt?: string;
  }>;
}

export async function generateMetadata({ searchParams }: TASPageProps): Promise<Metadata> {
  const params = await searchParams;
  const cas = params.cas || "";
  const oat = params.oat || "";
  const alt = params.alt || "";

  // Build dynamic OG image URL with query params
  const hasParams = cas || oat || alt;
  const ogImageUrl = hasParams
    ? `/api/og-tas?cas=${cas}&oat=${oat}&alt=${alt}`
    : undefined;

  return {
    title: "TAS Calculator - True Airspeed Calculator | José's Aviation Calculators",
    description: "Calculate True Airspeed (TAS) from Calibrated Airspeed (CAS), Outside Air Temperature (OAT), and Pressure Altitude using the ISA model. Free online aviation calculator for pilots and flight planning.",
    keywords: [
      "TAS calculator",
      "true airspeed calculator",
      "calibrated airspeed",
      "CAS to TAS",
      "ISA calculator",
      "airspeed calculator",
      "aviation calculator",
      "flight planning calculator",
      "pilot tools",
      "pressure altitude calculator",
      "OAT calculator",
      "air density calculator",
      "indicated airspeed",
      "aviation tools",
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
      title: "TAS Calculator - True Airspeed Calculator",
      description: "Calculate True Airspeed from CAS, OAT, and Pressure Altitude using ISA model",
      type: "website",
      siteName: "José's Aviation Calculators",
      locale: "en_US",
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: "TAS Calculator - True Airspeed Calculator",
      description: "Calculate True Airspeed from CAS, OAT, and Pressure Altitude using ISA model",
      creator: "@jfroma",
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    alternates: {
      canonical: "/tas",
    },
    category: "Aviation",
  };
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
