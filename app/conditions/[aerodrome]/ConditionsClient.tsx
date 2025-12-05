"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/app/components/Navbar";
import { AerodromeSearchInput, AerodromeResult } from "@/app/components/AerodromeSearchInput";
import { MetarData, MetarResponse, Runway, OpenMeteoData, TomorrowData } from "./types";
import { MetarCard } from "./MetarCard";
import { AerodromeInfoCard } from "./AerodromeInfoCard";
import { WeatherCard } from "./WeatherCard";
import { LocationMap } from "./LocationMap";
import { WindyEmbed } from "./WindyEmbed";

interface ConditionsClientProps {
  aerodromeCode: string;
}

export function ConditionsClient({ aerodromeCode }: ConditionsClientProps) {
  const router = useRouter();

  // Aerodrome info
  const [aerodrome, setAerodrome] = useState<AerodromeResult | null>(null);
  const [loadingAerodrome, setLoadingAerodrome] = useState(true);

  // METAR
  const [metar, setMetar] = useState<MetarData | null>(null);
  const [metarSource, setMetarSource] = useState<"direct" | "nearby" | null>(null);
  const [metarDistance, setMetarDistance] = useState<number | null>(null);
  const [loadingMetar, setLoadingMetar] = useState(true);
  const [metarError, setMetarError] = useState<string | null>(null);

  // Runways
  const [runways, setRunways] = useState<Runway[]>([]);
  const [loadingRunways, setLoadingRunways] = useState(true);

  // Open-Meteo forecast
  const [openMeteo, setOpenMeteo] = useState<OpenMeteoData | null>(null);
  const [loadingOpenMeteo, setLoadingOpenMeteo] = useState(true);

  // Tomorrow.io weather
  const [tomorrow, setTomorrow] = useState<TomorrowData | null>(null);

  // Map ready state
  const [mapReady, setMapReady] = useState(false);

  // Last update
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch aerodrome info
  useEffect(() => {
    const fetchAerodrome = async () => {
      setLoadingAerodrome(true);
      try {
        const response = await fetch(`/api/aerodromes?q=${encodeURIComponent(aerodromeCode)}&limit=1`);
        const data = await response.json();

        if (data.data && data.data.length > 0) {
          // Find exact match by code
          const exactMatch = data.data.find(
            (ad: AerodromeResult) => ad.code?.toUpperCase() === aerodromeCode.toUpperCase()
          );
          setAerodrome(exactMatch || data.data[0]);
        }
      } catch (error) {
        console.error("Failed to fetch aerodrome:", error);
      } finally {
        setLoadingAerodrome(false);
      }
    };

    fetchAerodrome();
  }, [aerodromeCode]);

  // Fetch METAR, Runways, Open-Meteo, and Tomorrow.io
  const fetchData = async () => {
    setLoadingMetar(true);
    setLoadingRunways(true);
    setLoadingOpenMeteo(true);
    setMetarError(null);

    const lat = aerodrome?.lat;
    const lon = aerodrome?.lon;

    try {
      // Fetch METAR, Runways, Open-Meteo, and Tomorrow.io in parallel
      const [metarRes, runwaysRes, openMeteoRes, tomorrowRes] = await Promise.all([
        fetch(`/api/metar?id=${aerodromeCode}${lat ? `&lat=${lat}&lon=${lon}` : ""}`),
        fetch(`/api/runways?icao=${aerodromeCode}`),
        lat && lon
          ? fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,wind_speed_10m,wind_direction_10m&forecast_days=1&wind_speed_unit=kn`
            )
          : Promise.resolve(null),
        lat && lon
          ? fetch(`/api/tomorrow?icao=${aerodromeCode}&lat=${lat}&lon=${lon}`)
          : Promise.resolve(null),
      ]);

      // Process METAR
      if (metarRes.ok) {
        const metarData: MetarResponse = await metarRes.json();
        setMetar(metarData.metar);
        setMetarSource(metarData.source);
        setMetarDistance(metarData.distance || null);
      } else {
        setMetarError("No METAR data available");
      }

      // Process Runways
      if (runwaysRes.ok) {
        const runwaysData = await runwaysRes.json();
        setRunways(runwaysData.runways || []);
      }

      // Process Open-Meteo
      if (openMeteoRes && openMeteoRes.ok) {
        const openMeteoData = await openMeteoRes.json();
        setOpenMeteo(openMeteoData);
      }

      // Process Tomorrow.io (new structure with current and hourly)
      if (tomorrowRes && tomorrowRes.ok) {
        const tomorrowData = await tomorrowRes.json();
        if (tomorrowData.current) {
          setTomorrow({
            current: tomorrowData.current,
            hourly: tomorrowData.hourly || [],
          });
        }
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setMetarError("Failed to fetch weather data");
    } finally {
      setLoadingMetar(false);
      setLoadingRunways(false);
      setLoadingOpenMeteo(false);
    }
  };

  // Set map ready after mount (for Leaflet SSR)
  useEffect(() => {
    setMapReady(true);
  }, []);

  // Fetch data when aerodrome changes
  useEffect(() => {
    if (aerodrome || aerodromeCode) {
      fetchData();
    }
  }, [aerodrome, aerodromeCode]);

  // Handle aerodrome change from search
  const handleAerodromeChange = (newAerodrome: AerodromeResult | null) => {
    if (newAerodrome?.code) {
      router.push(`/conditions/${newAerodrome.code}`);
    }
  };

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
                {loadingAerodrome ? "Loading..." : aerodrome?.name || aerodromeCode}
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
                value={aerodrome}
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
            loading={loadingMetar}
            error={metarError}
            onRefresh={fetchData}
          />

          {/* Aerodrome Info Card (Location + Runways) */}
          {aerodrome && (
            <AerodromeInfoCard
              aerodrome={aerodrome}
              runways={runways}
              metar={metar}
              loadingRunways={loadingRunways}
            />
          )}

          {/* Online Weather Card */}
          <WeatherCard
            openMeteo={openMeteo}
            tomorrow={tomorrow}
            loading={loadingOpenMeteo}
          />

          {/* Map Card */}
          {aerodrome && mapReady && <LocationMap aerodrome={aerodrome} />}

          {/* Windy Embed */}
          {aerodrome && <WindyEmbed aerodrome={aerodrome} />}

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
          {lastUpdate && (
            <p className="text-xs text-slate-600 text-center mt-6">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
