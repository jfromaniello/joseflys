import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

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

  return createPageMetadata({
    title: "TAS Calculator - True Airspeed from CAS, OAT & Altitude | Free Aviation Tool",
    description: "Calculate True Airspeed (TAS) from Calibrated Airspeed (CAS), Outside Air Temperature (OAT), and Pressure Altitude using the ISA (International Standard Atmosphere) model. Accurate, instant calculations for flight planning and navigation. Free online calculator for pilots.",
    keywords: [
      "TAS calculator",
      "true airspeed calculator",
      "calibrated airspeed",
      "CAS to TAS",
      "CAS to TAS conversion",
      "ISA calculator",
      "international standard atmosphere",
      "airspeed calculator",
      "flight planning calculator",
      "pressure altitude calculator",
      "OAT calculator",
      "outside air temperature",
      "air density calculator",
      "density altitude",
      "indicated airspeed",
      "IAS to TAS",
      "flight computer",
      "E6B calculator",
    ],
    path: "/tas",
    ogImage: ogImageUrl,
  });
}
