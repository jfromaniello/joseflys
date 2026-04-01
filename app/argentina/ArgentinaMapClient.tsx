"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Navbar } from "@/app/components/Navbar";
import argentinaData from "@/data/ad-lads/argentina.json";

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
};

interface Aerodrome {
  type: "AD" | "LAD";
  code: string | null;
  name: string;
  lat: number;
  lon: number;
  elevation: number | null;
}

type FilterType = "all" | "AD" | "LAD";
type MapStyle = "street" | "satellite";

const data = argentinaData as {
  count: { total: number; ad: number; lad: number };
  data: Aerodrome[];
};

export function ArgentinaMapClient() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [mapStyle, setMapStyle] = useState<MapStyle>("street");

  // Filter data based on type and search
  const filteredData = useMemo(() => {
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
  }, [filter, searchQuery]);

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
      LAD: filtered.filter((a) => a.type === "LAD").length,
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

          {/* Controls */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Buscar por nombre o codigo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Filter buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    filter === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Todos ({counts.all})
                </button>
                <button
                  onClick={() => setFilter("AD")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    filter === "AD"
                      ? "bg-purple-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  AD ({counts.AD})
                </button>
                <button
                  onClick={() => setFilter("LAD")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    filter === "LAD"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  LAD ({counts.LAD})
                </button>
              </div>

              {/* Map style toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setMapStyle("street")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    mapStyle === "street"
                      ? "bg-sky-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Mapa
                </button>
                <button
                  onClick={() => setMapStyle("satellite")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
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
                  key={mapStyle}
                  attribution={TILE_LAYERS[mapStyle].attribution}
                  url={TILE_LAYERS[mapStyle].url}
                />
                <MarkerClusterGroup
                  chunkedLoading
                  maxClusterRadius={10}
                  disableClusteringAtZoom={4}
                  spiderfyOnMaxZoom={true}
                  showCoverageOnHover={false}
                >
                  {filteredData.map((aerodrome, index) => (
                    <Marker
                      key={`${aerodrome.lat}-${aerodrome.lon}-${index}`}
                      position={[aerodrome.lat, aerodrome.lon]}
                      icon={aerodrome.type === "AD" ? adIcon : ladIcon}
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
                                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                  aerodrome.type === "AD"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {aerodrome.type === "AD"
                                  ? "Aerodromo"
                                  : "LAD"}
                              </span>
                            </div>
                            {aerodrome.elevation !== null && (
                              <div>Elevacion: {aerodrome.elevation} ft</div>
                            )}
                            <div>
                              {aerodrome.lat.toFixed(4)}°,{" "}
                              {aerodrome.lon.toFixed(4)}°
                            </div>
                            {aerodrome.code && (
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
                  ))}
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
