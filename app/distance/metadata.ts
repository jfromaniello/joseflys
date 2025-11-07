import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

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

  return createPageMetadata({
    title: "Distance & Bearing Calculator - WGS-84 Geodesic Navigation | Free Aviation Tool",
    description:
      "Calculate precise geodesic distance and true bearing between two points using WGS-84 ellipsoid model with Karney's algorithm (GeographicLib). High-precision navigation for aviation with millimeter accuracy. Search cities or enter GPS coordinates directly. Free online calculator for pilots and flight planners.",
    keywords: [
      "distance calculator",
      "geodesic distance calculator",
      "geodesic distance",
      "WGS-84 calculator",
      "WGS-84",
      "GeographicLib",
      "Karney algorithm",
      "Karney method",
      "aviation distance calculator",
      "bearing calculator",
      "true bearing calculator",
      "true bearing",
      "initial bearing",
      "final bearing",
      "geodesic navigation",
      "great circle distance",
      "navigation calculator",
      "airport distance calculator",
      "airport distance",
      "nautical miles calculator",
      "statute miles calculator",
      "kilometers calculator",
      "route planning",
      "flight route calculator",
      "high precision navigation",
      "GPS calculator",
      "coordinate calculator",
      "lat lon calculator",
      "latitude longitude calculator",
    ],
    path: "/distance",
  });
}
