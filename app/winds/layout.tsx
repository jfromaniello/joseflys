import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wind Calculator - Wind Correction Angle & Ground Speed | José's Aviation Calculators",
  description: "Calculate wind correction angle (WCA), ground speed, compass heading, headwind, crosswind, and ETAS for accurate flight planning. Free online wind triangle calculator for pilots.",
  keywords: [
    "wind calculator",
    "wind correction angle",
    "WCA calculator",
    "ground speed calculator",
    "wind triangle",
    "crosswind calculator",
    "headwind calculator",
    "compass heading calculator",
    "flight planning calculator",
    "aviation calculator",
    "pilot calculator",
    "magnetic deviation",
    "ETAS calculator",
    "effective true airspeed",
    "wind component calculator",
    "navigation calculator",
    "aviation tools",
    "pilot tools",
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
    title: "Wind Calculator - Wind Correction Angle & Ground Speed",
    description: "Calculate wind correction angle, ground speed, compass heading, and wind components for flight planning",
    type: "website",
    siteName: "José's Aviation Calculators",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wind Calculator - Wind Correction Angle & Ground Speed",
    description: "Calculate wind correction angle, ground speed, compass heading, and wind components for flight planning",
    creator: "@jfroma",
  },
  alternates: {
    canonical: "/winds",
  },
  category: "Aviation",
};

export default function WindsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
