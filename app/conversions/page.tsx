import { Suspense } from "react";
import { ConversionCalculatorClient } from "./ConversionCalculatorClient";
import { categories, type Category } from "@/lib/unitConversions";
import { PageLayout } from "../components/PageLayout";

export { generateMetadata } from "./metadata";

interface ConversionsPageProps {
  searchParams: Promise<{
    cat?: string;
    val?: string;
    from?: string;
  }>;
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
