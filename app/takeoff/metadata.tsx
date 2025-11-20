import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  return {
    title: "Takeoff Performance Calculator | José's Flight Tools",
    description:
      "Calculate takeoff distance, ground roll, obstacle clearance, and safety margins based on aircraft performance, atmospheric conditions, runway characteristics, and weight.",
    keywords: [
      "takeoff performance",
      "takeoff distance",
      "ground roll",
      "obstacle clearance",
      "runway analysis",
      "density altitude",
      "pressure altitude",
      "v-speeds",
      "vr",
      "rotation speed",
      "rate of climb",
      "aviation calculator",
      "flight planning",
      "runway length",
      "takeoff safety",
    ],
    openGraph: {
      title: "Takeoff Performance Calculator | José's Flight Tools",
      description:
        "Calculate takeoff performance with detailed ground roll, obstacle clearance, and GO/MARGINAL/NO-GO decision",
      type: "website",
    },
  };
}
