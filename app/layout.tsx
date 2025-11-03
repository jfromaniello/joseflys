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
  title: "José's Aviation Calculators",
  description: "Professional aviation calculators for TAS, wind correction, and flight planning. Calculate true airspeed, ground speed, and wind components.",
  openGraph: {
    title: "José's Aviation Calculators",
    description: "Professional flight planning tools - TAS Calculator & Wind Calculator",
    type: "website",
    siteName: "José's Aviation Calculators",
  },
  twitter: {
    card: "summary_large_image",
    title: "José's Aviation Calculators",
    description: "Professional flight planning tools - TAS Calculator & Wind Calculator",
  },
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
