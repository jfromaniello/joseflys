import type { Metadata } from "next";
import { createPageMetadata, SITE_CONFIG } from "@/lib/metadata";

interface CoursePageProps {
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
    waypoints?: string; // JSON encoded waypoints
    depTime?: string; // Departure time HHMM
    elapsedMin?: string; // Elapsed minutes
    prevFuel?: string; // Previous fuel used
  }>;
}

export async function generateMetadata({ searchParams }: CoursePageProps): Promise<Metadata> {
  const params = await searchParams;
  const desc = params.desc || "";

  const title = desc
    ? `${desc} | ${SITE_CONFIG.name}`
    : "Course Calculator - Compass Course & Ground Speed | José's Aviation Calculators";

  // Only use dynamic OG image if there's a custom description
  const ogImageUrl = desc ? `/api/og-course?desc=${encodeURIComponent(desc)}` : undefined;

  return createPageMetadata({
    title,
    description: "Calculate compass course, ground speed, wind correction angle (WCA), and magnetic heading with deviation correction. Wind triangle calculator for pilots.",
    keywords: [
      "course calculator",
      "compass course calculator",
      "compass course",
      "ground speed calculator",
      "wind correction angle",
      "WCA calculator",
      "wind triangle calculator",
      "wind triangle",
      "compass heading calculator",
      "magnetic heading calculator",
      "compass deviation",
      "magnetic deviation",
      "magnetic variation",
      "navigation calculator",
      "crosswind calculator",
      "headwind calculator",
      "tailwind calculator",
      "ETAS calculator",
      "effective true airspeed",
      "true course",
      "magnetic course",
      "E6B calculator",
      "flight computer",
    ],
    path: "/course",
    ogImage: ogImageUrl, // undefined = auto-detect opengraph-image.tsx
  });
}
