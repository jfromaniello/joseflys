"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { PageLayout } from "../../../components/PageLayout";
import { Footer } from "../../../components/Footer";
import { CalculatorPageHeader } from "../../../components/CalculatorPageHeader";
import { ShareButtonSimple } from "../../../components/ShareButtonSimple";
import { getFlightPlanById, type FlightPlan } from "@/lib/flightPlan/flightPlanStorage";
import { calculateLegResults, calculateLegWaypoints, detectAlternativeLegs } from "@/lib/flightPlan/flightPlanCalculations";
import { validateUTMRoute, type UTMValidationResult, type Location } from "@/lib/utmValidation";
import { getFuelResultUnit, type FuelUnit } from "@/lib/fuelConversion";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import type { LocalChartMapHandle } from "../../../local-chart/LocalChartMap";

// Dynamic import for LocalChartMap to avoid SSR issues with Leaflet
const LocalChartMap = dynamic(
  () => import("../../../local-chart/LocalChartMap").then((mod) => mod.LocalChartMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-96 rounded-xl bg-slate-800/50 border-2 border-gray-700 flex items-center justify-center">
        <p className="text-gray-400">Loading map...</p>
      </div>
    ),
  }
);

interface LocationData {
  name: string;
  lat: number;
  lon: number;
  isFlyOver?: boolean;
  distance?: number; // Cumulative NM from start
  cumulativeTime?: number; // Cumulative time in minutes from start
}

interface RouteSegment {
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  isAlternative: boolean;
  groundSpeed?: number; // knots
  // Leg info for labels
  trueCourse?: number;
  magneticHeading?: number;
  climbMagneticHeading?: number;
  descentMagneticHeading?: number;
  distance?: number;
  fuelRemaining?: number;
  fuelUnit?: string;
}

type MapMode = "utm" | "mercator";

interface FlightPlanMapClientProps {
  flightPlanId: string;
}

// Format cumulative time: "[X h] Y min" without zero padding
function formatCumulativeTime(minutes?: number): string | null {
  if (minutes === undefined || minutes === null) return null;

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours > 0) {
    return `${hours} h ${mins} min`;
  } else {
    return `${mins} min`;
  }
}

export function FlightPlanMapClient({ flightPlanId }: FlightPlanMapClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [flightPlan, setFlightPlan] = useState<FlightPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<LocalChartMapHandle>(null);

  // Initialize state from URL query params (or defaults)
  const [mapMode, setMapMode] = useState<MapMode>(
    (searchParams.get("mode") as MapMode) || "utm"
  );
  const [printScale, setPrintScale] = useState<number>(
    parseInt(searchParams.get("scale") || "1000000")
  );
  const [tickIntervalNM, setTickIntervalNM] = useState<number>(
    parseInt(searchParams.get("distTick") || "10")
  );
  const [timeTickIntervalMin, setTimeTickIntervalMin] = useState<number>(
    parseInt(searchParams.get("timeTick") || "0")
  );

  // Load from localStorage after hydration
  useEffect(() => {
    const plan = getFlightPlanById(flightPlanId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlightPlan(plan);
    setLoading(false);
  }, [flightPlanId]);

  // Update URL when settings change
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("mode", mapMode);
    params.set("scale", printScale.toString());
    params.set("distTick", tickIntervalNM.toString());
    params.set("timeTick", timeTickIntervalMin.toString());

    router.replace(`/flight-plans/${flightPlanId}/map?${params.toString()}`, { scroll: false });
  }, [mapMode, printScale, tickIntervalNM, timeTickIntervalMin, flightPlanId, router]);

  // Calculate leg results for all legs (same as FlightPlanDetailClient)
  const legResults = useMemo(() => {
    if (!flightPlan) return new Map<string, ReturnType<typeof calculateLegResults>>();

    const results = new Map<string, ReturnType<typeof calculateLegResults>>();
    flightPlan.legs.forEach((leg) => {
      const result = calculateLegResults(leg);
      if (result) {
        results.set(leg.id, result);
      }
    });
    return results;
  }, [flightPlan]);

  // Detect alternative legs
  const alternativeLegs = useMemo(() => {
    if (!flightPlan) return new Set<string>();
    return detectAlternativeLegs(flightPlan.legs);
  }, [flightPlan]);

  // Extract route segments (for drawing lines with different colors for alternatives)
  const routeSegments = useMemo<RouteSegment[]>(() => {
    if (!flightPlan || flightPlan.legs.length === 0) return [];

    // Find total fuel needed (from last leg)
    const lastLeg = flightPlan.legs[flightPlan.legs.length - 1];
    const lastLegResult = legResults.get(lastLeg.id);
    const totalFuelNeeded = lastLegResult?.totalFuel || 0;

    const segments: RouteSegment[] = [];

    flightPlan.legs.forEach((leg) => {
      if (!leg.from?.lat || !leg.from?.lon || !leg.to?.lat || !leg.to?.lon) return;

      const isAlternative = alternativeLegs.has(leg.id);
      const legResult = legResults.get(leg.id);

      // Calculate fuel remaining after this leg
      // Remaining = Total needed - Fuel consumed up to this leg
      const fuelRemaining = totalFuelNeeded - (legResult?.totalFuel || 0);

      segments.push({
        fromLat: leg.from.lat,
        fromLon: leg.from.lon,
        toLat: leg.to.lat,
        toLon: leg.to.lon,
        isAlternative,
        groundSpeed: legResult?.groundSpeed,
        trueCourse: leg.th, // True course from leg data
        magneticHeading: legResult?.compassCourse ?? undefined, // Use compass course if available, otherwise magnetic heading
        climbMagneticHeading: leg.climbTas ? (legResult?.compassCourse ?? undefined) : undefined, // If there's climb data
        descentMagneticHeading: leg.descentTas ? (legResult?.compassCourse ?? undefined) : undefined, // If there's descent data
        distance: leg.dist,
        fuelRemaining: fuelRemaining > 0 ? fuelRemaining : 0,
        fuelUnit: getFuelResultUnit((leg.fuelUnit || "gph") as FuelUnit),
      });
    });

    return segments;
  }, [flightPlan, alternativeLegs, legResults]);

  // Extract locations from flight plan legs with cumulative distances
  const locations = useMemo<LocationData[]>(() => {
    if (!flightPlan || flightPlan.legs.length === 0) return [];

    const locs: LocationData[] = [];
    const seen = new Set<string>();

    flightPlan.legs.forEach((leg) => {
      const legResult = legResults.get(leg.id);
      if (!legResult) return;

      const startDistance = legResult.totalDistance - leg.dist;
      const startTime = legResult.totalTime - legResult.legDuration; // Time in hours at start of leg

      // Add "from" location if it exists and hasn't been added (route waypoint)
      if (leg.from && leg.from.lat !== undefined && leg.from.lon !== undefined) {
        const key = `${leg.from.lat},${leg.from.lon}`;
        if (!seen.has(key)) {
          locs.push({
            name: leg.from.name,
            lat: leg.from.lat,
            lon: leg.from.lon,
            isFlyOver: false, // Part of the route
            distance: startDistance, // Distance at start of this leg
            cumulativeTime: startTime * 60, // Convert hours to minutes
          });
          seen.add(key);
        }
      }

      // Add all checkpoints as fly-over reference points with their cumulative distances
      if (leg.checkpoints && leg.checkpoints.length > 0) {
        const waypointResults = calculateLegWaypoints(leg, legResult);

        leg.checkpoints.forEach((cp) => {
          if (cp.lat !== undefined && cp.lon !== undefined) {
            const key = `${cp.lat},${cp.lon}`;
            if (!seen.has(key)) {
              // Find matching waypoint result for this checkpoint
              const waypointResult = waypointResults.find(wp => wp.name === cp.name);
              const checkpointDistance = waypointResult?.distance;
              const checkpointTime = waypointResult?.cumulativeTime; // Already in minutes

              locs.push({
                name: cp.name,
                lat: cp.lat,
                lon: cp.lon,
                isFlyOver: true, // Visual reference only
                distance: checkpointDistance, // Checkpoint's cumulative distance
                cumulativeTime: checkpointTime, // Checkpoint's cumulative time in minutes
              });
              seen.add(key);
            }
          }
        });
      }

      // Add "to" location if it exists and hasn't been added (route waypoint)
      if (leg.to && leg.to.lat !== undefined && leg.to.lon !== undefined) {
        const key = `${leg.to.lat},${leg.to.lon}`;
        if (!seen.has(key)) {
          locs.push({
            name: leg.to.name,
            lat: leg.to.lat,
            lon: leg.to.lon,
            isFlyOver: false, // Part of the route
            distance: legResult.totalDistance, // Distance at end of this leg
            cumulativeTime: legResult.totalTime * 60, // Convert hours to minutes
          });
          seen.add(key);
        }
      }
    });

    return locs;
  }, [flightPlan, legResults]);

  // Calculate UTM zone for the first location
  const utmInfo = useMemo(() => {
    if (locations.length === 0) return null;

    const firstLoc = locations[0];
    const zone = Math.floor((firstLoc.lon + 180) / 6) + 1;
    const hemisphere = firstLoc.lat >= 0 ? "N" : "S";

    return { zone, hemisphere };
  }, [locations]);

  // Validate UTM when locations change
  const utmValidation = useMemo<UTMValidationResult | null>(() => {
    if (locations.length === 0) return null;

    const allLocations: Location[] = locations.map((loc) => ({
      lat: loc.lat,
      lon: loc.lon,
    }));

    return validateUTMRoute(allLocations);
  }, [locations]);

  if (loading) {
    return (
      <PageLayout currentPage="flight-plans">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-slate-400 text-lg">Loading...</div>
        </div>
      </PageLayout>
    );
  }

  if (!flightPlan) {
    return (
      <PageLayout currentPage="flight-plans">
        <CalculatorPageHeader
          title="Flight Plan Not Found"
          description="The requested flight plan could not be found"
        />
        <main className="w-full max-w-4xl">
          <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700 text-center">
            <p className="text-lg mb-4" style={{ color: "oklch(0.7 0.02 240)" }}>
              This flight plan may have been deleted or doesn&apos;t exist.
            </p>
            <Link
              href="/flight-plans"
              className="inline-flex px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors items-center gap-2"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              Back to Flight Plans
            </Link>
          </div>
        </main>
        <Footer description="Flight plan map view" />
      </PageLayout>
    );
  }

  if (locations.length === 0) {
    return (
      <PageLayout currentPage="flight-plans">
        <CalculatorPageHeader
          title={`${flightPlan.name} - Map`}
          description="No waypoints to display on map"
        />
        <main className="w-full max-w-4xl">
          <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">
            <Link
              href={`/flight-plans/${flightPlanId}`}
              className="inline-flex items-center gap-2 text-sm mb-6 hover:text-blue-400 transition-colors cursor-pointer"
              style={{ color: "oklch(0.6 0.02 240)" }}
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Flight Plan
            </Link>

            <div className="text-center py-12">
              <p className="text-lg mb-2" style={{ color: "oklch(0.7 0.02 240)" }}>
                This flight plan has no waypoints with coordinates to display on the map.
              </p>
            </div>
          </div>
        </main>
        <Footer description="Flight plan map view" />
      </PageLayout>
    );
  }

  return (
    <PageLayout currentPage="flight-plans">
      <CalculatorPageHeader
        title={`${flightPlan.name} - Map`}
        description={`Flight plan route with ${locations.length} waypoint${locations.length !== 1 ? "s" : ""}`}
      />

      <main className="w-full max-w-4xl print-hide-footer">
        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">
          {/* Back button */}
          <Link
            href={`/flight-plans/${flightPlanId}`}
            className="inline-flex items-center gap-2 text-sm mb-6 hover:text-blue-400 transition-colors cursor-pointer print:hidden"
            style={{ color: "oklch(0.6 0.02 240)" }}
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Flight Plan
          </Link>

          {/* Waypoint List */}
          <div className="mb-6 p-4 rounded-xl bg-slate-900/30 border border-gray-700 print:mb-3 print:p-3">
            <h3
              className="text-sm font-semibold uppercase tracking-wide mb-3 print:mb-2"
              style={{ color: "oklch(0.65 0.15 230)" }}
            >
              Route Waypoints ({locations.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
              {locations.map((loc, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border print:p-2 ${
                    loc.isFlyOver
                      ? "bg-purple-900/20 border-purple-500/30"
                      : "bg-slate-800/50 border-slate-700/50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs text-white print:w-5 print:h-5"
                      style={{
                        backgroundColor: loc.isFlyOver ? "#a855f7" : "oklch(0.5 0.15 230)"
                      }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-white truncate block print:text-xs">
                        {loc.name.split(",")[0]}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {loc.distance !== undefined && (
                          <span className="text-xs font-medium text-emerald-400 print:text-[10px]">
                            {loc.distance.toFixed(1)} NM
                          </span>
                        )}
                        {formatCumulativeTime(loc.cumulativeTime) && (
                          <span className="text-xs font-medium text-sky-400 print:text-[10px]">
                            {formatCumulativeTime(loc.cumulativeTime)}
                          </span>
                        )}
                      </div>
                    </div>
                    {loc.isFlyOver && (
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 print:hidden shrink-0">
                        Ref
                      </span>
                    )}
                  </div>
                  <div className="text-xs print:text-[10px]" style={{ color: "oklch(0.6 0.02 240)" }}>
                    {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* UTM Validation Warning */}
          {utmValidation && !utmValidation.isValid && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 print:hidden">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-red-400 mb-1">
                    Route Not Suitable for UTM Projection
                  </p>
                  <p className="text-sm text-red-300 mb-2">
                    {utmValidation.reason}
                  </p>
                  {utmValidation.recommendedAlternative && (
                    <p className="text-sm text-red-200">
                      <span className="font-semibold">Recommendation:</span> {utmValidation.recommendedAlternative}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* UTM Info + Map Mode Toggle */}
          {utmValidation && utmValidation.isValid && (
            <div className="mb-6 space-y-4 print:hidden">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-emerald-400 mb-1">
                      Route Valid for UTM Projection
                    </p>
                    <p className="text-sm text-emerald-200">
                      Zone: {utmValidation.zone}{utmValidation.hemisphere} (EPSG:{utmValidation.epsgCode}) •
                      East-West Span: {Math.round(utmValidation.maxEastWestSpan!)} km
                    </p>
                  </div>
                </div>
              </div>

              {/* Map Mode Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/30 border border-gray-700">
                <div>
                  <p className="text-sm font-semibold text-white mb-1">Map Projection</p>
                  <p className="text-xs text-gray-400">
                    {mapMode === "utm" ? "UTM: Fixed scale for printing" : "Web Mercator: OSM tiles with context"}
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-1">
                  <button
                    onClick={() => setMapMode("utm")}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-all cursor-pointer ${
                      mapMode === "utm"
                        ? "bg-sky-500/20 text-sky-400"
                        : "text-gray-400 hover:text-gray-300"
                    }`}
                  >
                    UTM
                  </button>
                  <button
                    onClick={() => setMapMode("mercator")}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-all cursor-pointer ${
                      mapMode === "mercator"
                        ? "bg-sky-500/20 text-sky-400"
                        : "text-gray-400 hover:text-gray-300"
                    }`}
                  >
                    Mercator
                  </button>
                </div>
              </div>

              {/* Print Scale Selector (only for UTM mode) */}
              {mapMode === "utm" && (
                <>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/30 border border-gray-700">
                    <div>
                      <p className="text-sm font-semibold text-white mb-1">Print Scale</p>
                      <p className="text-xs text-gray-400">
                        Chart scale for printing with plotter/ruler
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-1">
                      <button
                        onClick={() => setPrintScale(500000)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all cursor-pointer ${
                          printScale === 500000
                            ? "bg-sky-500/20 text-sky-400"
                            : "text-gray-400 hover:text-gray-300"
                        }`}
                      >
                        1:500,000
                        <span className="block text-xs opacity-70">Sectional</span>
                      </button>
                      <button
                        onClick={() => setPrintScale(1000000)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all cursor-pointer ${
                          printScale === 1000000
                            ? "bg-sky-500/20 text-sky-400"
                            : "text-gray-400 hover:text-gray-300"
                        }`}
                      >
                        1:1,000,000
                        <span className="block text-xs opacity-70">WAC</span>
                      </button>
                    </div>
                  </div>

                  {/* Distance Tick Marks Interval Selector (only for UTM mode) */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/30 border border-gray-700">
                    <div>
                      <p className="text-sm font-semibold text-white mb-1">Distance Marks</p>
                      <p className="text-xs text-gray-400">
                        Tick mark interval on route lines
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-1">
                      <button
                        onClick={() => setTickIntervalNM(10)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all cursor-pointer ${
                          tickIntervalNM === 10
                            ? "bg-sky-500/20 text-sky-400"
                            : "text-gray-400 hover:text-gray-300"
                        }`}
                      >
                        10 NM
                      </button>
                      <button
                        onClick={() => setTickIntervalNM(50)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all cursor-pointer ${
                          tickIntervalNM === 50
                            ? "bg-sky-500/20 text-sky-400"
                            : "text-gray-400 hover:text-gray-300"
                        }`}
                      >
                        50 NM
                      </button>
                      <button
                        onClick={() => setTickIntervalNM(100)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all cursor-pointer ${
                          tickIntervalNM === 100
                            ? "bg-sky-500/20 text-sky-400"
                            : "text-gray-400 hover:text-gray-300"
                        }`}
                      >
                        100 NM
                      </button>
                    </div>
                  </div>

                  {/* Time Tick Marks Interval Selector (only for UTM mode) */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/30 border border-gray-700">
                    <div>
                      <p className="text-sm font-semibold text-white mb-1">Time Marks</p>
                      <p className="text-xs text-gray-400">
                        Time-based tick marks using ground speed
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-1">
                      <button
                        onClick={() => setTimeTickIntervalMin(0)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all cursor-pointer ${
                          timeTickIntervalMin === 0
                            ? "bg-sky-500/20 text-sky-400"
                            : "text-gray-400 hover:text-gray-300"
                        }`}
                      >
                        Off
                      </button>
                      <button
                        onClick={() => setTimeTickIntervalMin(10)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all cursor-pointer ${
                          timeTickIntervalMin === 10
                            ? "bg-purple-500/20 text-purple-400"
                            : "text-gray-400 hover:text-gray-300"
                        }`}
                      >
                        10 min
                      </button>
                      <button
                        onClick={() => setTimeTickIntervalMin(15)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all cursor-pointer ${
                          timeTickIntervalMin === 15
                            ? "bg-purple-500/20 text-purple-400"
                            : "text-gray-400 hover:text-gray-300"
                        }`}
                      >
                        15 min
                      </button>
                      <button
                        onClick={() => setTimeTickIntervalMin(20)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all cursor-pointer ${
                          timeTickIntervalMin === 20
                            ? "bg-purple-500/20 text-purple-400"
                            : "text-gray-400 hover:text-gray-300"
                        }`}
                      >
                        20 min
                      </button>
                      <button
                        onClick={() => setTimeTickIntervalMin(30)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all cursor-pointer ${
                          timeTickIntervalMin === 30
                            ? "bg-purple-500/20 text-purple-400"
                            : "text-gray-400 hover:text-gray-300"
                        }`}
                      >
                        30 min
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Map */}
          {utmInfo && (
            <div className="mb-6 print:mb-4">
              <LocalChartMap
                ref={mapRef}
                locations={locations}
                routeSegments={routeSegments}
                utmZone={utmInfo.zone}
                hemisphere={utmInfo.hemisphere as "N" | "S"}
                mapMode={utmValidation?.isValid ? mapMode : "mercator"}
                printScale={printScale}
                tickIntervalNM={tickIntervalNM}
                timeTickIntervalMin={timeTickIntervalMin}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 print:hidden">
            <ShareButtonSimple
              shareData={{
                title: `${flightPlan.name} - Map`,
                text: `Flight plan route with ${locations.length} waypoints`,
              }}
            />
            {mapMode === "utm" && utmValidation?.isValid && (
              <button
                onClick={() => mapRef.current?.downloadChart()}
                className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-600 hover:border-gray-500 hover:bg-slate-700/50 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span className="text-sm font-medium">Download Chart</span>
              </button>
            )}
          </div>

          {/* Note */}
          <div className="mt-6 p-4 rounded-xl bg-slate-900/30 border border-gray-700 print:mt-3 print:p-3 print-last-element">
            <p
              className="text-xs sm:text-sm leading-relaxed"
              style={{ color: "oklch(0.6 0.02 240)" }}
            >
              <span className="font-semibold">Note:</span> This map displays all waypoints
              from your flight plan. {utmValidation?.isValid && mapMode === "utm"
                ? "UTM projection provides fixed scale for printing with plotter/ruler. All navigation calculations use WGS-84."
                : "Web Mercator projection uses OpenStreetMap tiles for easy visualization and interaction."}
            </p>
          </div>
        </div>
      </main>

      <Footer description="Flight plan map view with UTM and Mercator projections" />
    </PageLayout>
  );
}
