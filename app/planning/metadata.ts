import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

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

  return createPageMetadata({
    title: `Flight Planning Calculator - ${modeTitle} | Free Aviation Tool`,
    description: "Professional flight planning calculator for pilots. Calculate time, speed, distance, and fuel consumption. Solve any flight planning problem by entering two known values. Includes fuel endurance calculator and flight time calculator. Essential tool for pre-flight planning and navigation. Free online calculator.",
    keywords: [
      "flight planning calculator",
      "time speed distance calculator",
      "time distance calculator",
      "fuel consumption calculator",
      "fuel calculator",
      "ground speed calculator",
      "fuel flow calculator",
      "fuel endurance calculator",
      "endurance calculator",
      "range calculator",
      "flight time calculator",
      "aviation fuel calculator",
      "flight duration calculator",
      "trip time calculator",
      "ETE calculator",
      "estimated time enroute",
      "navigation calculator",
      "cross country planning",
      "flight plan calculator",
      "E6B calculator",
      "flight computer",
      "CR-3 calculator",
    ],
    path: "/planning",
    ogImage: ogImageUrl,
  });
}
