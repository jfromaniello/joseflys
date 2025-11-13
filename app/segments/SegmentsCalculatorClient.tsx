"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
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

// Dynamically import map components (both use browser-only APIs)
const SegmentsMap = dynamic(() => import("./SegmentsMap").then(mod => ({ default: mod.SegmentsMap })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] rounded-xl border-2 border-gray-700 bg-slate-800/50 flex items-center justify-center">
      <div className="text-gray-400">Loading 2D map...</div>
    </div>
  ),
});

const SegmentsGlobe = dynamic(() => import("./SegmentsGlobe").then(mod => ({ default: mod.SegmentsGlobe })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] rounded-xl border-2 border-gray-700 bg-slate-800/50 flex items-center justify-center">
      <div className="text-gray-400">Loading 3D globe...</div>
    </div>
  ),
});

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
  initialViewMode?: string;
}

export function SegmentsCalculatorClient({
  initialFromLat,
  initialFromLon,
  initialFromName,
  initialToLat,
  initialToLon,
  initialToName,
  initialSegmentCount,
  initialViewMode,
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

  // Map view mode
  const [viewMode, setViewMode] = useState<"2d" | "3d">(
    (initialViewMode === "3d" ? "3d" : "2d")
  );

  // Get navigation era description based on segment count
  const getNavigationEra = (count: number): { era: string; description: string; color: string } => {
    if (count === 1) {
      return {
        era: "⛵ Age of Explorers",
        description: "Single direct heading, like Columbus crossing the Atlantic",
        color: "text-red-400"
      };
    } else if (count <= 3) {
      return {
        era: "🚢 19th Century Sailing Ship",
        description: "Dead reckoning navigation with very few course changes",
        color: "text-orange-400"
      };
    } else if (count <= 10) {
      return {
        era: "✈️ Pan Am 1940s",
        description: "Stage flights with celestial and radio navigation",
        color: "text-yellow-400"
      };
    } else if (count <= 30) {
      return {
        era: "🛩️ Classic Jet IFR (VOR/NDB)",
        description: "Ground-based radio navigation aids",
        color: "text-lime-400"
      };
    } else if (count <= 60) {
      return {
        era: "🛫 Modern LNAV / FMS",
        description: "Flight management system with GPS",
        color: "text-cyan-400"
      };
    } else {
      return {
        era: "🚀 Ultra-Precise LNAV",
        description: "Near-perfect great circle approximation",
        color: "text-blue-400"
      };
    }
  };

  const router = useRouter();
  const searchParams = useSearchParams();

  // Update URL when viewMode changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const currentView = params.get("view");

    // Only update if the URL doesn't match the current viewMode
    const shouldBeInUrl = viewMode === "3d";
    const isInUrl = currentView === "3d";

    if (shouldBeInUrl !== isInUrl) {
      if (viewMode === "3d") {
        params.set("view", "3d");
      } else {
        params.delete("view");
      }
      router.replace(`/segments?${params.toString()}`, { scroll: false });
    }
  }, [viewMode, router, searchParams]);

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
                  max="50"
                  step="1"
                  value={segmentCount}
                  onChange={(e) => setSegmentCount(e.target.value)}
                  className="flex-1"
                />
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  value={segmentCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1 && val <= 50) {
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
                      {getNavigationEra(parseInt(segmentCount)).era}
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
              <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Great Circle (Ideal)</div>
                  <div className="text-lg font-semibold text-green-400">
                    {formatSegmentDistance(result.orthodromicDistance)} NM
                  </div>
                  <div className="text-xs text-gray-400">
                    Shortest possible path
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Segmented Route ({result.segmentCount} seg)</div>
                  <div className="text-lg font-semibold text-blue-400">
                    {formatSegmentDistance(result.totalDistance)} NM
                  </div>
                  <div className="text-xs text-gray-400">
                    {result.segments.length > 0 && `~${formatSegmentDistance(result.segments[0].distance)} NM per segment`}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Difference from Ideal</div>
                  <div className={`text-lg font-semibold ${
                    ((result.totalDistance - result.orthodromicDistance) / result.orthodromicDistance * 100) > 1
                      ? 'text-red-400'
                      : ((result.totalDistance - result.orthodromicDistance) / result.orthodromicDistance * 100) > 0.1
                      ? 'text-amber-400'
                      : 'text-green-400'
                  }`}>
                    +{formatSegmentDistance(result.totalDistance - result.orthodromicDistance)} NM
                  </div>
                  <div className="text-xs text-gray-400">
                    +{((result.totalDistance - result.orthodromicDistance) / result.orthodromicDistance * 100).toFixed(3)}% longer
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
                      className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg cursor-pointer border-2 border-gray-600 transition-colors whitespace-nowrap"
                    >
                      {showCopied ? (
                        <>
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copy All</span>
                        </>
                      )}
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

          {/* Map Visualization */}
          {result && fromLocation && toLocation && (
            <div className="mb-8">
              {/* Map View Toggle */}
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Route Visualization</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode("2d")}
                    className={`px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                      viewMode === "2d"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      2D Map
                    </div>
                  </button>
                  <button
                    onClick={() => setViewMode("3d")}
                    className={`px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                      viewMode === "3d"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      3D Globe
                    </div>
                  </button>
                </div>
              </div>

              {/* Map Legend */}
              <div className="mb-3 p-4 bg-slate-800/50 border border-gray-700 rounded-lg">
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 bg-green-500" style={{ borderTop: "2px dashed" }}></div>
                    <span className="text-gray-300">Great Circle Route (shortest path)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500"></div>
                    <span className="text-gray-300">Rhumb Line Segments (constant heading)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-500 border-2 border-white"></div>
                    <span className="text-gray-300">Waypoints</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Click on any segment or waypoint for details. The colored lines show how LNAV approximates the green great circle path.
                </p>
              </div>

              {/* Map Component */}
              {viewMode === "2d" ? (
                <SegmentsMap
                  fromLat={fromLocation.lat}
                  fromLon={fromLocation.lon}
                  toLat={toLocation.lat}
                  toLon={toLocation.lon}
                  fromName={fromLocation.name}
                  toName={toLocation.name}
                  segments={result.segments}
                  orthodromicDistance={result.orthodromicDistance}
                  totalDistance={result.totalDistance}
                />
              ) : (
                <SegmentsGlobe
                  fromLat={fromLocation.lat}
                  fromLon={fromLocation.lon}
                  toLat={toLocation.lat}
                  toLon={toLocation.lon}
                  fromName={fromLocation.name}
                  toName={toLocation.name}
                  segments={result.segments}
                  orthodromicDistance={result.orthodromicDistance}
                  totalDistance={result.totalDistance}
                />
              )}

              {/* Segment Slider Below Map */}
              <div className="mt-4 bg-slate-800/50 border-2 border-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-white">
                        Segments: {segmentCount}
                      </label>
                      <div className="text-xs text-gray-300">
                        <span className={getNavigationEra(parseInt(segmentCount)).color}>
                          {getNavigationEra(parseInt(segmentCount)).era}
                        </span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      step="1"
                      value={segmentCount}
                      onChange={(e) => setSegmentCount(e.target.value)}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>1</span>
                      <span className="text-center">
                        +{formatSegmentDistance(result.totalDistance - result.orthodromicDistance)} NM
                        {" "}
                        ({((result.totalDistance - result.orthodromicDistance) / result.orthodromicDistance * 100).toFixed(2)}%)
                      </span>
                      <span>50</span>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    step="1"
                    value={segmentCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 1 && val <= 50) {
                        setSegmentCount(e.target.value);
                      }
                    }}
                    className="w-16 px-2 py-2 bg-slate-700 text-white rounded-lg border-2 border-gray-600 focus:border-blue-500 focus:outline-none text-center text-sm font-semibold"
                  />
                </div>
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
