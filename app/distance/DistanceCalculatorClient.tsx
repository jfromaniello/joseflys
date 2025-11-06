"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Tooltip } from "../components/Tooltip";
import { PageLayout } from "../components/PageLayout";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { ShareButton } from "../components/ShareButton";
import {
  calculateHaversineDistance,
  calculateInitialBearing,
  validateCoordinates,
  MAX_RECOMMENDED_DISTANCE_NM,
} from "@/lib/distanceCalculations";

// Dynamic import for DistanceMap to avoid SSR issues with Leaflet
const DistanceMap = dynamic(() => import("./DistanceMap").then((mod) => mod.DistanceMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 rounded-xl bg-slate-800/50 border-2 border-gray-700 flex items-center justify-center">
      <p className="text-gray-400">Loading map...</p>
    </div>
  ),
});

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

interface DistanceCalculatorClientProps {
  initialFromLat?: string;
  initialFromLon?: string;
  initialFromName?: string;
  initialToLat?: string;
  initialToLon?: string;
  initialToName?: string;
}

export function DistanceCalculatorClient({
  initialFromLat,
  initialFromLon,
  initialFromName,
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
      : null
  );
  const [toLat, setToLat] = useState(initialToLat || "");
  const [toLon, setToLon] = useState(initialToLon || "");
  const [toSearching, setToSearching] = useState(false);
  const [toShowDropdown, setToShowDropdown] = useState(false);
  const [showCopiedDistanceMessage, setShowCopiedDistanceMessage] = useState(false);
  const [showCopiedBearingMessage, setShowCopiedBearingMessage] = useState(false);

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

  // Update URL when locations change
  useEffect(() => {
    if (fromLat && fromLon && toLat && toLon) {
      const params = new URLSearchParams();
      params.set("fromLat", fromLat);
      params.set("fromLon", fromLon);
      params.set("toLat", toLat);
      params.set("toLon", toLon);

      // Add city names if available (from search mode)
      if (fromLocation) {
        params.set("fromName", fromLocation.name);
      }
      if (toLocation) {
        params.set("toName", toLocation.name);
      }

      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", newUrl);
    }
  }, [fromLat, fromLon, toLat, toLon, fromLocation, toLocation]);

  // Calculate distance and bearing
  const fromLatNum = parseFloat(fromLat);
  const fromLonNum = parseFloat(fromLon);
  const toLatNum = parseFloat(toLat);
  const toLonNum = parseFloat(toLon);

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

  const handleToLocationSelect = useCallback((result: GeocodingResult) => {
    setToLocation({
      name: result.name,
      lat: result.lat,
      lon: result.lon,
    });
    setToLat(result.lat.toFixed(6));
    setToLon(result.lon.toFixed(6));
    setToSearchQuery(""); // Clear the search query
    setToSearchResults([]);
    setToShowDropdown(false);
  }, []);

  const handleCopyDistance = async () => {
    if (distance !== null) {
      try {
        await navigator.clipboard.writeText(Math.round(distance).toString());
        setShowCopiedDistanceMessage(true);
        setTimeout(() => setShowCopiedDistanceMessage(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const handleCopyBearing = async () => {
    if (bearing !== null) {
      try {
        await navigator.clipboard.writeText(Math.round(bearing).toString().padStart(3, '0'));
        setShowCopiedBearingMessage(true);
        setTimeout(() => setShowCopiedBearingMessage(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  // Build share URL
  const shareUrl = (() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams();
    if (fromLat) params.set("fromLat", fromLat);
    if (fromLon) params.set("fromLon", fromLon);
    if (toLat) params.set("toLat", toLat);
    if (toLon) params.set("toLon", toLon);
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  })();

  return (
    <PageLayout>
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12 print:mb-3">
        <div className="flex items-center justify-center gap-4 mb-3 print:mb-1">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-slate-800/50 backdrop-blur-sm border border-gray-700">
            <svg
              className="w-9 h-9"
              fill="none"
              stroke="oklch(0.65 0.15 230)"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <h1
            className="text-4xl sm:text-5xl font-bold"
            style={{ color: "white" }}
          >
            José&apos;s Distance Calculator
          </h1>
        </div>
        <p
          className="text-base sm:text-lg mb-4 print:mb-2 print:text-sm"
          style={{ color: "oklch(0.58 0.02 240)" }}
        >
          Calculate great circle distance and initial bearing between two points
        </p>
        <Navigation currentPage="distance" />
      </div>

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
            <p className="text-sm print:hidden" style={{ color: "oklch(0.58 0.02 240)" }}>
              {inputMode === "search"
                ? "Search for cities or airports"
                : "Enter coordinates directly"}
            </p>
          </div>

          {/* Input Mode: Search */}
          {inputMode === "search" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print:grid-cols-2 print:gap-4 print:mb-4">
              {/* From Location Search */}
              <div className="relative">
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  From
                  <Tooltip content="Search for a city, airport, or location by name. Select from the dropdown to set the departure point." />
                </label>
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
                      onChange={(e) => setFromSearchQuery(e.target.value)}
                      onFocus={() => {
                        if (fromSearchResults.length > 0) {
                          setFromShowDropdown(true);
                        }
                      }}
                      placeholder="Search city or airport..."
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

              {/* To Location Search */}
              <div className="relative">
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  To
                  <Tooltip content="Search for a city, airport, or location by name. Select from the dropdown to set the destination point." />
                </label>
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
                      value={toSearchQuery}
                      onChange={(e) => setToSearchQuery(e.target.value)}
                      onFocus={() => {
                        if (toSearchResults.length > 0) {
                          setToShowDropdown(true);
                        }
                      }}
                      placeholder="Search city or airport..."
                      className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white"
                    />
                    {toSearching && toShowDropdown && (
                      <div className="absolute top-full mt-1 w-full bg-slate-800 rounded-lg p-2 text-sm text-gray-400 border border-gray-700 z-10">
                        Searching...
                      </div>
                    )}
                    {toSearchResults.length > 0 && toShowDropdown && (
                      <div className="absolute top-full mt-1 w-full bg-slate-800 rounded-lg border border-gray-700 max-h-60 overflow-y-auto z-10">
                        {toSearchResults.map((result, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleToLocationSelect(result)}
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
          )}

          {/* Input Mode: Coordinates */}
          {inputMode === "coordinates" && (
            <div className="space-y-6 mb-8 print:grid print:grid-cols-2 print:gap-4 print:mb-4 print:space-y-0">
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

              {/* To Coordinates */}
              <div>
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  To Coordinates
                  <Tooltip content="Enter the latitude and longitude of the destination point. Latitude: -90 to 90, Longitude: -180 to 180" />
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      type="number"
                      value={toLat}
                      onChange={(e) => setToLat(e.target.value)}
                      placeholder="41.3874"
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
                      value={toLon}
                      onChange={(e) => setToLon(e.target.value)}
                      placeholder="2.1686"
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
            </div>
          )}

          {/* Distance Limit Warning */}
          {distanceExceedsLimit && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p
                className="text-sm leading-relaxed"
                style={{ color: "rgb(251, 191, 36)" }}
              >
                <span className="font-semibold">Warning:</span> Distance exceeds{" "}
                {MAX_RECOMMENDED_DISTANCE_NM} NM. For long distances, the
                bearing changes significantly along the route. The initial
                bearing shown may differ substantially from the final bearing at
                destination.
              </p>
            </div>
          )}

          {/* Results */}
          {distance !== null && bearing !== null && !distanceExceedsLimit && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 print:grid-cols-2 print:gap-3 print:mb-4">
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
                    {Math.round(distance)}
                  </p>
                  <p
                    className="text-base print:text-sm"
                    style={{ color: "oklch(0.6 0.02 240)" }}
                  >
                    nautical miles
                  </p>
                  <button
                    onClick={handleCopyDistance}
                    className="mt-3 px-4 py-2 rounded-lg border-2 border-sky-500/50 hover:bg-sky-500/10 transition-all text-sm font-medium cursor-pointer print:hidden"
                    style={{ color: "oklch(0.7 0.15 230)" }}
                  >
                    {showCopiedDistanceMessage ? "✓ Copied!" : "📋 Copy"}
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
                    {Math.round(bearing).toString().padStart(3, '0')}°
                  </p>
                  <p
                    className="text-base print:text-sm"
                    style={{ color: "oklch(0.6 0.02 240)" }}
                  >
                    true
                  </p>
                  <button
                    onClick={handleCopyBearing}
                    className="mt-3 px-4 py-2 rounded-lg border-2 border-purple-500/50 hover:bg-purple-500/10 transition-all text-sm font-medium cursor-pointer print:hidden"
                    style={{ color: "rgb(192, 132, 252)" }}
                  >
                    {showCopiedBearingMessage ? "✓ Copied!" : "📋 Copy"}
                  </button>
                </div>
              </div>

              {/* Map */}
              <div className="mt-6 print:mt-4">
                <DistanceMap
                  fromLat={fromLatNum}
                  fromLon={fromLonNum}
                  toLat={toLatNum}
                  toLon={toLonNum}
                  fromName={fromLocation?.name}
                  toName={toLocation?.name}
                />
              </div>

              {/* Share Button */}
              <div className="mt-6">
                <ShareButton
                  shareData={{
                    title: "José's Distance Calculator",
                    text: `Distance: ${Math.round(distance)} NM, Bearing: ${Math.round(bearing).toString().padStart(3, '0')}°T`,
                    url: shareUrl,
                  }}
                />
              </div>
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
