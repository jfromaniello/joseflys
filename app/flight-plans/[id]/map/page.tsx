import { Metadata } from "next";
import { FlightPlanMapClient } from "./FlightPlanMapClient";

export const metadata: Metadata = {
  title: "Flight Plan Map - José's Aviation",
  description: "View flight plan route on map",
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function FlightPlanMapPage({ params }: PageProps) {
  const { id } = await params;

  return <FlightPlanMapClient flightPlanId={id} />;
}
