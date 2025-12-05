"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Navbar } from "@/app/components/Navbar";
import { AerodromeSearchInput, AerodromeResult } from "@/app/components/AerodromeSearchInput";
import { ArrowPathIcon, MapPinIcon, ArrowTopRightOnSquareIcon, CloudIcon } from "@heroicons/react/24/outline";

// Dynamic import for Leaflet (SSR issues)
const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), { ssr: false });

interface RunwayEnd {
  id: string;
  heading: number | null;
  elevation: number | null;
  displacedThreshold: number;
  lat: number | null;
  lon: number | null;
}

interface Runway {
  id: string;
  length: number;
  width: number;
  surface: string;
  surfaceName: string;
  lighted: boolean;
  closed: boolean;
  ends: RunwayEnd[];
}

interface MetarData {
  icaoId: string;
  temp: number | null;
  dewp: number | null;
  wdir: number | null;
  wspd: number | null;
  wgst: number | null;
  altim: number | null;
  visib: string | null;
  rawOb: string;
  reportTime: string;
  lat: number;
  lon: number;
  name: string;
  fltCat: string | null;
}

interface MetarResponse {
  metar: MetarData | null;
  source: "direct" | "nearby" | null;
  searchedId?: string;
  distance?: number;
}

interface OpenMeteoData {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    cloud_cover: number;
    surface_pressure: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    cloud_cover: number[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    visibility: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
  };
  elevation: number;
}

interface ConditionsClientProps {
  aerodromeCode: string;
}

const SURFACE_NAMES: Record<string, string> = {
  PG: "Paved (Good)",
  PP: "Paved (Poor)",
  GG: "Grass (Good)",
  GF: "Grass (Fair)",
  GV: "Gravel",
  DT: "Dirt",
  SD: "Sand",
  WT: "Water",
};

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

  // Fetch METAR, Runways, and Open-Meteo
  const fetchData = async () => {
    setLoadingMetar(true);
    setLoadingRunways(true);
    setLoadingOpenMeteo(true);
    setMetarError(null);

    const lat = aerodrome?.lat;
    const lon = aerodrome?.lon;

    try {
      // Fetch METAR, Runways, and Open-Meteo in parallel
      const [metarRes, runwaysRes, openMeteoRes] = await Promise.all([
        fetch(`/api/metar?id=${aerodromeCode}${lat ? `&lat=${lat}&lon=${lon}` : ""}`),
        fetch(`/api/runways?icao=${aerodromeCode}`),
        lat && lon
          ? fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,wind_speed_10m,wind_direction_10m&forecast_days=1&wind_speed_unit=kn`
            )
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

  // Format wind
  const formatWind = () => {
    if (!metar) return null;
    if (metar.wdir === null || metar.wspd === null) return "Calm";

    const dir = metar.wdir === 0 ? "VRB" : `${String(metar.wdir).padStart(3, "0")}°`;
    let wind = `${dir} at ${metar.wspd} KT`;
    if (metar.wgst) {
      wind += ` gusting ${metar.wgst} KT`;
    }
    return wind;
  };

  // Flight category colors
  const getFlightCatColor = (cat: string | null) => {
    switch (cat) {
      case "VFR": return "text-green-400 bg-green-400/10 border-green-400/30";
      case "MVFR": return "text-blue-400 bg-blue-400/10 border-blue-400/30";
      case "IFR": return "text-red-400 bg-red-400/10 border-red-400/30";
      case "LIFR": return "text-purple-400 bg-purple-400/10 border-purple-400/30";
      default: return "text-slate-400 bg-slate-400/10 border-slate-400/30";
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

          {/* Location Card */}
          {aerodrome && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <MapPinIcon className="w-5 h-5 text-sky-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-2">Location</h2>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <div>
                        <span className="text-slate-400">Latitude:</span>
                        <span className="text-white ml-2">{aerodrome.lat.toFixed(4)}°</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Longitude:</span>
                        <span className="text-white ml-2">{aerodrome.lon.toFixed(4)}°</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Elevation:</span>
                        <span className="text-white ml-2">
                          {aerodrome.elevation !== null ? `${aerodrome.elevation} ft` : "Unknown"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Type:</span>
                        <span className="text-white ml-2">
                          {aerodrome.type === "AD" ? "Aerodrome" : "Landing Area"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${aerodrome.lat},${aerodrome.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:text-sky-300 p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                  title="Open in Google Maps"
                >
                  <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                </a>
              </div>
            </div>
          )}

          {/* METAR Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Current Weather</h2>
              <button
                onClick={fetchData}
                disabled={loadingMetar}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-sky-400 hover:text-sky-300 hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-4 h-4 ${loadingMetar ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {loadingMetar ? (
              <div className="text-slate-400 text-center py-8">Loading weather data...</div>
            ) : metarError ? (
              <div className="text-slate-400 text-center py-8">{metarError}</div>
            ) : metar ? (
              <div className="space-y-4">
                {/* Raw METAR */}
                <div className="bg-slate-900/50 rounded-lg p-4 font-mono text-sm text-slate-300 break-all">
                  {metar.rawOb}
                </div>

                {/* Source info */}
                {metarSource === "nearby" && (
                  <p className="text-xs text-amber-400">
                    METAR from nearby station: {metar.icaoId} ({metarDistance?.toFixed(0)} NM away)
                  </p>
                )}

                {/* Decoded data */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Flight Category */}
                  <div className="text-center p-3 rounded-lg bg-slate-900/30">
                    <div className="text-xs text-slate-400 mb-1">Category</div>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getFlightCatColor(metar.fltCat)}`}>
                      {metar.fltCat || "N/A"}
                    </div>
                  </div>

                  {/* Wind */}
                  <div className="text-center p-3 rounded-lg bg-slate-900/30">
                    <div className="text-xs text-slate-400 mb-1">Wind</div>
                    <div className="text-white font-medium">{formatWind()}</div>
                  </div>

                  {/* Temperature */}
                  <div className="text-center p-3 rounded-lg bg-slate-900/30">
                    <div className="text-xs text-slate-400 mb-1">Temperature</div>
                    <div className="text-white font-medium">
                      {metar.temp !== null ? `${metar.temp}°C` : "N/A"}
                    </div>
                    {metar.dewp !== null && (
                      <div className="text-xs text-slate-500">Dewpoint: {metar.dewp}°C</div>
                    )}
                  </div>

                  {/* QNH */}
                  <div className="text-center p-3 rounded-lg bg-slate-900/30">
                    <div className="text-xs text-slate-400 mb-1">QNH</div>
                    <div className="text-white font-medium">
                      {metar.altim !== null ? `${metar.altim} hPa` : "N/A"}
                    </div>
                    {metar.altim !== null && (
                      <div className="text-xs text-slate-500">
                        {(metar.altim * 0.02953).toFixed(2)} inHg
                      </div>
                    )}
                  </div>
                </div>

                {/* Visibility */}
                {metar.visib && (
                  <div className="text-sm text-slate-400">
                    <span className="text-slate-500">Visibility:</span> {metar.visib}
                  </div>
                )}

                {/* Report time */}
                <div className="text-xs text-slate-500 text-right">
                  Report time: {metar.reportTime}
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-center py-8">No weather data available</div>
            )}
          </div>

          {/* Runways Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Runways</h2>

            {loadingRunways ? (
              <div className="text-slate-400 text-center py-8">Loading runway data...</div>
            ) : runways.length === 0 ? (
              <div className="text-slate-400 text-center py-8">No runway data available</div>
            ) : (
              <div className="space-y-4">
                {runways.map((runway) => (
                  <div
                    key={runway.id}
                    className="bg-slate-900/30 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold text-white">{runway.id}</span>
                        {runway.lighted && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-400/10 text-yellow-400 rounded">
                            Lighted
                          </span>
                        )}
                        {runway.closed && (
                          <span className="px-2 py-0.5 text-xs bg-red-400/10 text-red-400 rounded">
                            Closed
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-slate-400">
                        {SURFACE_NAMES[runway.surface] || runway.surfaceName}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Length:</span>
                        <span className="text-white ml-2">{runway.length.toLocaleString()} ft</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Width:</span>
                        <span className="text-white ml-2">{runway.width} ft</span>
                      </div>
                      {runway.ends.map((end) => (
                        <div key={end.id}>
                          <span className="text-slate-400">RWY {end.id}:</span>
                          <span className="text-white ml-2">
                            {end.heading !== null ? `${String(Math.round(end.heading)).padStart(3, "0")}° True` : "N/A"}
                          </span>
                          {end.elevation !== null && (
                            <span className="text-slate-500 ml-1">({end.elevation} ft)</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Wind components if METAR available */}
                    {metar && metar.wdir !== null && metar.wspd !== null && (
                      <div className="mt-3 pt-3 border-t border-slate-700/50">
                        <div className="flex flex-wrap gap-4 text-sm">
                          {runway.ends.map((end) => {
                            if (end.heading === null) return null;

                            // Calculate wind components
                            const windAngle = ((metar.wdir! - end.heading + 360) % 360) * (Math.PI / 180);
                            const headwind = Math.round(metar.wspd! * Math.cos(windAngle));
                            const crosswind = Math.round(Math.abs(metar.wspd! * Math.sin(windAngle)));
                            const crossDir = Math.sin(windAngle) > 0 ? "R" : "L";

                            return (
                              <div key={end.id} className="flex items-center gap-2">
                                <span className="text-slate-400">RWY {end.id}:</span>
                                <span className={headwind >= 0 ? "text-green-400" : "text-red-400"}>
                                  {headwind >= 0 ? `+${headwind}` : headwind} HW
                                </span>
                                <span className="text-amber-400">
                                  {crosswind}{crossDir} XW
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Open-Meteo Forecast Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <CloudIcon className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg font-semibold text-white">Weather Forecast</h2>
              <span className="ml-auto text-xs text-slate-500">
                Data from{" "}
                <a
                  href="https://open-meteo.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:text-sky-300"
                >
                  Open-Meteo
                </a>
              </span>
            </div>

            {loadingOpenMeteo ? (
              <div className="text-slate-400 text-center py-8">Loading forecast data...</div>
            ) : !openMeteo ? (
              <div className="text-slate-400 text-center py-8">No forecast data available</div>
            ) : (
              <div className="space-y-4">
                {/* Current conditions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-slate-900/30">
                    <div className="text-xs text-slate-400 mb-1">Temperature</div>
                    <div className="text-white font-medium">{openMeteo.current.temperature_2m}°C</div>
                    <div className="text-xs text-slate-500">
                      Feels like {openMeteo.current.apparent_temperature}°C
                    </div>
                  </div>

                  <div className="text-center p-3 rounded-lg bg-slate-900/30">
                    <div className="text-xs text-slate-400 mb-1">Wind</div>
                    <div className="text-white font-medium">
                      {String(Math.round(openMeteo.current.wind_direction_10m)).padStart(3, "0")}° / {Math.round(openMeteo.current.wind_speed_10m)} KT
                    </div>
                    {openMeteo.current.wind_gusts_10m > openMeteo.current.wind_speed_10m && (
                      <div className="text-xs text-amber-400">
                        Gusts {Math.round(openMeteo.current.wind_gusts_10m)} KT
                      </div>
                    )}
                  </div>

                  <div className="text-center p-3 rounded-lg bg-slate-900/30">
                    <div className="text-xs text-slate-400 mb-1">Cloud Cover</div>
                    <div className="text-white font-medium">{openMeteo.current.cloud_cover}%</div>
                    <div className="text-xs text-slate-500">
                      {openMeteo.current.cloud_cover < 25
                        ? "Clear"
                        : openMeteo.current.cloud_cover < 50
                        ? "Few"
                        : openMeteo.current.cloud_cover < 75
                        ? "Scattered"
                        : "Overcast"}
                    </div>
                  </div>

                  <div className="text-center p-3 rounded-lg bg-slate-900/30">
                    <div className="text-xs text-slate-400 mb-1">Pressure / Humidity</div>
                    <div className="text-white font-medium">{Math.round(openMeteo.current.surface_pressure)} hPa</div>
                    <div className="text-xs text-slate-500">
                      Humidity {openMeteo.current.relative_humidity_2m}%
                    </div>
                  </div>
                </div>

                {/* Cloud layers */}
                <div className="bg-slate-900/30 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-2">Cloud Layers (current hour)</div>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-slate-500">Low:</span>
                      <span className="text-white ml-2">{openMeteo.hourly.cloud_cover_low[0]}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Mid:</span>
                      <span className="text-white ml-2">{openMeteo.hourly.cloud_cover_mid[0]}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500">High:</span>
                      <span className="text-white ml-2">{openMeteo.hourly.cloud_cover_high[0]}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Visibility:</span>
                      <span className="text-white ml-2">
                        {openMeteo.hourly.visibility[0] >= 10000
                          ? "10+ km"
                          : `${(openMeteo.hourly.visibility[0] / 1000).toFixed(1)} km`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hourly forecast mini */}
                <div className="bg-slate-900/30 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-3">Next Hours</div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {openMeteo.hourly.time.slice(0, 12).map((time, i) => {
                      const hour = new Date(time).getHours();
                      return (
                        <div
                          key={time}
                          className="flex-shrink-0 text-center p-2 rounded bg-slate-800/50 min-w-[60px]"
                        >
                          <div className="text-xs text-slate-500">{String(hour).padStart(2, "0")}:00</div>
                          <div className="text-sm text-white font-medium">
                            {Math.round(openMeteo.hourly.temperature_2m[i])}°
                          </div>
                          <div className="text-xs text-slate-400">
                            {Math.round(openMeteo.hourly.wind_speed_10m[i])} kt
                          </div>
                          <div
                            className="text-xs mt-1"
                            style={{
                              color:
                                openMeteo.hourly.cloud_cover[i] < 25
                                  ? "#4ade80"
                                  : openMeteo.hourly.cloud_cover[i] < 75
                                  ? "#fbbf24"
                                  : "#94a3b8",
                            }}
                          >
                            {openMeteo.hourly.cloud_cover[i]}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Model elevation */}
                <div className="text-xs text-slate-500 text-right">
                  Model elevation: {openMeteo.elevation}m ({Math.round(openMeteo.elevation * 3.28084)} ft)
                </div>
              </div>
            )}
          </div>

          {/* Map Card */}
          {aerodrome && mapReady && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Location Map</h2>
              <div className="h-80 rounded-lg overflow-hidden">
                <MapContainer
                  center={[aerodrome.lat, aerodrome.lon]}
                  zoom={14}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[aerodrome.lat, aerodrome.lon]}>
                    <Popup>
                      <div className="text-center">
                        <strong>{aerodrome.code || aerodrome.name}</strong>
                        <br />
                        {aerodrome.name}
                        {aerodrome.elevation !== null && (
                          <>
                            <br />
                            Elev: {aerodrome.elevation} ft
                          </>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          )}

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
