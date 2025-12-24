import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: "Sky Art Generator | GPS Flight Art Planner",
    description:
      "Create GPS art flight paths! Choose from templates like hearts, stars, Christmas trees, and more. Generate shareable routes and export to GPX for your next flight.",
    keywords: [
      "GPS art",
      "flight art",
      "sky art",
      "sky drawing",
      "GPS drawing",
      "flight path art",
      "aviation art",
      "flight tracker art",
      "FlightRadar24 art",
      "ADS-B art",
      "flight planning",
      "GPX export",
      "creative flying",
      "fun flight",
      "flight patterns",
      "aerial art",
      "GPS flight path",
      "airplane drawing",
      "sky writing",
      "flight route art",
    ],
    path: "/sky-art",
  });
}
