"use client";

import { useState, useEffect } from "react";
import { PageLayout } from "../components/PageLayout";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { calculateCourse, calculateWaypoints, Waypoint, FlightParameters } from "@/lib/courseCalculations";
import { DeviationEntry } from "../components/CompassDeviationModal";
import { WaypointsModal } from "../components/WaypointsModal";
import { calculateCompassCourse } from "@/lib/compassDeviation";
import { compressForUrl, decompressFromUrl } from "@/lib/urlCompression";
import { CourseSpeedInputs, SpeedUnit } from "./components/CourseSpeedInputs";
import { WindInputs } from "./components/WindInputs";
import { CorrectionsInputs } from "./components/CorrectionsInputs";
import { RangeFuelInputs, FuelUnit } from "./components/RangeFuelInputs";
import { FlightParametersInputs } from "./components/FlightParametersInputs";
import { IntermediateResults } from "./components/IntermediateResults";
import { PrimaryResults } from "./components/PrimaryResults";
import { WaypointsResults } from "./components/WaypointsResults";
import { ShareButton } from "../components/ShareButton";
import { NewLegButton } from "../components/NewLegButton";
import { toKnots } from "@/lib/speedConversion";

interface CourseCalculatorClientProps {
  initialTh: string;
  initialTas: string;
  initialWd: string;
  initialWs: string;
  initialMd: string;
  initialDist: string;
  initialFf: string;
  initialDevTable: string;
  initialDesc: string;
  initialSpeedUnit: string;
  initialFuelUnit: string;
  initialWaypoints: string;
  initialDepTime: string;
  initialElapsedMin: string;
}

export function CourseCalculatorClient({
  initialTh,
  initialTas,
  initialWd,
  initialWs,
  initialMd,
  initialDist,
  initialFf,
  initialDevTable,
  initialDesc,
  initialSpeedUnit,
  initialFuelUnit,
  initialWaypoints,
  initialDepTime,
  initialElapsedMin,
}: CourseCalculatorClientProps) {
  const [trueHeading, setTrueHeading] = useState<string>(initialTh);
  const [tas, setTas] = useState<string>(initialTas);
  const [windDir, setWindDir] = useState<string>(initialWd);
  const [windSpeed, setWindSpeed] = useState<string>(initialWs);
  const [magDev, setMagDev] = useState<string>(initialMd);
  const [distance, setDistance] = useState<string>(initialDist);
  const [fuelFlow, setFuelFlow] = useState<string>(initialFf);
  const [description, setDescription] = useState<string>(initialDesc);
  const [departureTime, setDepartureTime] = useState<string>(initialDepTime);
  const [elapsedMinutes, setElapsedMinutes] = useState<string>(initialElapsedMin);
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>(
    (initialSpeedUnit as SpeedUnit) || 'kt'
  );
  const [fuelUnit, setFuelUnit] = useState<FuelUnit>(
    (initialFuelUnit as FuelUnit) || 'gph'
  );
  const [isWaypointsModalOpen, setIsWaypointsModalOpen] = useState(false);

  // Compass deviation table state - initialize from URL if available
  const [deviationTable, setDeviationTable] = useState<DeviationEntry[]>(() => {
    if (initialDevTable) {
      try {
        const decompressed = decompressFromUrl(initialDevTable);
        if (Array.isArray(decompressed)) {
          return decompressed;
        }
      } catch {
        // Invalid data, ignore
      }
    }
    return [];
  });

  // Waypoints state - initialize from URL if available
  const [waypoints, setWaypoints] = useState<Waypoint[]>(() => {
    if (initialWaypoints) {
      try {
        const decompressed = decompressFromUrl(initialWaypoints);
        if (Array.isArray(decompressed)) {
          return decompressed;
        }
      } catch {
        // Invalid data, ignore
      }
    }
    return [];
  });

  // Update URL when parameters change (client-side only, no page reload)
  useEffect(() => {
    const params = new URLSearchParams();
    if (trueHeading) params.set("th", trueHeading);
    if (tas) params.set("tas", tas);
    if (windDir) params.set("wd", windDir);
    if (windSpeed) params.set("ws", windSpeed);
    if (magDev) params.set("md", magDev);
    if (distance) params.set("dist", distance);
    if (fuelFlow) params.set("ff", fuelFlow);
    if (description) params.set("desc", description);
    if (departureTime) params.set("depTime", departureTime);
    if (elapsedMinutes) params.set("elapsedMin", elapsedMinutes);
    if (speedUnit !== 'kt') params.set("unit", speedUnit);
    if (fuelUnit !== 'gph') params.set("funit", fuelUnit);

    // Add deviation table if it exists (compressed)
    if (deviationTable.length > 0) {
      const compressed = compressForUrl(deviationTable);
      if (compressed) {
        params.set("devTable", compressed);
      }
    }

    // Add waypoints if they exist (compressed)
    if (waypoints.length > 0) {
      const compressed = compressForUrl(waypoints);
      if (compressed) {
        params.set("waypoints", compressed);
      }
    }

    // Use window.history.replaceState instead of router.replace to avoid server requests
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [trueHeading, tas, windDir, windSpeed, magDev, distance, fuelFlow, description, departureTime, elapsedMinutes, deviationTable, waypoints, speedUnit, fuelUnit]);

  // Calculate results during render (not in useEffect to avoid cascading renders)
  const th = parseFloat(trueHeading);
  const tasVal = parseFloat(tas);
  // Convert TAS to knots for calculations
  const tasInKnots = !isNaN(tasVal) ? toKnots(tasVal, speedUnit) : NaN;
  const wd = windDir ? parseFloat(windDir) : 0; // Default to 0 if empty
  const ws = windSpeed ? parseFloat(windSpeed) : 0; // Default to 0 if empty
  const md = parseFloat(magDev) || 0; // Default to 0 if empty
  const dist = distance ? parseFloat(distance) : undefined;
  const ff = fuelFlow ? parseFloat(fuelFlow) : undefined;

  const elapsedMins = elapsedMinutes ? parseInt(elapsedMinutes) : undefined;

  const results =
    !isNaN(th) &&
    !isNaN(tasInKnots) &&
    tasInKnots > 0
      ? calculateCourse(wd, ws, th, tasInKnots, md, dist, ff, elapsedMins)
      : null;

  // Calculate compass course when deviation table is available and results exist
  const compassCourse =
    results && deviationTable.length >= 2
      ? calculateCompassCourse(results.compassHeading, deviationTable)
      : null;

  // Calculate waypoint results
  const flightParams: FlightParameters = {
    departureTime: departureTime || undefined,
    elapsedMinutes: elapsedMinutes ? parseInt(elapsedMinutes) : undefined,
  };

  const waypointResults =
    results && waypoints.length > 0 && dist !== undefined
      ? calculateWaypoints(waypoints, results.groundSpeed, ff, flightParams)
      : [];


  // Build OG image URL for download
  const hasParams = windDir || windSpeed || trueHeading || tas;
  const ogImageUrl = hasParams
    ? (() => {
        const params = new URLSearchParams();
        params.set('wd', windDir);
        params.set('ws', windSpeed);
        params.set('th', trueHeading);
        params.set('tas', tas);
        params.set('md', magDev);
        if (distance) params.set('dist', distance);
        if (fuelFlow) params.set('ff', fuelFlow);
        if (description) params.set('desc', description);
        if (deviationTable.length > 0) {
          const compressed = compressForUrl(deviationTable);
          if (compressed) params.set('devTable', compressed);
        }
        return `/api/og-course?${params.toString()}`;
      })()
    : undefined;

  return (
    <PageLayout>
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="flex items-center justify-center gap-4 mb-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-slate-800/50 backdrop-blur-sm border border-gray-700">
            <svg
              className="w-9 h-9"
              fill="none"
              stroke="oklch(0.65 0.15 230)"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold" style={{ color: "white" }}>
            {description || "José's Course Calculator"}
          </h1>
        </div>
        {description && (
          <p
            className="text-base sm:text-lg mb-4"
            style={{ color: "oklch(0.58 0.02 240)" }}
          >
            José&apos;s Aviation Tools
          </p>
        )}
        <Navigation currentPage="course" />
      </div>

      <main className="w-full max-w-4xl">
        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">
          {/* Section Header */}
          <div className="mb-6 pb-6 border-b border-gray-700">
            <h2
              className="text-xl sm:text-2xl font-bold mb-2"
              style={{ color: "white" }}
            >
              Flight Parameters
            </h2>
            <p className="text-sm" style={{ color: "oklch(0.58 0.02 240)" }}>
              Calculate compass course, ground speed, and navigation data
            </p>
          </div>

          {/* Description Input */}
          <div className="mb-6">
            <label
              className="flex items-center text-sm font-medium mb-2"
              style={{ color: "oklch(0.72 0.015 240)" }}
            >
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white"
              placeholder="e.g., KJFK to KLAX"
            />
          </div>

          {/* Input Fields - Grouped */}
          <div className="space-y-6 mb-8">
            {/* Course & Speed */}
            <CourseSpeedInputs
              trueHeading={trueHeading}
              setTrueHeading={setTrueHeading}
              tas={tas}
              setTas={setTas}
              speedUnit={speedUnit}
              setSpeedUnit={setSpeedUnit}
            />

            {/* Wind */}
            <WindInputs
              windDir={windDir}
              setWindDir={setWindDir}
              windSpeed={windSpeed}
              setWindSpeed={setWindSpeed}
            />

            {/* Corrections */}
            <CorrectionsInputs
              magDev={magDev}
              setMagDev={setMagDev}
              deviationTable={deviationTable}
              onDeviationTableChange={setDeviationTable}
            />

            {/* Range & Fuel */}
            <RangeFuelInputs
              distance={distance}
              setDistance={setDistance}
              fuelFlow={fuelFlow}
              setFuelFlow={setFuelFlow}
              fuelUnit={fuelUnit}
              setFuelUnit={setFuelUnit}
              onWaypointsClick={() => setIsWaypointsModalOpen(true)}
              waypointsCount={waypoints.length}
            />

            {/* Flight Parameters */}
            <FlightParametersInputs
              departureTime={departureTime}
              setDepartureTime={setDepartureTime}
              elapsedMinutes={elapsedMinutes}
              setElapsedMinutes={setElapsedMinutes}
            />
          </div>

          {/* Results */}
          {results !== null && (
            <div className="space-y-6">
              {/* Intermediate Results */}
              <IntermediateResults
                results={results}
                fuelUnit={fuelUnit}
                fuelFlow={ff}
              />

              {/* Primary Results */}
              <PrimaryResults
                results={results}
                compassCourse={compassCourse}
                deviationTable={deviationTable}
                windDir={windDir}
                windSpeed={windSpeed}
                trueHeading={trueHeading}
                ogImageUrl={ogImageUrl}
                speedUnit={speedUnit}
                fuelUnit={fuelUnit}
                departureTime={departureTime}
                elapsedMinutes={elapsedMins}
              />

              {/* Waypoints Results */}
              {waypointResults.length > 0 && (
                <WaypointsResults
                  waypointResults={waypointResults}
                  fuelUnit={fuelUnit}
                  showFuel={ff !== undefined && ff > 0}
                  showETA={departureTime.length === 4}
                />
              )}

              {/* New Leg Button - only show if we have distance (completed leg) */}
              {results.eta !== undefined && (
                <div className="pt-4">
                  <NewLegButton
                    magDev={magDev}
                    departureTime={departureTime}
                    deviationTable={initialDevTable}
                    fuelFlow={fuelFlow}
                    tas={tas}
                    speedUnit={speedUnit}
                    fuelUnit={fuelUnit}
                    elapsedMinutes={(elapsedMins || 0) + Math.round((results.eta || 0) * 60)}
                  />
                </div>
              )}

              {/* Share Button - after all results */}
              <div className="pt-2">
                <ShareButton
                  shareData={{
                    title: "José's Course Calculator",
                    text: `Wind: ${windDir}° at ${windSpeed} kt, Heading: ${trueHeading}° → GS: ${results?.groundSpeed.toFixed(1)} kt`,
                    url: typeof window !== "undefined" ? window.location.href : "",
                  }}
                  ogImageUrl={ogImageUrl}
                />
              </div>
            </div>
          )}

          {/* Note */}
          <div className="mt-6 p-4 rounded-xl bg-slate-900/30 border border-gray-700">
            <p
              className="text-xs sm:text-sm leading-relaxed"
              style={{ color: "oklch(0.6 0.02 240)" }}
            >
              <span className="font-semibold">Note:</span> This calculator uses
              standard aviation wind triangle formulas. Wind direction is where
              the wind is coming FROM. Positive WCA means turn right, negative
              means turn left. {" "}
              <span className="font-semibold">ETAS (Effective True Air Speed)</span> is
              shown when WCA exceeds 10° to account for the reduced effective forward
              speed when crabbing at large angles.
              {" "}<span className="font-semibold">All calculations are performed with decimal precision,
              but displayed values are rounded to the nearest integer for clarity.</span>
            </p>
          </div>
        </div>

      </main>

      <Footer description="Aviation calculations based on wind triangle principles" />

      {/* Waypoints Modal */}
      <WaypointsModal
        isOpen={isWaypointsModalOpen}
        onClose={() => setIsWaypointsModalOpen(false)}
        onApply={setWaypoints}
        initialWaypoints={waypoints}
        totalDistance={dist}
      />
    </PageLayout>
  );
}
