import { ViewAircraftClient } from "./ViewAircraftClient";
import { PRESET_AIRCRAFT, ResolvedAircraftPerformance } from "@/lib/aircraft";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const preset = PRESET_AIRCRAFT.find(p => p.model === id);

  return {
    title: preset ? `${preset.name} | JoseFlys` : "View Aircraft | JoseFlys",
    description: preset?.description || "View aircraft performance data",
  };
}

export default async function ViewAircraftPage({ params }: PageProps) {
  const { id } = await params;

  // Try to find in presets (SSR)
  const preset = PRESET_AIRCRAFT.find(p => p.model === id);
  const initialAircraft = preset ? {
    ...preset,
    isCustom: false,
  } as ResolvedAircraftPerformance : null;

  return <ViewAircraftClient aircraftId={id} initialAircraft={initialAircraft} />;
}
