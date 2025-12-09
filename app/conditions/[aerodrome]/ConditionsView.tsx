"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/app/components/Navbar";
import { AerodromeSearchInput, AerodromeResult } from "@/app/components/AerodromeSearchInput";
import { MetarData, TafData, Runway, OpenMeteoData, TomorrowData, Aerodrome, Notam } from "./types";
import { MetarCard } from "./MetarCard";
import { TafCard } from "./TafCard";
import { AerodromeInfoCard } from "./AerodromeInfoCard";
import { WeatherCard } from "./WeatherCard";
import { LocationMap } from "./LocationMap";
import { WindyEmbed } from "./WindyEmbed";
import { NotamCard } from "./NotamCard";
import { AISummaryCard } from "./AISummaryCard";
import { SunTimesCard } from "./SunTimesCard";
import { selectBestRunway } from "@/lib/runwayUtils";
import { getSunPosition } from "@/lib/sun";

interface ConditionsViewProps {
  aerodromeCode: string;
  aerodrome: Aerodrome | null;
  metar: MetarData | null;
  metarSource: "direct" | "nearby" | null;
  metarDistance: number | null;
  taf: TafData | null;
  tafSource: "direct" | "nearby" | null;
  tafDistance: number | null;
  runways: Runway[];
  tomorrow: TomorrowData | null;
  openMeteo: OpenMeteoData | null;
  notams: Notam[] | null;
  fetchedAt: string;
}

export function ConditionsView({
  aerodromeCode,
  aerodrome,
  metar,
  metarSource,
  metarDistance,
  taf,
  tafSource,
  tafDistance,
  runways,
  tomorrow,
  openMeteo,
  notams,
  fetchedAt,
}: ConditionsViewProps) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Set map ready after mount (for Leaflet SSR)
  useEffect(() => {
    setMapReady(true);
  }, []);

  // Handle refresh using router.refresh() to re-fetch server data
  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    // Reset refreshing state after a short delay
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Handle aerodrome change from search
  const handleAerodromeChange = (newAerodrome: AerodromeResult | null) => {
    if (newAerodrome?.code) {
      router.push(`/conditions/${newAerodrome.code}`);
    }
  };

  // Convert Aerodrome to AerodromeResult for the search input
  const aerodromeResult: AerodromeResult | null = aerodrome
    ? {
        type: aerodrome.type,
        code: aerodrome.code,
        name: aerodrome.name,
        lat: aerodrome.lat,
        lon: aerodrome.lon,
        elevation: aerodrome.elevation,
      }
    : null;

  const lastUpdate = new Date(fetchedAt);

  // Get best runway for AI summary
  const bestRunway = metar && runways.length > 0
    ? selectBestRunway(runways, metar.wdir, metar.wspd)
    : null;

  // Get sun position for VFR night warning
  const sunPosition = aerodrome
    ? getSunPosition(aerodrome.lat, aerodrome.lon)
    : null;

  // Prepare recommended runway data for AI summary
  const recommendedRunway = bestRunway
    ? {
        endId: bestRunway.endId,
        headwind: bestRunway.headwind,
        crosswind: bestRunway.crosswind,
      }
    : null;

  // Prepare weather data for AI summary (convert null to undefined for type compatibility)
  const weatherForAI = openMeteo || tomorrow
    ? {
        temperature: openMeteo?.current?.temperature_2m ?? tomorrow?.current?.temperature ?? undefined,
        humidity: openMeteo?.current?.relative_humidity_2m ?? tomorrow?.current?.humidity ?? undefined,
        windSpeed: openMeteo?.current?.wind_speed_10m ?? tomorrow?.current?.windSpeed ?? undefined,
        windDirection: openMeteo?.current?.wind_direction_10m ?? tomorrow?.current?.windDirection ?? undefined,
        cloudCover: openMeteo?.current?.cloud_cover ?? tomorrow?.current?.cloudCover ?? undefined,
        visibility: tomorrow?.current?.visibility ?? undefined,
      }
    : null;

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
      <Navbar currentPage="conditions" />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header with Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <Link href="/conditions" className="text-sky-400 hover:text-sky-300 text-sm mb-2 inline-block">
                ← Back to search
              </Link>
              <h1 className="text-3xl font-bold text-white">
                {aerodrome?.name || aerodromeCode}
              </h1>
              {aerodrome && (
                <p className="text-slate-400 mt-1">
                  {aerodrome.code} • {aerodrome.type === "AD" ? "Aerodrome" : "Landing Area"}
                  {aerodrome.elevation !== null && ` • ${aerodrome.elevation} ft`}
                </p>
              )}
            </div>
            <div className="w-full md:w-72">
              <AerodromeSearchInput
                value={null}
                onChange={handleAerodromeChange}
                placeholder="Change airport..."
                showLabel={false}
              />
            </div>
          </div>

          {/* METAR Card */}
          <MetarCard
            metar={metar}
            metarSource={metarSource}
            metarDistance={metarDistance}
            runways={runways}
            loading={refreshing}
            error={!metar && !refreshing ? "No METAR data available" : null}
            onRefresh={handleRefresh}
            isVfrLegal={sunPosition?.isVfrLegal ?? true}
          />

          {/* Sun Times Card */}
          {aerodrome && (
            <SunTimesCard lat={aerodrome.lat} lon={aerodrome.lon} />
          )}

          {/* TAF Card */}
          <TafCard
            taf={taf}
            tafSource={tafSource}
            tafDistance={tafDistance}
            loading={refreshing}
          />

          {/* NOTAM Card (only if enabled) */}
          {notams !== null && (
            <NotamCard notams={notams} loading={refreshing} />
          )}

          {/* Aerodrome Info Card (Location + Runways) */}
          {aerodrome && (
            <AerodromeInfoCard
              aerodrome={aerodromeResult!}
              runways={runways}
              metar={metar}
              loadingRunways={false}
            />
          )}

          {/* Online Weather Card */}
          <WeatherCard
            openMeteo={openMeteo}
            tomorrow={tomorrow}
            loading={refreshing}
          />

          {/* Map Card */}
          {aerodrome && mapReady && <LocationMap aerodrome={aerodromeResult!} />}

          {/* Windy Embed */}
          {aerodrome && <WindyEmbed aerodrome={aerodromeResult!} />}

          {/* AI Summary */}
          <AISummaryCard
            aerodromeCode={aerodromeCode}
            aerodrome={aerodrome ? {
              name: aerodrome.name,
              type: aerodrome.type,
              elevation: aerodrome.elevation,
              lat: aerodrome.lat,
              lon: aerodrome.lon,
            } : null}
            metar={metar ? {
              rawOb: metar.rawOb,
              temp: metar.temp,
              dewp: metar.dewp,
              wdir: metar.wdir,
              wspd: metar.wspd,
              wgst: metar.wgst,
              altim: metar.altim,
              visib: metar.visib,
              fltCat: metar.fltCat,
            } : null}
            taf={taf ? { rawTAF: taf.rawTAF } : null}
            runways={runways.map(r => ({
              id: r.id,
              length: r.length,
              width: r.width,
              surface: r.surface,
              lighted: r.lighted,
              closed: r.closed,
            }))}
            recommendedRunway={recommendedRunway}
            notams={notams}
            weather={weatherForAI}
            sunTimes={sunPosition ? {
              civilDawn: sunPosition.times.civilDawn.toISOString(),
              sunrise: sunPosition.times.sunrise.toISOString(),
              sunset: sunPosition.times.sunset.toISOString(),
              civilDusk: sunPosition.times.civilDusk.toISOString(),
              isVfrLegal: sunPosition.isVfrLegal,
              phase: sunPosition.phase,
            } : null}
          />

          {/* Quick Links */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href={`/takeoff?ad=${aerodromeCode}`}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm transition-colors"
            >
              Takeoff Calculator
            </Link>
            {aerodrome && (
              <a
                href={`https://skyvector.com/airport/${aerodromeCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
              >
                SkyVector
              </a>
            )}
          </div>

          {/* Last update */}
          <p className="text-xs text-slate-600 text-center mt-6">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
      </div>
    </main>
  );
}
