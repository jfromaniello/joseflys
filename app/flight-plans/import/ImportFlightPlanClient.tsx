"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageLayout } from "../../components/PageLayout";
import { CalculatorPageHeader } from "../../components/CalculatorPageHeader";
import { Footer } from "../../components/Footer";
import {
  deserializeFlightPlan,
  createFlightPlan,
  getFlightPlanById,
  addOrUpdateLeg,
  findDuplicateFlightPlan,
} from "@/lib/flightPlan";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

interface ImportFlightPlanClientProps {
  serializedPlan: string;
}

export function ImportFlightPlanClient({
  serializedPlan,
}: ImportFlightPlanClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "existing" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [flightPlanId, setFlightPlanId] = useState<string>("");

  useEffect(() => {
    // Safe: Synchronizing with external system (URL params, localStorage)
    // Import and deserialize flight plan from URL parameter on mount
    if (!serializedPlan) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("error");
      setErrorMessage("No flight plan data provided");
      return;
    }

    try {
      // Deserialize the flight plan
      const deserialized = deserializeFlightPlan(serializedPlan);

      // Check if an identical flight plan already exists
      const existingPlan = findDuplicateFlightPlan(deserialized);
      if (existingPlan) {
        // Found duplicate - redirect to existing plan
        setFlightPlanId(existingPlan.id);
        setStatus("existing");

        setTimeout(() => {
          router.push(`/flight-plans/${existingPlan.id}`);
        }, 1500);
        return;
      }

      // No duplicate found - create new plan
      let flightPlan = createFlightPlan(deserialized.name, deserialized.date);

      // Add all legs
      deserialized.legs.forEach((leg) => {
        addOrUpdateLeg(flightPlan.id, leg);
      });

      // Refresh to get updated plan
      flightPlan = getFlightPlanById(flightPlan.id)!;

      setFlightPlanId(flightPlan.id);
      setStatus("success");

      // Redirect to the flight plan after a short delay
      setTimeout(() => {
        router.push(`/flight-plans/${flightPlan.id}`);
      }, 1500);
    } catch (error) {
      console.error("Failed to import flight plan:", error);
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to import flight plan"
      );
    }
  }, [serializedPlan, router]);

  return (
    <PageLayout currentPage="flight-plans">
      <CalculatorPageHeader
        title="Import Flight Plan"
        description="Importing shared flight plan"
      />

      <main className="w-full max-w-4xl">
        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">
          {status === "loading" && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-lg" style={{ color: "oklch(0.7 0.02 240)" }}>
                Importing flight plan...
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center py-12">
              <div
                className="text-5xl mb-4"
                style={{ color: "oklch(0.7 0.15 120)" }}
              >
                ✓
              </div>
              <p className="text-lg text-white mb-2">
                Flight plan imported successfully!
              </p>
              <p
                className="text-sm mb-6"
                style={{ color: "oklch(0.6 0.02 240)" }}
              >
                Redirecting to flight plan...
              </p>
              {flightPlanId && (
                <Link
                  href={`/flight-plans/${flightPlanId}`}
                  className="inline-flex px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  View Flight Plan
                </Link>
              )}
            </div>
          )}

          {status === "existing" && (
            <div className="text-center py-12">
              <div
                className="text-5xl mb-4"
                style={{ color: "oklch(0.7 0.15 230)" }}
              >
                ✓
              </div>
              <p className="text-lg text-white mb-2">
                Flight plan already exists!
              </p>
              <p
                className="text-sm mb-6"
                style={{ color: "oklch(0.6 0.02 240)" }}
              >
                Opening existing flight plan...
              </p>
              {flightPlanId && (
                <Link
                  href={`/flight-plans/${flightPlanId}`}
                  className="inline-flex px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  View Flight Plan
                </Link>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-12">
              <div
                className="text-5xl mb-4"
                style={{ color: "oklch(0.6 0.15 0)" }}
              >
                ✗
              </div>
              <p className="text-lg text-white mb-2">
                Failed to import flight plan
              </p>
              <p
                className="text-sm mb-6"
                style={{ color: "oklch(0.6 0.02 240)" }}
              >
                {errorMessage}
              </p>
              <Link
                href="/flight-plans"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                Back to Flight Plans
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer description="Import flight plan from shared link" />
    </PageLayout>
  );
}
