import type { Metadata } from "next";
import { createPageMetadata, SITE_CONFIG } from "@/lib/metadata";

interface LegPageProps {
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

export async function generateMetadata({ searchParams }: LegPageProps): Promise<Metadata> {
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
    ? `${desc} | ${SITE_CONFIG.name}`
    : "Leg Planner - Flight Planning & Navigation | José's Aviation Calculators";

  return createPageMetadata({
    title,
    description: "Complete flight leg planner with course calculations, fuel planning, waypoints, and time estimates. Calculate compass course, ground speed, wind correction angle, ETA, and fuel consumption for your flight legs.",
    keywords: [
      "leg planner",
      "flight leg planner",
      "flight planning",
      "navigation planner",
      "course calculator",
      "fuel planning",
      "waypoint navigation",
      "flight leg calculator",
      "VFR navigation",
      "compass course calculator",
      "ground speed calculator",
      "wind correction angle",
      "WCA calculator",
      "wind triangle calculator",
      "ETA calculator",
      "fuel consumption calculator",
      "compass deviation",
      "magnetic deviation",
      "E6B calculator",
      "flight computer",
    ],
    path: "/leg",
    ogImage: ogImageUrl,
  });
}
