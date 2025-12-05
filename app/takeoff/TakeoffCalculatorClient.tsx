"use client";

import { useState, useEffect, useCallback } from "react";
import { PageLayout } from "../components/PageLayout";
import { CalculatorPageHeader } from "../components/CalculatorPageHeader";
import { Footer } from "../components/Footer";
import { ShareButton } from "../components/ShareButton";
import { Tooltip } from "../components/Tooltip";
import { AtmosphericConditionsInputs, type AtmosphericConditionsData, type AtmosphericPreset } from "../components/AtmosphericConditionsInputs";
import { AircraftSelector } from "../components/AircraftSelector";
import { AircraftSelectorModal } from "../components/AircraftSelectorModal";
import { AerodromeSearchInput, type AerodromeResult } from "../components/AerodromeSearchInput";
import { PRESET_AIRCRAFT, ResolvedAircraftPerformance } from "@/lib/aircraft";
import {
  calculateTakeoffPerformance,
  validateTakeoffInputs,
  type SurfaceType,
  type FlapConfiguration,
  type TakeoffResults,
} from "@/lib/takeoffCalculations";
import {
  type Runway,
  type SelectedRunway,
  selectBestRunway,
  getAllRunwayOptions,
  surfaceToTakeoffSurface,
} from "@/lib/runwayUtils";
import { loadAircraftFromUrl, serializeAircraft, getAircraftByModel } from "@/lib/aircraftStorage";
import { formatDistance } from "@/lib/formatters";
import { TakeoffVisualization } from "./TakeoffVisualization";
import { TAKEOFF_EXAMPLES } from "@/lib/takeoffExamples";

interface TakeoffCalculatorClientProps {
  initialAircraft: string;
  initialPlane: string;
  initialWeight: string;
  initialFlaps: string;
  initialPA: string;
  initialAlt: string;
  initialQNH: string;
  initialDA: string;
  initialOAT: string;
  initialRunway: string;
  initialSurface: string;
  initialSlope: string;
  initialWind: string;
  initialObstacle: string;
  initialAerodrome: string;
  initialMetarRef: string;
  initialRunwayEnd: string;
}


/**
 * Extract METAR reference (ICAO + day/time) from raw METAR string
 * E.g., "METAR KJFK 041051Z ..." -> "KJFK041051Z"
 */
function extractMetarRef(rawMetar: string, icaoId: string): string {
  // Find the day/time pattern (DDHHMMZ)
  const match = rawMetar.match(/\b(\d{6}Z)\b/);
  if (match) {
    return `${icaoId}${match[1]}`;
  }
  return "";
}

export function TakeoffCalculatorClient({
  initialAircraft,
  initialPlane,
  initialWeight,
  initialFlaps,
  initialPA,
  initialAlt,
  initialQNH,
  initialDA,
  initialOAT,
  initialRunway,
  initialSurface,
  initialSlope,
  initialWind,
  initialObstacle,
  initialAerodrome,
  initialMetarRef,
  initialRunwayEnd,
}: TakeoffCalculatorClientProps) {
  // Aircraft state
  const [aircraft, setAircraft] = useState<ResolvedAircraftPerformance | null>(() => {
    // Try loading from serialized plane parameter first
    if (initialPlane) {
      const loadedAircraft = loadAircraftFromUrl(initialPlane);
      if (loadedAircraft) return loadedAircraft;
    }
    // Fall back to model code (check presets and custom)
    const aircraftFromModel = getAircraftByModel(initialAircraft);
    return aircraftFromModel || (PRESET_AIRCRAFT[0] as ResolvedAircraftPerformance);
  });

  // Aircraft modal state
  const [isAircraftModalOpen, setIsAircraftModalOpen] = useState(false);

  // Aerodrome & METAR state
  const [selectedAerodrome, setSelectedAerodrome] = useState<AerodromeResult | null>(null);
  const [metarInfo, setMetarInfo] = useState<{ raw: string; source: string; station: string; windDir: number | null; windSpeed: number | null } | null>(null);
  const [loadingMetar, setLoadingMetar] = useState(false);
  const [atmosphericPreset, setAtmosphericPreset] = useState<AtmosphericPreset | null>(null);
  // METAR reference tracking (ICAO + day/time, e.g., "KJFK041051Z")
  const [storedMetarRef, setStoredMetarRef] = useState<string>(initialMetarRef);
  const [currentMetarRef, setCurrentMetarRef] = useState<string>("");
  const [metarHasChanged, setMetarHasChanged] = useState(false);
  // Flag to prevent URL update until initial aerodrome is loaded
  const [initialAerodromeLoaded, setInitialAerodromeLoaded] = useState(!initialAerodrome);

  // Runway state
  const [availableRunways, setAvailableRunways] = useState<Runway[]>([]);
  const [selectedRunway, setSelectedRunway] = useState<SelectedRunway | null>(null);
  const [runwayOptions, setRunwayOptions] = useState<SelectedRunway[]>([]);
  const [loadingRunways, setLoadingRunways] = useState(false);

  // Input state
  const [weight, setWeight] = useState<string>(initialWeight);
  const [flapConfiguration, setFlapConfiguration] = useState<FlapConfiguration>(
    (initialFlaps as FlapConfiguration) || "0"
  );
  const [runwayLength, setRunwayLength] = useState<string>(initialRunway);
  const [surfaceType, setSurfaceType] = useState<SurfaceType>(initialSurface as SurfaceType || "PG");
  const [runwaySlope, setRunwaySlope] = useState<string>(initialSlope);
  const [headwindComponent, setHeadwindComponent] = useState<string>(initialWind);
  const [obstacleHeight, setObstacleHeight] = useState<string>(initialObstacle);

  // Atmospheric conditions data (from component)
  const [atmosphericData, setAtmosphericData] = useState<AtmosphericConditionsData | null>(null);

  // Determine initial altitude mode from URL params
  const initialAltitudeMode = initialDA ? "da" : (initialAlt && initialQNH) ? "qnh" : "pa";

  // Callback for atmospheric conditions changes
  const handleAtmosphericChange = useCallback((data: AtmosphericConditionsData) => {
    setAtmosphericData(data);
  }, []);

  // Fetch METAR and runways when aerodrome is selected
  const handleAerodromeChange = useCallback(async (aerodrome: AerodromeResult | null, preferredRunwayEnd?: string) => {
    setSelectedAerodrome(aerodrome);
    setMetarInfo(null);
    setAtmosphericPreset(null);
    setAvailableRunways([]);
    setSelectedRunway(null);
    setRunwayOptions([]);
    setCurrentMetarRef("");
    setMetarHasChanged(false);

    if (!aerodrome) return;

    // Use aerodrome elevation immediately (we have it from the API)
    const basePreset: AtmosphericPreset = {
      altitudeMode: "qnh",
      altitude: aerodrome.elevation?.toString() || "",
    };

    let windDir: number | null = null;
    let windSpeed: number | null = null;

    // Fetch METAR and runways in parallel
    setLoadingMetar(true);
    // Only show runway loading if there's an ICAO code to look up
    setLoadingRunways(!!aerodrome.code);

    // Start both fetches
    const metarPromise = (async () => {
      try {
        const params = new URLSearchParams();
        if (aerodrome.code) params.set("id", aerodrome.code);
        params.set("lat", aerodrome.lat.toString());
        params.set("lon", aerodrome.lon.toString());

        const response = await fetch(`/api/metar?${params}`);
        const data = await response.json();

        if (data.metar) {
          const metar = data.metar;
          windDir = metar.wdir;
          windSpeed = metar.wspd;

          // Extract and track METAR reference
          const newMetarRef = extractMetarRef(metar.rawOb, metar.icaoId);
          setCurrentMetarRef(newMetarRef);

          // Check if METAR has changed from stored reference
          if (storedMetarRef && newMetarRef && storedMetarRef !== newMetarRef) {
            setMetarHasChanged(true);
          }

          setMetarInfo({
            raw: metar.rawOb,
            source: data.source === "direct" ? "Direct" : `Nearest (${data.distance} NM)`,
            station: metar.icaoId,
            windDir,
            windSpeed,
          });

          // Set atmospheric preset from METAR + aerodrome elevation
          setAtmosphericPreset({
            ...basePreset,
            qnh: metar.altim?.toString() || "",
            oat: metar.temp?.toString() || "",
          });
        } else {
          // No METAR, but still set elevation
          setAtmosphericPreset(basePreset);
        }
      } catch (error) {
        console.error("Failed to fetch METAR:", error);
        setAtmosphericPreset(basePreset);
      } finally {
        setLoadingMetar(false);
      }
      return { windDir, windSpeed };
    })();

    const runwayPromise = (async () => {
      if (!aerodrome.code) {
        return [];
      }
      try {
        const response = await fetch(`/api/runways?icao=${aerodrome.code}`);
        const data = await response.json();
        return data.runways || [];
      } catch (error) {
        console.error("Failed to fetch runways:", error);
        return [];
      }
    })();

    // Wait for both to complete
    const [metarResult, runways] = await Promise.all([metarPromise, runwayPromise]);

    // Process runway data
    if (runways.length > 0) {
      setAvailableRunways(runways);

      // Calculate all runway options with wind components
      const options = getAllRunwayOptions(runways, metarResult.windDir, metarResult.windSpeed);
      setRunwayOptions(options);

      // Select runway: prefer specified end from URL, otherwise best by wind
      let selectedOption = preferredRunwayEnd
        ? options.find((opt) => opt.endId === preferredRunwayEnd)
        : selectBestRunway(runways, metarResult.windDir, metarResult.windSpeed);

      if (selectedOption) {
        setSelectedRunway(selectedOption);
        // Update form fields from selected runway
        setRunwayLength(selectedOption.length.toString());
        setSurfaceType(surfaceToTakeoffSurface(selectedOption.surface));
        setRunwaySlope(selectedOption.slope.toFixed(1));
        setHeadwindComponent(selectedOption.headwind.toString());
      }
    }

    // Only set loading false after all processing is complete
    setLoadingRunways(false);
  }, [storedMetarRef]);

  // Load aerodrome from URL on mount
  useEffect(() => {
    if (!initialAerodrome) return;

    // Fetch aerodrome data by ICAO code
    const loadAerodrome = async () => {
      try {
        const response = await fetch(`/api/aerodromes?q=${encodeURIComponent(initialAerodrome)}&limit=1`);
        const data = await response.json();

        if (data.data && data.data.length > 0) {
          const aerodrome = data.data[0];
          // Trigger the full aerodrome selection flow with preferred runway
          await handleAerodromeChange(aerodrome, initialRunwayEnd || undefined);
        }
      } catch (error) {
        console.error("Failed to load aerodrome from URL:", error);
      } finally {
        // Mark initial aerodrome as loaded (even if it failed)
        setInitialAerodromeLoaded(true);
      }
    };

    loadAerodrome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Handler for manual runway selection
  const handleRunwaySelect = useCallback((endId: string) => {
    const selected = runwayOptions.find((opt) => opt.endId === endId);
    if (selected) {
      setSelectedRunway(selected);
      setRunwayLength(selected.length.toString());
      setSurfaceType(surfaceToTakeoffSurface(selected.surface));
      setRunwaySlope(selected.slope.toFixed(1));
      setHeadwindComponent(selected.headwind.toString());
    }
  }, [runwayOptions]);

  // Set default weight to standard weight or max gross weight
  useEffect(() => {
    if (!weight && aircraft) {
      const defaultWeight = aircraft.weights?.standardWeight || aircraft.weights?.maxGrossWeight;
      if (defaultWeight) {
        // Safe: Setting default value based on aircraft selection
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWeight(defaultWeight.toString());
      }
    }
  }, [aircraft, weight]);

  // Update URL when parameters change
  useEffect(() => {
    if (!atmosphericData) return; // Wait for initial atmospheric data
    if (!initialAerodromeLoaded) return; // Wait for initial aerodrome to load

    const params = new URLSearchParams();

    // Aircraft
    if (aircraft) {
      params.set("aircraft", aircraft.model);
      // Optionally serialize full aircraft data if custom
      const isPreset = PRESET_AIRCRAFT.some(p => p.model === aircraft.model);
      if (!isPreset) {
        params.set("plane", serializeAircraft(aircraft, {
          includeStandardWeight: true,
          includeMaxWeight: true,
          includeClimbTable: true
        }));
      }
    }

    // Weight & Flaps
    if (weight) params.set("weight", weight);
    if (flapConfiguration) params.set("flaps", flapConfiguration);

    // Add atmospheric parameters based on mode
    if (atmosphericData.altitudeMode === "pa" && atmosphericData.pressureAlt) {
      params.set("pa", atmosphericData.pressureAlt);
    } else if (atmosphericData.altitudeMode === "qnh" && atmosphericData.altitude && atmosphericData.qnh) {
      params.set("alt", atmosphericData.altitude);
      params.set("qnh", atmosphericData.qnh);
    } else if (atmosphericData.altitudeMode === "da" && atmosphericData.densityAlt) {
      params.set("da", atmosphericData.densityAlt);
    }

    if (atmosphericData.oat) params.set("oat", atmosphericData.oat);

    // Runway parameters
    if (runwayLength) params.set("runway", runwayLength);
    if (surfaceType) params.set("surface", surfaceType);
    if (runwaySlope) params.set("slope", runwaySlope);
    if (headwindComponent) params.set("wind", headwindComponent);
    if (obstacleHeight) params.set("obstacle", obstacleHeight);

    // Aerodrome and METAR reference
    if (selectedAerodrome?.code) {
      params.set("ad", selectedAerodrome.code);
    }
    if (currentMetarRef) {
      params.set("metar", currentMetarRef);
    }
    if (selectedRunway?.endId) {
      params.set("rwy", selectedRunway.endId);
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [aircraft, weight, flapConfiguration, atmosphericData, runwayLength, surfaceType, runwaySlope, headwindComponent, obstacleHeight, selectedAerodrome, currentMetarRef, selectedRunway, initialAerodromeLoaded]);

  // Parse values
  const weightVal = parseFloat(weight);
  const runwayVal = parseFloat(runwayLength);
  const slopeVal = parseFloat(runwaySlope);
  const windVal = parseFloat(headwindComponent);
  const obstacleVal = parseFloat(obstacleHeight);

  // Get actual PA and DA from atmospheric data
  const actualPA = atmosphericData?.actualPA || 0;
  const actualDA = atmosphericData?.actualDA || 0;
  const oatVal = atmosphericData?.oatVal || 0;

  // Calculate results
  const hasValidInputs =
    aircraft &&
    !isNaN(weightVal) &&
    !isNaN(actualPA) &&
    !isNaN(actualDA) &&
    !isNaN(oatVal) &&
    !isNaN(runwayVal) &&
    !isNaN(slopeVal) &&
    !isNaN(windVal) &&
    !isNaN(obstacleVal);

  const results: TakeoffResults | null = hasValidInputs
    ? calculateTakeoffPerformance({
        aircraft,
        weight: weightVal,
        flapConfiguration,
        pressureAltitude: actualPA,
        densityAltitude: actualDA,
        oat: oatVal,
        runwayLength: runwayVal,
        surfaceType,
        runwaySlope: slopeVal,
        headwindComponent: windVal,
        obstacleHeight: obstacleVal,
      })
    : null;

  // Validate inputs
  const validationErrors = hasValidInputs
    ? validateTakeoffInputs({
        aircraft,
        weight: weightVal,
        pressureAltitude: actualPA,
        densityAltitude: actualDA,
        oat: oatVal,
        runwayLength: runwayVal,
        surfaceType,
        runwaySlope: slopeVal,
        headwindComponent: windVal,
        obstacleHeight: obstacleVal,
      })
    : [];

  // Load example data - rotates through Easy -> Complicated -> NO GO
  const loadExample = () => {
    // Detect current example by comparing current state with examples
    let currentExampleIndex = -1;

    for (let i = 0; i < TAKEOFF_EXAMPLES.length; i++) {
      const example = TAKEOFF_EXAMPLES[i];
      const matches =
        aircraft?.model === example.aircraft &&
        weight === example.weight &&
        atmosphericData?.pressureAlt === example.pa &&
        atmosphericData?.oat === example.oat &&
        runwayLength === example.runway &&
        surfaceType === example.surface &&
        runwaySlope === example.slope &&
        headwindComponent === example.wind &&
        obstacleHeight === example.obstacle;

      if (matches) {
        currentExampleIndex = i;
        break;
      }
    }

    // Load next example (or first if none matched)
    const nextIndex = (currentExampleIndex + 1) % TAKEOFF_EXAMPLES.length;
    const nextExample = TAKEOFF_EXAMPLES[nextIndex];

    // Build URL with example parameters
    const params = new URLSearchParams();
    params.set("aircraft", nextExample.aircraft);
    params.set("weight", nextExample.weight);
    params.set("pa", nextExample.pa);
    params.set("oat", nextExample.oat);
    params.set("runway", nextExample.runway);
    params.set("surface", nextExample.surface);
    params.set("slope", nextExample.slope);
    params.set("wind", nextExample.wind);
    params.set("obstacle", nextExample.obstacle);

    // Navigate to example URL
    window.location.href = `${window.location.pathname}?${params.toString()}`;
  };

  return (
    <PageLayout currentPage="takeoff">
      <CalculatorPageHeader
        title="Takeoff Performance Calculator"
        description="Calculate takeoff distance, ground roll, obstacle clearance, and safety margins based on aircraft performance, atmospheric conditions, and runway characteristics"
      />

      <main className="w-full max-w-4xl">
        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">

          {/* Aircraft Selection Section */}
          <div className="mb-8 pb-8 border-b border-gray-700/50">
            <div className="flex items-center justify-between gap-3 mb-4">
              <label
                className="flex items-center text-sm font-medium"
                style={{ color: "oklch(0.72 0.015 240)" }}
              >
                Aircraft
                <Tooltip content="Select the aircraft to calculate takeoff performance" />
              </label>
              {/* Example Button */}
              <div className="relative group">
                <button
                  onClick={loadExample}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-gray-600 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all text-sm font-medium cursor-pointer whitespace-nowrap"
                  style={{ color: "oklch(0.75 0.15 300)" }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Example
                </button>
                {/* Custom Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none whitespace-nowrap border border-gray-700 z-50">
                  Rotate through examples: Easy → Complicated → NO GO
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900"></div>
                </div>
              </div>
            </div>
            <AircraftSelector
              aircraft={aircraft}
              onClick={() => setIsAircraftModalOpen(true)}
            />
          </div>

          {/* Weight & Configuration Section */}
          <div className="mb-8 pb-8 border-b border-gray-700/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <svg className="w-6 h-6" fill="none" stroke="oklch(0.7 0.15 290)" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: "white" }}>
                  Weight & Configuration
                </h2>
                <p className="text-sm" style={{ color: "oklch(0.65 0.02 240)" }}>
                  Set aircraft weight and flap position
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Takeoff Weight
                  <Tooltip content="Current weight of the aircraft at takeoff in pounds" />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full h-[52px] px-4 pr-16 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 hover:border-gray-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                    placeholder="1670"
                  />
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                    style={{ color: "oklch(0.55 0.02 240)" }}
                  >
                    lbs
                  </span>
                </div>
              </div>

              <div>
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Flap Configuration
                  <Tooltip content="Flap setting for takeoff. 10° flaps reduces ground roll but slightly decreases climb performance." />
                </label>
                <select
                  value={flapConfiguration}
                  onChange={(e) => setFlapConfiguration(e.target.value as FlapConfiguration)}
                  className="w-full h-[52px] pl-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 hover:border-gray-500 text-white cursor-pointer"
                >
                  <option value="0">0° (Normal Takeoff)</option>
                  <option value="10">10° (Short Field)</option>
                  <option value="full">Full (Not Recommended)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Aerodrome & METAR Section */}
          <div className="mb-8 pb-8 border-b border-gray-700/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                <svg className="w-6 h-6" fill="none" stroke="oklch(0.7 0.15 160)" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: "white" }}>
                  Aerodrome
                </h2>
                <p className="text-sm" style={{ color: "oklch(0.65 0.02 240)" }}>
                  Auto-fill conditions from METAR (optional)
                </p>
              </div>
            </div>

            <AerodromeSearchInput
              value={selectedAerodrome}
              onChange={handleAerodromeChange}
              label="Search Airport"
              tooltip="Search for an airport to auto-fill elevation and weather from METAR"
              placeholder="Search ICAO code or airport name..."
              showLabel={false}
            />

            {/* METAR Display */}
            {loadingMetar && (
              <div className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-gray-700 animate-pulse">
                <p className="text-sm" style={{ color: "oklch(0.6 0.02 240)" }}>
                  Fetching METAR data...
                </p>
              </div>
            )}

            {metarInfo && !loadingMetar && (
              <div className={`mt-4 p-4 rounded-xl border ${
                metarHasChanged
                  ? "bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30"
                  : "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: metarHasChanged ? "oklch(0.65 0.15 70)" : "oklch(0.65 0.15 160)" }}>
                    METAR ({metarInfo.station}) - {metarInfo.source}
                    {metarHasChanged && (
                      <span className="ml-2 text-amber-400">(Updated)</span>
                    )}
                  </p>
                  {metarHasChanged && (
                    <button
                      onClick={() => {
                        // Update stored reference to current and clear the changed flag
                        setStoredMetarRef(currentMetarRef);
                        setMetarHasChanged(false);
                      }}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors cursor-pointer"
                    >
                      Use New METAR
                    </button>
                  )}
                </div>
                <p className="font-mono text-sm break-all" style={{ color: "oklch(0.85 0.02 240)" }}>
                  {metarInfo.raw}
                </p>
                {metarHasChanged && storedMetarRef && (
                  <p className="mt-2 text-xs" style={{ color: "oklch(0.6 0.02 240)" }}>
                    Link was created with: {storedMetarRef}
                  </p>
                )}
              </div>
            )}

            {selectedAerodrome && !loadingMetar && !metarInfo && (
              <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-sm" style={{ color: "oklch(0.75 0.1 80)" }}>
                  No METAR available for this location. Enter conditions manually below.
                </p>
              </div>
            )}

            {/* Runway Selector */}
            {loadingRunways && (
              <div className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-gray-700 animate-pulse">
                <p className="text-sm" style={{ color: "oklch(0.6 0.02 240)" }}>
                  Loading runway data...
                </p>
              </div>
            )}

            {runwayOptions.length > 0 && !loadingRunways && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/30">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.65 0.15 40)" }}>
                    Available Runways
                  </p>
                  {metarInfo && metarInfo.windDir !== null && metarInfo.windSpeed !== null && (
                    <p className="text-xs" style={{ color: "oklch(0.6 0.02 240)" }}>
                      Wind: {String(metarInfo.windDir).padStart(3, '0')}° / {metarInfo.windSpeed} kt
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {runwayOptions.map((option) => {
                    const isSelected = selectedRunway?.endId === option.endId;
                    const isBest = runwayOptions[0]?.endId === option.endId;
                    return (
                      <button
                        key={option.endId}
                        onClick={() => handleRunwaySelect(option.endId)}
                        className={`p-3 rounded-lg text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-orange-500/30 border-2 border-orange-500"
                            : "bg-slate-800/50 border border-gray-600 hover:border-orange-500/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-lg" style={{ color: "white" }}>
                            {option.endId}
                          </span>
                          {isBest && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/30 text-emerald-400">
                              BEST
                            </span>
                          )}
                        </div>
                        <div className="text-xs space-y-0.5" style={{ color: "oklch(0.65 0.02 240)" }}>
                          <p>
                            {option.headwind >= 0 ? (
                              <span className="text-emerald-400">↑{option.headwind} kt HW</span>
                            ) : (
                              <span className="text-red-400">↓{Math.abs(option.headwind)} kt TW</span>
                            )}
                            {option.crosswind > 0 && (
                              <span className="ml-1">
                                {option.crosswind} kt {option.crosswindDirection}
                              </span>
                            )}
                          </p>
                          <p>{option.surfaceName} • {option.length.toLocaleString()} ft</p>
                          {option.slope !== 0 && (
                            <p>{option.slope > 0 ? "↗" : "↘"} {Math.abs(option.slope).toFixed(1)}% slope</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedAerodrome?.code && !loadingRunways && availableRunways.length === 0 && (
              <div className="mt-4 p-4 rounded-xl bg-slate-900/30 border border-gray-700">
                <p className="text-sm" style={{ color: "oklch(0.6 0.02 240)" }}>
                  No runway data available for {selectedAerodrome.code}. Enter runway details manually below.
                </p>
              </div>
            )}
          </div>

          {/* Atmospheric Conditions */}
          <AtmosphericConditionsInputs
            initialAltitudeMode={initialAltitudeMode}
            initialPressureAlt={initialPA}
            initialAltitude={initialAlt}
            initialQNH={initialQNH}
            initialDensityAlt={initialDA}
            initialOAT={initialOAT}
            preset={atmosphericPreset}
            onChange={handleAtmosphericChange}
            showCalculatedValues={true}
          />

          {/* Runway Section */}
          <div className="mb-8 pb-8 border-b border-gray-700/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30">
                <svg className="w-6 h-6" fill="none" stroke="oklch(0.7 0.15 40)" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: "white" }}>
                  Runway Characteristics
                </h2>
                <p className="text-sm" style={{ color: "oklch(0.65 0.02 240)" }}>
                  Available runway and surface conditions
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Runway Length
                  <Tooltip content="Available takeoff distance in feet" />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={runwayLength}
                    onChange={(e) => setRunwayLength(e.target.value)}
                    className="w-full h-[52px] px-4 pr-16 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 hover:border-gray-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                    placeholder="3000"
                  />
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                    style={{ color: "oklch(0.55 0.02 240)" }}
                  >
                    ft
                  </span>
                </div>
              </div>

              <div>
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Surface Type
                  <Tooltip content="Runway surface condition affects ground roll distance" />
                </label>
                <select
                  value={surfaceType}
                  onChange={(e) => setSurfaceType(e.target.value as SurfaceType)}
                  className="w-full h-[52px] pl-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 hover:border-gray-500 text-white cursor-pointer"
                >
                  <option value="PG">Pavement (Good)</option>
                  <option value="PP">Pavement (Poor)</option>
                  <option value="GG">Grass (Good)</option>
                  <option value="GF">Grass (Fair)</option>
                  <option value="GV">Gravel</option>
                  <option value="DT">Dirt</option>
                  <option value="SD">Sand</option>
                  <option value="WT">Water (NO-GO)</option>
                </select>
              </div>

              <div>
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Runway Slope
                  <Tooltip content="Positive for uphill, negative for downhill. Affects distance required." />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={runwaySlope}
                    onChange={(e) => setRunwaySlope(e.target.value)}
                    className="w-full h-[52px] px-4 pr-16 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 hover:border-gray-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                    placeholder="0.0"
                  />
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                    style={{ color: "oklch(0.55 0.02 240)" }}
                  >
                    %
                  </span>
                </div>
              </div>

              <div>
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Headwind Component
                  <Tooltip content="Headwind component along runway (positive = headwind, negative = tailwind)" />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={headwindComponent}
                    onChange={(e) => setHeadwindComponent(e.target.value)}
                    className="w-full h-[52px] px-4 pr-16 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 hover:border-gray-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                    placeholder="0"
                  />
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                    style={{ color: "oklch(0.55 0.02 240)" }}
                  >
                    kt
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Obstacle Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30">
                <svg className="w-6 h-6" fill="none" stroke="oklch(0.7 0.15 80)" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: "white" }}>
                  Obstacle Clearance
                </h2>
                <p className="text-sm" style={{ color: "oklch(0.65 0.02 240)" }}>
                  Obstacle height to clear
                </p>
              </div>
            </div>
            <div>
              <label
                className="flex items-center text-sm font-medium mb-2"
                style={{ color: "oklch(0.72 0.015 240)" }}
              >
                Obstacle Height
                <Tooltip content="Height of obstacle to clear (typically 50 ft)" />
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={obstacleHeight}
                  onChange={(e) => setObstacleHeight(e.target.value)}
                  className="w-full h-[52px] px-4 pr-16 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 hover:border-gray-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                  placeholder="50"
                />
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                  style={{ color: "oklch(0.55 0.02 240)" }}
                >
                  ft
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <div className="mt-8 rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">
            {/* Decision Banner */}
            <div className={`mb-8 p-6 rounded-2xl text-center border-2 ${
              results.decision === "GO"
                ? "bg-green-500/10 border-green-500/50"
                : results.decision === "MARGINAL"
                ? "bg-yellow-500/10 border-yellow-500/50"
                : "bg-red-500/10 border-red-500/50"
            }`}>
              <div className="text-5xl mb-3">
                {results.decision === "GO" ? "✔" : results.decision === "MARGINAL" ? "⚠" : "❌"}
              </div>
              <h2 className={`text-3xl font-bold mb-2 ${
                results.decision === "GO"
                  ? "text-green-400"
                  : results.decision === "MARGINAL"
                  ? "text-yellow-400"
                  : "text-red-400"
              }`}>
                {results.decision}
              </h2>
              <p className="text-lg" style={{ color: "oklch(0.7 0.02 240)" }}>
                Safety Margin: {results.safetyMargin >= 0 ? "+" : ""}{(results.safetyMargin * 100).toFixed(1)}%
              </p>
            </div>

            {/* Takeoff Visualization */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4" style={{ color: "white" }}>
                Takeoff Profile
              </h3>
              <div className="rounded-xl overflow-hidden bg-gradient-to-b from-sky-900/20 to-slate-900/40 border border-slate-700 p-4">
                <TakeoffVisualization
                  results={results}
                  runwayLength={runwayVal}
                  obstacleHeight={obstacleVal}
                />
              </div>
            </div>

            {/* V-Speeds */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4" style={{ color: "white" }}>
                V-Speeds
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30">
                  <div className="absolute top-2 right-2">
                    <Tooltip content="Stall speed in clean configuration at current weight and density altitude" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.65 0.15 230)" }}>
                    VS1 (IAS)
                  </p>
                  <p className="text-2xl font-bold" style={{ color: "white" }}>
                    {Math.round(results.vSpeeds.vs1IAS)} <span className="text-sm font-normal" style={{ color: "oklch(0.6 0.02 240)" }}>kt</span>
                  </p>
                </div>
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30">
                  <div className="absolute top-2 right-2">
                    <Tooltip content="Rotation speed - speed at which to lift nose for takeoff (typically 1.1 × Vs1)" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.65 0.15 290)" }}>
                    VR (IAS)
                  </p>
                  <p className="text-2xl font-bold" style={{ color: "white" }}>
                    {Math.round(results.vSpeeds.vrIAS)} <span className="text-sm font-normal" style={{ color: "oklch(0.6 0.02 240)" }}>kt</span>
                  </p>
                </div>
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border border-cyan-500/30">
                  <div className="absolute top-2 right-2">
                    <Tooltip content="Best angle of climb speed - provides maximum altitude gain per distance traveled" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.65 0.15 200)" }}>
                    VX (IAS)
                  </p>
                  <p className="text-2xl font-bold" style={{ color: "white" }}>
                    {Math.round(results.vSpeeds.vxIAS)} <span className="text-sm font-normal" style={{ color: "oklch(0.6 0.02 240)" }}>kt</span>
                  </p>
                </div>
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30">
                  <div className="absolute top-2 right-2">
                    <Tooltip content="Best rate of climb speed - provides maximum altitude gain per minute" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.65 0.15 150)" }}>
                    VY (IAS)
                  </p>
                  <p className="text-2xl font-bold" style={{ color: "white" }}>
                    {Math.round(results.vSpeeds.vyIAS)} <span className="text-sm font-normal" style={{ color: "oklch(0.6 0.02 240)" }}>kt</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Distances */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4" style={{ color: "white" }}>
                Takeoff Distances
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30">
                  <div className="absolute top-2 right-2">
                    <Tooltip content="Distance required from brake release to liftoff, adjusted for weight, surface, wind, and slope" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.65 0.15 40)" }}>
                    Ground Roll
                  </p>
                  <p className="text-2xl font-bold" style={{ color: "white" }}>
                    {formatDistance(results.distances.groundRoll)} <span className="text-sm font-normal" style={{ color: "oklch(0.6 0.02 240)" }}>ft</span>
                  </p>
                </div>
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/30">
                  <div className="absolute top-2 right-2">
                    <Tooltip content="Total distance required to clear the specified obstacle height at runway end" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.65 0.15 80)" }}>
                    Obstacle Distance
                  </p>
                  <p className="text-2xl font-bold" style={{ color: "white" }}>
                    {formatDistance(results.distances.obstacleDistance)} <span className="text-sm font-normal" style={{ color: "oklch(0.6 0.02 240)" }}>ft</span>
                  </p>
                </div>
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30">
                  <div className="absolute top-2 right-2">
                    <Tooltip content="Vertical speed after obstacle clearance at current density altitude and weight" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.65 0.15 260)" }}>
                    Rate of Climb
                  </p>
                  <p className="text-2xl font-bold" style={{ color: "white" }}>
                    {Math.round(results.rateOfClimb)} <span className="text-sm font-normal" style={{ color: "oklch(0.6 0.02 240)" }}>ft/min</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Warnings */}
            {results.warnings.length > 0 && (
              <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <h3 className="text-lg font-bold mb-3 text-yellow-400">
                  ⚠ Warnings
                </h3>
                <ul className="space-y-2">
                  {results.warnings.map((warning, idx) => (
                    <li key={idx} className="text-sm" style={{ color: "oklch(0.75 0.02 240)" }}>
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Errors */}
            {results.errors.length > 0 && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <h3 className="text-lg font-bold mb-3 text-red-400">
                  ❌ Errors
                </h3>
                <ul className="space-y-2">
                  {results.errors.map((error, idx) => (
                    <li key={idx} className="text-sm" style={{ color: "oklch(0.75 0.02 240)" }}>
                      • {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Share Button */}
            <ShareButton
              shareData={{
                title: "Takeoff Performance Calculator",
                text: `Check out this takeoff performance calculation - ${results.decision}`,
                url: typeof window !== "undefined" ? window.location.href : undefined,
              }}
            />
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && !results && (
          <div className="mt-8 p-6 rounded-2xl bg-red-500/10 border border-red-500/30">
            <h3 className="text-lg font-bold mb-3 text-red-400">
              Please correct the following:
            </h3>
            <ul className="space-y-2">
              {validationErrors.map((error, idx) => (
                <li key={idx} className="text-sm" style={{ color: "oklch(0.75 0.02 240)" }}>
                  • {error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      <Footer description="Calculate takeoff performance, ground roll, obstacle clearance, and safety margins for your flight planning needs." />

      {/* Aircraft Selector Modal */}
      <AircraftSelectorModal
        isOpen={isAircraftModalOpen}
        onClose={() => setIsAircraftModalOpen(false)}
        onApply={setAircraft}
        initialAircraft={aircraft || undefined}
      />
    </PageLayout>
  );
}
