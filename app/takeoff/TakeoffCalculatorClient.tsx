"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "../components/Navbar";
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
import Link from "next/link";
import { loadAircraftFromUrl, serializeAircraft, getAircraftByModel } from "@/lib/aircraftStorage";
import { formatDistance } from "@/lib/formatters";
import { fromKnots } from "@/lib/speedConversion";
import { TakeoffVisualization } from "./TakeoffVisualization";
import { TAKEOFF_EXAMPLES } from "@/lib/takeoffExamples";

interface TakeoffCalculatorClientProps {
  initialAircraft: string;
  initialPlane: string;
  initialWeight: string;
  initialFlaps: string;
  initialPower: string;
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

/** Neutral metric tile — color is reserved for meaning (danger/warn), not decoration. */
function StatTile({
  label,
  value,
  unit,
  tone = "default",
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: "default" | "danger" | "warn";
}) {
  const valueColor =
    tone === "danger" ? "text-red-400" : tone === "warn" ? "text-amber-400" : "text-white";
  return (
    <div className="bg-slate-900/60 px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-lg font-bold leading-tight tabular-nums ${valueColor}`}>
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-slate-500">{unit}</span>}
      </div>
    </div>
  );
}

export function TakeoffCalculatorClient({
  initialAircraft,
  initialPlane,
  initialWeight,
  initialFlaps,
  initialPower,
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
  const [availablePower, setAvailablePower] = useState<string>(initialPower);
  const [flapConfiguration, setFlapConfiguration] = useState<FlapConfiguration>(
    (initialFlaps as FlapConfiguration) || "0"
  );
  const [runwayLength, setRunwayLength] = useState<string>(initialRunway);
  const [surfaceType, setSurfaceType] = useState<SurfaceType>(initialSurface as SurfaceType || "PG");
  const [runwaySlope, setRunwaySlope] = useState<string>(initialSlope);
  const [headwindComponent, setHeadwindComponent] = useState<string>(initialWind);
  const [obstacleHeight, setObstacleHeight] = useState<string>(initialObstacle);

  // V-speed display unit. Aircraft with MPH-calibrated ASIs (e.g. C150) offer
  // a kt/mph toggle and default to mph; everything else stays in kt.
  const [speedUnit, setSpeedUnit] = useState<"kt" | "mph">("kt");
  const [showAerodrome, setShowAerodrome] = useState<boolean>(false);

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

  // Default the V-speed unit to mph for MPH-calibrated aircraft (e.g. C150),
  // kt otherwise. Re-runs when the selected aircraft changes.
  useEffect(() => {
    // Safe: aligning the unit default with the selected aircraft
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpeedUnit(aircraft?.usesMPH ? "mph" : "kt");
  }, [aircraft?.model, aircraft?.usesMPH]);

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
    if (availablePower && availablePower !== "100") params.set("power", availablePower);

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
  }, [aircraft, weight, flapConfiguration, availablePower, atmosphericData, runwayLength, surfaceType, runwaySlope, headwindComponent, obstacleHeight, selectedAerodrome, currentMetarRef, selectedRunway, initialAerodromeLoaded]);

  // Parse values
  const weightVal = parseFloat(weight);
  const powerVal = parseFloat(availablePower);
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
        availablePowerPercent: isNaN(powerVal) ? 100 : powerVal,
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

  // Decision presentation + headline reason (keeps status and "why" together)
  const ds =
    results?.decision === "GO"
      ? { text: "text-emerald-400", border: "border-emerald-500/40", bg: "bg-emerald-500/10", icon: "✔" }
      : results?.decision === "MARGINAL"
      ? { text: "text-amber-400", border: "border-amber-500/40", bg: "bg-amber-500/10", icon: "⚠" }
      : { text: "text-red-400", border: "border-red-500/40", bg: "bg-red-500/10", icon: "✕" };

  const obstacleDeficit = results ? results.distances.obstacleDistance - runwayVal : 0;
  const headline = results
    ? results.errors[0] ??
      (obstacleDeficit > 0
        ? `Insufficient runway — need ${formatDistance(obstacleDeficit)} ft more`
        : results.decision === "MARGINAL"
        ? "Margins are tight — review carefully"
        : "Runway length and climb are adequate")
    : "";

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
      <Navbar currentPage="takeoff" />

      <div className="flex flex-col xl:h-[calc(100dvh-3.5rem)]">
        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b border-gray-800 bg-slate-900/50 px-3 py-2">
          <span className="text-sm font-bold uppercase tracking-wider text-white whitespace-nowrap">Takeoff Performance</span>
          <span className="hidden sm:inline text-xs text-slate-500 truncate">ground roll · obstacle clearance · GO / NO-GO</span>
          <div className="relative group ml-auto shrink-0">
            <button
              onClick={loadExample}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-dashed border-gray-600 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all text-xs font-medium cursor-pointer whitespace-nowrap"
              style={{ color: "oklch(0.75 0.15 300)" }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Load example
            </button>
            <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none whitespace-nowrap border border-gray-700 z-50">
              Loads a full scenario — aircraft + conditions (Easy → Complicated → NO-GO)
            </div>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 flex-col xl:flex-row">
          {/* Aircraft column */}
          <aside className="shrink-0 overflow-x-hidden bg-slate-900/20 xl:w-[19rem] 2xl:w-[21rem] xl:border-r xl:border-gray-800 xl:overflow-y-auto">
            {/* Sticky column header */}
            <div className="z-10 border-b border-gray-700 bg-slate-900/95 px-3 py-2.5 backdrop-blur xl:sticky xl:top-0">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">Aircraft</h2>
            </div>
            <div className="flex flex-col gap-2.5 p-3">

          {/* Aircraft Selection Section */}
          <div className="pb-2.5 border-b border-gray-800/70">
            <AircraftSelector
              aircraft={aircraft}
              onClick={() => setIsAircraftModalOpen(true)}
            />
            {aircraft && (
              <Link
                href={`/aircraft/${aircraft.model}/view#takeoff`}
                className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium transition-colors"
                style={{ color: "oklch(0.65 0.15 230)" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View takeoff performance data
              </Link>
            )}
          </div>

          {/* Weight & Configuration Section */}
          <div className="pb-2.5 border-b border-gray-800/70">
            <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "oklch(0.62 0.035 235)" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
              Weight &amp; Configuration
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5">
              <div>
                <label
                  className="flex items-center text-xs font-medium mb-1"
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
                    className="w-full h-9 px-2.5 pr-11 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm bg-slate-900/40 border border-gray-700 hover:border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                    placeholder="1670"
                  />
                  <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none"
                    style={{ color: "oklch(0.55 0.02 240)" }}
                  >
                    lbs
                  </span>
                </div>
              </div>

              <div>
                <label
                  className="flex items-center text-xs font-medium mb-1"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Flap Configuration
                  <Tooltip content="Flap setting for takeoff. 10° flaps reduces ground roll but slightly decreases climb performance." />
                </label>
                <select
                  value={flapConfiguration}
                  onChange={(e) => setFlapConfiguration(e.target.value as FlapConfiguration)}
                  className="w-full h-9 pl-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm bg-slate-900/40 border border-gray-700 hover:border-gray-600 text-white cursor-pointer"
                >
                  <option value="0">0° (Normal Takeoff)</option>
                  <option value="10">10° (Short Field)</option>
                  <option value="full">Full (Not Recommended)</option>
                </select>
              </div>

              <div>
                <label
                  className="flex items-center text-xs font-medium mb-1"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Available Power
                  <Tooltip content="Percentage of rated engine power actually available. POH numbers assume a new engine at 100%. Worn engines produce less — check it via the static full-throttle RPM (e.g. the C150 should reach ~2500–2600 RPM). Reduced power lengthens the ground roll and sharply cuts climb rate." />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={availablePower}
                    onChange={(e) => setAvailablePower(e.target.value)}
                    min={50}
                    max={100}
                    step={1}
                    className="w-full h-9 px-2.5 pr-11 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm bg-slate-900/40 border border-gray-700 hover:border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                    placeholder="100"
                  />
                  <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none"
                    style={{ color: "oklch(0.55 0.02 240)" }}
                  >
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

            </div>
          </aside>

          {/* Conditions column */}
          <aside className="shrink-0 overflow-x-hidden bg-slate-900/20 xl:w-[21rem] 2xl:w-[23rem] xl:border-r xl:border-gray-800 xl:overflow-y-auto">
            {/* Sticky column header */}
            <div className="z-10 border-b border-gray-700 bg-slate-900/95 px-3 py-2.5 backdrop-blur xl:sticky xl:top-0">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">Conditions</h2>
            </div>
            <div className="flex flex-col gap-2.5 p-3">

          {/* Aerodrome & METAR Section (optional, collapsed by default) */}
          <div className="pb-2.5 border-b border-gray-800/70">
            {showAerodrome || selectedAerodrome ? (
              <>
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: "oklch(0.62 0.035 235)" }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                Aerodrome / METAR
              </h2>
              <button
                type="button"
                onClick={() => { setShowAerodrome(false); if (selectedAerodrome) handleAerodromeChange(null); }}
                className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                Hide
              </button>
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
              <div className="mt-4 p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/30">
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
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowAerodrome(true)}
                className="flex w-full items-center gap-3 rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2.5 text-left hover:border-sky-500/50 hover:bg-sky-500/15 cursor-pointer"
              >
                <svg className="w-5 h-5 shrink-0 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-sky-100">Load from an airport</span>
                  <span className="block text-[11px] text-slate-400">Shortcut — auto-fills elevation, QNH, wind &amp; runway below</span>
                </span>
              </button>
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
            compact={true}
          />

          {/* Runway Section */}
          <div className="pb-2.5 border-b border-gray-800/70">
            <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "oklch(0.62 0.035 235)" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Runway Characteristics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5">
              <div>
                <label
                  className="flex items-center text-xs font-medium mb-1"
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
                    className="w-full h-9 px-2.5 pr-11 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm bg-slate-900/40 border border-gray-700 hover:border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                    placeholder="3000"
                  />
                  <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none"
                    style={{ color: "oklch(0.55 0.02 240)" }}
                  >
                    ft
                  </span>
                </div>
              </div>

              <div>
                <label
                  className="flex items-center text-xs font-medium mb-1"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Surface Type
                  <Tooltip content="Runway surface condition affects ground roll distance" />
                </label>
                <select
                  value={surfaceType}
                  onChange={(e) => setSurfaceType(e.target.value as SurfaceType)}
                  className="w-full h-9 pl-2.5 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm bg-slate-900/40 border border-gray-700 hover:border-gray-600 text-white cursor-pointer"
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
                  className="flex items-center text-xs font-medium mb-1"
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
                    className="w-full h-9 px-2.5 pr-11 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm bg-slate-900/40 border border-gray-700 hover:border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                    placeholder="0.0"
                  />
                  <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none"
                    style={{ color: "oklch(0.55 0.02 240)" }}
                  >
                    %
                  </span>
                </div>
              </div>

              <div>
                <label
                  className="flex items-center text-xs font-medium mb-1"
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
                    className="w-full h-9 px-2.5 pr-11 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm bg-slate-900/40 border border-gray-700 hover:border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                    placeholder="0"
                  />
                  <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none"
                    style={{ color: "oklch(0.55 0.02 240)" }}
                  >
                    kt
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Obstacle Section */}
          <div className="pb-2.5 border-b border-gray-800/70">
            <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "oklch(0.62 0.035 235)" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Obstacle Clearance
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5">
              <div>
                <label
                  className="flex items-center text-xs font-medium mb-1"
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
                    className="w-full h-9 px-2.5 pr-11 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all text-sm bg-slate-900/40 border border-gray-700 hover:border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                    placeholder="50"
                  />
                  <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none"
                    style={{ color: "oklch(0.55 0.02 240)" }}
                  >
                    ft
                  </span>
                </div>
              </div>
            </div>
          </div>
            </div>
          </aside>

          {/* Results dashboard (main area) */}
          <div className="overflow-x-hidden xl:flex-1 xl:min-w-0 xl:overflow-y-auto">
            <div className="flex flex-col gap-3 p-3">

          {/* Results Section */}
          {results && (
            <>
            {/* Status: decision + reason + safety margin, advisories grouped here */}
            <div className={`rounded-lg border p-3 ${ds.border} ${ds.bg}`}>
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-bold leading-none ${ds.text}`}>{ds.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={`text-xl font-bold leading-none ${ds.text}`}>{results.decision}</span>
                    <span className="text-sm text-slate-300">{headline}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Safety margin</div>
                  <div className={`text-lg font-bold leading-none tabular-nums ${ds.text}`}>
                    {results.safetyMargin >= 0 ? "+" : ""}{(results.safetyMargin * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {(results.errors.length > 0 || results.warnings.length > 0) && (
                <ul className="mt-2.5 space-y-1 border-t border-white/10 pt-2.5 text-xs text-slate-300">
                  {results.errors.map((e, i) => (
                    <li key={`e${i}`} className="flex gap-2">
                      <span className="text-red-400 shrink-0">✕</span>
                      <span>{e}</span>
                    </li>
                  ))}
                  {results.warnings.map((w, i) => (
                    <li key={`w${i}`} className="flex gap-2">
                      <span className="text-amber-400 shrink-0">⚠</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-lg border border-slate-800 bg-slate-800">
              <StatTile label="Ground roll" value={formatDistance(results.distances.groundRoll)} unit="ft" />
              <StatTile label="Over 50 ft obst." value={formatDistance(results.distances.obstacleDistance)} unit="ft" tone={obstacleDeficit > 0 ? "danger" : "default"} />
              <StatTile label="Runway avail." value={formatDistance(runwayVal)} unit="ft" />
              <StatTile label="Rate of climb" value={Math.round(results.rateOfClimb).toString()} unit="ft/min" tone={results.rateOfClimb < 200 ? "danger" : results.rateOfClimb < 400 ? "warn" : "default"} />
            </div>

            {/* Takeoff Visualization */}
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Takeoff profile
              </h3>
              <div className="rounded-lg overflow-hidden border border-slate-800">
                <TakeoffVisualization
                  results={results}
                  runwayLength={runwayVal}
                  obstacleHeight={obstacleVal}
                />
              </div>
            </div>

            {/* V-Speeds */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  V-speeds <span className="font-normal text-slate-600">IAS</span>
                </h3>
                {aircraft?.usesMPH && (
                  <div className="inline-flex overflow-hidden rounded-md border border-slate-700 text-[11px] font-semibold">
                    {(["mph", "kt"] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setSpeedUnit(unit)}
                        className={`px-2.5 py-1 cursor-pointer transition-colors ${
                          speedUnit === unit ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {unit === "mph" ? "MPH" : "KT"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-slate-800 bg-slate-800">
                <StatTile label="VS1" value={String(Math.round(fromKnots(results.vSpeeds.vs1IAS, speedUnit)))} unit={speedUnit} />
                <StatTile label="VR" value={String(Math.round(fromKnots(results.vSpeeds.vrIAS, speedUnit)))} unit={speedUnit} />
                <StatTile label="VX" value={String(Math.round(fromKnots(results.vSpeeds.vxIAS, speedUnit)))} unit={speedUnit} />
                <StatTile label="VY" value={String(Math.round(fromKnots(results.vSpeeds.vyIAS, speedUnit)))} unit={speedUnit} />
              </div>
            </div>

            </>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && !results && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
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
            </div>
          </div>
        </div>
      </div>

      {/* Aircraft Selector Modal */}
      <AircraftSelectorModal
        isOpen={isAircraftModalOpen}
        onClose={() => setIsAircraftModalOpen(false)}
        onApply={setAircraft}
        initialAircraft={aircraft || undefined}
      />
    </div>
  );
}
