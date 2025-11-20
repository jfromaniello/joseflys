import type { Metadata } from "next";

// Common metadata configuration
export const SITE_CONFIG = {
  name: "José's Aviation Tools",
  author: {
    name: "José Romaniello",
    twitter: "@jfroma",
    url: "https://twitter.com/jfroma",
  },
  baseUrl: "https://joseflys.com",
  category: "Aviation",
} as const;

// Common keywords that apply to all aviation calculators
const COMMON_KEYWORDS = [
  "aviation calculator",
  "pilot tools",
  "flight planning",
  "aviation tools",
  "aviation navigation",
] as const;

// Common robots configuration
const COMMON_ROBOTS = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-video-preview": -1,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
} as const;

interface CreateMetadataParams {
  title: string;
  description: string;
  keywords?: string[];
  path: string;
  ogImage?: string;
}

/**
 * Creates standardized metadata for a page
 */
export function createPageMetadata({
  title,
  description,
  keywords = [],
  path,
  ogImage,
}: CreateMetadataParams): Metadata {
  const url = `${SITE_CONFIG.baseUrl}${path}`;
  const allKeywords = [...keywords, ...COMMON_KEYWORDS];

  return {
    title,
    description,
    keywords: allKeywords,
    authors: [{ name: SITE_CONFIG.author.name, url: SITE_CONFIG.author.url }],
    creator: SITE_CONFIG.author.name,
    publisher: SITE_CONFIG.author.name,
    robots: COMMON_ROBOTS,
    openGraph: {
      title,
      description,
      type: "website",
      url,
      siteName: SITE_CONFIG.name,
      locale: "en_US",
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: SITE_CONFIG.author.twitter,
      site: SITE_CONFIG.author.twitter,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    alternates: {
      canonical: url,
    },
    category: SITE_CONFIG.category,
  };
}

/**
 * Creates the root layout metadata with all common settings
 */
export function createRootMetadata(): Metadata {
  return {
    title: "Aviation Tools for Flight Planning | TAS, Course & Performance",
    description:
      "Aviation tools for flight planning, performance, and navigation. Calculate TAS, compass course, wind correction, distance & bearing, fuel consumption, leg planning. Based on ISA and WGS-84.",
    keywords: [
      "aviation calculator",
      "flight planning calculator",
      "leg planner",
      "flight leg planner",
      "VFR navigation",
      "TAS calculator",
      "true airspeed calculator",
      "course calculator",
      "wind correction angle",
      "WCA calculator",
      "compass course calculator",
      "ground speed calculator",
      "distance calculator",
      "geodesic distance",
      "bearing calculator",
      "fuel consumption calculator",
      "waypoint navigation",
      "ETA calculator",
      "unit converter",
      "flight planning",
      "aviation tools",
      "pilot calculator",
      "navigation calculator",
      "airspeed calculator",
      "headwind calculator",
      "crosswind calculator",
      "ISA calculator",
      "compass heading calculator",
      "ETAS calculator",
      "WGS-84",
      "aviation navigation",
    ],
    authors: [{ name: SITE_CONFIG.author.name, url: SITE_CONFIG.author.url }],
    creator: SITE_CONFIG.author.name,
    publisher: SITE_CONFIG.author.name,
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
    robots: COMMON_ROBOTS,
    openGraph: {
      title: "Aviation Tools for Flight Planning",
      description:
        "Aviation tools for flight planning and performance. Leg planner, TAS, compass course, wind correction, distance & bearing, fuel consumption. ISA & WGS-84 based.",
      type: "website",
      url: SITE_CONFIG.baseUrl,
      siteName: SITE_CONFIG.name,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: "Aviation Tools for Flight Planning",
      description:
        "Aviation tools: Leg planner, TAS, compass course, wind correction, distance & bearing, fuel consumption. ISA & WGS-84 based.",
      creator: SITE_CONFIG.author.twitter,
      site: SITE_CONFIG.author.twitter,
    },
    alternates: {
      canonical: SITE_CONFIG.baseUrl,
    },
    category: SITE_CONFIG.category,
    applicationName: SITE_CONFIG.name,
    referrer: "origin-when-cross-origin",
    metadataBase: new URL(SITE_CONFIG.baseUrl),
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: SITE_CONFIG.name,
    },
    formatDetection: {
      telephone: false,
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

/**
 * Creates the structured data (JSON-LD) for the site
 */
export function createStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_CONFIG.name,
    applicationCategory: "UtilityApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Professional aviation tools for flight planning, performance, and navigation. Calculate true airspeed (TAS), compass course, wind correction, geodesic distance, fuel consumption, leg planning with waypoints, and more.",
    url: SITE_CONFIG.baseUrl,
    author: {
      "@type": "Person",
      name: SITE_CONFIG.author.name,
      url: SITE_CONFIG.author.url,
    },
    publisher: {
      "@type": "Person",
      name: SITE_CONFIG.author.name,
    },
    featureList: [
      "Flight Leg Planner with Waypoints",
      "Course Calculator with Wind Correction",
      "True Airspeed (TAS) Calculator",
      "Distance & Bearing Calculator (WGS-84)",
      "Flight Planning Calculator",
      "Aviation Unit Converter",
      "Fuel Consumption Calculator",
    ],
    screenshot: `${SITE_CONFIG.baseUrl}/api/og`,
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    softwareVersion: "1.0",
  };
}
