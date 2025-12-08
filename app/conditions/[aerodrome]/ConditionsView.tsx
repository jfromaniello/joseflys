"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/app/components/Navbar";
import { AerodromeSearchInput, AerodromeResult } from "@/app/components/AerodromeSearchInput";
import { MetarData, TafData, Runway, OpenMeteoData, TomorrowData, Aerodrome } from "./types";
import { MetarCard } from "./MetarCard";
import { TafCard } from "./TafCard";
import { AerodromeInfoCard } from "./AerodromeInfoCard";
import { WeatherCard } from "./WeatherCard";
import { LocationMap } from "./LocationMap";
import { WindyEmbed } from "./WindyEmbed";

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
                value={aerodromeResult}
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
          />

          {/* TAF Card */}
          <TafCard
            taf={taf}
            tafSource={tafSource}
            tafDistance={tafDistance}
            loading={refreshing}
          />

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
