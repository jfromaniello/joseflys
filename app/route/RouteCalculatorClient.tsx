"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Tooltip } from "../components/Tooltip";
import { LocationSearchInput } from "../components/LocationSearchInput";
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
import { magvar } from "magvar";
import { formatAngle, formatCourse } from "@/lib/formatters";

// Dynamic import for RouteMap to avoid SSR issues with Leaflet
const RouteMap = dynamic(() => import("./RouteMap").then((mod) => mod.RouteMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 rounded-xl bg-slate-800/50 border-2 border-gray-700 flex items-center justify-center">
      <p className="text-gray-400">Loading map...</p>
    </div>
  ),
});

// Helper function to parse coordinate string (e.g., "-30.7505058,-62.8236677")

// Helper function to normalize angle to 0-360 range
function normalizeHeading(heading: number): number {
  let normalized = heading % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  return normalized;
}

type InputMode = "search" | "coordinates";

interface Location {
  name: string;
  lat: number;
  lon: number;
}

interface ToLocation extends Location {
  id: string;
  lat_str: string;
  lon_str: string;
}

interface InitialToLocation {
  lat: string;
  lon: string;
  name?: string;
}

interface RouteCalculatorClientProps {
  initialFromLat?: string;
  initialFromLon?: string;
  initialFromName?: string;
  initialToLocations?: InitialToLocation[];
  // Legacy props for backward compatibility
  initialToLat?: string;
  initialToLon?: string;
  initialToName?: string;
}

export function RouteCalculatorClient({
  initialFromLat,
  initialFromLon,
  initialFromName,
  initialToLocations,
  // Legacy props
  initialToLat,
  initialToLon,
  initialToName,
}: RouteCalculatorClientProps) {
  // Input mode toggle
  const [inputMode, setInputMode] = useState<InputMode>("search");

  // From location
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
    }];
  });

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

    // Calculate magnetic variation at midpoint
    const midLat = validCoordinates ? (fromLatNum + toLatNum) / 2 : null;
    const midLon = validCoordinates ? (fromLonNum + toLonNum) / 2 : null;
    const magneticVariation = midLat !== null && midLon !== null
      ? magvar(midLat, midLon, 0) // Altitude 0 (sea level)
      : null;

    // Calculate magnetic heading from true heading - declination
    // Aviation mnemonics: 'East is Least, West is Best'
    // WMM Convention: positive = East, negative = West
    // Formula: magneticHeading = trueHeading - declination
    // Example: TH=12°, VAR=7.5°W(-7.5): MH = 12 - (-7.5) = 19.5° ✓
    const magneticHeading = bearing !== null && magneticVariation !== null
      ? normalizeHeading(bearing - magneticVariation)
      : null;

    const distanceExceedsLimit =
      distance !== null && distance > MAX_RECOMMENDED_DISTANCE_NM;

    return {
      id: toLocation.id,
      toLocation,
      distance,
      bearing,
      magneticVariation,
      magneticHeading,
      distanceExceedsLimit,
      validCoordinates,
    };
  });

  // Handle location selection


  const handleAddDestination = useCallback(() => {
    setToLocations(prev => [...prev, {
      id: crypto.randomUUID(),
      name: "",
      lat: 0,
      lon: 0,
      lat_str: "",
      lon_str: "",
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

  return (
    <PageLayout currentPage="route">
      <CalculatorPageHeader
        title="Route Calculator"
        description="Calculate distance, true bearing, magnetic heading, and variation between points using WGS-84 geodesic algorithms for high-precision navigation"
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
              <LocationSearchInput
                value={fromLocation}
                onChange={(loc) => {
                  if (loc) {
                    setFromLocation(loc);
                    setFromLat(loc.lat.toFixed(6));
                    setFromLon(loc.lon.toFixed(6));
                  } else {
                    setFromLocation(null);
                    setFromLat("");
                    setFromLon("");
                  }
                }}
                label="From"
                tooltip="Search for a city, airport, or location by name. Select from the dropdown to set the departure point."
                placeholder="Search city, airport or paste coordinates..."
                selectedBorderColor="border-sky-500/50"
              />

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
                        <div className="flex items-center gap-2">
                          <LocationSearchInput
                            value={null}
                            onChange={(loc) => {
                              if (loc) {
                                setToLocations(prev => prev.map((l, i) =>
                                  i === index ? {
                                    ...l,
                                    name: loc.name,
                                    lat: loc.lat,
                                    lon: loc.lon,
                                    lat_str: loc.lat.toFixed(6),
                                    lon_str: loc.lon.toFixed(6),
                                  } : l
                                ));
                              }
                            }}
                            showLabel={false}
                            placeholder="Search city, airport or paste coordinates..."
                            selectedBorderColor="border-purple-500/50"
                            className="flex-1"
                          />
                          {toLocations.length > 1 && (
                            <button
                              onClick={() => handleRemoveDestination(index)}
                              className="p-3 rounded-xl bg-slate-900/50 border-2 border-gray-600 text-gray-400 hover:text-red-400 hover:border-red-400/50 transition-colors cursor-pointer"
                              title="Remove destination"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
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

                    {/* Distance, Bearings, and Magnetic Variation Cards */}
                    <div className="space-y-4">
                      {/* Distance Result - Full Width */}
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
                          className="text-5xl sm:text-6xl font-bold mb-1 print:text-3xl print:mb-0"
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
                      </div>

                      {/* Bearings and Variation - Three Equal Columns */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* True Bearing Result */}
                        <div className="p-6 rounded-xl text-center bg-linear-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 print:p-4">
                          <div className="flex items-center justify-center mb-2 print:mb-1">
                            <p
                              className="text-sm font-semibold uppercase tracking-wider print:text-xs"
                              style={{ color: "rgb(192, 132, 252)" }}
                            >
                              True Bearing
                            </p>
                            <Tooltip content="The true bearing (course over ground) at departure, referenced to true north. For short to medium distances, this can be used as your True Course. Note: on longer great circle routes, the bearing changes continuously along the path." />
                          </div>
                          <p
                            className="text-4xl sm:text-5xl font-bold mb-1 print:text-3xl print:mb-0"
                            style={{ color: "white" }}
                          >
                            {formatCourse(result.bearing!)}
                          </p>
                          <p
                            className="text-base print:text-sm"
                            style={{ color: "oklch(0.6 0.02 240)" }}
                          >
                            true
                          </p>
                        </div>

                        {/* Magnetic Variation Result */}
                        <div className="p-6 rounded-xl text-center bg-linear-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 print:p-4">
                          <div className="flex items-center justify-center mb-2 print:mb-1">
                            <p
                              className="text-sm font-semibold uppercase tracking-wider print:text-xs"
                              style={{ color: "oklch(0.65 0.15 60)" }}
                            >
                              Magnetic Variation
                            </p>
                            <Tooltip content="Magnetic variation (declination) at the midpoint between origin and destination, using the World Magnetic Model (WMM) at sea level. East variation means magnetic north is east of true north; West means it's west of true north. Remember: 'East is Least, West is Best' when converting between true and magnetic courses." />
                          </div>
                          <p
                            className="text-4xl sm:text-5xl font-bold mb-1 print:text-3xl print:mb-0"
                            style={{ color: "white" }}
                          >
                            {formatAngle(result.magneticVariation, 1)}
                          </p>
                          <p
                            className="text-base print:text-sm"
                            style={{ color: "oklch(0.6 0.02 240)" }}
                          >
                            at midpoint
                          </p>
                        </div>

                        {/* Magnetic Heading Result */}
                        <div className="p-6 rounded-xl text-center bg-linear-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 print:p-4">
                          <div className="flex items-center justify-center mb-2 print:mb-1">
                            <p
                              className="text-sm font-semibold uppercase tracking-wider print:text-xs"
                              style={{ color: "oklch(0.65 0.15 150)" }}
                            >
                              Magnetic Heading
                            </p>
                            <Tooltip content="The magnetic heading at departure, referenced to magnetic north. Calculated by applying magnetic variation to the true bearing (True - Variation = Magnetic). For short to medium distances, this can be used as your Magnetic Heading. You'll still need to apply wind correction to get your final compass heading." />
                          </div>
                          <p
                            className="text-4xl sm:text-5xl font-bold mb-1 print:text-3xl print:mb-0"
                            style={{ color: "white" }}
                          >
                            {formatCourse(result.magneticHeading!)}
                          </p>
                          <p
                            className="text-base print:text-sm"
                            style={{ color: "oklch(0.6 0.02 240)" }}
                          >
                            magnetic
                          </p>
                        </div>
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
                <RouteMap
                  fromLat={fromLatNum}
                  fromLon={fromLonNum}
                  toLocations={toLocations.filter((_, i) => results[i].validCoordinates)}
                  fromName={fromLocation?.name}
                />
              </div>

              {/* Action Buttons */}
              {results.filter(r => r.validCoordinates && r.distance !== null).length > 0 && (
                <div className="mt-6 print:hidden grid grid-cols-1 md:grid-cols-2 gap-3 md:max-w-lg md:mx-auto">
                  <ShareButtonSimple
                    shareData={{
                      title: "José's Route Calculator",
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
              the WGS-84 geodesic algorithm (Karney&apos;s method via GeographicLib) to compute
              precise distances on Earth&apos;s ellipsoid. This is more accurate than the Haversine
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
