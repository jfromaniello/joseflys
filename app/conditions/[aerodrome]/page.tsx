import type { Metadata } from "next";
import {
  fetchMetar,
  fetchTaf,
  getRunways,
  fetchTomorrow,
  fetchOpenMeteo,
  getAerodromeByCode,
  fetchNotams,
} from "@/lib/clients";
import { ConditionsView } from "./ConditionsView";

// Check if NOTAM fetching is enabled
const NOTAM_ENABLED = !!process.env.NOTAM_SEARCH_URL;

interface ConditionsPageProps {
  params: Promise<{
    aerodrome: string;
  }>;
}

export async function generateMetadata({ params }: ConditionsPageProps): Promise<Metadata> {
  const { aerodrome } = await params;
  const code = aerodrome.toUpperCase();
  const aerodromeInfo = getAerodromeByCode(code);
  const title = `${code} Conditions | JoseFlys`;
  const description = `Current weather, METAR, and runway information for ${aerodromeInfo?.name || code}`;
  const ogImageUrl = `/api/og-conditions?code=${code}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
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
  const [metarResult, tafResult, runwaysResult, tomorrowResult, openMeteoResult, notamsResult] = await Promise.all([
    fetchMetar(aerodromeCode, lat, lon),
    fetchTaf(aerodromeCode, lat, lon),
    Promise.resolve(getRunways(aerodromeCode)),
    lat !== undefined && lon !== undefined
      ? fetchTomorrow(aerodromeCode, lat, lon)
      : Promise.resolve({ current: null, hourly: [] }),
    lat !== undefined && lon !== undefined
      ? fetchOpenMeteo(lat, lon)
      : Promise.resolve(null),
    NOTAM_ENABLED
      ? fetchNotams(aerodromeCode).catch((err) => {
          console.error("[NOTAM] Failed to fetch:", err);
          return [];
        })
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
      notams={notamsResult}
      fetchedAt={new Date().toISOString()}
    />
  );
}
