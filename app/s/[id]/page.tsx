import { redirect, notFound } from "next/navigation";
import { getSharedFlightPlan } from "@/lib/redis";
import type { FlightPlan } from "@/lib/flightPlan";
import { serializeFlightPlan } from "@/lib/flightPlan";

// Force dynamic rendering - this page needs to fetch from Redis on each request
export const dynamic = "force-dynamic";

interface ShortLinkPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ShortLinkPage({ params }: ShortLinkPageProps) {
  const { id } = await params;

  console.log(`[/s/${id}] Fetching shared flight plan...`);

  // Fetch the flight plan from Redis
  let planData: unknown = null;
  try {
    planData = await getSharedFlightPlan(id);
    console.log(`[/s/${id}] Redis response:`, planData ? "Found" : "Not found");
  } catch (error) {
    console.error(`[/s/${id}] Redis error:`, error);
    notFound();
  }

  if (!planData) {
    console.log(`[/s/${id}] Plan not found in Redis`);
    notFound();
  }

  // Upstash client auto-deserializes JSON, so planData is already the object
  const flightPlan = (typeof planData === "string" ? JSON.parse(planData) : planData) as FlightPlan;
  console.log(`[/s/${id}] Parsed flight plan: "${flightPlan.name}" with ${flightPlan.legs.length} legs`);

  // Re-serialize using the existing CBOR format for the import page
  const serialized = serializeFlightPlan(flightPlan);

  // Redirect to the import page with the serialized plan
  // Note: redirect() throws NEXT_REDIRECT internally, so it must be outside try/catch
  redirect(`/flight-plans/import?plan=${serialized}`);
}
