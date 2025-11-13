"use client";

import { useState, useEffect } from "react";
import { Tooltip } from "../components/Tooltip";
import { PageLayout } from "../components/PageLayout";
import { CalculatorPageHeader } from "../components/CalculatorPageHeader";
import { Footer } from "../components/Footer";
import { ShareButtonSimple } from "../components/ShareButtonSimple";
import {
  calculateNavigationSegments,
  formatHeading,
  formatSegmentDistance,
  type NavigationSegment,
  type SegmentCalculationResult,
} from "@/lib/segmentCalculations";
import { validateCoordinates } from "@/lib/distanceCalculations";
import { formatCourse } from "@/lib/formatters";

// Helper function to parse coordinate string (e.g., "-30.7505058,-62.8236677")
function parseCoordinates(text: string): { lat: number; lon: number } | null {
  const coordPattern = /^([-+]?\d+\.?\d*)\s*,\s*([-+]?\d+\.?\d*)$/;
  const match = text.trim().match(coordPattern);

  if (!match) return null;

  const lat = parseFloat(match[1]);
  const lon = parseFloat(match[2]);

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

interface GeocodingResult {
  name: string;
  lat: number;
  lon: number;
  type: string;
  importance: number;
}

interface SegmentsCalculatorClientProps {
  initialFromLat?: string;
  initialFromLon?: string;
  initialFromName?: string;
  initialToLat?: string;
  initialToLon?: string;
  initialToName?: string;
  initialSegmentCount?: string;
}

export function SegmentsCalculatorClient({
  initialFromLat,
  initialFromLon,
  initialFromName,
  initialToLat,
  initialToLon,
  initialToName,
  initialSegmentCount,
}: SegmentsCalculatorClientProps) {
  // Input mode toggle
  const [inputMode, setInputMode] = useState<InputMode>("search");

  // Default locations: New York to Tokyo (from tests)
  const defaultFrom = {
    name: "New York, NY, USA",
    lat: 40.7127281,
    lon: -74.0060152,
  };
  const defaultTo = {
    name: "Tokyo, Japan",
    lat: 35.6768601,
    lon: 139.7638947,
  };

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
      : defaultFrom
  );
  const [fromLat, setFromLat] = useState(initialFromLat || String(defaultFrom.lat));
  const [fromLon, setFromLon] = useState(initialFromLon || String(defaultFrom.lon));
  const [fromSearching, setFromSearching] = useState(false);
  const [fromShowDropdown, setFromShowDropdown] = useState(false);

  // To location
  const [toSearchQuery, setToSearchQuery] = useState("");
  const [toSearchResults, setToSearchResults] = useState<GeocodingResult[]>([]);
  const [toLocation, setToLocation] = useState<Location | null>(
    initialToLat && initialToLon && initialToName
      ? {
          name: initialToName,
          lat: parseFloat(initialToLat),
          lon: parseFloat(initialToLon),
        }
      : defaultTo
  );
  const [toLat, setToLat] = useState(initialToLat || String(defaultTo.lat));
  const [toLon, setToLon] = useState(initialToLon || String(defaultTo.lon));
  const [toSearching, setToSearching] = useState(false);
  const [toShowDropdown, setToShowDropdown] = useState(false);

  // Segment count (default 35 - good middle ground for LNAV, min 1, max 150)
  const [segmentCount, setSegmentCount] = useState(initialSegmentCount || "35");

  // Calculation result
  const [result, setResult] = useState<SegmentCalculationResult | null>(null);
  const [showCopied, setShowCopied] = useState(false);
  const [segmentsExpanded, setSegmentsExpanded] = useState(false);

  // Get navigation era description based on segment count
  const getNavigationEra = (count: number): { era: string; description: string; color: string } => {
    if (count === 1) {
      return {
        era: "Age of Explorers",
        description: "Single direct heading, like Columbus crossing the Atlantic",
        color: "text-red-400"
      };
    } else if (count <= 3) {
      return {
        era: "19th Century Sailing Ship",
        description: "Dead reckoning navigation with very few course changes",
        color: "text-orange-400"
      };
    } else if (count <= 10) {
      return {
        era: "Pan Am 1940s",
        description: "Stage flights with celestial and radio navigation",
        color: "text-yellow-400"
      };
    } else if (count <= 30) {
      return {
        era: "Classic Jet IFR (VOR/NDB)",
        description: "Ground-based radio navigation aids",
        color: "text-lime-400"
      };
    } else if (count <= 60) {
      return {
        era: "Modern LNAV / FMS",
        description: "Flight management system with GPS",
        color: "text-cyan-400"
      };
    } else {
      return {
        era: "Ultra-Precise LNAV",
        description: "Near-perfect great circle approximation",
        color: "text-blue-400"
      };
    }
  };

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

  // Debounced search for "to" location
  useEffect(() => {
    if (inputMode !== "search" || toSearchQuery.length < 3) {
      setToSearchResults([]);
      setToShowDropdown(false);
      return;
    }

    setToShowDropdown(true);
    const timer = setTimeout(async () => {
      setToSearching(true);
      try {
        const response = await fetch(
          `/api/geocode?q=${encodeURIComponent(toSearchQuery)}`
        );
        if (response.ok) {
          const results = await response.json();
          setToSearchResults(results);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setToSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [toSearchQuery, inputMode]);

  // Update URL when locations change (immediate)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Add from location
    if (fromLocation) {
      params.set("fromLat", fromLocation.lat.toString());
      params.set("fromLon", fromLocation.lon.toString());
      if (fromLocation.name) {
        params.set("fromName", fromLocation.name);
      }
    } else {
      params.delete("fromLat");
      params.delete("fromLon");
      params.delete("fromName");
    }

    // Add to location
    if (toLocation) {
      params.set("toLat", toLocation.lat.toString());
      params.set("toLon", toLocation.lon.toString());
      if (toLocation.name) {
        params.set("toName", toLocation.name);
      }
    } else {
      params.delete("toLat");
      params.delete("toLon");
      params.delete("toName");
    }

    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [fromLocation, toLocation]);

  // Update URL when segment count changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);

      // Add segment count
      if (segmentCount && parseInt(segmentCount) >= 1) {
        params.set("seg", segmentCount);
      } else {
        params.delete("seg");
      }

      const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
      window.history.replaceState(null, "", newUrl);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [segmentCount]);

  // Calculate segments when inputs change
  useEffect(() => {
    if (!fromLocation || !toLocation) {
      setResult(null);
      return;
    }

    const numSegments = parseInt(segmentCount);
    if (isNaN(numSegments) || numSegments < 1) {
      setResult(null);
      return;
    }

    try {
      const calculationResult = calculateNavigationSegments(
        fromLocation.lat,
        fromLocation.lon,
        toLocation.lat,
        toLocation.lon,
        numSegments
      );
      setResult(calculationResult);
    } catch (error) {
      console.error("Calculation error:", error);
      setResult(null);
    }
  }, [fromLocation, toLocation, segmentCount]);

  // Handle location selection from search dropdown
  const handleFromLocationSelect = (result: GeocodingResult) => {
    setFromLocation({
      name: result.name,
      lat: result.lat,
      lon: result.lon,
    });
    setFromSearchQuery("");
    setFromSearchResults([]);
    setFromShowDropdown(false);
  };

  const handleToLocationSelect = (result: GeocodingResult) => {
    setToLocation({
      name: result.name,
      lat: result.lat,
      lon: result.lon,
    });
    setToSearchQuery("");
    setToSearchResults([]);
    setToShowDropdown(false);
  };

  // Handle coordinate input mode
  const handleFromCoordinatesSubmit = () => {
    const fromLatNum = parseFloat(fromLat);
    const fromLonNum = parseFloat(fromLon);

    if (!validateCoordinates(fromLatNum, fromLonNum)) {
      alert("Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.");
      return;
    }

    setFromLocation({
      name: `${fromLatNum.toFixed(4)}°, ${fromLonNum.toFixed(4)}°`,
      lat: fromLatNum,
      lon: fromLonNum,
    });
  };

  const handleToCoordinatesSubmit = () => {
    const toLatNum = parseFloat(toLat);
    const toLonNum = parseFloat(toLon);

    if (!validateCoordinates(toLatNum, toLonNum)) {
      alert("Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.");
      return;
    }

    setToLocation({
      name: `${toLatNum.toFixed(4)}°, ${toLonNum.toFixed(4)}°`,
      lat: toLatNum,
      lon: toLonNum,
    });
  };

  // Smart search query handler - detects coordinate paste
  const handleFromSearchChange = (value: string) => {
    setFromSearchQuery(value);

    // Try to parse as coordinates
    const coords = parseCoordinates(value);
    if (coords) {
      setFromLocation({
        name: `${coords.lat.toFixed(4)}°, ${coords.lon.toFixed(4)}°`,
        lat: coords.lat,
        lon: coords.lon,
      });
      setFromSearchQuery("");
      setFromShowDropdown(false);
    }
  };

  const handleToSearchChange = (value: string) => {
    setToSearchQuery(value);

    // Try to parse as coordinates
    const coords = parseCoordinates(value);
    if (coords) {
      setToLocation({
        name: `${coords.lat.toFixed(4)}°, ${coords.lon.toFixed(4)}°`,
        lat: coords.lat,
        lon: coords.lon,
      });
      setToSearchQuery("");
      setToShowDropdown(false);
    }
  };

  // Copy segments to clipboard
  const handleCopySegments = () => {
    if (!result) return;

    const text = result.segments
      .map((seg) => `${seg.segmentNumber}. ${formatSegmentDistance(seg.distance)} NM @ ${formatHeading(seg.heading)}`)
      .join("\n");

    navigator.clipboard.writeText(text);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  return (
    <PageLayout currentPage="segments">
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-950 to-slate-900 text-white px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <CalculatorPageHeader
            title="LNAV Segments Calculator"
            description="Divide long-distance orthodromic routes into constant-heading loxodromic segments. Simulates how FMS/LNAV systems approximate great circle routes."
          />

          {/* Input Mode Toggle */}
          <div className="mb-6 flex gap-4">
            <button
              onClick={() => setInputMode("search")}
              className={`px-4 py-2 rounded-lg cursor-pointer ${
                inputMode === "search"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              Search Cities/Airports
            </button>
            <button
              onClick={() => setInputMode("coordinates")}
              className={`px-4 py-2 rounded-lg cursor-pointer ${
                inputMode === "coordinates"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              Enter Coordinates
            </button>
          </div>

          {/* Inputs Section */}
          <div className="mb-8 bg-slate-800/50 border-2 border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Route</h3>

            {inputMode === "search" ? (
              <>
                {/* From Search */}
                <div className="mb-4">
                  <label
                    className="flex items-center text-sm font-medium mb-2"
                    style={{ color: "oklch(0.72 0.015 240)" }}
                  >
                    From
                    <Tooltip content="Search for a city, airport, or location. You can also paste coordinates directly (e.g., '40.7128, -74.0060')." />
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
                            className="ml-2 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={fromSearchQuery}
                        onChange={(e) => handleFromSearchChange(e.target.value)}
                        onFocus={() => setFromShowDropdown(true)}
                        placeholder="Search city or airport..."
                        className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border-2 border-gray-600 focus:border-blue-500 focus:outline-none"
                      />
                    )}
                    {fromShowDropdown && fromSearchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-slate-700 border-2 border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {fromSearchResults.map((result, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleFromLocationSelect(result)}
                            className="px-4 py-2 hover:bg-slate-600 cursor-pointer"
                          >
                            {result.name}
                          </div>
                        ))}
                      </div>
                    )}
                    {fromSearching && (
                      <div className="absolute right-3 top-3 text-gray-400">
                        Searching...
                      </div>
                    )}
                  </div>
                </div>

                {/* To Search */}
                <div className="mb-4">
                  <label
                    className="flex items-center text-sm font-medium mb-2"
                    style={{ color: "oklch(0.72 0.015 240)" }}
                  >
                    To
                    <Tooltip content="Search for destination city, airport, or location. You can also paste coordinates directly." />
                  </label>
                  <div className="relative">
                    {toLocation ? (
                      <div className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-sky-500/50 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-medium truncate">
                              {toLocation.name.split(",")[0]}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {toLocation.lat.toFixed(4)}, {toLocation.lon.toFixed(4)}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setToLocation(null);
                              setToLat("");
                              setToLon("");
                              setToSearchQuery("");
                            }}
                            className="ml-2 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={toSearchQuery}
                        onChange={(e) => handleToSearchChange(e.target.value)}
                        onFocus={() => setToShowDropdown(true)}
                        placeholder="Search city or airport..."
                        className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border-2 border-gray-600 focus:border-blue-500 focus:outline-none"
                      />
                    )}
                    {toShowDropdown && toSearchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-slate-700 border-2 border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {toSearchResults.map((result, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleToLocationSelect(result)}
                            className="px-4 py-2 hover:bg-slate-600 cursor-pointer"
                          >
                            {result.name}
                          </div>
                        ))}
                      </div>
                    )}
                    {toSearching && (
                      <div className="absolute right-3 top-3 text-gray-400">
                        Searching...
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* From Coordinates */}
                <div className="mb-4">
                  <label
                    className="flex items-center text-sm font-medium mb-2"
                    style={{ color: "oklch(0.72 0.015 240)" }}
                  >
                    From Coordinates
                    <Tooltip content="Enter latitude and longitude. Latitude: -90 to 90, Longitude: -180 to 180." />
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      value={fromLat}
                      onChange={(e) => setFromLat(e.target.value)}
                      placeholder="Latitude"
                      className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg border-2 border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      step="any"
                      value={fromLon}
                      onChange={(e) => setFromLon(e.target.value)}
                      placeholder="Longitude"
                      className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg border-2 border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={handleFromCoordinatesSubmit}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                    >
                      Set
                    </button>
                  </div>
                  {fromLocation && (
                    <div className="mt-3 px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-sky-500/50">
                      <div className="text-base font-medium truncate">
                        {fromLocation.name.split(",")[0]}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {fromLocation.lat.toFixed(4)}, {fromLocation.lon.toFixed(4)}
                      </div>
                    </div>
                  )}
                </div>

                {/* To Coordinates */}
                <div className="mb-4">
                  <label
                    className="flex items-center text-sm font-medium mb-2"
                    style={{ color: "oklch(0.72 0.015 240)" }}
                  >
                    To Coordinates
                    <Tooltip content="Enter destination latitude and longitude." />
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      value={toLat}
                      onChange={(e) => setToLat(e.target.value)}
                      placeholder="Latitude"
                      className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg border-2 border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      step="any"
                      value={toLon}
                      onChange={(e) => setToLon(e.target.value)}
                      placeholder="Longitude"
                      className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg border-2 border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={handleToCoordinatesSubmit}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                    >
                      Set
                    </button>
                  </div>
                  {toLocation && (
                    <div className="mt-3 px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-sky-500/50">
                      <div className="text-base font-medium truncate">
                        {toLocation.name.split(",")[0]}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {toLocation.lat.toFixed(4)}, {toLocation.lon.toFixed(4)}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Segment Count Slider */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Number of Segments: {segmentCount}
                <Tooltip content="Choose how many waypoints to use. Fewer segments = old navigation (less precise). More segments = modern navigation (more precise)." />
              </label>
              <div className="flex gap-4 items-center">
                <input
                  type="range"
                  min="1"
                  max="150"
                  step="1"
                  value={segmentCount}
                  onChange={(e) => setSegmentCount(e.target.value)}
                  className="flex-1"
                />
                <input
                  type="number"
                  min="1"
                  max="150"
                  step="1"
                  value={segmentCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1 && val <= 150) {
                      setSegmentCount(e.target.value);
                    }
                  }}
                  className="w-20 px-3 py-1 bg-slate-700 text-white rounded-lg border-2 border-gray-600 focus:border-blue-500 focus:outline-none text-right"
                />
              </div>

              {/* Era message and distance preview */}
              {result && (
                <div className="mt-3 space-y-2">
                  {/* Historical era */}
                  <div className="bg-slate-700/50 rounded-lg p-3 border-l-4 border-blue-500">
                    <div className={`text-sm font-bold ${getNavigationEra(parseInt(segmentCount)).color}`}>
                      🛫 {getNavigationEra(parseInt(segmentCount)).era}
                    </div>
                    <div className="text-xs text-gray-300 mt-1">
                      {getNavigationEra(parseInt(segmentCount)).description}
                    </div>
                    {result.segments.length > 0 && (
                      <div className="text-xs text-gray-400 mt-2">
                        Segment size: ~{formatSegmentDistance(result.segments[0].distance)} NM
                      </div>
                    )}
                  </div>

                  {/* Distance stats */}
                  <div className="text-sm text-gray-300">
                    Segmented Route: <span className="font-semibold text-blue-400">{formatSegmentDistance(result.totalDistance)} NM</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    Great Circle: {formatSegmentDistance(result.orthodromicDistance)} NM
                    {" · "}
                    Penalty: <span className={`font-semibold ${
                      ((result.totalDistance - result.orthodromicDistance) / result.orthodromicDistance * 100) > 1
                        ? 'text-red-400'
                        : 'text-amber-400'
                    }`}>
                      +{((result.totalDistance - result.orthodromicDistance) / result.orthodromicDistance * 100).toFixed(2)}%
                    </span>
                    {" "}
                    (+{formatSegmentDistance(result.totalDistance - result.orthodromicDistance)} NM)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          {result && result.segments.length > 0 && (
            <div className="mb-8 bg-slate-800/50 border-2 border-gray-700 rounded-xl p-6">
              {/* Summary */}
              <div className="mb-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Segmented Route</div>
                  <div className="text-lg font-semibold text-blue-400">
                    {formatSegmentDistance(result.totalDistance)} NM
                  </div>
                  <div className="text-xs text-gray-400">
                    {result.segmentCount} segments × {result.segments.length > 0 && `~${formatSegmentDistance(result.segments[0].distance)} NM`}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Great Circle</div>
                  <div className="text-lg font-semibold text-green-400">
                    {formatSegmentDistance(result.orthodromicDistance)} NM
                  </div>
                  <div className="text-xs text-gray-400">
                    Shortest path
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Distance Penalty</div>
                  <div className={`text-lg font-semibold ${
                    ((result.totalDistance - result.orthodromicDistance) / result.orthodromicDistance * 100) > 1
                      ? 'text-red-400'
                      : 'text-amber-400'
                  }`}>
                    +{formatSegmentDistance(result.totalDistance - result.orthodromicDistance)} NM
                  </div>
                  <div className="text-xs text-gray-400">
                    +{((result.totalDistance - result.orthodromicDistance) / result.orthodromicDistance * 100).toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Segments List Toggle */}
              <div className="border-t border-gray-700 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <button
                    onClick={() => setSegmentsExpanded(!segmentsExpanded)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white cursor-pointer"
                  >
                    <svg
                      className={`w-5 h-5 transition-transform ${segmentsExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    {segmentsExpanded ? 'Hide' : 'Show'} Segment Details ({result.segmentCount} segments)
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopySegments}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer text-sm"
                    >
                      {showCopied ? "Copied!" : "Copy All"}
                    </button>
                    <ShareButtonSimple
                      shareData={{
                        title: "LNAV Segments",
                        text: `Route from ${fromLocation?.name} to ${toLocation?.name}: ${result.segmentCount} segments, ${getNavigationEra(parseInt(segmentCount)).era}`,
                      }}
                    />
                  </div>
                </div>

                {/* Segments List (Collapsible) */}
                {segmentsExpanded && (
                  <div className="space-y-2 mt-3">
                    {result.segments.map((segment) => (
                      <div
                        key={segment.segmentNumber}
                        className="bg-slate-700/50 rounded-lg p-4 flex justify-between items-center"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-2xl font-bold text-blue-400 w-12">
                            {segment.segmentNumber}
                          </div>
                          <div>
                            <div className="text-lg font-semibold">
                              {formatHeading(segment.heading)}
                            </div>
                            <div className="text-sm text-gray-400">
                              {formatSegmentDistance(segment.distance)} NM
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-400">
                          <div>
                            Cumulative: {formatSegmentDistance(segment.cumulativeDistance)} NM
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Info Section */}
          {!result && (
            <div className="mb-8 bg-slate-800/50 border-2 border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-2">How It Works</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Modern Flight Management Systems (FMS) approximate the shortest great circle route
                by dividing it into constant-heading segments. This calculator demonstrates this process:
              </p>
              <ul className="list-disc list-inside text-gray-300 text-sm mt-2 space-y-1">
                <li><strong>Great Circle</strong>: The shortest distance between two points (orthodromic route)</li>
                <li><strong>Waypoints</strong>: Places N waypoints evenly along the great circle</li>
                <li><strong>Segments</strong>: Flies constant heading (rhumb line) between each waypoint</li>
                <li><strong>Total Distance</strong>: Sum of all segment distances (longer than great circle)</li>
              </ul>
              <p className="text-gray-400 text-xs mt-4">
                <strong>Key Insight:</strong> With fewer segments, each rhumb line deviates more from the great circle,
                increasing total distance. More segments = better approximation = closer to the shortest path.
              </p>
              <div className="mt-3 p-3 bg-slate-700/30 rounded-lg border-l-4 border-blue-500">
                <p className="text-gray-300 text-xs">
                  <strong>Example:</strong> For a 3000 NM route:<br/>
                  • 1 segment (direct rhumb line): ~3090 NM (+3%)<br/>
                  • 10 segments (Pan Am era): ~3008 NM (+0.3%)<br/>
                  • 100 segments (modern FMS): ~3000.5 NM (+0.02%)
                </p>
              </div>
            </div>
          )}

          <Footer description="Calculate LNAV segments for long-distance navigation planning" />
        </div>
      </div>
    </PageLayout>
  );
}
