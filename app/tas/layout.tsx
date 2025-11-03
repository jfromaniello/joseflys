import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "José's TAS Calculator - True Airspeed Calculator",
    description: "Calculate True Airspeed (TAS) from Calibrated Airspeed (CAS), Outside Air Temperature, and Pressure Altitude using the ISA model",
    openGraph: {
      title: "José's TAS Calculator",
      description: "Calculate True Airspeed from CAS, OAT, and Pressure Altitude",
      type: "website",
      siteName: "José's Aviation Calculators",
    },
    twitter: {
      card: "summary_large_image",
      title: "José's TAS Calculator",
      description: "Calculate True Airspeed from CAS, OAT, and Pressure Altitude",
    },
  };
}

export default function TASLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
