"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PageLayout } from "../../components/PageLayout";
import { Footer } from "../../components/Footer";
import { CalculatorPageHeader } from "../../components/CalculatorPageHeader";
import {
  getFlightPlanById,
  removeLeg,
  type FlightPlan,
  type FlightPlanLeg,
} from "@/lib/flightPlanStorage";
import {
  calculateLegResults,
  calculateLegWaypoints,
  formatHoursToTime,
  formatTimeHHMM,
  formatFuel,
  detectAlternativeLegs,
  calculateMainRouteTotals,
  calculateTotalFuelWithAlternatives,
  type LegCalculatedResults,
} from "@/lib/flightPlanCalculations";
import { FuelUnit, getFuelResultUnit } from "@/lib/fuelConversion";
import { generateShareUrl } from "@/lib/flightPlanSharing";
import { Tooltip } from "@/app/components/Tooltip";
import {
  ArrowLeftIcon,
  TrashIcon,
  PencilIcon,
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  ShareIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { compressForUrl } from "@/lib/urlCompression";

interface FlightPlanDetailClientProps {
  flightPlanId: string;
}

export function FlightPlanDetailClient({
  flightPlanId,
}: FlightPlanDetailClientProps) {
  const [flightPlan, setFlightPlan] = useState<FlightPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareSuccess, setShareSuccess] = useState(false);

  useEffect(() => {
    const plan = getFlightPlanById(flightPlanId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlightPlan(plan);
    setLoading(false);
  }, [flightPlanId]);

  // Calculate results for all legs
  const legResults = useMemo(() => {
    if (!flightPlan) return new Map<string, LegCalculatedResults>();

    const results = new Map<string, LegCalculatedResults>();
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

  // Calculate totals for main route (excluding alternatives)
  const mainRouteTotals = useMemo(() => {
    if (!flightPlan || flightPlan.legs.length === 0) {
      return { distance: 0, time: 0, fuel: 0, eta: null };
    }

    return calculateMainRouteTotals(flightPlan.legs, legResults, alternativeLegs);
  }, [flightPlan, legResults, alternativeLegs]);

  // Calculate total fuel including alternatives
  const totalFuel = useMemo(() => {
    if (!flightPlan || flightPlan.legs.length === 0) {
      return 0;
    }

    return calculateTotalFuelWithAlternatives(flightPlan.legs, legResults);
  }, [flightPlan, legResults]);

  // Check if there are any alternative legs
  const hasAlternatives = alternativeLegs.size > 0;

  const handleDeleteLeg = (leg: FlightPlanLeg) => {
    if (!flightPlan) return;

    const legLabel = leg.desc || `Leg ${leg.index + 1}`;
    if (
      confirm(
        `Are you sure you want to delete "${legLabel}"? This cannot be undone.`
      )
    ) {
      const updatedPlan = removeLeg(flightPlan.id, leg.id);
      if (updatedPlan) {
        setFlightPlan(updatedPlan);
      }
    }
  };

  const handleShare = async () => {
    if (!flightPlan) return;

    try {
      const shareUrl = generateShareUrl(flightPlan);

      // Try to use Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: `Flight Plan: ${flightPlan.name}`,
          text: `Check out this flight plan with ${flightPlan.legs.length} leg${flightPlan.legs.length !== 1 ? "s" : ""}`,
          url: shareUrl,
        });
      } else {
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(shareUrl);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      }
    } catch (error) {
      // User cancelled share or clipboard failed
      console.error("Share failed:", error);
    }
  };

  const buildLegUrl = (leg: FlightPlanLeg) => {
    const params = new URLSearchParams();
    params.set("th", leg.th.toString());
    params.set("tas", leg.tas.toString());
    if (leg.wd !== undefined) params.set("wd", leg.wd.toString());
    if (leg.ws !== undefined) params.set("ws", leg.ws.toString());
    params.set("md", leg.md.toString());
    params.set("dist", leg.dist.toString());
    params.set("ff", leg.ff.toString());
    params.set("funit", leg.fuelUnit);
    params.set("unit", leg.unit);
    if (leg.plane) params.set("plane", leg.plane);
    if (leg.desc) params.set("desc", leg.desc);
    if (leg.depTime) params.set("depTime", leg.depTime);
    if (leg.elapsedMin !== undefined) params.set("elapsedMin", leg.elapsedMin.toString());
    if (leg.prevFuel !== undefined) params.set("prevFuel", leg.prevFuel.toString());
    if (leg.climbTas !== undefined) params.set("climbTas", leg.climbTas.toString());
    if (leg.climbDist !== undefined) params.set("climbDist", leg.climbDist.toString());
    if (leg.climbFuel !== undefined) params.set("climbFuel", leg.climbFuel.toString());
    if (leg.climbWd !== undefined) params.set("cwd", leg.climbWd.toString());
    if (leg.climbWs !== undefined) params.set("cws", leg.climbWs.toString());
    if (leg.descentTas !== undefined) params.set("descentTas", leg.descentTas.toString());
    if (leg.descentDist !== undefined) params.set("descentDist", leg.descentDist.toString());
    if (leg.descentFuel !== undefined) params.set("descentFuel", leg.descentFuel.toString());
    if (leg.descentWd !== undefined) params.set("dwd", leg.descentWd.toString());
    if (leg.descentWs !== undefined) params.set("dws", leg.descentWs.toString());
    if (leg.additionalFuel !== undefined) params.set("af", leg.additionalFuel.toString());
    if (leg.approachLandingFuel !== undefined) params.set("alf", leg.approachLandingFuel.toString());
    if (leg.waypoints && leg.waypoints.length > 0) {
      // Compress waypoints if needed
      const compressed = compressForUrl(leg.waypoints);
      if (compressed) params.set("waypoints", compressed);
    }
    // Add flight plan context
    params.set("fp", flightPlan!.id);
    params.set("lid", leg.id);

    return `/leg?${params.toString()}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatETA = (eta: string) => {
    // Convert HHMM to HH:MM
    if (eta.length === 4) {
      return `${eta.substring(0, 2)}:${eta.substring(2, 4)}`;
    }
    return eta;
  };

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
        <Footer description="Flight plan details and legs" />
      </PageLayout>
    );
  }

  return (
    <PageLayout currentPage="flight-plans">
      <CalculatorPageHeader
        title={flightPlan.name}
        description={`Flight plan with ${flightPlan.legs.length} leg${flightPlan.legs.length !== 1 ? "s" : ""}`}
      />

      <main className="w-full max-w-4xl">
        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">
          {/* Header */}
          <div className="mb-6 pb-6 border-b border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <Link
                  href="/flight-plans"
                  className="inline-flex items-center gap-2 text-sm mb-3 hover:text-blue-400 transition-colors"
                  style={{ color: "oklch(0.6 0.02 240)" }}
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back to Flight Plans
                </Link>
                <h2
                  className="text-xl sm:text-2xl font-bold"
                  style={{ color: "white" }}
                >
                  {flightPlan.name}
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
                  title="Share flight plan"
                >
                  {shareSuccess ? (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Copied!</span>
                    </>
                  ) : (
                    <>
                      <ShareIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Share</span>
                    </>
                  )}
                </button>
                <Link
                  href={`/leg?fp=${flightPlan.id}`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Leg
                </Link>
              </div>
            </div>

            {/* Metadata */}
            <div
              className="text-sm space-y-1"
              style={{ color: "oklch(0.6 0.02 240)" }}
            >
              {flightPlan.date && (
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  <span>Flight Date: {flightPlan.date}</span>
                </div>
              )}
              {flightPlan.legs.length > 0 && flightPlan.legs[0].depTime && (
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-4 h-4" />
                  <span>
                    Departure Time: {flightPlan.legs[0].depTime.substring(0, 2)}:
                    {flightPlan.legs[0].depTime.substring(2, 4)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4" />
                <span>
                  Last Updated: {formatDate(flightPlan.updated_at)} at{" "}
                  {formatTime(flightPlan.updated_at)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4" />
                <span>
                  Created: {formatDate(flightPlan.created_at)} at{" "}
                  {formatTime(flightPlan.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Legs List */}
          {flightPlan.legs.length === 0 ? (
            <div className="text-center py-12">
              <div
                className="text-5xl mb-4"
                style={{ color: "oklch(0.5 0.02 240)" }}
              >
                ✈️
              </div>
              <p
                className="text-lg mb-2"
                style={{ color: "oklch(0.7 0.02 240)" }}
              >
                No legs in this flight plan yet
              </p>
              <p
                className="text-sm mb-6"
                style={{ color: "oklch(0.6 0.02 240)" }}
              >
                Click &quot;Add Leg&quot; above to create your first leg
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Flight Plan Totals */}
              {mainRouteTotals.distance > 0 && (
                <div className="bg-linear-to-r from-amber-900/40 via-orange-900/30 to-amber-900/40 border-2 border-amber-500/40 rounded-2xl p-5 shadow-lg">
                  <h3
                    className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2"
                    style={{ color: "oklch(0.8 0.15 60)" }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Flight Plan Summary
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-slate-900/40 rounded-xl border border-amber-500/20">
                      <div className="text-xs font-semibold uppercase tracking-wide mb-1 flex items-center justify-center" style={{ color: "oklch(0.7 0.1 60)" }}>
                        Total Distance
                        <span className="print:hidden">
                          <Tooltip content={`Total distance for ${hasAlternatives ? 'the main route' : 'all legs'} in nautical miles`} />
                        </span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: "oklch(0.9 0.18 60)" }}>
                        {mainRouteTotals.distance.toFixed(1)}
                      </div>
                      <div className="text-xs" style={{ color: "oklch(0.65 0.08 60)" }}>
                        Nautical Miles
                      </div>
                    </div>
                    <div className="text-center p-3 bg-slate-900/40 rounded-xl border border-amber-500/20">
                      <div className="text-xs font-semibold uppercase tracking-wide mb-1 flex items-center justify-center" style={{ color: "oklch(0.7 0.1 60)" }}>
                        Total Fuel
                        <span className="print:hidden">
                          <Tooltip content="Total fuel consumption for all legs, including alternative routes" />
                        </span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: "oklch(0.9 0.18 60)" }}>
                        {totalFuel.toFixed(1)}
                      </div>
                      <div className="text-xs" style={{ color: "oklch(0.65 0.08 60)" }}>
                        {getFuelResultUnit(flightPlan.legs[0]?.fuelUnit as FuelUnit || 'gph')}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-slate-900/40 rounded-xl border border-amber-500/20">
                      <div className="text-xs font-semibold uppercase tracking-wide mb-1 flex items-center justify-center" style={{ color: "oklch(0.7 0.1 60)" }}>
                        Total Time
                        <span className="print:hidden">
                          <Tooltip content={`Total flight time for ${hasAlternatives ? 'the main route' : 'all legs'}, excluding alternative routes`} />
                        </span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: "oklch(0.9 0.18 60)" }}>
                        {formatHoursToTime(mainRouteTotals.time)}
                      </div>
                      <div className="text-xs" style={{ color: "oklch(0.65 0.08 60)" }}>
                        Flight Duration
                      </div>
                    </div>
                    {mainRouteTotals.eta && (
                      <div className="text-center p-3 bg-slate-900/40 rounded-xl border border-amber-500/20">
                        <div className="text-xs font-semibold uppercase tracking-wide mb-1 flex items-center justify-center" style={{ color: "oklch(0.7 0.1 60)" }}>
                          {hasAlternatives ? "ETA to Main" : "ETA"}
                          <span className="print:hidden">
                            <Tooltip content={`Estimated time of arrival ${hasAlternatives ? 'to the main destination' : 'for the flight'}. Alternative routes have separate ETAs`} />
                          </span>
                        </div>
                        <div className="text-2xl font-bold" style={{ color: "oklch(0.9 0.18 60)" }}>
                          {formatTimeHHMM(mainRouteTotals.eta)}
                        </div>
                        <div className="text-xs" style={{ color: "oklch(0.65 0.08 60)" }}>
                          Arrival Time
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <h3
                className="text-sm font-semibold uppercase tracking-wide mb-3"
                style={{ color: "oklch(0.65 0.15 230)" }}
              >
                Flight Legs ({flightPlan.legs.length})
              </h3>
              {flightPlan.legs.map((leg, index) => {
                const result = legResults.get(leg.id);
                const waypointResults = result ? calculateLegWaypoints(leg, result) : [];
                const isAlternative = alternativeLegs.has(leg.id);
                return (
                  <div
                    key={leg.id}
                    className={`bg-linear-to-br from-slate-900/80 to-slate-800/60 border-2 rounded-2xl p-3 sm:p-5 hover:shadow-lg transition-all ${
                      isAlternative
                        ? "border-orange-500/40 hover:border-orange-400/60 hover:shadow-orange-500/10"
                        : "border-sky-500/30 hover:border-sky-400/50 hover:shadow-sky-500/10"
                    }`}
                  >
                    {/* Header with Actions */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold text-lg text-white shadow-lg shrink-0 ${
                          isAlternative
                            ? "bg-linear-to-br from-orange-500 to-amber-600"
                            : "bg-linear-to-br from-sky-500 to-blue-600"
                        }`}>
                          {index + 1}
                        </div>
                        {leg.desc && (
                          <span className="text-lg font-semibold text-white truncate">
                            {leg.desc}
                          </span>
                        )}
                        {isAlternative && (
                          <span
                            className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border-2 shrink-0 print:hidden"
                            style={{
                              backgroundColor: "oklch(0.45 0.15 60 / 0.3)",
                              borderColor: "oklch(0.7 0.18 60)",
                              color: "oklch(0.85 0.18 60)"
                            }}
                          >
                            Alternative
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 shrink-0">
                        <Link
                          href={buildLegUrl(leg)}
                          className="p-2.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 hover:text-blue-200 rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/20 border border-blue-500/30"
                          title="Edit leg"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => handleDeleteLeg(leg)}
                          className="p-2.5 bg-red-600/30 hover:bg-red-600/50 text-red-300 hover:text-red-200 rounded-xl transition-all hover:shadow-lg hover:shadow-red-500/20 border border-red-500/30 cursor-pointer"
                          title="Delete leg"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Leg Content */}
                    <div>

                        {/* Flight Parameters & Results Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                          {/* Input Parameters */}
                          <div className="bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-700/50">
                            <div
                              className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
                              style={{ color: "oklch(0.75 0.15 230)" }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              Flight Parameters
                            </div>
                            <div className="space-y-2">
                              {result?.startTime && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm" style={{ color: "oklch(0.65 0.05 240)" }}>Start Time</span>
                                  <span className="text-base font-bold" style={{ color: "oklch(0.85 0.15 230)" }}>
                                    {formatTimeHHMM(result.startTime)}
                                  </span>
                                </div>
                              )}
                              {leg.prevFuel !== undefined && leg.prevFuel > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm" style={{ color: "oklch(0.65 0.05 240)" }}>Fuel Used Before</span>
                                  <span className="text-base font-bold" style={{ color: "oklch(0.85 0.15 230)" }}>
                                    {formatFuel(leg.prevFuel, leg.fuelUnit)}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between items-center">
                                <span className="text-sm" style={{ color: "oklch(0.65 0.05 240)" }}>True Heading</span>
                                <span className="text-base font-bold" style={{ color: "oklch(0.85 0.15 230)" }}>
                                  {leg.th}°
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm" style={{ color: "oklch(0.65 0.05 240)" }}>True Airspeed</span>
                                <span className="text-base font-bold" style={{ color: "oklch(0.85 0.15 230)" }}>
                                  {leg.tas} {leg.unit.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm" style={{ color: "oklch(0.65 0.05 240)" }}>Distance</span>
                                <span className="text-base font-bold" style={{ color: "oklch(0.85 0.15 230)" }}>
                                  {leg.dist} NM
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm" style={{ color: "oklch(0.65 0.05 240)" }}>Fuel Flow</span>
                                <span className="text-base font-bold" style={{ color: "oklch(0.85 0.15 230)" }}>
                                  {leg.ff} {leg.fuelUnit.toUpperCase()}
                                </span>
                              </div>
                              {typeof leg.wd !== 'undefined' && typeof leg.ws !== 'undefined' ? (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm" style={{ color: "oklch(0.65 0.05 240)" }}>Wind</span>
                                  <span className="text-base font-bold" style={{ color: "oklch(0.85 0.15 230)" }}>
                                    {leg.wd.toString().padStart(3, '0')}° @ {leg.ws} KT
                                  </span>
                                </div>
                              ) : <></>}
                              {leg.additionalFuel !== undefined && leg.additionalFuel > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm" style={{ color: "oklch(0.65 0.05 240)" }}>Reserve Time</span>
                                  <span className="text-base font-bold" style={{ color: "oklch(0.85 0.15 230)" }}>
                                    {leg.additionalFuel} min
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Calculated Results */}
                          {result && (
                            <div className="bg-linear-to-br from-emerald-900/30 to-emerald-800/20 rounded-xl p-3 sm:p-4 border border-emerald-500/30">
                              <div
                                className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
                                style={{ color: "oklch(0.75 0.15 160)" }}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Calculated Results
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm" style={{ color: "oklch(0.7 0.08 160)" }}>Ground Speed</span>
                                  <span className="text-base font-bold" style={{ color: "oklch(0.85 0.15 160)" }}>
                                    {result.groundSpeed.toFixed(1)} KT
                                  </span>
                                </div>
                                {result.compassCourse !== null && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm" style={{ color: "oklch(0.7 0.08 160)" }}>Compass Course</span>
                                    <span className="text-base font-bold" style={{ color: "oklch(0.85 0.15 160)" }}>
                                      {result.compassCourse.toFixed(0).padStart(3, "0")}°
                                    </span>
                                  </div>
                                )}
                                {result.climbTime !== null && result.climbTime > 0 && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm" style={{ color: "oklch(0.7 0.08 160)" }}>Climb Time</span>
                                    <span className="text-base font-bold" style={{ color: "oklch(0.85 0.15 160)" }}>
                                      {formatHoursToTime(result.climbTime)}
                                    </span>
                                  </div>
                                )}
                                {result.cruiseTime !== null && result.cruiseTime > 0 && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm" style={{ color: "oklch(0.7 0.08 160)" }}>Cruise Time</span>
                                    <span className="text-base font-bold" style={{ color: "oklch(0.85 0.15 160)" }}>
                                      {formatHoursToTime(result.cruiseTime)}
                                    </span>
                                  </div>
                                )}
                                {result.descentTime !== null && result.descentTime > 0 && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm" style={{ color: "oklch(0.7 0.08 160)" }}>Descend Time</span>
                                    <span className="text-base font-bold" style={{ color: "oklch(0.85 0.15 160)" }}>
                                      {formatHoursToTime(result.descentTime)}
                                    </span>
                                  </div>
                                )}
                                {leg.additionalFuel !== undefined && leg.additionalFuel > 0 && leg.ff && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm" style={{ color: "oklch(0.7 0.08 160)" }}>Reserve Fuel</span>
                                    <span className="text-base font-bold" style={{ color: "oklch(0.85 0.15 160)" }}>
                                      {formatFuel((leg.additionalFuel / 60) * leg.ff, leg.fuelUnit)}
                                    </span>
                                  </div>
                                )}
                                <div className="h-px bg-emerald-500/30 my-2"></div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-semibold" style={{ color: "oklch(0.75 0.1 160)" }}>Leg Time</span>
                                  <span className="text-lg font-bold" style={{ color: "oklch(0.9 0.18 160)" }}>
                                    {formatHoursToTime(result.legDuration)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-semibold" style={{ color: "oklch(0.75 0.1 160)" }}>Leg Fuel</span>
                                  <span className="text-lg font-bold" style={{ color: "oklch(0.9 0.18 160)" }}>
                                    {formatFuel(result.fuelUsed, leg.fuelUnit)}
                                  </span>
                                </div>
                                <div className="h-px bg-emerald-500/30 my-2"></div>
                                {result.arrivalTime && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold" style={{ color: "oklch(0.75 0.1 160)" }}>
                                      {isAlternative ? "ETA to Alt" : "ETA"}
                                    </span>
                                    <span className="text-lg font-bold" style={{ color: "oklch(0.9 0.18 160)" }}>
                                      {formatTimeHHMM(result.arrivalTime)}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-semibold" style={{ color: "oklch(0.75 0.1 160)" }}>Total to Here</span>
                                  <span className="text-lg font-bold" style={{ color: "oklch(0.9 0.18 160)" }}>
                                    {formatFuel(result.totalFuel, leg.fuelUnit)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Waypoints/Checkpoints */}
                        {waypointResults.length > 0 && (
                          <div className="bg-slate-800/40 rounded-xl p-3 sm:p-4 border border-slate-700/40">
                            <div
                              className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
                              style={{ color: "oklch(0.75 0.15 270)" }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Checkpoints ({waypointResults.length})
                            </div>
                            <div className="space-y-1.5">
                              {waypointResults.map((wp, wpIndex) => (
                                <div
                                  key={wpIndex}
                                  className="flex items-center justify-between py-1.5 px-1 sm:px-2 rounded-lg hover:bg-slate-700/30 transition-colors gap-2"
                                >
                                  <span className="font-semibold text-xs sm:text-sm truncate flex-1 min-w-0" style={{ color: "oklch(0.8 0.12 270)" }}>
                                    {wp.name}
                                  </span>
                                  <div className="flex gap-1.5 sm:gap-3 text-xs font-medium shrink-0" style={{ color: "oklch(0.7 0.05 240)" }}>
                                    <span className="min-w-12 sm:min-w-16 text-right">{wp.distance.toFixed(1)} NM</span>
                                    <span className="min-w-10 sm:min-w-14 text-right">{wp.eta ? formatETA(wp.eta) : "N/A"}</span>
                                    <span className="min-w-12 sm:min-w-16 text-right">
                                      {wp.fuelUsed !== undefined ? formatFuel(wp.fuelUsed, leg.fuelUnit) : "N/A"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer description="Flight plan details and legs" />
    </PageLayout>
  );
}
