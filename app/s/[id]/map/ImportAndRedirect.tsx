"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createFlightPlan,
  addOrUpdateLeg,
  findDuplicateFlightPlan,
  type FlightPlan,
} from "@/lib/flightPlan";

interface ImportAndRedirectProps {
  flightPlan: FlightPlan;
  redirectTo: "map" | "detail";
}

export function ImportAndRedirect({ flightPlan, redirectTo }: ImportAndRedirectProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"importing" | "redirecting">("importing");

  useEffect(() => {
    // Check if an identical flight plan already exists
    const existingPlan = findDuplicateFlightPlan({
      name: flightPlan.name,
      date: flightPlan.date,
      legs: flightPlan.legs,
    });

    let targetId: string;

    if (existingPlan) {
      // Use existing plan
      targetId = existingPlan.id;
    } else {
      // Create new plan
      const newPlan = createFlightPlan(flightPlan.name, flightPlan.date);
      flightPlan.legs.forEach((leg) => {
        addOrUpdateLeg(newPlan.id, leg);
      });
      targetId = newPlan.id;
    }

    setStatus("redirecting");

    // Redirect to the appropriate page
    const targetPath = redirectTo === "map"
      ? `/flight-plans/${targetId}/map`
      : `/flight-plans/${targetId}`;

    router.replace(targetPath);
  }, [flightPlan, redirectTo, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-lg text-slate-300">
          {status === "importing" ? "Importing flight plan..." : "Redirecting to map..."}
        </p>
      </div>
    </div>
  );
}
