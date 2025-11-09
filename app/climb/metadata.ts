import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  return {
    title: "Climb Performance Calculator | José's Aviation Tools",
    description:
      "Calculate climb time, distance, fuel consumption, and Top of Climb position based on aircraft performance tables. Automatically adjusts for density altitude and aircraft weight.",
    keywords: [
      "climb calculator",
      "climb performance",
      "rate of climb",
      "top of climb",
      "ToC",
      "density altitude",
      "aircraft performance",
      "fuel consumption",
      "flight planning",
      "aviation calculator",
    ],
    openGraph: {
      title: "Climb Performance Calculator",
      description:
        "Calculate climb performance based on aircraft POH data with automatic density altitude corrections",
      type: "website",
    },
  };
}
