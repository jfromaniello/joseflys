"use client";

import { useState, useEffect, Fragment } from "react";
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from "@headlessui/react";
import {
  calculateHaversineDistance,
  calculateInitialBearing,
  validateCoordinates,
} from "@/lib/distanceCalculations";
import { LocationSearchInput } from "./LocationSearchInput";

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

interface DistanceCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: {
    bearing: number;
    distance: number;
    fromName: string;
    toName: string;
  }) => void;
  description?: string;
}

export function DistanceCalculatorModal({
  isOpen,
  onClose,
  onApply,
  description,
}: DistanceCalculatorModalProps) {
  const [inputMode, setInputMode] = useState<InputMode>("search");

  // From location
  const [fromSearchQuery] = useState("");
  const [, setFromSearchResults] = useState<GeocodingResult[]>([]);
  const [fromLocation, setFromLocation] = useState<Location | null>(null);
  const [fromLat, setFromLat] = useState("");
  const [fromLon, setFromLon] = useState("");
  const [, setFromSearching] = useState(false);
  const [, setFromShowDropdown] = useState(false);

  // To location
  const [toSearchQuery] = useState("");
  const [, setToSearchResults] = useState<GeocodingResult[]>([]);
  const [toLocation, setToLocation] = useState<Location | null>(null);
  const [toLat, setToLat] = useState("");
  const [toLon, setToLon] = useState("");
  const [, setToSearching] = useState(false);
  const [, setToShowDropdown] = useState(false);

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

  const handleApply = () => {
    if (distance !== null && bearing !== null && fromLocation && toLocation) {
      onApply({
        bearing: Math.round(bearing),
        distance: Math.round(distance),
        fromName: fromLocation.name.split(",")[0],
        toName: toLocation.name.split(",")[0],
      });
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start sm:items-center justify-center p-4 pt-20 sm:pt-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-slate-800 shadow-2xl transition-all border border-gray-700">
                {/* Header */}
                <div className="bg-slate-800 border-b border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <DialogTitle
                      as="h2"
                      className="text-2xl font-bold"
                      style={{ color: "white" }}
                    >
                      Calculate Distance & Bearing
                    </DialogTitle>
                    <button
                      onClick={onClose}
                      className="p-2 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                      style={{ color: "oklch(0.6 0.02 240)" }}
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  {description && (
                    <p className="text-sm" style={{ color: "oklch(0.6 0.02 240)" }}>
                      {description}
                    </p>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  {/* Input Mode Toggle */}
                  <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-1 w-fit">
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

                  {/* Search Mode */}
                  {inputMode === "search" && (
                    <div className="grid grid-cols-2 gap-4">
                      {/* From Location */}
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
                        placeholder="Search..."
                        selectedBorderColor="border-sky-500/50"
                      />

                      {/* To Location */}
                      <LocationSearchInput
                        value={toLocation}
                        onChange={(loc) => {
                          if (loc) {
                            setToLocation(loc);
                            setToLat(loc.lat.toFixed(6));
                            setToLon(loc.lon.toFixed(6));
                          } else {
                            setToLocation(null);
                            setToLat("");
                            setToLon("");
                          }
                        }}
                        label="To"
                        placeholder="Search..."
                        selectedBorderColor="border-red-500/50"
                      />
                    </div>
                  )}

                  {/* Coordinates Mode */}
                  {inputMode === "coordinates" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            From Latitude
                          </label>
                          <input
                            type="number"
                            value={fromLat}
                            onChange={(e) => setFromLat(e.target.value)}
                            placeholder="40.4168"
                            step="any"
                            className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all bg-slate-900/50 border-2 border-gray-600 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            From Longitude
                          </label>
                          <input
                            type="number"
                            value={fromLon}
                            onChange={(e) => setFromLon(e.target.value)}
                            placeholder="-3.7038"
                            step="any"
                            className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all bg-slate-900/50 border-2 border-gray-600 text-white"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            To Latitude
                          </label>
                          <input
                            type="number"
                            value={toLat}
                            onChange={(e) => setToLat(e.target.value)}
                            placeholder="41.3874"
                            step="any"
                            className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all bg-slate-900/50 border-2 border-gray-600 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            To Longitude
                          </label>
                          <input
                            type="number"
                            value={toLon}
                            onChange={(e) => setToLon(e.target.value)}
                            placeholder="2.1686"
                            step="any"
                            className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all bg-slate-900/50 border-2 border-gray-600 text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Results */}
                  {distance !== null && bearing !== null && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900/50 rounded-xl border border-gray-700">
                      <div className="text-center">
                        <div className="text-sm text-gray-400 mb-1">Distance</div>
                        <div className="text-2xl font-bold text-white">
                          {Math.round(distance)} NM
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-400 mb-1">Bearing</div>
                        <div className="text-2xl font-bold text-white">
                          {Math.round(bearing).toString().padStart(3, '0')}°
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="bg-slate-800 border-t border-gray-700 p-6 flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 px-6 rounded-xl font-medium border-2 border-gray-600 hover:bg-slate-700 transition-all cursor-pointer"
                    style={{ color: "white" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={distance === null || bearing === null}
                    className="flex-1 py-3 px-6 rounded-xl font-medium border-2 border-sky-500 bg-sky-500/20 hover:bg-sky-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: "oklch(0.8 0.15 230)" }}
                  >
                    Apply to Course
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
