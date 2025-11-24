"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Tooltip } from "./Tooltip";
import { PRESET_AIRCRAFT, ResolvedAircraftPerformance } from "@/lib/aircraft";
import { resolveAircraft } from "@/lib/aircraftStorage";

interface AircraftSearchSelectorProps {
  selectedAircraft: ResolvedAircraftPerformance | null;
  customAircraft: ResolvedAircraftPerformance[];
  onSelect: (aircraft: ResolvedAircraftPerformance) => void;
  onClear: () => void;
  label?: string;
  tooltip?: string;
  placeholder?: string;
}

export function AircraftSearchSelector({
  selectedAircraft,
  customAircraft,
  onSelect,
  onClear,
  label = "Aircraft Type",
  tooltip = "Search for an aircraft model from the database",
  placeholder = "Search aircraft...",
}: AircraftSearchSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Resolve preset aircraft to ResolvedAircraftPerformance
  const resolvedPresets = useMemo(
    () => PRESET_AIRCRAFT.map(ac => resolveAircraft(ac)),
    []
  );

  // Filter aircraft based on search query
  const allAircraft = useMemo(
    () => [...resolvedPresets, ...customAircraft],
    [resolvedPresets, customAircraft]
  );

  const filteredAircraft = useMemo(() => {
    if (searchQuery.length > 0) {
      return allAircraft.filter((ac) => {
        const query = searchQuery.toLowerCase();
        return (
          ac.name.toLowerCase().includes(query) ||
          ac.model.toLowerCase().includes(query)
        );
      });
    }
    // Show first 10 alphabetically when no search query
    return [...allAircraft]
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 10);
  }, [searchQuery, allAircraft]);

  // Separate into presets and customs
  const filteredPresets = filteredAircraft.filter((ac) =>
    PRESET_AIRCRAFT.some((p) => p.model === ac.model)
  );
  const filteredCustoms = filteredAircraft.filter((ac) =>
    customAircraft.some((c) => c.model === ac.model)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (aircraft: ResolvedAircraftPerformance) => {
    onSelect(aircraft);
    setSearchQuery("");
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  const handleClear = () => {
    onClear();
    setSearchQuery("");
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filteredAircraft.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredAircraft.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredAircraft.length) {
          handleSelect(filteredAircraft[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [selectedIndex]);

  // // Reset selected index when search query changes
  // useEffect(() => {
  //   // eslint-disable-next-line react-hooks/set-state-in-effect
  //   setSelectedIndex(-1);
  // }, [searchQuery]);

  return (
    <div>
      <label
        className="flex items-center text-sm font-medium mb-2"
        style={{ color: "oklch(0.72 0.015 240)" }}
      >
        {label}
        <Tooltip content={tooltip} />
      </label>
      <div className="relative" ref={dropdownRef}>
        {selectedAircraft ? (
          // Selected aircraft display
          <div className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-sky-500/50 text-white">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-lg font-medium truncate">
                  {selectedAircraft.name}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {selectedAircraft.model}
                </div>
              </div>
              <button
                onClick={handleClear}
                className="ml-2 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Clear selection"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          // Search input
          <>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => {
                setShowDropdown(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full h-[52px] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 hover:border-gray-500 text-white"
            />
            {showDropdown && filteredAircraft.length > 0 && (
              <div className="absolute top-full mt-1 w-full bg-slate-800 rounded-lg border border-gray-700 max-h-80 overflow-y-auto z-50 shadow-2xl">
                {/* Preset Aircraft */}
                {filteredPresets.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 bg-slate-800 sticky top-0 z-10">
                      Preset Aircraft
                    </div>
                    {filteredPresets.map((ac) => {
                      const globalIndex = filteredAircraft.indexOf(ac);
                      const isSelected = globalIndex === selectedIndex;
                      return (
                        <button
                          key={ac.model}
                          data-index={globalIndex}
                          onClick={() => handleSelect(ac)}
                          className={`w-full text-left px-4 py-3 transition-colors border-b border-gray-700/30 cursor-pointer ${
                            isSelected
                              ? "bg-sky-500/20 border-sky-500/40"
                              : "hover:bg-slate-700"
                          }`}
                        >
                          <div className="text-sm font-medium text-white">
                            {ac.name}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {ac.model}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* Custom Aircraft */}
                {filteredCustoms.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 bg-slate-800 sticky top-0 z-10">
                      Custom Aircraft
                    </div>
                    {filteredCustoms.map((ac) => {
                      const globalIndex = filteredAircraft.indexOf(ac);
                      const isSelected = globalIndex === selectedIndex;
                      return (
                        <button
                          key={ac.model}
                          data-index={globalIndex}
                          onClick={() => handleSelect(ac)}
                          className={`w-full text-left px-4 py-3 transition-colors border-b border-gray-700/30 cursor-pointer ${
                            isSelected
                              ? "bg-sky-500/20 border-sky-500/40"
                              : "hover:bg-slate-700"
                          }`}
                        >
                          <div className="text-sm font-medium text-white">
                            {ac.name}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {ac.model}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {showDropdown && searchQuery.length > 0 && filteredAircraft.length === 0 && (
              <div className="absolute top-full mt-1 w-full bg-slate-800 rounded-lg p-4 text-sm text-gray-400 border border-gray-700 z-50">
                No aircraft found matching &quot;{searchQuery}&quot;
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
