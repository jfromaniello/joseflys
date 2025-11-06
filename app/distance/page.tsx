import { Suspense } from "react";
import type { Metadata } from "next";
import { DistanceCalculatorClient } from "./DistanceCalculatorClient";

interface DistancePageProps {
  searchParams: Promise<{
    fromLat?: string;
    fromLon?: string;
    fromName?: string;
    toLat?: string;
    toLon?: string;
    toName?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: DistancePageProps): Promise<Metadata> {
  const params = await searchParams;
  const fromLat = params.fromLat || "";
  const fromLon = params.fromLon || "";
  const toLat = params.toLat || "";
  const toLon = params.toLon || "";

  return {
    title:
      "Distance Calculator - WGS-84 Geodesic Distance & Bearing | José's Aviation Calculators",
    description:
      "Calculate precise geodesic distance and bearing between two points using WGS-84 ellipsoid model (Karney's method). High-precision navigation for aviation. Search cities or enter coordinates directly.",
    keywords: [
      "distance calculator",
      "geodesic distance",
      "WGS-84",
      "GeographicLib",
      "Karney algorithm",
      "aviation distance",
      "bearing calculator",
      "true bearing",
      "geodesic navigation",
      "flight planning",
      "navigation calculator",
      "aviation tools",
      "pilot calculator",
      "airport distance",
      "nautical miles calculator",
      "aviation navigation",
      "route planning",
      "high precision navigation",
    ],
    authors: [{ name: "José Romaniello", url: "https://twitter.com/jfroma" }],
    creator: "José Romaniello",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      title: "Distance Calculator - WGS-84 Geodesic Distance & Bearing",
      description:
        "Calculate precise geodesic distance and bearing using WGS-84 ellipsoid model. High-precision navigation calculator for aviation.",
      type: "website",
      siteName: "José's Aviation Calculators",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: "Distance Calculator - WGS-84 Geodesic Distance & Bearing",
      description:
        "Calculate precise geodesic distance and bearing using WGS-84 ellipsoid (Karney's method)",
      creator: "@jfroma",
    },
    alternates: {
      canonical: "/distance",
    },
    category: "Aviation",
  };
}

export default async function DistancePage({
  searchParams,
}: DistancePageProps) {
  const params = await searchParams;
  const fromLat = params.fromLat;
  const fromLon = params.fromLon;
  const fromName = params.fromName;
  const toLat = params.toLat;
  const toLon = params.toLon;
  const toName = params.toName;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <DistanceCalculatorClient
        initialFromLat={fromLat}
        initialFromLon={fromLon}
        initialFromName={fromName}
        initialToLat={toLat}
        initialToLon={toLon}
        initialToName={toName}
      />
    </Suspense>
  );
}
