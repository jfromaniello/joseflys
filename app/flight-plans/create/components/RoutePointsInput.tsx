/**
 * Route Points Input Component
 * Allows users to input departure, waypoints, destination, and alternate for a flight plan
 */

"use client";

import { useState, useEffect } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Tooltip } from "@/app/components/Tooltip";

interface GeocodingResult {
  name: string;
  lat: number;
  lon: number;
  type: string;
  importance: number;
}

export interface RoutePoint {
  lat: number;
  lon: number;
  name: string;
}

interface RoutePointsInputProps {
  departure: RoutePoint | null;
  destination: RoutePoint | null;
  waypoints: RoutePoint[];
  alternate: RoutePoint | null;
  onDepartureChange: (point: RoutePoint | null) => void;
  onDestinationChange: (point: RoutePoint | null) => void;
  onWaypointsChange: (points: RoutePoint[]) => void;
  onAlternateChange: (point: RoutePoint | null) => void;
}

// Helper function to parse coordinate string (e.g., "-30.7505058,-62.8236677")
function parseCoordinates(text: string): { lat: number; lon: number } | null {
  const coordPattern = /^([-+]?\d+\.?\d*)\s*,\s*([-+]?\d+\.?\d*)$/;
  const match = text.trim().match(coordPattern);

  if (!match) return null;

  const lat = parseFloat(match[1]);
  const lon = parseFloat(match[2]);

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return null;
  }

  return { lat, lon };
}

interface PointInputProps {
  label: string;
  tooltip: string;
  point: RoutePoint | null;
  onPointChange: (point: RoutePoint | null) => void;
  placeholder?: string;
  canRemove?: boolean;
}

function PointInput({
  label,
  tooltip,
  point,
  onPointChange,
  placeholder = "Search city, airport, or enter coordinates...",
  canRemove = false,
}: PointInputProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    // Check if it's a coordinate input
    const coords = parseCoordinates(searchQuery);
    if (coords) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setShowDropdown(true);
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const results = await response.json();
          setSearchResults(results);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectResult = (result: GeocodingResult) => {
    onPointChange({
      lat: result.lat,
      lon: result.lon,
      name: result.name.split(",")[0].trim(),
    });
    setSearchQuery("");
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const coords = parseCoordinates(searchQuery);
      if (coords) {
        onPointChange({
          lat: coords.lat,
          lon: coords.lon,
          name: `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`,
        });
        setSearchQuery("");
      }
    }
  };

  const handleClear = () => {
    onPointChange(null);
    setSearchQuery("");
  };

  return (
    <div className="relative">
      <label
        className="flex items-center text-sm font-medium mb-2"
        style={{ color: "oklch(0.72 0.015 240)" }}
      >
        {label}
        <Tooltip content={tooltip} />
      </label>

      {point ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-slate-600">
          <div className="flex-1 min-w-0">
            <div className="text-white font-medium truncate">{point.name}</div>
            <div className="text-xs text-slate-400">
              {point.lat.toFixed(4)}, {point.lon.toFixed(4)}
            </div>
          </div>
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            onFocus={() => searchQuery.length >= 3 && setShowDropdown(true)}
            className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-slate-600 text-white"
            placeholder={placeholder}
          />

          {/* Search dropdown */}
          {showDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {searching ? (
                <div className="p-3 text-slate-400 text-sm">Searching...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectResult(result)}
                    className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <div className="text-white text-sm">{result.name}</div>
                    <div className="text-xs text-slate-400">
                      {result.lat.toFixed(4)}, {result.lon.toFixed(4)}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-3 text-slate-400 text-sm">No results found</div>
              )}
            </div>
          )}
        </div>
      )}

      {canRemove && point && (
        <button
          onClick={handleClear}
          className="absolute -right-8 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400 cursor-pointer"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function RoutePointsInput({
  departure,
  destination,
  waypoints,
  alternate,
  onDepartureChange,
  onDestinationChange,
  onWaypointsChange,
  onAlternateChange,
}: RoutePointsInputProps) {
  const addWaypoint = () => {
    // Don't add if there's an empty waypoint slot
    onWaypointsChange([...waypoints, { lat: 0, lon: 0, name: "" }]);
  };

  const updateWaypoint = (index: number, point: RoutePoint | null) => {
    if (point === null) {
      // Remove waypoint
      const newWaypoints = waypoints.filter((_, i) => i !== index);
      onWaypointsChange(newWaypoints);
    } else {
      const newWaypoints = [...waypoints];
      newWaypoints[index] = point;
      onWaypointsChange(newWaypoints);
    }
  };

  const removeWaypoint = (index: number) => {
    const newWaypoints = waypoints.filter((_, i) => i !== index);
    onWaypointsChange(newWaypoints);
  };

  // Filter out placeholder waypoints (those with empty names)
  const validWaypoints = waypoints.filter((wp) => wp.name !== "");
  const hasEmptyWaypoint = waypoints.some((wp) => wp.name === "");

  return (
    <div className="space-y-4">
      <h3
        className="text-sm font-semibold mb-3 uppercase tracking-wide"
        style={{ color: "oklch(0.65 0.15 230)" }}
      >
        Route
      </h3>

      {/* Departure */}
      <PointInput
        label="Departure"
        tooltip="The starting point of your flight. Enter a city name, airport code, or coordinates."
        point={departure}
        onPointChange={onDepartureChange}
        placeholder="e.g., KJFK, New York, or 40.6413,-73.7781"
      />

      {/* Waypoints */}
      {waypoints.map((waypoint, index) => (
        <div key={index} className="relative">
          <PointInput
            label={`Waypoint ${index + 1}`}
            tooltip="An intermediate point along your route. Each waypoint creates a new leg."
            point={waypoint.name ? waypoint : null}
            onPointChange={(point) => updateWaypoint(index, point)}
            placeholder="Search or enter coordinates..."
          />
          <button
            onClick={() => removeWaypoint(index)}
            className="absolute -right-2 top-0 p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400 cursor-pointer"
            title="Remove waypoint"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      ))}

      {/* Add Waypoint Button */}
      {!hasEmptyWaypoint && (
        <button
          onClick={addWaypoint}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border-2 border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 transition-colors w-full justify-center cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          Add Waypoint
        </button>
      )}

      {/* Destination */}
      <PointInput
        label="Destination"
        tooltip="The final destination of your flight."
        point={destination}
        onPointChange={onDestinationChange}
        placeholder="e.g., KLAX, Los Angeles, or 33.9425,-118.4081"
      />

      {/* Alternate */}
      <PointInput
        label="Alternate (Optional)"
        tooltip="An alternate airport in case you cannot land at your destination. Creates an additional leg with reserve fuel calculations."
        point={alternate}
        onPointChange={onAlternateChange}
        placeholder="e.g., KONT, Ontario, or coordinates..."
      />
    </div>
  );
}
