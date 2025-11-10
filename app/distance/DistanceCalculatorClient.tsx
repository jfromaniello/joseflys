"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Tooltip } from "../components/Tooltip";
import { PageLayout } from "../components/PageLayout";
import { CalculatorPageHeader } from "../components/CalculatorPageHeader";
import { Footer } from "../components/Footer";
import { ShareButtonSimple } from "../components/ShareButtonSimple";
import {
  calculateHaversineDistance,
  calculateInitialBearing,
  validateCoordinates,
  MAX_RECOMMENDED_DISTANCE_NM,
} from "@/lib/distanceCalculations";
import { quantizeCoordinate } from "@/lib/coordinateUrlParams";

// Dynamic import for DistanceMap to avoid SSR issues with Leaflet
const DistanceMap = dynamic(() => import("./DistanceMap").then((mod) => mod.DistanceMap), {
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
  if (isNaN(lat) || isNaN(lon) || !validateCoordinates(lat, lon)) {
    return null;
  }

  return { lat, lon };
}

type InputMode = "search" | "coordinates";

interface Location {
  name: string;
  lat: number;
  lon: number;
}

interface ToLocation extends Location {
  id: string;
  searchQuery: string;
  searchResults: GeocodingResult[];
  searching: boolean;
  showDropdown: boolean;
  lat_str: string;
  lon_str: string;
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
}

interface DistanceCalculatorClientProps {
  initialFromLat?: string;
  initialFromLon?: string;
  initialFromName?: string;
  initialToLocations?: InitialToLocation[];
  // Legacy props for backward compatibility
  initialToLat?: string;
  initialToLon?: string;
  initialToName?: string;
}

export function DistanceCalculatorClient({
  initialFromLat,
  initialFromLon,
  initialFromName,
  initialToLocations,
  // Legacy props
  initialToLat,
  initialToLon,
  initialToName,
}: DistanceCalculatorClientProps) {
  // Input mode toggle
  const [inputMode, setInputMode] = useState<InputMode>("search");

  // From location
  const [fromSearchQuery, setFromSearchQuery] = useState("");
  const [fromSearchResults, setFromSearchResults] = useState<GeocodingResult[]>([]);
  const [fromLocation, setFromLocation] = useState<Location | null>(
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

  // To locations (multiple destinations)
  const [toLocations, setToLocations] = useState<ToLocation[]>(() => {
    // New format: use initialToLocations if provided
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
      }));
    }

    // Legacy format: use initialToLat/Lon if provided
    if (initialToLat && initialToLon) {
      return [{
        id: crypto.randomUUID(),
        name: initialToName || "",
        lat: parseFloat(initialToLat),
        lon: parseFloat(initialToLon),
        lat_str: initialToLat,
        lon_str: initialToLon,
        searchQuery: "",
        searchResults: [],
        searching: false,
        showDropdown: false,
      }];
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
    }];
  });
  const [showCopiedMessages, setShowCopiedMessages] = useState<Record<string, { distance: boolean; bearing: boolean }>>({});
  const [showCopiedWaypoints, setShowCopiedWaypoints] = useState(false);

  // Debounced search for "from" location
  useEffect(() => {
    if (inputMode !== "search" || fromSearchQuery.length < 3) {
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
  }, [fromSearchQuery, inputMode]);

  // Debounced search for each "to" location
  useEffect(() => {
    if (inputMode !== "search") return;

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
  }, [toLocations.map(loc => loc.searchQuery).join(','), inputMode]);

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
          // Include city name as third parameter (only first part before comma)
          fromValue += `~${fromLocation.name.split(",")[0]}`;
        }
        params.set("from", fromValue);
        params.set("s", "5");

        // Add all to locations with indexed compact format (lat~lon~name)
        toLocations.forEach((toLocation, index) => {
          if (toLocation.lat_str && toLocation.lon_str) {
            const toLatNum = parseFloat(toLocation.lat_str);
            const toLonNum = parseFloat(toLocation.lon_str);

            if (!isNaN(toLatNum) && !isNaN(toLonNum)) {
              let toValue = `${quantizeCoordinate(toLatNum)}~${quantizeCoordinate(toLonNum)}`;
              if (toLocation.name) {
                // Include city name as third parameter (only first part before comma)
                toValue += `~${toLocation.name.split(",")[0]}`;
              }
              params.set(`to[${index}]`, toValue);
            }
          }
        });

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, "", newUrl);
      }
    }
  }, [fromLat, fromLon, toLocations, fromLocation]);

  // Calculate distance and bearing for each destination
  const fromLatNum = parseFloat(fromLat);
  const fromLonNum = parseFloat(fromLon);

  const results = toLocations.map(toLocation => {
    const toLatNum = parseFloat(toLocation.lat_str);
    const toLonNum = parseFloat(toLocation.lon_str);

    const validCoordinates =
      !isNaN(fromLatNum) &&
      !isNaN(fromLonNum) &&
      !isNaN(toLatNum) &&
      !isNaN(toLonNum) &&
      validateCoordinates(fromLatNum, fromLonNum) &&
      validateCoordinates(toLatNum, toLonNum);

    const distance = validCoordinates
      ? calculateHaversineDistance(fromLatNum, fromLonNum, toLatNum, toLonNum)
      : null;

    const bearing = validCoordinates
      ? calculateInitialBearing(fromLatNum, fromLonNum, toLatNum, toLonNum)
      : null;

    const distanceExceedsLimit =
      distance !== null && distance > MAX_RECOMMENDED_DISTANCE_NM;

    return {
      id: toLocation.id,
      toLocation,
      distance,
      bearing,
      distanceExceedsLimit,
      validCoordinates,
    };
  });

  // Handle location selection
  const handleFromLocationSelect = useCallback((result: GeocodingResult) => {
    setFromLocation({
      name: result.name,
      lat: result.lat,
      lon: result.lon,
    });
    setFromLat(result.lat.toFixed(6));
    setFromLon(result.lon.toFixed(6));
    setFromSearchQuery(""); // Clear the search query
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
    }]);
  }, []);

  const handleRemoveDestination = useCallback((index: number) => {
    setToLocations(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateToCoordinates = useCallback((index: number, field: 'lat_str' | 'lon_str', value: string) => {
    setToLocations(prev => prev.map((loc, i) => {
      if (i !== index) return loc;
      const updated = { ...loc, [field]: value };
      // Update numeric values if valid
      if (field === 'lat_str') {
        const lat = parseFloat(value);
        if (!isNaN(lat)) updated.lat = lat;
      } else if (field === 'lon_str') {
        const lon = parseFloat(value);
        if (!isNaN(lon)) updated.lon = lon;
      }
      return updated;
    }));
  }, []);

  const handleUpdateToSearchQuery = useCallback((index: number, query: string) => {
    setToLocations(prev => prev.map((loc, i) =>
      i === index ? { ...loc, searchQuery: query } : loc
    ));
  }, []);

  const handleCopyDistance = async (id: string, distance: number) => {
    try {
      await navigator.clipboard.writeText(Math.round(distance).toString());
      setShowCopiedMessages(prev => ({ ...prev, [id]: { ...prev[id], distance: true } }));
      setTimeout(() => {
        setShowCopiedMessages(prev => ({ ...prev, [id]: { ...prev[id], distance: false } }));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleCopyBearing = async (id: string, bearing: number) => {
    try {
      await navigator.clipboard.writeText(Math.round(bearing).toString().padStart(3, '0'));
      setShowCopiedMessages(prev => ({ ...prev, [id]: { ...prev[id], bearing: true } }));
      setTimeout(() => {
        setShowCopiedMessages(prev => ({ ...prev, [id]: { ...prev[id], bearing: false } }));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleCopyWaypoints = async () => {
    // Create waypoints array from valid results
    const waypoints = results
      .filter(r => r.validCoordinates && r.distance !== null)
      .map(r => ({
        name: r.toLocation.name || `(${r.toLocation.lat.toFixed(2)}, ${r.toLocation.lon.toFixed(2)})`,
        distance: Math.round(r.distance!),
      }));

    try {
      await navigator.clipboard.writeText(JSON.stringify(waypoints, null, 2));
      setShowCopiedWaypoints(true);
      setTimeout(() => setShowCopiedWaypoints(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Build share URL (using first destination for simplicity)
  const shareUrl = (() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams();
    if (fromLat) params.set("fromLat", fromLat);
    if (fromLon) params.set("fromLon", fromLon);
    if (toLocations.length > 0 && toLocations[0].lat_str) {
      params.set("toLat", toLocations[0].lat_str);
      params.set("toLon", toLocations[0].lon_str);
    }
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  })();

  return (
    <PageLayout currentPage="distance">
      <CalculatorPageHeader
        title="Distance Calculator"
        description="Calculate great circle distance and initial bearing between two points using WGS-84 geodesic algorithms for high-precision navigation"
      />

      <main className="w-full max-w-4xl print-hide-footer">
        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">
          {/* Section Header */}
          <div className="mb-6 pb-6 border-b border-gray-700 print:mb-3 print:pb-3">
            <div className="flex items-center justify-between mb-2 print:mb-1">
              <h2
                className="text-xl sm:text-2xl font-bold"
                style={{ color: "white" }}
              >
                Route Information
              </h2>

              {/* Input Mode Toggle */}
              <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-1">
                <button
                  onClick={() => setInputMode("search")}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                    inputMode === "search"
                      ? "bg-sky-500/20 text-sky-400"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  Search
                </button>
                <button
                  onClick={() => setInputMode("coordinates")}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                    inputMode === "coordinates"
                      ? "bg-sky-500/20 text-sky-400"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  Coordinates
                </button>
              </div>
            </div>
            <p className="text-sm print:hidden" style={{ color: "oklch(0.7 0.02 240)" }}>
              {inputMode === "search"
                ? "Search for two locations to get distance and bearing"
                : "Enter two coordinates to get distance and bearing"}
            </p>
          </div>

          {/* Input Mode: Search */}
          {inputMode === "search" && (
            <div className="space-y-6 mb-8">
              {/* From Location Search */}
              <div>
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  From
                  <Tooltip content="Search for a city, airport, or location by name. Select from the dropdown to set the departure point." />
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
                            // Coordinates detected - set location directly
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
                            // Normal search behavior
                            setFromSearchQuery(value);
                          }
                        }}
                        onFocus={() => {
                          if (fromSearchResults.length > 0) {
                            setFromShowDropdown(true);
                          }
                        }}
                        placeholder="Search city, airport or paste coordinates..."
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

              {/* To Locations (Multiple) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className="flex items-center text-sm font-medium"
                    style={{ color: "oklch(0.72 0.015 240)" }}
                  >
                    To (Destinations)
                    <Tooltip content="Add multiple destinations. Distance and bearing are calculated from the origin to each destination." />
                  </label>
                  <button
                    onClick={handleAddDestination}
                    className="px-3 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-sm font-medium transition-all"
                  >
                    + Add Destination
                  </button>
                </div>

                <div className="space-y-3">
                  {toLocations.map((toLocation, index) => (
                    <div key={toLocation.id} className="relative">
                      {toLocation.name ? (
                        <div className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-purple-500/50 text-white">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="text-lg font-medium truncate">
                                {toLocation.name.split(",")[0]}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {toLocation.lat.toFixed(4)}, {toLocation.lon.toFixed(4)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
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
                                className="text-gray-400 hover:text-yellow-400 transition-colors"
                                title="Clear"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                              {toLocations.length > 1 && (
                                <button
                                  onClick={() => handleRemoveDestination(index)}
                                  className="text-gray-400 hover:text-red-400 transition-colors"
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
                                  // Coordinates detected - set location directly
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
                                  // Normal search behavior
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
                              placeholder="Search city, airport or paste coordinates..."
                              className="flex-1 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white"
                            />
                            {toLocations.length > 1 && (
                              <button
                                onClick={() => handleRemoveDestination(index)}
                                className="p-3 rounded-xl bg-slate-900/50 border-2 border-gray-600 text-gray-400 hover:text-red-400 hover:border-red-400/50 transition-colors"
                                title="Remove destination"
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
            </div>
          )}

          {/* Input Mode: Coordinates */}
          {inputMode === "coordinates" && (
            <div className="space-y-6 mb-8">
              {/* From Coordinates */}
              <div>
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  From Coordinates
                  <Tooltip content="Enter the latitude and longitude of the departure point. Latitude: -90 to 90, Longitude: -180 to 180" />
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      type="number"
                      value={fromLat}
                      onChange={(e) => setFromLat(e.target.value)}
                      placeholder="40.4168"
                      step="any"
                      className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white"
                    />
                    <span
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                      style={{ color: "oklch(0.55 0.02 240)" }}
                    >
                      Lat
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={fromLon}
                      onChange={(e) => setFromLon(e.target.value)}
                      placeholder="-3.7038"
                      step="any"
                      className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white"
                    />
                    <span
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                      style={{ color: "oklch(0.55 0.02 240)" }}
                    >
                      Lon
                    </span>
                  </div>
                </div>
              </div>

              {/* To Coordinates (Multiple) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className="flex items-center text-sm font-medium"
                    style={{ color: "oklch(0.72 0.015 240)" }}
                  >
                    To Coordinates (Destinations)
                    <Tooltip content="Add multiple destinations. Distance and bearing are calculated from the origin to each destination. Latitude: -90 to 90, Longitude: -180 to 180" />
                  </label>
                  <button
                    onClick={handleAddDestination}
                    className="px-3 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-sm font-medium transition-all"
                  >
                    + Add Destination
                  </button>
                </div>

                <div className="space-y-3">
                  {toLocations.map((toLocation, index) => (
                    <div key={toLocation.id} className="flex items-center gap-2">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div className="relative">
                          <input
                            type="number"
                            value={toLocation.lat_str}
                            onChange={(e) => handleUpdateToCoordinates(index, 'lat_str', e.target.value)}
                            placeholder="41.3874"
                            step="any"
                            className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white"
                          />
                          <span
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                            style={{ color: "oklch(0.55 0.02 240)" }}
                          >
                            Lat
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            value={toLocation.lon_str}
                            onChange={(e) => handleUpdateToCoordinates(index, 'lon_str', e.target.value)}
                            placeholder="2.1686"
                            step="any"
                            className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white"
                          />
                          <span
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                            style={{ color: "oklch(0.55 0.02 240)" }}
                          >
                            Lon
                          </span>
                        </div>
                      </div>
                      {toLocations.length > 1 && (
                        <button
                          onClick={() => handleRemoveDestination(index)}
                          className="p-3 rounded-xl bg-slate-900/50 border-2 border-gray-600 text-gray-400 hover:text-red-400 hover:border-red-400/50 transition-colors"
                          title="Remove destination"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {results.some(r => r.validCoordinates) && (
            <>
              {/* Warnings for any destinations that exceed distance limit */}
              {results.filter(r => r.distanceExceedsLimit).map(result => (
                <div key={result.id} className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "rgb(251, 191, 36)" }}
                  >
                    <span className="font-semibold">Warning:</span> Distance to{" "}
                    {result.toLocation.name || `(${result.toLocation.lat.toFixed(2)}, ${result.toLocation.lon.toFixed(2)})`} exceeds{" "}
                    {MAX_RECOMMENDED_DISTANCE_NM} NM. For long distances, the
                    bearing changes significantly along the route. The initial
                    bearing shown may differ substantially from the final bearing at
                    destination.
                  </p>
                </div>
              ))}

              {/* Results for each destination */}
              <div className="space-y-6 mb-6">
                {results.filter(r => r.validCoordinates && !r.distanceExceedsLimit).map((result, index) => (
                  <div key={result.id} className="space-y-4">
                    {/* Destination Header */}
                    {result.toLocation.name && (
                      <h3 className="text-lg font-semibold text-white">
                        To: {result.toLocation.name.split(",")[0]}
                      </h3>
                    )}

                    {/* Distance and Bearing Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Distance Result */}
                      <div className="p-6 rounded-xl text-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30 print:p-4">
                        <div className="flex items-center justify-center mb-2 print:mb-1">
                          <p
                            className="text-sm font-semibold uppercase tracking-wider print:text-xs"
                            style={{ color: "oklch(0.65 0.15 230)" }}
                          >
                            Distance
                          </p>
                          <Tooltip content="Geodesic distance calculated using WGS-84 ellipsoid model (Karney's method). More accurate than Haversine, especially for long distances and polar routes." />
                        </div>
                        <p
                          className="text-4xl sm:text-5xl font-bold mb-1 print:text-3xl print:mb-0"
                          style={{ color: "white" }}
                        >
                          {Math.round(result.distance!)}
                        </p>
                        <p
                          className="text-base print:text-sm"
                          style={{ color: "oklch(0.6 0.02 240)" }}
                        >
                          nautical miles
                        </p>
                        <button
                          onClick={() => handleCopyDistance(result.id, result.distance!)}
                          className="mt-3 px-4 py-2 rounded-lg border-2 border-sky-500/50 hover:bg-sky-500/10 transition-all text-sm font-medium cursor-pointer print:hidden"
                          style={{ color: "oklch(0.7 0.15 230)" }}
                        >
                          {showCopiedMessages[result.id]?.distance ? "✓ Copied!" : "📋 Copy"}
                        </button>
                      </div>

                      {/* Bearing Result */}
                      <div className="p-6 rounded-xl text-center bg-linear-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 print:p-4">
                        <div className="flex items-center justify-center mb-2 print:mb-1">
                          <p
                            className="text-sm font-semibold uppercase tracking-wider print:text-xs"
                            style={{ color: "rgb(192, 132, 252)" }}
                          >
                            Initial True Bearing
                          </p>
                          <Tooltip content="The true bearing at departure. This is the initial course to fly from the departure point. Note: bearing changes along a great circle route." />
                        </div>
                        <p
                          className="text-4xl sm:text-5xl font-bold mb-1 print:text-3xl print:mb-0"
                          style={{ color: "white" }}
                        >
                          {Math.round(result.bearing!).toString().padStart(3, '0')}°
                        </p>
                        <p
                          className="text-base print:text-sm"
                          style={{ color: "oklch(0.6 0.02 240)" }}
                        >
                          true
                        </p>
                        <button
                          onClick={() => handleCopyBearing(result.id, result.bearing!)}
                          className="mt-3 px-4 py-2 rounded-lg border-2 border-purple-500/50 hover:bg-purple-500/10 transition-all text-sm font-medium cursor-pointer print:hidden"
                          style={{ color: "rgb(192, 132, 252)" }}
                        >
                          {showCopiedMessages[result.id]?.bearing ? "✓ Copied!" : "📋 Copy"}
                        </button>
                      </div>
                    </div>

                    {/* Divider between destinations (not after last one) */}
                    {index < results.filter(r => r.validCoordinates && !r.distanceExceedsLimit).length - 1 && (
                      <div className="border-t border-gray-700"></div>
                    )}
                  </div>
                ))}
              </div>

              {/* Map */}
              <div className="mt-6 print:mt-4">
                <DistanceMap
                  fromLat={fromLatNum}
                  fromLon={fromLonNum}
                  toLocations={toLocations.filter((_, i) => results[i].validCoordinates)}
                  fromName={fromLocation?.name}
                />
              </div>

              {/* Action Buttons - Two Column Layout on Desktop */}
              {results.filter(r => r.validCoordinates && r.distance !== null).length > 0 && (
                <div className="mt-6 print:hidden grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
                  {/* Copy Waypoints Button */}
                  <button
                    onClick={handleCopyWaypoints}
                    className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all font-medium cursor-pointer"
                    style={{ color: "oklch(0.7 0.15 150)" }}
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
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    {showCopiedWaypoints ? "✓ Copied!" : "Copy Waypoints for Leg Planner"}
                  </button>

                  {/* Share & Print Buttons (stacked) */}
                  <div className="flex flex-col gap-2">
                    <ShareButtonSimple
                      shareData={{
                        title: "José's Distance Calculator",
                        text: results.length === 1 && results[0].distance !== null && results[0].bearing !== null
                          ? `Distance: ${Math.round(results[0].distance)} NM, Bearing: ${Math.round(results[0].bearing).toString().padStart(3, '0')}°T`
                          : `${results.filter(r => r.validCoordinates).length} destinations calculated`,
                      }}
                    />
                    <button
                      onClick={() => window.print()}
                      className="w-full px-6 py-3 rounded-xl border-2 border-gray-600 hover:border-gray-500 hover:bg-slate-700/50 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
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
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                        />
                      </svg>
                      <span className="text-sm font-medium">Print</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Note */}
          <div className="mt-6 p-4 rounded-xl bg-slate-900/30 border border-gray-700 print:mt-3 print:p-3 print-last-element">
            <p
              className="text-xs sm:text-sm leading-relaxed"
              style={{ color: "oklch(0.6 0.02 240)" }}
            >
              <span className="font-semibold">Note:</span> This calculator uses
              the WGS-84 geodesic algorithm (Karney's method via GeographicLib) to compute
              precise distances on Earth's ellipsoid. This is more accurate than the Haversine
              formula, especially for long distances and polar routes. The
              initial bearing is accurate at the departure point. For longer routes, consider
              that the bearing will change continuously along the geodesic
              path.{" "}
              <span className="font-semibold">All calculations are performed with decimal precision,
              but displayed values are rounded to the nearest integer for clarity.</span>
            </p>
          </div>
        </div>
      </main>

      <Footer description="High-precision geodesic distance and bearing calculations using WGS-84 ellipsoid model" />
    </PageLayout>
  );
}
