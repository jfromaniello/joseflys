import { ViewAircraftClient } from "./ViewAircraftClient";

export const metadata = {
  title: "View Aircraft | JoseFlys",
  description: "View aircraft performance data",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ViewAircraftPage({ params }: PageProps) {
  const { id } = await params;

  return <ViewAircraftClient aircraftId={id} />;
}
