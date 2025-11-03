import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "José's Wind Calculator - Wind Correction & Ground Speed",
    description: "Calculate wind correction angle, ground speed, compass heading, and wind components for accurate flight planning",
    openGraph: {
      title: "José's Wind Calculator",
      description: "Calculate wind correction angle, ground speed, and compass heading",
      type: "website",
      siteName: "José's Aviation Calculators",
    },
    twitter: {
      card: "summary_large_image",
      title: "José's Wind Calculator",
      description: "Calculate wind correction angle, ground speed, and compass heading",
    },
  };
}

export default function WindsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
