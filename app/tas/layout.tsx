import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "TAS Calculator - True Airspeed Calculator | José's Aviation Calculators",
    description: "Calculate True Airspeed (TAS) from Calibrated Airspeed (CAS), Outside Air Temperature (OAT), and Pressure Altitude using the ISA model. Free online aviation calculator for pilots and flight planning.",
    keywords: [
      "TAS calculator",
      "true airspeed calculator",
      "calibrated airspeed",
      "CAS to TAS",
      "ISA calculator",
      "airspeed calculator",
      "aviation calculator",
      "flight planning calculator",
      "pilot tools",
      "pressure altitude calculator",
      "OAT calculator",
      "air density calculator",
      "indicated airspeed",
      "aviation tools",
    ],
    authors: [{ name: "José", url: "https://twitter.com/jfroma" }],
    creator: "José",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title: "TAS Calculator - True Airspeed Calculator",
      description: "Calculate True Airspeed from CAS, OAT, and Pressure Altitude using ISA model",
      type: "website",
      siteName: "José's Aviation Calculators",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: "TAS Calculator - True Airspeed Calculator",
      description: "Calculate True Airspeed from CAS, OAT, and Pressure Altitude using ISA model",
      creator: "@jfroma",
    },
    alternates: {
      canonical: "/tas",
    },
    category: "Aviation",
  };
}

export default function TASLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
