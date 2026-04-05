"use client";

import { useState, useMemo, useCallback, memo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Navbar } from "@/app/components/Navbar";
import argentinaData from "@/data/ad-lads/argentina.json";

// Separate search input component to prevent map re-renders
const LLMSearchInput = memo(function LLMSearchInput({
  onSearch,
  onClear,
  isSearching,
  activeQuery,
  initialQuery,
}: {
  onSearch: (query: string) => void;
  onClear: () => void;
  isSearching: boolean;
  activeQuery: string | null;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery || "");
  // Don't start in editing mode if there's an initialQuery from URL
  const [isEditing, setIsEditing] = useState(!activeQuery && !initialQuery);

  // Sync with initialQuery when it changes (from URL)
  useEffect(() => {
    if (initialQuery && !activeQuery) {
      setQuery(initialQuery);
      setIsEditing(false);
    }
  }, [initialQuery, activeQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.length >= 3) {
      onSearch(query);
      setIsEditing(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setIsEditing(true);
    onClear();
  };

  // Show loading state when searching from URL
  if (isSearching && initialQuery && !activeQuery) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 px-4 py-3 rounded-lg bg-amber-900/30 border border-amber-600/50 text-amber-100 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
          <span className="truncate">
            <span className="text-amber-400 font-medium">Buscando:</span>{" "}
            {initialQuery}
          </span>
        </div>
      </div>
    );
  }

  // Show fixed label when there's an active query
  if (activeQuery && !isEditing && !isSearching) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 px-4 py-3 rounded-lg bg-amber-900/30 border border-amber-600/50 text-amber-100 flex items-center justify-between">
          <span className="truncate">
            <span className="text-amber-400 font-medium">Busqueda:</span>{" "}
            {activeQuery}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="ml-3 text-amber-300 hover:text-white cursor-pointer flex-shrink-0"
            title="Limpiar busqueda"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
      <div className="flex-1 relative">
        <input
          type="text"
          placeholder="Buscar con IA: ej. 'pistas en la patagonia', 'LADs cerca de lagos'..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-3 pr-10 rounded-lg bg-slate-900/50 border border-amber-600/50 text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
        />
      </div>
      <button
        type="submit"
        disabled={isSearching || query.length < 3}
        className="px-6 py-3 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
      >
        {isSearching ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        )}
        Buscar
      </button>
    </form>
  );
});

// Dynamic imports for Leaflet (SSR issues)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const MarkerClusterGroup = dynamic(
  () => import("react-leaflet-cluster").then((mod) => mod.default),
  { ssr: false }
);

// Fix for Leaflet default marker icon not loading in webpack/Next.js
let adIcon: L.DivIcon | undefined;
let ladIcon: L.DivIcon | undefined;
let heliportIcon: L.DivIcon | undefined;
let ladhIcon: L.DivIcon | undefined;
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require("leaflet");
  require("leaflet/dist/leaflet.css");

  // AD - Aerodrome (purple, larger)
  adIcon = L.divIcon({
    className: "ad-marker",
    html: '<div style="background: #a855f7; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  // LAD - Lugar Apto Denunciado (green, smaller but still clickable)
  ladIcon = L.divIcon({
    className: "lad-marker",
    html: '<div style="background: #34d399; width: 18px; height: 18px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

  // HELIPORT - Heliport (sky blue, medium)
  heliportIcon = L.divIcon({
    className: "heliport-marker",
    html: '<div style="background: #0ea5e9; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  // LADH - LAD Heliport (amber/orange, small)
  ladhIcon = L.divIcon({
    className: "ladh-marker",
    html: '<div style="background: #f59e0b; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

// Tile layer configurations
const TILE_LAYERS = {
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a> World Imagery',
  },
  hybrid: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    labelsUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a> World Imagery',
  },
};

interface Aerodrome {
  type: "AD" | "LAD" | "HELIPORT" | "LADH";
  code: string | null;
  name: string;
  lat: number;
  lon: number;
  elevation: number | null;
  province?: string | null;
  surface?: string | null;
}

type AerodromeType = "AD" | "LAD" | "HELIPORT" | "LADH";
type FilterType = "all" | AerodromeType;
type MapStyle = "street" | "satellite" | "hybrid";

interface LLMSearchResult {
  query: string;
  explanation: string;
  count: number;
  results: Aerodrome[];
}

const data = argentinaData as {
  count: { total: number; ad: number; lad: number };
  data: Aerodrome[];
};

export function ArgentinaMapClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q");
  const urlMapStyle = searchParams.get("map") as MapStyle | null;

  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [mapStyle, setMapStyle] = useState<MapStyle>(
    urlMapStyle === "satellite" ? "satellite" : urlMapStyle === "hybrid" ? "hybrid" : "street"
  );

  // Update URL when map style changes
  const handleMapStyleChange = useCallback((style: MapStyle) => {
    setMapStyle(style);
    const params = new URLSearchParams(searchParams.toString());
    if (style === "street") {
      params.delete("map");
    } else {
      params.set("map", style);
    }
    const newUrl = params.toString() ? `/argentina?${params.toString()}` : "/argentina";
    router.push(newUrl, { scroll: false });
  }, [router, searchParams]);

  // LLM search state
  const [llmSearching, setLlmSearching] = useState(false);
  const [llmResult, setLlmResult] = useState<LLMSearchResult | null>(null);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);

  // LLM search function
  const handleLLMSearch = useCallback(async (query: string) => {
    setLlmSearching(true);
    setLlmError(null);

    try {
      const response = await fetch("/api/argentina-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error("Error en la búsqueda");
      }

      const result = await response.json();
      setLlmResult(result);
      setActiveQuery(query);

      // Update URL
      const params = new URLSearchParams(searchParams.toString());
      params.set("q", query);
      router.push(`/argentina?${params.toString()}`, { scroll: false });
    } catch (error) {
      setLlmError(error instanceof Error ? error.message : "Error desconocido");
      setLlmResult(null);
    } finally {
      setLlmSearching(false);
    }
  }, [router, searchParams]);

  // Clear LLM search
  const handleLLMClear = useCallback(() => {
    setLlmResult(null);
    setLlmError(null);
    setActiveQuery(null);

    // Remove q from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    const newUrl = params.toString() ? `/argentina?${params.toString()}` : "/argentina";
    router.push(newUrl, { scroll: false });
  }, [router, searchParams]);

  // Execute search from URL on mount
  useEffect(() => {
    if (urlQuery && !llmResult && !llmSearching) {
      handleLLMSearch(urlQuery);
    }
  }, [urlQuery, llmResult, llmSearching, handleLLMSearch]);

  // Filter data based on type and search (or use LLM results)
  const filteredData = useMemo(() => {
    // If LLM search has results, use those
    if (llmResult && llmResult.results.length > 0) {
      let result = llmResult.results;

      // Still apply type filter on top of LLM results
      if (filter !== "all") {
        result = result.filter((a) => a.type === filter);
      }

      return result;
    }

    // Otherwise use normal filtering
    let result = data.data;

    // Filter by type
    if (filter !== "all") {
      result = result.filter((a) => a.type === filter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.code?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [filter, searchQuery, llmResult]);

  // Count by type
  const counts = useMemo(() => {
    const filtered = searchQuery.trim()
      ? data.data.filter(
          (a) =>
            a.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
            a.code?.toLowerCase().includes(searchQuery.toLowerCase().trim())
        )
      : data.data;

    return {
      all: filtered.length,
      AD: filtered.filter((a) => a.type === "AD").length,
      HELIPORT: filtered.filter((a) => a.type === "HELIPORT").length,
      LAD: filtered.filter((a) => a.type === "LAD").length,
      LADH: filtered.filter((a) => a.type === "LADH").length,
    };
  }, [searchQuery]);

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
      <Navbar currentPage="argentina" />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-3">
              Argentina - Aerodromos y LADs
            </h1>
            <p className="text-slate-400">
              {data.count.ad} aerodromos (AD) y {data.count.lad} Lugares Aptos
              Denunciados (LAD)
            </p>
          </div>

          {/* Smart Search */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4 mb-4">
            <LLMSearchInput
              onSearch={handleLLMSearch}
              onClear={handleLLMClear}
              isSearching={llmSearching}
              activeQuery={activeQuery}
              initialQuery={urlQuery || undefined}
            />

            {/* LLM Result info */}
            {llmResult && (
              <div className="mt-3 p-3 rounded-lg bg-amber-900/30 border border-amber-700/50">
                <p className="text-sm text-amber-200">
                  <span className="font-medium">{llmResult.count} resultados</span>
                  {" - "}{llmResult.explanation}
                </p>
              </div>
            )}

            {llmError && (
              <div className="mt-3 p-3 rounded-lg bg-red-900/30 border border-red-700/50">
                <p className="text-sm text-red-300">{llmError}</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              {/* Search by name */}
              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Filtrar por nombre o codigo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={!!llmResult}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Filter buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    filter === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Todos ({counts.all})
                </button>
                <button
                  onClick={() => setFilter("AD")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    filter === "AD"
                      ? "bg-purple-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  AD ({counts.AD})
                </button>
                <button
                  onClick={() => setFilter("HELIPORT")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    filter === "HELIPORT"
                      ? "bg-sky-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Helipuertos ({counts.HELIPORT})
                </button>
                <button
                  onClick={() => setFilter("LAD")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    filter === "LAD"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  LAD ({counts.LAD})
                </button>
                <button
                  onClick={() => setFilter("LADH")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    filter === "LADH"
                      ? "bg-amber-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  LADH ({counts.LADH})
                </button>
              </div>

              {/* Map style toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleMapStyleChange("street")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    mapStyle === "street"
                      ? "bg-sky-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Mapa
                </button>
                <button
                  onClick={() => handleMapStyleChange("hybrid")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    mapStyle === "hybrid"
                      ? "bg-sky-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Hibrido
                </button>
                <button
                  onClick={() => handleMapStyleChange("satellite")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    mapStyle === "satellite"
                      ? "bg-sky-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Satelite
                </button>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
            <div className="h-[600px] sm:h-[700px]">
              <MapContainer
                center={[-38.5, -63.5]}
                zoom={5}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  key={`base-${mapStyle}`}
                  attribution={TILE_LAYERS[mapStyle].attribution}
                  url={TILE_LAYERS[mapStyle].url}
                />
                {mapStyle === "hybrid" && (
                  <TileLayer
                    key="hybrid-labels"
                    url={TILE_LAYERS.hybrid.labelsUrl}
                  />
                )}
                <MarkerClusterGroup
                  chunkedLoading
                  maxClusterRadius={10}
                  disableClusteringAtZoom={4}
                  spiderfyOnMaxZoom={true}
                  showCoverageOnHover={false}
                >
                  {filteredData.map((aerodrome, index) => {
                    // Select icon based on type
                    const icon = {
                      AD: adIcon,
                      HELIPORT: heliportIcon,
                      LAD: ladIcon,
                      LADH: ladhIcon,
                    }[aerodrome.type] || ladIcon;

                    // Badge styling per type
                    const badgeStyles = {
                      AD: "bg-purple-100 text-purple-700",
                      HELIPORT: "bg-sky-100 text-sky-700",
                      LAD: "bg-emerald-100 text-emerald-700",
                      LADH: "bg-amber-100 text-amber-700",
                    };

                    const typeLabels = {
                      AD: "Aerodromo",
                      HELIPORT: "Helipuerto",
                      LAD: "LAD",
                      LADH: "LAD Helipuerto",
                    };

                    return (
                      <Marker
                        key={`${aerodrome.lat}-${aerodrome.lon}-${index}`}
                        position={[aerodrome.lat, aerodrome.lon]}
                        icon={icon}
                      >
                        <Popup>
                          <div className="min-w-[200px]">
                            <div className="font-bold text-base mb-1">
                              {aerodrome.code && (
                                <span className="text-purple-600">
                                  {aerodrome.code} -{" "}
                                </span>
                              )}
                              {aerodrome.name}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badgeStyles[aerodrome.type]}`}
                                >
                                  {typeLabels[aerodrome.type]}
                                </span>
                              </div>
                              {aerodrome.elevation !== null && (
                                <div>Elevacion: {aerodrome.elevation} m</div>
                              )}
                              {aerodrome.surface && (
                                <div>Superficie: {aerodrome.surface}</div>
                              )}
                              {aerodrome.province && (
                                <div>Provincia: {aerodrome.province}</div>
                              )}
                              <div>
                                {aerodrome.lat.toFixed(4)}°,{" "}
                                {aerodrome.lon.toFixed(4)}°
                              </div>
                              {aerodrome.code && aerodrome.type === "AD" && (
                                <div className="pt-2">
                                  <Link
                                    href={`/conditions/${aerodrome.code}`}
                                    className="text-blue-600 hover:text-blue-800 underline"
                                  >
                                    Ver condiciones
                                  </Link>
                                </div>
                              )}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MarkerClusterGroup>
              </MapContainer>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-purple-500 border-2 border-white shadow"></div>
              <span>Aerodromo (AD)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-400 border-2 border-white shadow"></div>
              <span>Lugar Apto Denunciado (LAD)</span>
            </div>
          </div>

          {/* Note */}
          <div className="mt-6 p-4 rounded-xl bg-slate-900/30 border border-slate-700">
            <p className="text-xs text-slate-500 text-center">
              Datos de ANAC Argentina. Los LADs son pistas privadas registradas.
              Haz click en un marcador para ver detalles.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
