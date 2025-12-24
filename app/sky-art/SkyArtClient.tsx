"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Tooltip } from "../components/Tooltip";
import { LocationSearchInput } from "../components/LocationSearchInput";
import { PageLayout } from "../components/PageLayout";
import { CalculatorPageHeader } from "../components/CalculatorPageHeader";
import { Footer } from "../components/Footer";
import { ShareButtonSimple } from "../components/ShareButtonSimple";
import {
  svgPathToGeoPath,
  generateSkyArtGPX,
  type SkyArtPath,
} from "@/lib/skyArtCalculations";
import {
  skyArtTemplates,
  getTemplateById,
  getTemplateCategories,
  type SkyArtTemplate,
} from "@/lib/skyArtTemplates";

// Dynamically import map component (uses browser-only APIs)
const SkyArtMap = dynamic(
  () => import("./SkyArtMap").then((mod) => ({ default: mod.SkyArtMap })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] rounded-xl border border-gray-700 bg-slate-900/30 flex items-center justify-center">
        <div className="text-gray-400">Loading map...</div>
      </div>
    ),
  }
);

interface Location {
  name: string;
  lat: number;
  lon: number;
}

interface SkyArtClientProps {
  initialTemplateId?: string;
  initialLat?: number;
  initialLon?: number;
  initialWidth?: number;
  initialRotation?: number;
  initialLocationName?: string;
}

export function SkyArtClient({
  initialTemplateId,
  initialLat,
  initialLon,
  initialWidth,
  initialRotation,
  initialLocationName,
}: SkyArtClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Default location (Buenos Aires)
  const defaultLocation = {
    name: "Buenos Aires, Argentina",
    lat: -34.6037,
    lon: -58.3816,
  };

  // State
  const [selectedTemplate, setSelectedTemplate] = useState<SkyArtTemplate>(
    getTemplateById(initialTemplateId || "") || skyArtTemplates[0]
  );
  const [location, setLocation] = useState<Location | null>(
    initialLat !== undefined && initialLon !== undefined
      ? {
          name: initialLocationName || `${initialLat.toFixed(4)}, ${initialLon.toFixed(4)}`,
          lat: initialLat,
          lon: initialLon,
        }
      : defaultLocation
  );
  const [widthNM, setWidthNM] = useState(
    initialWidth?.toString() || selectedTemplate.suggestedWidthNM.toString()
  );
  const [rotation, setRotation] = useState(initialRotation?.toString() || "0");
  const [result, setResult] = useState<SkyArtPath | null>(null);
  const [showCopied, setShowCopied] = useState(false);

  // Calculate the sky art path when inputs change
  useEffect(() => {
    if (!location || !selectedTemplate) {
      setResult(null);
      return;
    }

    const width = parseFloat(widthNM);
    const rot = parseFloat(rotation);

    if (isNaN(width) || width <= 0) {
      setResult(null);
      return;
    }

    try {
      const path = svgPathToGeoPath(
        selectedTemplate.path,
        location.lat,
        location.lon,
        width,
        rot
      );
      setResult(path);
    } catch (error) {
      console.error("Calculation error:", error);
      setResult(null);
    }
  }, [location, selectedTemplate, widthNM, rotation]);

  // Update URL when state changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();

      params.set("t", selectedTemplate.id);

      if (location) {
        params.set("lat", location.lat.toFixed(6));
        params.set("lon", location.lon.toFixed(6));
        if (location.name && !location.name.includes(",")) {
          params.set("loc", location.name);
        }
      }

      const width = parseFloat(widthNM);
      if (!isNaN(width) && width !== selectedTemplate.suggestedWidthNM) {
        params.set("w", width.toString());
      }

      const rot = parseFloat(rotation);
      if (!isNaN(rot) && rot !== 0) {
        params.set("r", rot.toString());
      }

      const newUrl = `?${params.toString()}`;
      window.history.replaceState(null, "", newUrl);
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedTemplate, location, widthNM, rotation, router, searchParams]);

  // Handle template change
  const handleTemplateChange = useCallback((template: SkyArtTemplate) => {
    setSelectedTemplate(template);
    setWidthNM(template.suggestedWidthNM.toString());
  }, []);

  // Download GPX file
  const handleDownloadGPX = useCallback(() => {
    if (!result) return;

    const gpxContent = generateSkyArtGPX(result, selectedTemplate.name, location?.name);

    const filename = `sky-art-${selectedTemplate.id}${location?.name ? `-${location.name.split(",")[0].toLowerCase().replace(/[^a-z0-9]/g, "-")}` : ""}.gpx`;

    const blob = new Blob([gpxContent], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  }, [result, selectedTemplate, location]);

  // Download CSV file
  const handleDownloadCSV = useCallback(() => {
    if (!result) return;

    // Generate CSV content
    let csvContent = "name,lat,lon\n";
    let waypointIndex = 1;
    
    for (const stroke of result.strokes) {
      for (const point of stroke) {
        const name = `WPT${waypointIndex.toString().padStart(2, "0")}`;
        csvContent += `${name},${point.lat.toFixed(4)},${point.lon.toFixed(4)}\n`;
        waypointIndex++;
      }
    }

    const filename = `sky-art-${selectedTemplate.id}${location?.name ? `-${location.name.split(",")[0].toLowerCase().replace(/[^a-z0-9]/g, "-")}` : ""}.csv`;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result, selectedTemplate, location]);

  const categories = getTemplateCategories();

  return (
    <PageLayout currentPage="sky-art">
      <CalculatorPageHeader
        title="Sky Art Generator"
        description="Create GPS art flight paths! Choose a template, set your location and size, then export to GPX for your next creative flight."
      />

      <main className="w-full max-w-4xl">
        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">
          {/* Template Selection */}
          <div className="mb-6 pb-6 border-b border-gray-700">
            <label
              className="flex items-center text-sm font-medium mb-2"
              style={{ color: "oklch(0.72 0.015 240)" }}
            >
              Design
              <Tooltip content="Choose a shape to draw in the sky. Each design shows the emoji, name, and suggested size." />
            </label>
            <select
              value={selectedTemplate.id}
              onChange={(e) => {
                const template = getTemplateById(e.target.value);
                if (template) {
                  handleTemplateChange(template);
                }
              }}
              className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border-2 border-gray-600 focus:border-blue-500 focus:outline-none cursor-pointer text-base"
            >
              {categories.map((category) => (
                <optgroup key={category.category} label={category.label}>
                  {category.templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.emoji} {template.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {selectedTemplate && (
              <p className="mt-2 text-sm text-gray-400">
                {selectedTemplate.description} - Suggested size: {selectedTemplate.suggestedWidthNM} NM
              </p>
            )}
          </div>

          {/* Location and Size Configuration */}
          <div className="mb-6 pb-6 border-b border-gray-700 space-y-4">
            <h3
              className="text-sm font-semibold mb-3 uppercase tracking-wide"
              style={{ color: "oklch(0.65 0.15 230)" }}
            >
              Location & Size
            </h3>

            {/* Location Search */}
            <LocationSearchInput
              value={location}
              onChange={(loc) => {
                if (loc) {
                  setLocation(loc);
                } else {
                  setLocation(null);
                }
              }}
              label="Center Location"
              tooltip="The center point of your sky art design. Search for a city, airport, or location."
              placeholder="Search city or airport..."
              selectedBorderColor="border-blue-500/50"
            />

            {/* Size and Rotation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Width */}
              <div>
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Width
                  <Tooltip content="The total width of your sky art design in nautical miles. Larger designs are more visible but take longer to fly." />
                </label>
                <div className="flex gap-2">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={widthNM}
                    onChange={(e) => setWidthNM(e.target.value)}
                    className="flex-1"
                  />
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="0.5"
                      value={widthNM}
                      onChange={(e) => setWidthNM(e.target.value)}
                      className="w-20 px-3 py-1 pr-10 bg-slate-700 text-white rounded-lg border-2 border-gray-600 focus:border-blue-500 focus:outline-none text-right"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      NM
                    </span>
                  </div>
                </div>
              </div>

              {/* Rotation */}
              <div>
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Rotation
                  <Tooltip content="Rotate your design clockwise. 0° = design faces north." />
                </label>
                <div className="flex gap-2">
                  <input
                    type="range"
                    min="0"
                    max="359"
                    step="1"
                    value={rotation}
                    onChange={(e) => setRotation(e.target.value)}
                    className="flex-1"
                  />
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="359"
                      step="1"
                      value={rotation}
                      onChange={(e) => setRotation(e.target.value)}
                      className="w-20 px-3 py-1 pr-6 bg-slate-700 text-white rounded-lg border-2 border-gray-600 focus:border-blue-500 focus:outline-none text-right"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      °
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
          {result && (
            <div className="mb-6 pb-6 border-b border-gray-700">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Total Distance</div>
                  <div className="text-lg font-semibold text-blue-400">
                    {result.totalDistanceNM.toFixed(1)} NM
                  </div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Width</div>
                  <div className="text-lg font-semibold text-green-400">
                    {result.widthNM.toFixed(1)} NM
                  </div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Height</div>
                  <div className="text-lg font-semibold text-purple-400">
                    {result.heightNM.toFixed(1)} NM
                  </div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Strokes</div>
                  <div className="text-lg font-semibold text-orange-400">
                    {result.strokes.length}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadGPX}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg cursor-pointer border-2 border-gray-600 transition-colors whitespace-nowrap"
                >
                  {showCopied ? (
                    <>
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Downloaded!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>GPX</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg cursor-pointer border-2 border-gray-600 transition-colors whitespace-nowrap"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>CSV</span>
                </button>
                <ShareButtonSimple
                  shareData={{
                    title: `Sky Art: ${selectedTemplate.name}`,
                    text: `Check out my ${selectedTemplate.name} sky art design - ${result.totalDistanceNM.toFixed(1)} NM flight path!`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Map Visualization */}
          {result && location && (
            <div className="mb-6">
              <h3
                className="text-lg font-semibold mb-3"
                style={{ color: "white" }}
              >
                Preview
              </h3>
              <SkyArtMap
                strokes={result.strokes}
                bounds={result.bounds}
                center={result.center}
                templateName={selectedTemplate.name}
                onCenterChange={(lat: number, lon: number) => {
                  setLocation({
                    name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
                    lat,
                    lon,
                  });
                }}
              />

              {/* Quick controls below map */}
              <div className="mt-4 bg-slate-900/30 border border-gray-700 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-1 block">
                      Width: {widthNM} NM
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      step="1"
                      value={widthNM}
                      onChange={(e) => setWidthNM(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-1 block">
                      Rotation: {rotation}°
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="359"
                      step="1"
                      value={rotation}
                      onChange={(e) => setRotation(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Help Section */}
          {!result && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: "white" }}
              >
                How It Works
              </h3>
              <ol className="list-decimal list-inside text-gray-300 text-sm space-y-2">
                <li>
                  <strong>Choose a design</strong> from the dropdown above
                </li>
                <li>
                  <strong>Set your location</strong> - search for a city or airport
                </li>
                <li>
                  <strong>Adjust the size</strong> - bigger designs are more
                  visible but take longer to fly
                </li>
                <li>
                  <strong>Rotate if needed</strong> - orient the design to face
                  any direction
                </li>
                <li>
                  <strong>Download GPX</strong> - import into your flight
                  planner or GPS
                </li>
              </ol>
              <p className="text-gray-400 text-xs mt-4">
                <strong>Tip:</strong> Designs between 5-15 NM wide work best for
                visibility on FlightRadar24 while being flyable in a reasonable
                time.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer description="Create GPS art flight paths for fun aerial drawings" />
    </PageLayout>
  );
}
