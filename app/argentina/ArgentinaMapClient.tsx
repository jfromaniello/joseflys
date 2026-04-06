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
        <div className="px-4 py-3 rounded-lg bg-amber-900/30 border border-amber-600/50 text-amber-100 flex items-center gap-3">
          <span className="break-words">
            <span className="text-amber-400 font-medium">Busqueda:</span>{" "}
            {activeQuery}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="text-amber-300 hover:text-white cursor-pointer flex-shrink-0"
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

// Component to handle map focusing when loc param is present
const MapFocusController = dynamic(
  () => Promise.all([import("react-leaflet"), import("leaflet")]).then(([mod, L]) => {
    const { useMap } = mod;
    // eslint-disable-next-line react/display-name
    return ({ focusLat, focusLon }: { focusLat: number | null; focusLon: number | null }) => {
      const map = useMap();
      const React = require("react");

      React.useEffect(() => {
        if (focusLat !== null && focusLon !== null && !isNaN(focusLat) && !isNaN(focusLon)) {
          // Center map on the location with zoom
          map.setView([focusLat, focusLon], 12);

          // Find and open the popup for this marker after a short delay
          setTimeout(() => {
            map.eachLayer((layer) => {
              if (layer instanceof L.Marker) {
                const pos = layer.getLatLng();
                if (Math.abs(pos.lat - focusLat) < 0.0001 && Math.abs(pos.lng - focusLon) < 0.0001) {
                  layer.openPopup();
                }
              }
            });
          }, 500);
        }
      }, [map, focusLat, focusLon]);

      return null;
    };
  }),
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

interface Runway {
  heading1: number;
  heading2: number;
  dimensions: string;
  length: number;
  width: number;
}

interface Aerodrome {
  type: "AD" | "LAD" | "HELIPORT" | "LADH";
  code: string | null;
  name: string;
  lat: number;
  lon: number;
  elevation: number | null;
  province?: string | null;
  surface?: string | null;
  runways?: Runway[];
}

type AerodromeType = "AD" | "LAD" | "HELIPORT" | "LADH";
const ALL_TYPES: AerodromeType[] = ["AD", "HELIPORT", "LAD", "LADH"];
type MapStyle = "street" | "satellite" | "hybrid";

interface LLMSearchResult {
  query: string;
  explanation: string;
  count: number;
  results: Aerodrome[];
}

const data = argentinaData as {
  count: { total: number; ad: number; heliport: number; lad: number; ladh: number };
  data: Aerodrome[];
};

// Pre-compute available provinces and surfaces for facets
const AVAILABLE_PROVINCES = [...new Set(data.data.map(a => a.province).filter(Boolean))].sort() as string[];
const AVAILABLE_SURFACES = [...new Set(data.data.map(a => a.surface).filter(Boolean))].sort() as string[];
const RUNWAY_LENGTH_OPTIONS = [
  { value: null, label: "Cualquier longitud" },
  { value: 500, label: "> 500m" },
  { value: 800, label: "> 800m" },
  { value: 1000, label: "> 1000m" },
  { value: 1500, label: "> 1500m" },
  { value: 2000, label: "> 2000m" },
];

type SearchMode = "filters" | "ai";

export function ArgentinaMapClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q");
  const urlMapStyle = searchParams.get("map") as MapStyle | null;
  const urlLoc = searchParams.get("loc"); // Format: "lat,lon" for focusing on aerodrome
  const urlProvince = searchParams.get("prov");
  const urlSurface = searchParams.get("surf");
  const urlMinLen = searchParams.get("minlen");
  const urlMode = searchParams.get("mode") as SearchMode | null;

  // Parse URL filters (e.g., "AD,LAD" or empty for all)
  const urlFilters = searchParams.get("types");
  const initialFilters = urlFilters
    ? new Set(urlFilters.split(",").filter(t => ALL_TYPES.includes(t as AerodromeType)) as AerodromeType[])
    : new Set(ALL_TYPES);

  const [selectedTypes, setSelectedTypes] = useState<Set<AerodromeType>>(initialFilters);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapStyle, setMapStyle] = useState<MapStyle>(
    urlMapStyle === "satellite" ? "satellite" : urlMapStyle === "hybrid" ? "hybrid" : "street"
  );
  const [focusedAerodrome, setFocusedAerodrome] = useState<{ lat: number; lon: number } | null>(
    urlLoc ? { lat: parseFloat(urlLoc.split(",")[0]), lon: parseFloat(urlLoc.split(",")[1]) } : null
  );

  // Search mode: "filters" for deterministic facets, "ai" for LLM search
  // Initialize from URL: explicit mode param, or infer from presence of q param
  const [searchMode, setSearchMode] = useState<SearchMode>(
    urlMode === "ai" || urlMode === "filters" ? urlMode : (urlQuery ? "ai" : "filters")
  );

  // Facet filters
  const [selectedProvince, setSelectedProvince] = useState<string | null>(urlProvince);
  const [selectedSurface, setSelectedSurface] = useState<string | null>(urlSurface);
  const [minRunwayLength, setMinRunwayLength] = useState<number | null>(
    urlMinLen ? parseInt(urlMinLen, 10) : null
  );

  // Toggle a type in the filter
  const toggleType = useCallback((type: AerodromeType) => {
    setSelectedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        // Don't allow deselecting all types
        if (newSet.size > 1) {
          newSet.delete(type);
        }
      } else {
        newSet.add(type);
      }

      // Update URL
      const params = new URLSearchParams(searchParams.toString());
      if (newSet.size === ALL_TYPES.length) {
        params.delete("types");
      } else {
        params.set("types", Array.from(newSet).join(","));
      }
      const newUrl = params.toString() ? `/argentina?${params.toString()}` : "/argentina";
      router.push(newUrl, { scroll: false });

      return newSet;
    });
  }, [router, searchParams]);

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

  // Update URL helper
  const updateUrl = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const newUrl = params.toString() ? `/argentina?${params.toString()}` : "/argentina";
    router.push(newUrl, { scroll: false });
  }, [router, searchParams]);

  // Facet change handlers
  const handleProvinceChange = useCallback((province: string | null) => {
    setSelectedProvince(province);
    updateUrl({ prov: province });
  }, [updateUrl]);

  const handleSurfaceChange = useCallback((surface: string | null) => {
    setSelectedSurface(surface);
    updateUrl({ surf: surface });
  }, [updateUrl]);

  const handleMinLengthChange = useCallback((length: number | null) => {
    setMinRunwayLength(length);
    updateUrl({ minlen: length ? String(length) : null });
  }, [updateUrl]);

  // LLM search state
  const [llmSearching, setLlmSearching] = useState(false);
  const [llmResult, setLlmResult] = useState<LLMSearchResult | null>(null);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);

  // Search mode change handler (defined after LLM state)
  const handleSearchModeChange = useCallback((mode: SearchMode) => {
    setSearchMode(mode);

    if (mode === "filters") {
      // Clear AI results when switching to filters mode
      setLlmResult(null);
      setActiveQuery(null);
      updateUrl({ mode: null, q: null }); // mode=filters is default, no need to store
    } else {
      // Clear facet filters when switching to AI mode
      setSelectedProvince(null);
      setSelectedSurface(null);
      setMinRunwayLength(null);
      setSearchQuery("");
      updateUrl({ mode: "ai", prov: null, surf: null, minlen: null });
    }
  }, [updateUrl]);

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

      // Update URL with mode and query
      const params = new URLSearchParams(searchParams.toString());
      params.set("mode", "ai");
      params.set("q", query);
      router.push(`/argentina?${params.toString()}`, { scroll: false });
    } catch (error) {
      setLlmError(error instanceof Error ? error.message : "Error desconocido");
      setLlmResult(null);
    } finally {
      setLlmSearching(false);
    }
  }, [router, searchParams]);

  // Track if user explicitly cleared the search
  const [wasCleared, setWasCleared] = useState(false);

  // Clear LLM search
  const handleLLMClear = useCallback(() => {
    setWasCleared(true);
    setLlmResult(null);
    setLlmError(null);
    setActiveQuery(null);

    // Remove q from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    const newUrl = params.toString() ? `/argentina?${params.toString()}` : "/argentina";
    router.push(newUrl, { scroll: false });
  }, [router, searchParams]);

  // Reset wasCleared when URL query changes (user navigated or typed new search)
  useEffect(() => {
    if (!urlQuery) {
      setWasCleared(false);
    }
  }, [urlQuery]);

  // Execute search from URL on mount (but not if user just cleared)
  useEffect(() => {
    if (urlQuery && !llmResult && !llmSearching && !wasCleared) {
      handleLLMSearch(urlQuery);
    }
  }, [urlQuery, llmResult, llmSearching, wasCleared, handleLLMSearch]);

  // Filter data based on type and search (or use LLM results)
  const filteredData = useMemo(() => {
    // If in AI mode and have LLM results, use those
    if (searchMode === "ai" && llmResult && llmResult.results.length > 0) {
      let result = llmResult.results;

      // Still apply type filter on top of LLM results
      if (selectedTypes.size < ALL_TYPES.length) {
        result = result.filter((a) => selectedTypes.has(a.type));
      }

      return result;
    }

    // Filters mode: use deterministic facet filtering
    let result = data.data;

    // Filter by selected types
    if (selectedTypes.size < ALL_TYPES.length) {
      result = result.filter((a) => selectedTypes.has(a.type));
    }

    // Filter by search query (name/code)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.code?.toLowerCase().includes(query)
      );
    }

    // Filter by province
    if (selectedProvince) {
      result = result.filter((a) => a.province === selectedProvince);
    }

    // Filter by surface
    if (selectedSurface) {
      result = result.filter((a) => a.surface === selectedSurface);
    }

    // Filter by minimum runway length
    if (minRunwayLength) {
      result = result.filter((a) =>
        a.runways && a.runways.some((r) => r.length >= minRunwayLength)
      );
    }

    return result;
  }, [searchMode, selectedTypes, searchQuery, selectedProvince, selectedSurface, minRunwayLength, llmResult]);

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
              Argentina - Aerodromos y Helipuertos
            </h1>
            <p className="text-slate-400">
              {data.count.ad} AD + {data.count.heliport} Helipuertos + {data.count.lad} LAD + {data.count.ladh} LADH = {data.count.total} ubicaciones
            </p>
          </div>

          {/* Search Tabs */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4 mb-4">
            {/* Tab buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => handleSearchModeChange("filters")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                  searchMode === "filters"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                Filtros
              </button>
              <button
                onClick={() => handleSearchModeChange("ai")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                  searchMode === "ai"
                    ? "bg-amber-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                Busqueda AI
              </button>
            </div>

            {/* Tab content */}
            {searchMode === "filters" ? (
              /* Filters mode: Facet dropdowns */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Province dropdown */}
                  <select
                    value={selectedProvince || ""}
                    onChange={(e) => handleProvinceChange(e.target.value || null)}
                    className="px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">Todas las provincias</option>
                    {AVAILABLE_PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>

                  {/* Surface dropdown */}
                  <select
                    value={selectedSurface || ""}
                    onChange={(e) => handleSurfaceChange(e.target.value || null)}
                    className="px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">Cualquier superficie</option>
                    {AVAILABLE_SURFACES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>

                  {/* Runway length dropdown */}
                  <select
                    value={minRunwayLength || ""}
                    onChange={(e) => handleMinLengthChange(e.target.value ? parseInt(e.target.value, 10) : null)}
                    className="px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {RUNWAY_LENGTH_OPTIONS.map((opt) => (
                      <option key={opt.label} value={opt.value || ""}>{opt.label}</option>
                    ))}
                  </select>

                  {/* Name/code search */}
                  <input
                    type="text"
                    placeholder="Nombre o codigo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Results count */}
                <p className="text-sm text-slate-400">
                  Mostrando {filteredData.length} de {data.count.total} ubicaciones
                </p>
              </div>
            ) : (
              /* AI mode: LLM search */
              <div>
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
            )}
          </div>

          {/* Type filters and Map style */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              {/* Filter buttons - multi-select */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => toggleType("AD")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    selectedTypes.has("AD")
                      ? "bg-purple-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  AD ({counts.AD})
                </button>
                <button
                  onClick={() => toggleType("HELIPORT")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    selectedTypes.has("HELIPORT")
                      ? "bg-sky-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Helipuertos ({counts.HELIPORT})
                </button>
                <button
                  onClick={() => toggleType("LAD")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    selectedTypes.has("LAD")
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  LAD ({counts.LAD})
                </button>
                <button
                  onClick={() => toggleType("LADH")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    selectedTypes.has("LADH")
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
                zoomAnimation={false}
                fadeAnimation={false}
                markerZoomAnimation={false}
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
                {focusedAerodrome && (
                  <MapFocusController
                    focusLat={focusedAerodrome.lat}
                    focusLon={focusedAerodrome.lon}
                  />
                )}
                <MarkerClusterGroup
                  chunkedLoading
                  maxClusterRadius={10}
                  disableClusteringAtZoom={4}
                  spiderfyOnMaxZoom={true}
                  showCoverageOnHover={false}
                  animate={false}
                  animateAddingMarkers={false}
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
                              {aerodrome.runways && aerodrome.runways.length > 0 && (
                                <div>
                                  <span className="font-medium">
                                    {aerodrome.runways.length === 1 ? "Pista:" : "Pistas:"}
                                  </span>
                                  {aerodrome.runways.map((rwy, i) => (
                                    <div key={i} className="ml-2 text-xs">
                                      {String(rwy.heading1).padStart(2, "0")}/{String(rwy.heading2).padStart(2, "0")} - {rwy.length}x{rwy.width}m
                                    </div>
                                  ))}
                                </div>
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
                              <div className="pt-2 border-t border-gray-200 mt-2">
                                <button
                                  onClick={async (e) => {
                                    const url = new URL(window.location.href);
                                    url.searchParams.set("loc", `${aerodrome.lat},${aerodrome.lon}`);
                                    const shareUrl = url.toString();
                                    const btn = e.currentTarget;

                                    // Try Web Share API first (mobile)
                                    if (typeof navigator.share === 'function') {
                                      try {
                                        await navigator.share({
                                          title: `${aerodrome.name} - Aeródromos Argentina`,
                                          text: `${aerodrome.code ? `${aerodrome.code} - ` : ''}${aerodrome.name}`,
                                          url: shareUrl,
                                        });
                                        return;
                                      } catch (err) {
                                        // User cancelled sharing
                                        if ((err as Error).name === 'AbortError') return;
                                        // NotAllowedError = not triggered by user gesture, try clipboard
                                        // Other errors = also try clipboard
                                        console.log('Share failed:', err);
                                      }
                                    }

                                    // Fallback: copy to clipboard
                                    if (navigator.clipboard && navigator.clipboard.writeText) {
                                      await navigator.clipboard.writeText(shareUrl);
                                      const originalText = btn.innerText;
                                      btn.innerText = "¡Copiado!";
                                      setTimeout(() => { btn.innerText = originalText; }, 1500);
                                    } else {
                                      // Ultimate fallback: prompt user to copy manually
                                      window.prompt("Copia este enlace:", shareUrl);
                                    }
                                  }}
                                  className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                  </svg>
                                  Compartir ubicación
                                </button>
                              </div>
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
              <div className="w-4 h-4 rounded-full bg-sky-500 border-2 border-white shadow"></div>
              <span>Helipuerto</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-400 border-2 border-white shadow"></div>
              <span>LAD</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white shadow"></div>
              <span>LADH</span>
            </div>
          </div>

          {/* Note */}
          <div className="mt-6 p-4 rounded-xl bg-slate-900/30 border border-slate-700">
            <p className="text-xs text-slate-500 text-center">
              Fuentes: OurAirports (AD, Helipuertos) y ANAC Argentina (LAD, LADH).
              LAD = Lugar Apto Denunciado. LADH = LAD Helipuerto.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
