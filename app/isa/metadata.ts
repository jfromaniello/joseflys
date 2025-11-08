import { Metadata } from "next";

export function generateMetadata(): Metadata {
  return {
    title: "ISA Calculator | José's Aviation Calculators",
    description:
      "Calculate ISA Temperature, Pressure Altitude, and Density Altitude. Enter elevation, QNH (in hPa or inHg), and actual temperature to get atmospheric parameters for flight planning.",
    openGraph: {
      title: "ISA Calculator",
      description:
        "Calculate ISA Temperature, Pressure Altitude, and Density Altitude based on elevation, QNH, and actual temperature",
      type: "website",
    },
  };
}
