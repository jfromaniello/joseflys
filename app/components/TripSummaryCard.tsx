"use client";

import { useState, useMemo, useCallback } from "react";
import { SparklesIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import type { FlightPlan, FlightPlanLeg, LegCalculatedResults } from "@/lib/flightPlan";
import { loadAircraftFromUrl } from "@/lib/aircraftStorage";

interface TripSummaryCardProps {
  flightPlan: FlightPlan;
  legResults: Map<string, LegCalculatedResults>;
  alternativeLegs: Set<string>;
  mainRouteTotals: {
    distance: number;
    time: number;
    fuel: number;
    eta: string | null;
  };
}

/**
 * Generate a simple hash of the flight plan content for cache invalidation
 */
function generateContentHash(plan: FlightPlan, results: Map<string, LegCalculatedResults>): string {
  const content = {
    name: plan.name,
    date: plan.date,
    legs: plan.legs.map((leg) => ({
      th: leg.th,
      tas: leg.tas,
      dist: leg.dist,
      wd: leg.wd,
      ws: leg.ws,
      depTime: leg.depTime,
    })),
    resultsCount: results.size,
  };

  const jsonStr = JSON.stringify(content);
  let hash = 0;
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function TripSummaryCard({
  flightPlan,
  legResults,
  alternativeLegs,
  mainRouteTotals,
}: TripSummaryCardProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Generate content hash for cache key
  const contentHash = useMemo(
    () => generateContentHash(flightPlan, legResults),
    [flightPlan, legResults]
  );

  // Extract aircraft info if available
  const aircraft = useMemo(() => {
    const planeStr = flightPlan.plane || flightPlan.legs[0]?.plane;
    if (!planeStr) return undefined;

    const aircraft = loadAircraftFromUrl(planeStr);
    if (!aircraft) return undefined;

    return {
      name: aircraft.name,
      model: aircraft.model,
    };
  }, [flightPlan]);

  // Build leg summaries for the API
  const legSummaries = useMemo(() => {
    return flightPlan.legs.map((leg: FlightPlanLeg, index: number) => {
      const result = legResults.get(leg.id);
      const isAlternative = alternativeLegs.has(leg.id);

      return {
        index,
        description: leg.desc,
        from: leg.from?.name?.split(",")[0],
        to: leg.to?.name?.split(",")[0],
        checkpoints: leg.checkpoints?.map((cp) => cp.name?.split(",")[0]).filter(Boolean),
        trueCourse: leg.th,
        distance: leg.dist,
        trueAirspeed: leg.tas,
        wind: leg.wd !== undefined && leg.ws !== undefined
          ? { direction: leg.wd, speed: leg.ws }
          : undefined,
        fuelFlow: leg.ff,
        fuelUnit: leg.fuelUnit,
        depTime: leg.depTime,
        groundSpeed: result?.groundSpeed,
        compassCourse: result?.compassCourse,
        legDuration: result?.legDuration,
        fuelUsed: result?.fuelUsed,
        arrivalTime: result?.arrivalTime,
        hasClimb: !!(leg.climbTas && leg.climbDist),
        hasDescent: !!(leg.descentTas && leg.descentDist),
        isAlternative,
      };
    });
  }, [flightPlan.legs, legResults, alternativeLegs]);

  // Determine fuel unit from first leg
  const fuelUnit = useMemo(() => {
    const unit = flightPlan.legs[0]?.fuelUnit || "gph";
    if (unit === "gph") return "GAL";
    if (unit === "lph") return "L";
    if (unit === "pph") return "lb";
    if (unit === "kgh") return "kg";
    return unit.toUpperCase();
  }, [flightPlan.legs]);

  const fetchSummary = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setError(null);
    setIsExpanded(true);

    try {
      const response = await fetch("/api/trip-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tripId: flightPlan.id,
          contentHash,
          trip: {
            name: flightPlan.name,
            date: flightPlan.date,
            cruiseAltitude: flightPlan.cruiseAltitude,
            cruisePower: flightPlan.cruisePower,
            departure: flightPlan.departure || flightPlan.legs[0]?.from,
            destination: flightPlan.destination || flightPlan.legs[flightPlan.legs.length - 1]?.to,
            alternate: flightPlan.alternate,
          },
          aircraft,
          legs: legSummaries,
          totals: {
            distance: mainRouteTotals.distance,
            time: mainRouteTotals.time,
            fuel: mainRouteTotals.fuel,
            fuelUnit,
            eta: mainRouteTotals.eta,
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 503) {
          setError("AI summary not available");
        } else if (response.status === 429) {
          setError("Too many requests. Please try again in a minute.");
        } else {
          setError("Failed to generate summary");
        }
        return;
      }

      const data = await response.json();
      setSummary(data.summary);
      setGeneratedAt(data.generatedAt);
      setCached(data.cached);
    } catch (err) {
      console.error("Failed to fetch trip summary:", err);
      setError("Failed to load summary");
    } finally {
      setLoading(false);
    }
  }, [flightPlan, contentHash, aircraft, legSummaries, mainRouteTotals, fuelUnit, loading]);

  const handleToggle = () => {
    if (!summary && !loading && !error) {
      // First click - generate the briefing
      fetchSummary();
    } else {
      // Toggle expand/collapse
      setIsExpanded(!isExpanded);
    }
  };

  // Don't render if there are no legs
  if (flightPlan.legs.length === 0) {
    return null;
  }

  // Check if we have wind data in any leg
  const hasWindData = flightPlan.legs.some(leg => leg.wd !== undefined && leg.ws !== undefined);

  // Don't show the card at all if there's no wind data (briefing won't be useful)
  if (!hasWindData) {
    return null;
  }

  const hasContent = summary || loading || error;

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-sm rounded-xl border border-purple-500/30 mb-6 print:hidden overflow-hidden">
      {/* Header / Button */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-2 p-4 hover:bg-purple-500/10 transition-colors cursor-pointer"
      >
        <SparklesIcon className="w-5 h-5 text-purple-400" />
        <span className="text-base font-semibold text-white">
          {hasContent ? "AI Flight Briefing" : "Generate AI Briefing"}
        </span>
        {cached && (
          <span className="text-xs text-purple-400/60 ml-2">cached</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {!hasContent && (
            <span className="text-xs text-purple-400/70">Click to generate</span>
          )}
          {hasContent && (
            isExpanded ? (
              <ChevronUpIcon className="w-5 h-5 text-purple-400" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-purple-400" />
            )
          )}
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-purple-500/20">
          {loading ? (
            <div className="flex items-center gap-3 py-4">
              <div className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
              <span className="text-purple-300/70">Generating briefing...</span>
            </div>
          ) : error ? (
            <div className="py-4">
              <div className="text-red-400/70">{error}</div>
              {error !== "AI summary not available" && (
                <button
                  onClick={fetchSummary}
                  className="mt-3 text-sm text-purple-400 hover:text-purple-300 underline cursor-pointer"
                >
                  Try again
                </button>
              )}
            </div>
          ) : summary ? (
            <div className="space-y-3">
              {/* Render markdown-like content */}
              <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                {summary.split("\n").map((line, i) => {
                  // Bold headers (full line)
                  if (line.startsWith("**") && line.endsWith("**")) {
                    return (
                      <p key={i} className="font-semibold text-purple-300 mt-3 first:mt-0">
                        {line.replace(/\*\*/g, "")}
                      </p>
                    );
                  }
                  // Inline bold
                  if (line.includes("**")) {
                    const parts = line.split("**");
                    return (
                      <p key={i} className="mt-2 first:mt-0">
                        {parts.map((part, j) =>
                          j % 2 === 1 ? (
                            <span key={j} className="font-semibold text-purple-300">
                              {part}
                            </span>
                          ) : (
                            <span key={j}>{part}</span>
                          )
                        )}
                      </p>
                    );
                  }
                  // Regular lines
                  if (line.trim()) {
                    return (
                      <p key={i} className="mt-1 first:mt-0">
                        {line}
                      </p>
                    );
                  }
                  return null;
                })}
              </div>

              {/* Generated at */}
              {generatedAt && (
                <div className="text-xs text-purple-400/50 text-right pt-2 border-t border-purple-500/20">
                  Generated {new Date(generatedAt).toLocaleTimeString()}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
