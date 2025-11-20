"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Tooltip } from "../components/Tooltip";
import { PageLayout } from "../components/PageLayout";
import { CalculatorPageHeader } from "../components/CalculatorPageHeader";
import { Footer } from "../components/Footer";
import { ShareButtonSimple } from "../components/ShareButtonSimple";
import { quantizeCoordinate } from "@/lib/coordinateUrlParams";
import { validateUTMRoute, type UTMValidationResult, type Location } from "@/lib/utmValidation";
import type { LocalChartMapHandle } from "./LocalChartMap";

// Dynamic import for LocalChartMap to avoid SSR issues with Leaflet
const LocalChartMap = dynamic(() => import("./LocalChartMap").then((mod) => mod.LocalChartMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 rounded-xl bg-slate-800/50 border-2 border-gray-700 flex items-center justify-center">
      <p className="text-gray-400">Loading map...</p>
    </div>
  ),
});

// Helper function to parse coordinate string (e.g., "-30.7505058,-62.8236677")
function parseCoordinates(text: string): { lat: number; lon: number } | null {
  // Match pattern: lat,lon (with optional spaces and signs)
  const coordPattern = /^([-+]?\d+\.?\d*)\s*,\s*([-+]?\d+\.?\d*)$/;
  const match = text.trim().match(coordPattern);

  if (!match) return null;

  const lat = parseFloat(match[1]);
  const lon = parseFloat(match[2]);

  // Validate coordinates are within valid ranges
  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return null;
  }

  return { lat, lon };
}

interface LocationData {
  name: string;
  lat: number;
  lon: number;
}

interface RouteLocation extends LocationData {
  id: string;
  searchQuery: string;
  searchResults: GeocodingResult[];
  searching: boolean;
  showDropdown: boolean;
  lat_str: string;
  lon_str: string;
  isFlyOver: boolean; // True if this is a reference point (not part of route line)
}

interface GeocodingResult {
  name: string;
  lat: number;
  lon: number;
  type: string;
  importance: number;
}

interface InitialToLocation {
  lat: string;
  lon: string;
  name?: string;
  isFlyOver?: boolean;
}

type MapMode = 'utm' | 'mercator';

interface LocalChartClientProps {
  initialFromLat?: string;
  initialFromLon?: string;
  initialFromName?: string;
  initialToLocations?: InitialToLocation[];
  initialMapMode?: MapMode;
  initialPrintScale?: number;
}

export function LocalChartClient({
  initialFromLat,
  initialFromLon,
  initialFromName,
  initialToLocations,
  initialMapMode = 'utm',
  initialPrintScale = 1000000,
}: LocalChartClientProps) {
  // Ref to call download function from map component
  const mapRef = useRef<LocalChartMapHandle>(null);

  // Map mode toggle
  const [mapMode, setMapMode] = useState<MapMode>(initialMapMode);

  // Print scale selector (1:500,000 Sectional or 1:1,000,000 WAC)
  const [printScale, setPrintScale] = useState<number>(initialPrintScale);

  // From location (origin)
  const [fromSearchQuery, setFromSearchQuery] = useState("");
  const [fromSearchResults, setFromSearchResults] = useState<GeocodingResult[]>([]);
  const [fromLocation, setFromLocation] = useState<LocationData | null>(
    initialFromLat && initialFromLon && initialFromName
      ? {
          name: initialFromName,
          lat: parseFloat(initialFromLat),
          lon: parseFloat(initialFromLon),
        }
      : null
  );
  const [fromLat, setFromLat] = useState(initialFromLat || "");
  const [fromLon, setFromLon] = useState(initialFromLon || "");
  const [fromSearching, setFromSearching] = useState(false);
  const [fromShowDropdown, setFromShowDropdown] = useState(false);

  // To locations (waypoints/destinations)
  const [toLocations, setToLocations] = useState<RouteLocation[]>(() => {
    // Use initialToLocations if provided
    if (initialToLocations && initialToLocations.length > 0) {
      return initialToLocations.map(loc => ({
        id: crypto.randomUUID(),
        name: loc.name || "",
        lat: parseFloat(loc.lat),
        lon: parseFloat(loc.lon),
        lat_str: loc.lat,
        lon_str: loc.lon,
        searchQuery: "",
        searchResults: [],
        searching: false,
        showDropdown: false,
        isFlyOver: loc.isFlyOver || false,
      }));
    }

    // Default: one empty destination
    return [{
      id: crypto.randomUUID(),
      name: "",
      lat: 0,
      lon: 0,
      lat_str: "",
      lon_str: "",
      searchQuery: "",
      searchResults: [],
      searching: false,
      showDropdown: false,
      isFlyOver: false,
    }];
  });

  // UTM validation state
  const [utmValidation, setUtmValidation] = useState<UTMValidationResult | null>(null);

  // Editing waypoint name
  const [editingWaypointIndex, setEditingWaypointIndex] = useState<number | null>(null);
  const [editingWaypointName, setEditingWaypointName] = useState<string>("");

  // Debounced search for "from" location
  useEffect(() => {
    if (fromSearchQuery.length < 3) {
      setFromSearchResults([]);
      setFromShowDropdown(false);
      return;
    }

    setFromShowDropdown(true);
    const timer = setTimeout(async () => {
      setFromSearching(true);
      try {
        const response = await fetch(
          `/api/geocode?q=${encodeURIComponent(fromSearchQuery)}`
        );
        if (response.ok) {
          const results = await response.json();
          setFromSearchResults(results);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setFromSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [fromSearchQuery]);

  // Debounced search for each "to" location
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    toLocations.forEach((toLocation, index) => {
      if (toLocation.searchQuery.length < 3) {
        if (toLocation.searchResults.length > 0 || toLocation.showDropdown) {
          setToLocations(prev => prev.map((loc, i) =>
            i === index ? { ...loc, searchResults: [], showDropdown: false } : loc
          ));
        }
        return;
      }

      const timer = setTimeout(async () => {
        setToLocations(prev => prev.map((loc, i) =>
          i === index ? { ...loc, searching: true, showDropdown: true } : loc
        ));

        try {
          const response = await fetch(
            `/api/geocode?q=${encodeURIComponent(toLocation.searchQuery)}`
          );
          if (response.ok) {
            const results = await response.json();
            setToLocations(prev => prev.map((loc, i) =>
              i === index ? { ...loc, searchResults: results, searching: false } : loc
            ));
          }
        } catch (error) {
          console.error("Search error:", error);
          setToLocations(prev => prev.map((loc, i) =>
            i === index ? { ...loc, searching: false } : loc
          ));
        }
      }, 300);

      timers.push(timer);
    });

    return () => timers.forEach(timer => clearTimeout(timer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toLocations.map(loc => loc.searchQuery).join(',')]);

  // Update URL when locations change
  useEffect(() => {
    if (fromLat && fromLon && toLocations.length > 0) {
      const fromLatNum = parseFloat(fromLat);
      const fromLonNum = parseFloat(fromLon);

      if (!isNaN(fromLatNum) && !isNaN(fromLonNum)) {
        const params = new URLSearchParams();

        // Add from location (compact format: lat~lon~name)
        let fromValue = `${quantizeCoordinate(fromLatNum)}~${quantizeCoordinate(fromLonNum)}`;
        if (fromLocation?.name) {
          fromValue += `~${fromLocation.name.split(",")[0]}`;
        }
        params.set("from", fromValue);
        params.set("s", "5");

        // Add all to locations with indexed compact format
        toLocations.forEach((toLocation, index) => {
          if (toLocation.lat_str && toLocation.lon_str) {
            const toLatNum = parseFloat(toLocation.lat_str);
            const toLonNum = parseFloat(toLocation.lon_str);

            if (!isNaN(toLatNum) && !isNaN(toLonNum)) {
              let toValue = `${quantizeCoordinate(toLatNum)}~${quantizeCoordinate(toLonNum)}`;
              if (toLocation.name) {
                toValue += `~${toLocation.name.split(",")[0]}`;
              }
              params.set(`to[${index}]`, toValue);

              // Add fly-over flag if true
              if (toLocation.isFlyOver) {
                params.set(`toFO[${index}]`, '1');
              }
            }
          }
        });

        // Add map mode if not default
        if (mapMode !== 'utm') {
          params.set('mode', mapMode);
        }

        // Add print scale if not default (WAC = 1,000,000)
        if (printScale !== 1000000) {
          params.set('scale', printScale.toString());
        }

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, "", newUrl);
      }
    }
  }, [fromLat, fromLon, toLocations, fromLocation, mapMode, printScale]);

  // Validate UTM when locations change
  useEffect(() => {
    const fromLatNum = parseFloat(fromLat);
    const fromLonNum = parseFloat(fromLon);

    if (!isNaN(fromLatNum) && !isNaN(fromLonNum)) {
      const allLocations: Location[] = [
        { lat: fromLatNum, lon: fromLonNum },
        ...toLocations
          .filter(loc => loc.lat_str && loc.lon_str)
          .map(loc => ({
            lat: parseFloat(loc.lat_str),
            lon: parseFloat(loc.lon_str),
          }))
          .filter(loc => !isNaN(loc.lat) && !isNaN(loc.lon))
      ];

      const validation = validateUTMRoute(allLocations);
      setUtmValidation(validation);
    } else {
      setUtmValidation(null);
    }
  }, [fromLat, fromLon, toLocations]);

  // Handle location selection
  const handleFromLocationSelect = useCallback((result: GeocodingResult) => {
    setFromLocation({
      name: result.name,
      lat: result.lat,
      lon: result.lon,
    });
    setFromLat(result.lat.toFixed(6));
    setFromLon(result.lon.toFixed(6));
    setFromSearchQuery("");
    setFromSearchResults([]);
    setFromShowDropdown(false);
  }, []);

  const handleToLocationSelect = useCallback((index: number, result: GeocodingResult) => {
    setToLocations(prev => prev.map((loc, i) =>
      i === index ? {
        ...loc,
        name: result.name,
        lat: result.lat,
        lon: result.lon,
        lat_str: result.lat.toFixed(6),
        lon_str: result.lon.toFixed(6),
        searchQuery: "",
        searchResults: [],
        showDropdown: false,
      } : loc
    ));
  }, []);

  const handleAddDestination = useCallback(() => {
    setToLocations(prev => [...prev, {
      id: crypto.randomUUID(),
      name: "",
      lat: 0,
      lon: 0,
      lat_str: "",
      lon_str: "",
      searchQuery: "",
      searchResults: [],
      searching: false,
      showDropdown: false,
      isFlyOver: false,
    }]);
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setToLocations(prev => {
      const newLocations = [...prev];
      [newLocations[index - 1], newLocations[index]] = [newLocations[index], newLocations[index - 1]];
      return newLocations;
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setToLocations(prev => {
      if (index >= prev.length - 1) return prev;
      const newLocations = [...prev];
      [newLocations[index], newLocations[index + 1]] = [newLocations[index + 1], newLocations[index]];
      return newLocations;
    });
  }, []);

  const handleToggleFlyOver = useCallback((index: number) => {
    setToLocations(prev => prev.map((loc, i) =>
      i === index ? { ...loc, isFlyOver: !loc.isFlyOver } : loc
    ));
  }, []);

  const handleRemoveDestination = useCallback((index: number) => {
    setToLocations(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateToSearchQuery = useCallback((index: number, query: string) => {
    setToLocations(prev => prev.map((loc, i) =>
      i === index ? { ...loc, searchQuery: query } : loc
    ));
  }, []);

  // Collect all valid locations for the map (only confirmed ones with name)
  // Use useMemo with a stable key based on actual confirmed data
  /* eslint-disable react-hooks/exhaustive-deps */
  const validLocations = useMemo<Array<LocationData & { isFlyOver?: boolean }>>(() => {
    return [
      ...(fromLocation ? [{ ...fromLocation, isFlyOver: false }] : []),
      ...toLocations
        .filter(loc => loc.name && loc.lat && loc.lon)
        .map(loc => ({
          name: loc.name,
          lat: loc.lat,
          lon: loc.lon,
          isFlyOver: loc.isFlyOver,
        })),
    ];
  }, [
    fromLocation?.name,
    fromLocation?.lat,
    fromLocation?.lon,
    toLocations.map(loc => `${loc.name}|${loc.lat}|${loc.lon}|${loc.isFlyOver}`).join(',')
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const hasValidRoute = validLocations.length >= 2;

  return (
    <PageLayout currentPage="local-chart">
      <CalculatorPageHeader
        title="Local Chart"
        description="Create printable route charts with fixed UTM scale for short-range local flights. Measure distances with ruler or plotter like a real aeronautical chart."
      />

      <main className="w-full max-w-4xl print-hide-footer">
        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">
          {/* Section Header */}
          <div className="mb-6 pb-6 border-b border-gray-700 print:mb-3 print:pb-3">
            <h2
              className="text-xl sm:text-2xl font-bold mb-2 print:mb-1"
              style={{ color: "white" }}
            >
              Route Waypoints
            </h2>
            <p className="text-sm print:hidden" style={{ color: "oklch(0.7 0.02 240)" }}>
              Add waypoints to create a local route chart. All points must be within the same UTM zone (max 400 km east-west).
            </p>
          </div>

          {/* From Location Search */}
          <div className="mb-6">
            <label
              className="flex items-center text-sm font-medium mb-2"
              style={{ color: "oklch(0.72 0.015 240)" }}
            >
              Origin
              <Tooltip content="Search for your departure point or paste coordinates (e.g., -31.4135, -64.181)" />
            </label>
            <div className="relative">
              {fromLocation ? (
                <div className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-sky-500/50 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-medium truncate">
                        {fromLocation.name.split(",")[0]}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {fromLocation.lat.toFixed(4)}, {fromLocation.lon.toFixed(4)}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setFromLocation(null);
                        setFromLat("");
                        setFromLon("");
                        setFromSearchQuery("");
                      }}
                      className="ml-2 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={fromSearchQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      const coords = parseCoordinates(value);

                      if (coords) {
                        setFromLocation({
                          name: `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`,
                          lat: coords.lat,
                          lon: coords.lon,
                        });
                        setFromLat(coords.lat.toFixed(6));
                        setFromLon(coords.lon.toFixed(6));
                        setFromSearchQuery("");
                        setFromSearchResults([]);
                        setFromShowDropdown(false);
                      } else {
                        setFromSearchQuery(value);
                      }
                    }}
                    onFocus={() => {
                      if (fromSearchResults.length > 0) {
                        setFromShowDropdown(true);
                      }
                    }}
                    placeholder="Search location or paste coordinates..."
                    className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white"
                  />
                  {fromSearching && fromShowDropdown && (
                    <div className="absolute top-full mt-1 w-full bg-slate-800 rounded-lg p-2 text-sm text-gray-400 border border-gray-700 z-10">
                      Searching...
                    </div>
                  )}
                  {fromSearchResults.length > 0 && fromShowDropdown && (
                    <div className="absolute top-full mt-1 w-full bg-slate-800 rounded-lg border border-gray-700 max-h-60 overflow-y-auto z-10">
                      {fromSearchResults.map((result, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleFromLocationSelect(result)}
                          className="w-full text-left px-4 py-2 hover:bg-slate-700 transition-colors text-sm text-white"
                        >
                          {result.name}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* To Locations (Multiple Waypoints) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                className="flex items-center text-sm font-medium"
                style={{ color: "oklch(0.72 0.015 240)" }}
              >
                Waypoints
                <Tooltip content="Add waypoints along your route. All points must be within the same UTM zone for accurate scale." />
              </label>
              <button
                onClick={handleAddDestination}
                className="px-3 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-sm font-medium transition-all cursor-pointer"
              >
                + Add Waypoint
              </button>
            </div>

            <div className="space-y-3">
              {toLocations.map((toLocation, index) => (
                <div key={toLocation.id} className="relative">
                  {toLocation.name ? (
                    <div className={`w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 ${toLocation.isFlyOver ? 'border-amber-500/50' : 'border-purple-500/50'} text-white`}>
                      <div className="flex items-center justify-between gap-3">
                        {/* Reorder buttons */}
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className={`p-1 rounded ${index === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-sky-400 cursor-pointer'} transition-colors`}
                            title="Move up"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={index === toLocations.length - 1}
                            className={`p-1 rounded ${index === toLocations.length - 1 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-sky-400 cursor-pointer'} transition-colors`}
                            title="Move down"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        {/* Location info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {editingWaypointIndex === index ? (
                              <input
                                type="text"
                                value={editingWaypointName}
                                onChange={(e) => setEditingWaypointName(e.target.value)}
                                onBlur={() => {
                                  if (editingWaypointName.trim()) {
                                    setToLocations(prev => prev.map((loc, i) =>
                                      i === index ? { ...loc, name: editingWaypointName.trim() } : loc
                                    ));
                                  }
                                  setEditingWaypointIndex(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    if (editingWaypointName.trim()) {
                                      setToLocations(prev => prev.map((loc, i) =>
                                        i === index ? { ...loc, name: editingWaypointName.trim() } : loc
                                      ));
                                    }
                                    setEditingWaypointIndex(null);
                                  } else if (e.key === 'Escape') {
                                    setEditingWaypointIndex(null);
                                  }
                                }}
                                autoFocus
                                className="text-lg font-medium bg-slate-800 border border-sky-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500"
                              />
                            ) : (
                              <div
                                className="text-lg font-medium truncate cursor-pointer hover:text-sky-400 transition-colors"
                                onClick={() => {
                                  setEditingWaypointIndex(index);
                                  setEditingWaypointName(toLocation.name.split(",")[0]);
                                }}
                                title="Click to edit name"
                              >
                                {toLocation.name.split(",")[0]}
                              </div>
                            )}
                            {toLocation.isFlyOver && (
                              <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                FLY-OVER
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {toLocation.lat.toFixed(4)}, {toLocation.lon.toFixed(4)}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleFlyOver(index)}
                            className={`p-2 rounded-lg transition-all cursor-pointer ${toLocation.isFlyOver ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-slate-800 text-gray-400 hover:text-amber-400'}`}
                            title={toLocation.isFlyOver ? "Set as route waypoint" : "Set as fly-over (reference only)"}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setToLocations(prev => prev.map((loc, i) =>
                                i === index ? {
                                  ...loc,
                                  name: "",
                                  lat_str: "",
                                  lon_str: "",
                                  searchQuery: "",
                                } : loc
                              ));
                            }}
                            className="text-gray-400 hover:text-yellow-400 transition-colors cursor-pointer p-2"
                            title="Clear"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          {toLocations.length > 1 && (
                            <button
                              onClick={() => handleRemoveDestination(index)}
                              className="text-gray-400 hover:text-red-400 transition-colors cursor-pointer p-2"
                              title="Remove"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={toLocation.searchQuery}
                          onChange={(e) => {
                            const value = e.target.value;
                            const coords = parseCoordinates(value);

                            if (coords) {
                              setToLocations(prev => prev.map((loc, i) =>
                                i === index ? {
                                  ...loc,
                                  name: `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`,
                                  lat: coords.lat,
                                  lon: coords.lon,
                                  lat_str: coords.lat.toFixed(6),
                                  lon_str: coords.lon.toFixed(6),
                                  searchQuery: "",
                                  searchResults: [],
                                  showDropdown: false,
                                } : loc
                              ));
                            } else {
                              handleUpdateToSearchQuery(index, value);
                            }
                          }}
                          onFocus={() => {
                            if (toLocation.searchResults.length > 0) {
                              setToLocations(prev => prev.map((loc, i) =>
                                i === index ? { ...loc, showDropdown: true } : loc
                              ));
                            }
                          }}
                          placeholder="Search location or paste coordinates..."
                          className="flex-1 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white"
                        />
                        {toLocations.length > 1 && (
                          <button
                            onClick={() => handleRemoveDestination(index)}
                            className="p-3 rounded-xl bg-slate-900/50 border-2 border-gray-600 text-gray-400 hover:text-red-400 hover:border-red-400/50 transition-colors cursor-pointer"
                            title="Remove waypoint"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {toLocation.searching && toLocation.showDropdown && (
                        <div className="absolute top-full mt-1 w-full bg-slate-800 rounded-lg p-2 text-sm text-gray-400 border border-gray-700 z-10">
                          Searching...
                        </div>
                      )}
                      {toLocation.searchResults.length > 0 && toLocation.showDropdown && (
                        <div className="absolute top-full mt-1 w-full bg-slate-800 rounded-lg border border-gray-700 max-h-60 overflow-y-auto z-10">
                          {toLocation.searchResults.map((result, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleToLocationSelect(index, result)}
                              className="w-full text-left px-4 py-2 hover:bg-slate-700 transition-colors text-sm text-white"
                            >
                              {result.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* UTM Validation Warning */}
          {hasValidRoute && utmValidation && !utmValidation.isValid && (
            <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-red-400 mb-1">
                    Route Not Suitable for UTM Projection
                  </p>
                  <p className="text-sm text-red-300 mb-2">
                    {utmValidation.reason}
                  </p>
                  {utmValidation.recommendedAlternative && (
                    <p className="text-sm text-red-200">
                      <span className="font-semibold">Recommendation:</span> {utmValidation.recommendedAlternative}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* UTM Info (when valid) + Map Mode Toggle */}
          {hasValidRoute && utmValidation && utmValidation.isValid && (
            <div className="mt-6 space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-emerald-400 mb-1">
                      Route Valid for UTM Projection
                    </p>
                    <p className="text-sm text-emerald-200">
                      Zone: {utmValidation.zone}{utmValidation.hemisphere} (EPSG:{utmValidation.epsgCode}) •
                      East-West Span: {Math.round(utmValidation.maxEastWestSpan!)} km
                    </p>
                  </div>
                </div>
              </div>

              {/* Map Mode Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/30 border border-gray-700">
                <div>
                  <p className="text-sm font-semibold text-white mb-1">Map Projection</p>
                  <p className="text-xs text-gray-400">
                    {mapMode === 'utm' ? 'UTM: Fixed scale for printing' : 'Web Mercator: OSM tiles with context'}
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-1">
                  <button
                    onClick={() => setMapMode('utm')}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-all cursor-pointer ${
                      mapMode === 'utm'
                        ? 'bg-sky-500/20 text-sky-400'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    UTM
                  </button>
                  <button
                    onClick={() => setMapMode('mercator')}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-all cursor-pointer ${
                      mapMode === 'mercator'
                        ? 'bg-sky-500/20 text-sky-400'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Mercator
                  </button>
                </div>
              </div>

              {/* Print Scale Selector (only for UTM mode) */}
              {mapMode === 'utm' && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/30 border border-gray-700 print:hidden">
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">Print Scale</p>
                    <p className="text-xs text-gray-400">
                      Chart scale for printing with plotter/ruler
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-1">
                    <button
                      onClick={() => setPrintScale(500000)}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-all cursor-pointer ${
                        printScale === 500000
                          ? 'bg-sky-500/20 text-sky-400'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      1:500,000
                      <span className="block text-xs opacity-70">Sectional</span>
                    </button>
                    <button
                      onClick={() => setPrintScale(1000000)}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-all cursor-pointer ${
                        printScale === 1000000
                          ? 'bg-sky-500/20 text-sky-400'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      1:1,000,000
                      <span className="block text-xs opacity-70">WAC</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Map (only show when valid) */}
          {hasValidRoute && utmValidation && utmValidation.isValid && (
            <div className="mt-6 print:mt-4">
              <LocalChartMap
                ref={mapRef}
                locations={validLocations}
                utmZone={utmValidation.zone!}
                hemisphere={utmValidation.hemisphere!}
                mapMode={mapMode}
                printScale={printScale}
              />
            </div>
          )}

          {/* Action Buttons */}
          {hasValidRoute && utmValidation && utmValidation.isValid && (
            <div className="mt-6 print:hidden flex gap-4">
              <ShareButtonSimple
                shareData={{
                  title: "José's Local Chart",
                  text: `Route chart - UTM Zone ${utmValidation.zone}${utmValidation.hemisphere}`,
                }}
              />
              <button
                onClick={() => mapRef.current?.downloadChart()}
                className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-600 hover:border-gray-500 hover:bg-slate-700/50 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
                style={{ color: "oklch(0.7 0.02 240)" }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span className="text-sm font-medium">Download Chart</span>
              </button>
            </div>
          )}

          {/* Note */}
          <div className="mt-6 p-4 rounded-xl bg-slate-900/30 border border-gray-700 print:mt-3 print:p-3 print-last-element">
            <p
              className="text-xs sm:text-sm leading-relaxed"
              style={{ color: "oklch(0.6 0.02 240)" }}
            >
              <span className="font-semibold">Note:</span> This tool creates route charts
              using UTM (Universal Transverse Mercator) projection with fixed scale, ideal
              for short-range local flights. All navigation calculations (bearings, distances)
              are performed in WGS-84. UTM is only used for displaying the map at a fixed
              scale, allowing you to measure distances with a ruler or plotter like a real
              aeronautical chart. For routes crossing UTM zones or spanning wide areas, use
              the <a href="/segments" className="text-sky-400 hover:underline">/segments</a> calculator instead.
            </p>
          </div>
        </div>
      </main>

      <Footer description="UTM projection route charts for local VFR navigation with fixed-scale printable maps" />
    </PageLayout>
  );
}
