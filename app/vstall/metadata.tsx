import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  return {
    title: "V-Stall Calculator | José's Flight Tools",
    description:
      "Calculate stall speed (IAS and TAS) under different flight conditions including weight, bank angle, flap configuration, and density altitude.",
    keywords: [
      "stall speed",
      "vstall",
      "vs",
      "vs0",
      "accelerated stall",
      "bank angle",
      "load factor",
      "density altitude",
      "aviation calculator",
      "flight planning",
    ],
    openGraph: {
      title: "V-Stall Calculator | José's Flight Tools",
      description:
        "Calculate stall speed under different conditions with weight, bank angle, and altitude adjustments",
      type: "website",
    },
  };
}
