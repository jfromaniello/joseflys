import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aviation Unit Converter | Distance, Speed, Fuel, Temperature",
  description:
    "Convert aviation units including distances (NM, SM, KM), speeds (knots, MPH), fuel volumes (gallons, liters), temperatures (°C, °F, K), weight, and pressure. Inspired by the Jeppesen CR-3 calculator.",
  keywords: [
    "unit converter",
    "aviation calculator",
    "nautical miles",
    "knots",
    "aviation fuel",
    "temperature conversion",
    "distance converter",
    "speed converter",
    "Jeppesen CR-3",
    "pilot tools",
  ],
  openGraph: {
    title: "Aviation Unit Converter",
    description:
      "Convert aviation units - distances, speeds, fuel, temperature, weight, and pressure. Inspired by the Jeppesen CR-3.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aviation Unit Converter",
    description:
      "Convert aviation units - distances, speeds, fuel, temperature, weight, and pressure.",
  },
};

export default function ConversionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
