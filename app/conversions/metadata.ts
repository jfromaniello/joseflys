import type { Metadata } from "next";
import { categories, type Category } from "@/lib/unitConversions";
import { createPageMetadata } from "@/lib/metadata";

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

  return createPageMetadata({
    title: `Aviation Unit Converter | ${categoryName} Conversions`,
    description: "Convert aviation units: distance (nm, mi, km), speed (knots, mph, km/h), fuel, temperature, weight, and pressure. Inspired by Jeppesen CR-3 for pilots.",
    keywords: [
      "aviation unit converter",
      "unit conversion calculator",
      "aviation converter",
      "distance converter",
      "nautical miles converter",
      "statute miles converter",
      "kilometers converter",
      "speed converter",
      "knots converter",
      "knots to mph",
      "mph to knots",
      "km/h converter",
      "fuel converter",
      "gallons to liters",
      "liters to gallons",
      "fuel flow converter",
      "temperature converter",
      "celsius to fahrenheit",
      "fahrenheit to celsius",
      "weight converter",
      "pounds to kilograms",
      "kg to lbs",
      "pressure converter",
      "inHg to hPa",
      "hPa to inHg",
      "millibars converter",
      "CR-3 calculator",
      "Jeppesen calculator",
      "E6B calculator",
      "flight computer",
    ],
    path: "/conversions",
    ogImage: ogImageUrl,
  });
}
