import { Suspense } from "react";
import type { Metadata } from "next";
import { ConversionCalculatorClient } from "./ConversionCalculatorClient";
import { categories, type Category } from "@/lib/unitConversions";
import { PageLayout } from "../components/PageLayout";

interface ConversionsPageProps {
  searchParams: Promise<{
    cat?: string;
    val?: string;
    from?: string;
  }>;
}

export async function generateMetadata({ searchParams }: ConversionsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const category = (params.cat || "distance") as Category;
  const value = params.val || "";
  const fromUnit = params.from || "";

  // Build dynamic OG image URL with query params
  const hasParams = category || value || fromUnit;
  const ogImageUrl = hasParams
    ? `/api/og-conversions?cat=${category}&val=${value}&from=${fromUnit}`
    : undefined;

  const categoryName = categories[category as Category]?.name || "Unit";

  return {
    title: `Aviation Unit Converter - ${categoryName} Conversions | José's Aviation Tools`,
    description: "Convert aviation units including distance, speed, fuel, temperature, weight, and pressure. Inspired by the Jeppesen CR-3 calculator. Free online tool for pilots and aviation professionals.",
    keywords: [
      "aviation unit converter",
      "unit conversion",
      "distance converter",
      "speed converter",
      "fuel converter",
      "temperature converter",
      "weight converter",
      "pressure converter",
      "nautical miles",
      "knots converter",
      "aviation calculator",
      "pilot tools",
      "flight planning",
      "CR-3 calculator",
      "Jeppesen calculator",
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
      title: `Aviation Unit Converter - ${categoryName} Conversions`,
      description: "Convert aviation units - distance, speed, fuel, temperature, weight, pressure",
      type: "website",
      siteName: "José's Aviation Calculators",
      locale: "en_US",
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `Aviation Unit Converter - ${categoryName} Conversions`,
      description: "Convert aviation units - distance, speed, fuel, temperature, weight, pressure",
      creator: "@jfroma",
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    alternates: {
      canonical: "/conversions",
    },
    category: "Aviation",
  };
}

export default async function ConversionsPage({ searchParams }: ConversionsPageProps) {
  const params = await searchParams;
  const category = (params.cat || "distance") as Category;
  const value = params.val || "100";
  const fromUnit = params.from || categories.distance.units[0].symbol;

  return (
    <Suspense
      fallback={
        <PageLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div
              className="text-lg font-medium"
              style={{ color: "oklch(0.72 0.015 240)" }}
            >
              Loading calculator...
            </div>
          </div>
        </PageLayout>
      }
    >
      <ConversionCalculatorClient
        initialCategory={category}
        initialValue={value}
        initialFromUnit={fromUnit}
      />
    </Suspense>
  );
}
