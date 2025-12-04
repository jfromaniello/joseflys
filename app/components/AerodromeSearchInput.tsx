"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Tooltip } from "./Tooltip";
import { useDropdownKeyboardNavigation } from "@/lib/useDropdownKeyboardNavigation";

export interface AerodromeResult {
  type: "AD" | "LAD";
  code: string | null;
  name: string;
  lat: number;
  lon: number;
  elevation: number | null;
}

interface AerodromeSearchInputProps {
  value: AerodromeResult | null;
  onChange: (aerodrome: AerodromeResult | null) => void;
  label?: string;
  tooltip?: string;
  placeholder?: string;
  showLabel?: boolean;
  className?: string;
}

export function AerodromeSearchInput({
  value,
  onChange,
  label,
  tooltip,
  placeholder = "Search ICAO code or airport name...",
  showLabel = true,
  className = "",
}: AerodromeSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AerodromeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelectResult = useCallback(
    (result: AerodromeResult) => {
      onChange(result);
      setSearchQuery("");
      setShowDropdown(false);
      setSearchResults([]);
    },
    [onChange]
  );

  const { selectedIndex, setSelectedIndex, handleKeyDown } =
    useDropdownKeyboardNavigation({
      items: searchResults,
      isOpen: showDropdown,
      onSelect: handleSelectResult,
      onClose: () => {
        setShowDropdown(false);
        setSearchResults([]);
      },
    });

  // Search aerodromes when query changes
  useEffect(() => {
    const searchAerodromes = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      setSearching(true);
      try {
        const response = await fetch(
          `/api/aerodromes?q=${encodeURIComponent(searchQuery)}&limit=8`
        );
        const data = await response.json();

        if (data.data && Array.isArray(data.data)) {
          setSearchResults(data.data);
          setShowDropdown(data.data.length > 0);
          setSelectedIndex(0);
        }
      } catch (error) {
        console.error("Aerodrome search failed:", error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchAerodromes, 200);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, setSelectedIndex]);

  const handleClear = () => {
    onChange(null);
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
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

      {/* Selected aerodrome display */}
      {value ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/50 border-2 border-emerald-500/50">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {value.code && (
                <span
                  className="px-2 py-0.5 rounded text-xs font-bold"
                  style={{
                    backgroundColor: "oklch(0.3 0.1 160)",
                    color: "oklch(0.85 0.15 160)",
                  }}
                >
                  {value.code}
                </span>
              )}
              <span
                className="text-sm font-medium truncate"
                style={{ color: "oklch(0.85 0.02 240)" }}
              >
                {value.name}
              </span>
            </div>
            <div
              className="text-xs mt-1"
              style={{ color: "oklch(0.6 0.02 240)" }}
            >
              {value.elevation !== null ? `${value.elevation} ft` : "Elev N/A"} •{" "}
              {value.lat.toFixed(4)}, {value.lon.toFixed(4)}
            </div>
          </div>
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
            title="Clear selection"
          >
            <XMarkIcon className="w-5 h-5" style={{ color: "oklch(0.6 0.02 240)" }} />
          </button>
        </div>
      ) : (
        /* Search input */
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchResults.length > 0) setShowDropdown(true);
            }}
            onBlur={() => {
              setTimeout(() => setShowDropdown(false), 200);
            }}
            className="w-full h-[52px] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 hover:border-gray-500 text-white"
            placeholder={placeholder}
          />
          {searching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Search results dropdown */}
      {showDropdown && searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-2 rounded-xl bg-slate-800 border border-gray-700 shadow-2xl max-h-80 overflow-y-auto">
          {searchResults.map((result, index) => (
            <button
              key={`${result.code || result.name}-${index}`}
              onClick={() => handleSelectResult(result)}
              className={`w-full px-4 py-3 text-left transition-colors cursor-pointer ${
                index === selectedIndex
                  ? "bg-emerald-500/20"
                  : "hover:bg-slate-700/50"
              } ${index === 0 ? "rounded-t-xl" : ""} ${
                index === searchResults.length - 1 ? "rounded-b-xl" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                {result.code && (
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold"
                    style={{
                      backgroundColor:
                        result.type === "AD"
                          ? "oklch(0.3 0.1 230)"
                          : "oklch(0.3 0.1 25)",
                      color:
                        result.type === "AD"
                          ? "oklch(0.75 0.15 230)"
                          : "oklch(0.75 0.15 25)",
                    }}
                  >
                    {result.code}
                  </span>
                )}
                <span
                  className="text-sm font-medium truncate"
                  style={{ color: "oklch(0.85 0.02 240)" }}
                >
                  {result.name}
                </span>
              </div>
              <div
                className="text-xs mt-0.5"
                style={{ color: "oklch(0.55 0.02 240)" }}
              >
                {result.type === "LAD" ? "Landing Area" : "Aerodrome"} •{" "}
                {result.elevation !== null ? `${result.elevation} ft` : "Elev N/A"}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
