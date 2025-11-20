import { AircraftEditorClient } from "./AircraftEditorClient";

export const metadata = {
  title: "Edit Aircraft | JoseFlys",
  description: "Edit aircraft performance data",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AircraftEditorPage({ params }: PageProps) {
  const { id } = await params;

  return <AircraftEditorClient aircraftId={id} />;
}
