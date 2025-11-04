import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "José's Aviation Calculators - TAS & Wind Calculator",
  description: "Experimental aviation calculators for TAS, wind correction, and flight planning. Calculate true airspeed, ground speed, and wind components.",
  keywords: [
    "aviation calculator",
    "TAS calculator",
    "true airspeed calculator",
    "wind calculator",
    "wind correction angle",
    "ground speed calculator",
    "flight planning",
    "aviation tools",
    "pilot calculator",
    "airspeed calculator",
    "headwind calculator",
    "crosswind calculator",
    "ISA calculator",
    "compass heading calculator",
    "WCA calculator",
    "ETAS calculator",
  ],
  authors: [{ name: "José", url: "https://twitter.com/jfroma" }],
  creator: "José",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
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
    title: "José's Aviation Calculators - TAS & Wind Calculator",
    description: "Experimental flight planning tools - TAS Calculator & Wind Calculator",
    type: "website",
    siteName: "José's Aviation Calculators",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "José's Aviation Calculators - TAS & Wind Calculator",
    description: "Experimental flight planning tools - TAS Calculator & Wind Calculator",
    creator: "@jfroma",
  },
  alternates: {
    canonical: "/",
  },
  category: "Aviation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
