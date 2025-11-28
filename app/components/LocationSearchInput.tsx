/**
 * Reusable Location Search Input Component
 * Supports geocoding search with keyboard navigation (up/down/enter/escape)
 * and direct coordinate input
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Tooltip } from "./Tooltip";
import { useDropdownKeyboardNavigation } from "@/lib/useDropdownKeyboardNavigation";

export interface LocationResult {
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

interface LocationSearchInputProps {
  /** Currently selected location */
  value: LocationResult | null;
  /** Callback when a location is selected */
  onChange: (location: LocationResult | null) => void;
  /** Label text */
  label?: string;
  /** Tooltip content */
  tooltip?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Border color class when selected (e.g., "border-sky-500/50", "border-green-500/50") */
  selectedBorderColor?: string;
  /** Whether to show the label */
  showLabel?: boolean;
  /** Additional class names for the container */
  className?: string;
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

export function LocationSearchInput({
  value,
  onChange,
  label,
  tooltip,
  placeholder = "Search city, airport, or enter coordinates...",
  selectedBorderColor = "border-sky-500/50",
  showLabel = true,
  className = "",
}: LocationSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelectResult = useCallback((result: GeocodingResult) => {
    onChange({
      lat: result.lat,
      lon: result.lon,
      name: result.name.split(",")[0].trim(),
    });
    setSearchQuery("");
    setShowDropdown(false);
  }, [onChange]);

  const { selectedIndex, handleKeyDown: handleDropdownKeyDown, dropdownRef } = useDropdownKeyboardNavigation({
    items: searchResults,
    isOpen: showDropdown && searchResults.length > 0,
    onSelect: handleSelectResult,
    onClose: () => setShowDropdown(false),
  });

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
      // Show coordinates as a search result option
      setSearchResults([{
        name: `Coordinates: ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`,
        lat: coords.lat,
        lon: coords.lon,
        type: "coordinates",
        importance: 1,
      }]);
      setShowDropdown(true);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle dropdown navigation first
    if (showDropdown && searchResults.length > 0) {
      handleDropdownKeyDown(e);
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Escape") {
        return;
      }
      // If Enter was pressed and an item was selected, don't process further
      if (e.key === "Enter" && selectedIndex >= 0) {
        return;
      }
    }

    // Handle coordinate input with Enter when no dropdown item is selected
    if (e.key === "Enter") {
      e.preventDefault();
      const coords = parseCoordinates(searchQuery);
      if (coords) {
        onChange({
          lat: coords.lat,
          lon: coords.lon,
          name: `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`,
        });
        setSearchQuery("");
        setShowDropdown(false);
      }
    }
  };

  const handleClear = () => {
    onChange(null);
    setSearchQuery("");
  };

  return (
    <div className={`relative ${className}`}>
      {showLabel && label && (
        <label
          className="flex items-center text-sm font-medium mb-2"
          style={{ color: "oklch(0.72 0.015 240)" }}
        >
          {label}
          {tooltip && <Tooltip content={tooltip} />}
        </label>
      )}

      {value ? (
        <div className={`w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 ${selectedBorderColor} text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-lg font-medium truncate">
                {value.name.split(",")[0]}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {value.lat.toFixed(4)}, {value.lon.toFixed(4)}
              </div>
            </div>
            <button
              onClick={handleClear}
              className="ml-2 p-1.5 rounded-lg hover:bg-slate-700 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
              title="Clear"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            onFocus={() => searchQuery.length >= 3 && setShowDropdown(true)}
            className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 hover:border-gray-500 text-white placeholder-gray-500"
            placeholder={placeholder}
          />

          {/* Search dropdown */}
          {showDropdown && (
            <div
              ref={dropdownRef}
              className="absolute z-50 w-full mt-1 bg-slate-800 border border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto"
            >
              {searching ? (
                <div className="p-3 text-gray-400 text-sm">Searching...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((result, index) => (
                  <button
                    key={index}
                    data-index={index}
                    onClick={() => handleSelectResult(result)}
                    className={`w-full px-4 py-2 text-left transition-colors cursor-pointer ${
                      index === selectedIndex
                        ? "bg-sky-500/20 border-l-2 border-sky-500"
                        : "hover:bg-slate-700"
                    }`}
                  >
                    <div className="text-white text-sm">{result.name}</div>
                    <div className="text-xs text-gray-400">
                      {result.lat.toFixed(4)}, {result.lon.toFixed(4)}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-3 text-gray-400 text-sm">No results found</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
