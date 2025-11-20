/**
 * Leg Route Points List
 * Displays Start/Checkpoints/End of Leg with geocoding search similar to local-chart
 */

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

export interface LegCheckpoint {
  lat: number;
  lon: number;
  name: string;
}

interface LegWaypointsTableProps {
  fromPoint: LegCheckpoint | null;
  toPoint: LegCheckpoint | null;
  checkpoints: LegCheckpoint[];
  onFromChange: (point: LegCheckpoint | null) => void;
  onToChange: (point: LegCheckpoint | null) => void;
  onCheckpointsChange: (points: LegCheckpoint[]) => void;
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

export function LegWaypointsTable({
  fromPoint,
  toPoint,
  checkpoints,
  onFromChange,
  onToChange,
  onCheckpointsChange,
}: LegWaypointsTableProps) {
  // From location search state
  const [fromSearchQuery, setFromSearchQuery] = useState("");
  const [fromSearchResults, setFromSearchResults] = useState<GeocodingResult[]>([]);
  const [fromSearching, setFromSearching] = useState(false);
  const [fromShowDropdown, setFromShowDropdown] = useState(false);

  // To location search state
  const [toSearchQuery, setToSearchQuery] = useState("");
  const [toSearchResults, setToSearchResults] = useState<GeocodingResult[]>([]);
  const [toSearching, setToSearching] = useState(false);
  const [toShowDropdown, setToShowDropdown] = useState(false);

  // Checkpoints search state (array for each checkpoint)
  const [checkpointSearchStates, setCheckpointSearchStates] = useState<Array<{
    query: string;
    results: GeocodingResult[];
    searching: boolean;
    showDropdown: boolean;
  }>>([]);

  // Sync checkpoint search states with checkpoints
  useEffect(() => {
    setCheckpointSearchStates(prev => {
      const newStates = [...prev];
      while (newStates.length < checkpoints.length) {
        newStates.push({ query: "", results: [], searching: false, showDropdown: false });
      }
      while (newStates.length > checkpoints.length) {
        newStates.pop();
      }
      return newStates;
    });
  }, [checkpoints.length]);

  // Debounced search for "from" location
  useEffect(() => {
    if (fromSearchQuery.length < 3) {
      setFromSearchResults([]);
      setFromShowDropdown(false);
      return;
    }

    setFromShowDropdown(true);
    const timer = setTimeout(async () => {
      // Check if it's coordinates
      const coords = parseCoordinates(fromSearchQuery);
      if (coords) {
        setFromSearchResults([
          {
            name: `Coordinates: ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`,
            lat: coords.lat,
            lon: coords.lon,
            type: "coordinates",
            importance: 1,
          },
        ]);
        return;
      }

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

  // Debounced search for "to" location
  useEffect(() => {
    if (toSearchQuery.length < 3) {
      setToSearchResults([]);
      setToShowDropdown(false);
      return;
    }

    setToShowDropdown(true);
    const timer = setTimeout(async () => {
      const coords = parseCoordinates(toSearchQuery);
      if (coords) {
        setToSearchResults([
          {
            name: `Coordinates: ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`,
            lat: coords.lat,
            lon: coords.lon,
            type: "coordinates",
            importance: 1,
          },
        ]);
        return;
      }

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
  }, [toSearchQuery]);

  // Debounced search for via points
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    checkpointSearchStates.forEach((state, index) => {
      if (state.query.length < 3) {
        if (state.results.length > 0 || state.showDropdown) {
          setCheckpointSearchStates(prev => prev.map((s, i) =>
            i === index ? { ...s, results: [], showDropdown: false } : s
          ));
        }
        return;
      }

      const timer = setTimeout(async () => {
        const coords = parseCoordinates(state.query);
        if (coords) {
          setCheckpointSearchStates(prev => prev.map((s, i) =>
            i === index ? {
              ...s,
              results: [{
                name: `Coordinates: ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`,
                lat: coords.lat,
                lon: coords.lon,
                type: "coordinates",
                importance: 1,
              }],
              showDropdown: true,
              searching: false,
            } : s
          ));
          return;
        }

        setCheckpointSearchStates(prev => prev.map((s, i) =>
          i === index ? { ...s, searching: true, showDropdown: true } : s
        ));

        try {
          const response = await fetch(
            `/api/geocode?q=${encodeURIComponent(state.query)}`
          );
          if (response.ok) {
            const results = await response.json();
            setCheckpointSearchStates(prev => prev.map((s, i) =>
              i === index ? { ...s, results, searching: false } : s
            ));
          }
        } catch (error) {
          console.error("Search error:", error);
          setCheckpointSearchStates(prev => prev.map((s, i) =>
            i === index ? { ...s, searching: false } : s
          ));
        }
      }, 300);

      timers.push(timer);
    });

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [checkpointSearchStates]);

  const handleFromLocationSelect = (result: GeocodingResult) => {
    onFromChange({
      name: result.name.split(",")[0].trim(),
      lat: result.lat,
      lon: result.lon,
    });
    setFromSearchQuery("");
    setFromShowDropdown(false);
  };

  const handleToLocationSelect = (result: GeocodingResult) => {
    onToChange({
      name: result.name.split(",")[0].trim(),
      lat: result.lat,
      lon: result.lon,
    });
    setToSearchQuery("");
    setToShowDropdown(false);
  };

  const handleCheckpointLocationSelect = (index: number, result: GeocodingResult) => {
    const newCheckpoints = [...checkpoints];
    newCheckpoints[index] = {
      name: result.name.split(",")[0].trim(),
      lat: result.lat,
      lon: result.lon,
    };
    onCheckpointsChange(newCheckpoints);
    setCheckpointSearchStates(prev => prev.map((s, i) =>
      i === index ? { ...s, query: "", showDropdown: false } : s
    ));
  };

  const handleAddCheckpoint = () => {
    onCheckpointsChange([...checkpoints, { name: "", lat: 0, lon: 0 }]);
  };

  const handleRemoveCheckpoint = (index: number) => {
    const newCheckpoints = [...checkpoints];
    newCheckpoints.splice(index, 1);
    onCheckpointsChange(newCheckpoints);
  };

  const handleMoveCheckpointUp = (index: number) => {
    if (index === 0) return;
    const newCheckpoints = [...checkpoints];
    [newCheckpoints[index - 1], newCheckpoints[index]] = [newCheckpoints[index], newCheckpoints[index - 1]];
    onCheckpointsChange(newCheckpoints);
  };

  const handleMoveCheckpointDown = (index: number) => {
    if (index === checkpoints.length - 1) return;
    const newCheckpoints = [...checkpoints];
    [newCheckpoints[index], newCheckpoints[index + 1]] = [newCheckpoints[index + 1], newCheckpoints[index]];
    onCheckpointsChange(newCheckpoints);
  };

  return (
    <div className="leg-waypoints">
      <h3
        className="text-sm font-semibold mb-3 uppercase tracking-wide"
        style={{ color: "oklch(0.65 0.15 230)" }}
      >
        Route Points
      </h3>

      <div className="space-y-3">
        {/* Start of Leg */}
        <div>
          <label
            className="flex items-center text-sm font-medium mb-2"
            style={{ color: "oklch(0.72 0.015 240)" }}
          >
            Start of Leg
            <Tooltip content="Search for the starting point of this leg or paste coordinates (e.g., 40.6413, -73.7781)" />
          </label>
          <div className="relative">
            {fromPoint ? (
              <div className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-green-500/50 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-medium truncate">
                      {fromPoint.name.split(",")[0]}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {fromPoint.lat.toFixed(5)}, {fromPoint.lon.toFixed(5)}
                    </div>
                  </div>
                  <button
                    onClick={() => onFromChange(null)}
                    className="ml-3 p-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                    title="Clear"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={fromSearchQuery}
                  onChange={(e) => setFromSearchQuery(e.target.value)}
                  placeholder="Search airport, city, or paste coordinates..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-gray-700 focus:border-green-500 focus:outline-none text-white placeholder-gray-500 transition-colors"
                />
                {fromSearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-600 border-t-sky-500"></div>
                  </div>
                )}
                {fromSearchResults.length > 0 && fromShowDropdown && (
                  <div className="absolute top-full mt-1 w-full bg-slate-800 rounded-lg border border-gray-700 max-h-60 overflow-y-auto z-10">
                    {fromSearchResults.map((result, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleFromLocationSelect(result)}
                        className="w-full text-left px-4 py-2 hover:bg-slate-700 transition-colors text-sm text-white cursor-pointer"
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

        {/* Checkpoints */}
        {checkpoints.map((checkpoint, index) => {
          const searchState = checkpointSearchStates[index] || { query: "", results: [], searching: false, showDropdown: false };

          return (
            <div key={index}>
              {index === 0 && (
                <div className="flex items-center justify-between mb-2">
                  <label
                    className="flex items-center text-sm font-medium"
                    style={{ color: "oklch(0.72 0.015 240)" }}
                  >
                    Checkpoints
                    <Tooltip content="Add intermediate checkpoints along your route" />
                  </label>
                  <button
                    onClick={handleAddCheckpoint}
                    className="px-3 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-medium transition-all cursor-pointer"
                  >
                    + Add Checkpoint
                  </button>
                </div>
              )}
              {index > 0 && index === 0 && (
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Checkpoint {index + 1}
                </label>
              )}
              <div className="relative">
                {checkpoint.name ? (
                  <div className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-blue-500/50 text-white">
                    <div className="flex items-center justify-between gap-3">
                      {/* Reorder buttons */}
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMoveCheckpointUp(index)}
                          disabled={index === 0}
                          className={`p-1 rounded ${index === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-blue-400 cursor-pointer'} transition-colors`}
                          title="Move up"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleMoveCheckpointDown(index)}
                          disabled={index === checkpoints.length - 1}
                          className={`p-1 rounded ${index === checkpoints.length - 1 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-blue-400 cursor-pointer'} transition-colors`}
                          title="Move down"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {/* Location info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-lg font-medium truncate">
                          {checkpoint.name.split(",")[0]}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {checkpoint.lat.toFixed(5)}, {checkpoint.lon.toFixed(5)}
                        </div>
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => handleRemoveCheckpoint(index)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                        title="Remove"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={searchState.query}
                      onChange={(e) => {
                        const newQuery = e.target.value;
                        setCheckpointSearchStates(prev => prev.map((s, i) =>
                          i === index ? { ...s, query: newQuery } : s
                        ));
                      }}
                      placeholder="Search airport, city, or paste coordinates..."
                      className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-gray-700 focus:border-blue-500 focus:outline-none text-white placeholder-gray-500 transition-colors"
                    />
                    {searchState.searching && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-600 border-t-sky-500"></div>
                      </div>
                    )}
                    {searchState.results.length > 0 && searchState.showDropdown && (
                      <div className="absolute top-full mt-1 w-full bg-slate-800 rounded-lg border border-gray-700 max-h-60 overflow-y-auto z-10">
                        {searchState.results.map((result, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleCheckpointLocationSelect(index, result)}
                            className="w-full text-left px-4 py-2 hover:bg-slate-700 transition-colors text-sm text-white cursor-pointer"
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
          );
        })}

        {/* To Location */}
        <div>
          <label
            className="flex items-center text-sm font-medium mb-2"
            style={{ color: "oklch(0.72 0.015 240)" }}
          >
            End of Leg
            <Tooltip content="Search for the ending point of this leg or paste coordinates" />
          </label>
          <div className="relative">
            {toPoint ? (
              <div className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-red-500/50 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-medium truncate">
                      {toPoint.name.split(",")[0]}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {toPoint.lat.toFixed(5)}, {toPoint.lon.toFixed(5)}
                    </div>
                  </div>
                  <button
                    onClick={() => onToChange(null)}
                    className="ml-3 p-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                    title="Clear"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={toSearchQuery}
                  onChange={(e) => setToSearchQuery(e.target.value)}
                  placeholder="Search airport, city, or paste coordinates..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-gray-700 focus:border-red-500 focus:outline-none text-white placeholder-gray-500 transition-colors"
                />
                {toSearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-600 border-t-sky-500"></div>
                  </div>
                )}
                {toSearchResults.length > 0 && toShowDropdown && (
                  <div className="absolute top-full mt-1 w-full bg-slate-800 rounded-lg border border-gray-700 max-h-60 overflow-y-auto z-10">
                    {toSearchResults.map((result, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleToLocationSelect(result)}
                        className="w-full text-left px-4 py-2 hover:bg-slate-700 transition-colors text-sm text-white cursor-pointer"
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

        {/* Add Checkpoint button (if no via points yet) */}
        {checkpoints.length === 0 && (
          <div className="flex justify-center">
            <button
              onClick={handleAddCheckpoint}
              className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-medium transition-all cursor-pointer flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Add Checkpoint
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
