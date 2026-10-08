import { Metadata } from "next";

export function generateMetadata(): Metadata {
  return {
    title: "Wind Components Calculator | José's Aviation Calculators",
    description:
      "Calculate headwind, tailwind and crosswind components relative to your heading in flight or a runway. Enter heading (or runway) and wind, or the relative wind angle and speed, and see the result plotted on a wind component chart.",
    openGraph: {
      title: "Wind Components Calculator",
      description: "Headwind and crosswind components for any heading or runway, plotted on a wind component chart",
      type: "website",
    },
  };
}
