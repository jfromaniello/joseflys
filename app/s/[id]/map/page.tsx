import { notFound } from "next/navigation";
import { getSharedFlightPlan } from "@/lib/redis";
import { ImportAndRedirect } from "./ImportAndRedirect";
import type { FlightPlan } from "@/lib/flightPlan";

// Force dynamic rendering - this page needs to fetch from Redis on each request
export const dynamic = "force-dynamic";

interface ShortLinkMapPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ShortLinkMapPage({ params }: ShortLinkMapPageProps) {
  const { id } = await params;

  // Fetch the flight plan from Redis
  let planData: unknown = null;
  try {
    planData = await getSharedFlightPlan(id);
  } catch (error) {
    console.error(`[/s/${id}/map] Redis error:`, error);
    notFound();
  }

  if (!planData) {
    notFound();
  }

  // Upstash client auto-deserializes JSON, so planData is already the object
  const flightPlan = (typeof planData === "string" ? JSON.parse(planData) : planData) as FlightPlan;

  // Pass to client component which will handle localStorage import and redirect
  return <ImportAndRedirect flightPlan={flightPlan} redirectTo="map" />;
}
