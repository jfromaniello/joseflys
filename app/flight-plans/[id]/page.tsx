import { FlightPlanDetailClient } from "./FlightPlanDetailClient";

export const metadata = {
  title: "Flight Plan Details | José Flies",
  description: "View detailed information about a flight plan and its legs",
};

interface FlightPlanDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function FlightPlanDetailPage({
  params,
}: FlightPlanDetailPageProps) {
  const { id } = await params;
  return <FlightPlanDetailClient flightPlanId={id} />;
}
