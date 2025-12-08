import type { Metadata } from "next";
import {
  fetchMetar,
  fetchTaf,
  getRunways,
  fetchTomorrow,
  fetchOpenMeteo,
  getAerodromeByCode,
} from "@/lib/clients";
import { ConditionsView } from "./ConditionsView";

interface ConditionsPageProps {
  params: Promise<{
    aerodrome: string;
  }>;
}

export async function generateMetadata({ params }: ConditionsPageProps): Promise<Metadata> {
  const { aerodrome } = await params;
  return {
    title: `${aerodrome.toUpperCase()} Conditions | JoseFlys`,
    description: `Current weather, METAR, and runway information for ${aerodrome.toUpperCase()}`,
  };
}

export default async function ConditionsDetailPage({ params }: ConditionsPageProps) {
  const { aerodrome } = await params;
  const aerodromeCode = aerodrome.toUpperCase();

  // Get aerodrome info first (needed for lat/lon)
  const aerodromeInfo = getAerodromeByCode(aerodromeCode);
  const lat = aerodromeInfo?.lat;
  const lon = aerodromeInfo?.lon;

  // Fetch all data in parallel
  const [metarResult, tafResult, runwaysResult, tomorrowResult, openMeteoResult] = await Promise.all([
    fetchMetar(aerodromeCode, lat, lon),
    fetchTaf(aerodromeCode, lat, lon),
    Promise.resolve(getRunways(aerodromeCode)),
    lat !== undefined && lon !== undefined
      ? fetchTomorrow(aerodromeCode, lat, lon)
      : Promise.resolve({ current: null, hourly: [] }),
    lat !== undefined && lon !== undefined
      ? fetchOpenMeteo(lat, lon)
      : Promise.resolve(null),
  ]);

  return (
    <ConditionsView
      aerodromeCode={aerodromeCode}
      aerodrome={aerodromeInfo}
      metar={metarResult.metar}
      metarSource={metarResult.source}
      metarDistance={metarResult.distance ?? null}
      taf={tafResult.taf}
      tafSource={tafResult.source}
      tafDistance={tafResult.distance ?? null}
      runways={runwaysResult.runways}
      tomorrow={tomorrowResult.current ? { current: tomorrowResult.current, hourly: tomorrowResult.hourly } : null}
      openMeteo={openMeteoResult}
      fetchedAt={new Date().toISOString()}
    />
  );
}
