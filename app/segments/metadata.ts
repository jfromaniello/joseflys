import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

interface SegmentsPageProps {
  searchParams: Promise<{
    fromLat?: string;
    fromLon?: string;
    fromName?: string;
    toLat?: string;
    toLon?: string;
    toName?: string;
    seg?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: SegmentsPageProps): Promise<Metadata> {
  const _params = await searchParams;

  return createPageMetadata({
    title: "LNAV Segments Calculator | Orthodromic to Loxodromic Route Division",
    description:
      "Divide long-distance orthodromic routes into constant-heading loxodromic segments. Simulates how FMS/LNAV systems approximate great circle routes with waypoints. Perfect for long-range flight planning.",
    keywords: [
      "LNAV calculator",
      "LNAV segments",
      "flight management system",
      "FMS calculator",
      "orthodromic route",
      "loxodromic route",
      "great circle segments",
      "constant heading segments",
      "rhumb line segments",
      "waypoint calculator",
      "route segmentation",
      "long range navigation",
      "great circle approximation",
      "geodesic segments",
      "navigation waypoints",
      "flight route planner",
      "long distance navigation",
      "aviation route planning",
      "WGS-84 segments",
      "true heading calculator",
      "segment bearing calculator",
      "oceanic routing",
      "transoceanic flight planning",
      "flight path calculator",
    ],
    path: "/segments",
  });
}
