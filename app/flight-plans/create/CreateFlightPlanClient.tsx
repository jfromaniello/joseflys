/**
 * Create Flight Plan Client
 * Main component for creating a new flight plan with route, aircraft, and cruise settings
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageLayout } from "@/app/components/PageLayout";
import { Footer } from "@/app/components/Footer";
import { AircraftSelectorModal } from "@/app/components/AircraftSelectorModal";
import { AircraftSelector } from "@/app/components/AircraftSelector";
import { Tooltip } from "@/app/components/Tooltip";
import { RoutePointsInput, RoutePoint } from "./components/RoutePointsInput";
import {
  createFlightPlan,
  addOrUpdateLeg,
  getFlightPlanById,
  type FlightPlanLeg,
} from "@/lib/flightPlan";
import { getCruisePerformance } from "@/lib/flightPlan/flightPlanningCalculations";
import { calculateHaversineDistance, calculateInitialBearing } from "@/lib/distanceCalculations";
import { calculateClimbPerformance } from "@/lib/climbCalculations";
import { ResolvedAircraftPerformance } from "@/lib/aircraft";
import { serializeAircraft, getAircraftByModel } from "@/lib/aircraftStorage";
import { magvar } from "magvar";
import { ChevronLeftIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";

export function CreateFlightPlanClient() {
  const router = useRouter();

  // Flight plan metadata
  const [planName, setPlanName] = useState("");
  const [planDate, setPlanDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [departureTime, setDepartureTime] = useState("");

  // Aircraft selection
  const [isAircraftModalOpen, setIsAircraftModalOpen] = useState(false);

  const [selectedAircraft, setSelectedAircraft] = useState<ResolvedAircraftPerformance | null>(
    getAircraftByModel("C172N")!
  );

  // Cruise settings
  const [cruiseAltitude, setCruiseAltitude] = useState("6500");
  const [cruisePower, setCruisePower] = useState("65");

  // Route points
  const [departure, setDeparture] = useState<RoutePoint | null>(null);
  const [destination, setDestination] = useState<RoutePoint | null>(null);
  const [waypoints, setWaypoints] = useState<RoutePoint[]>([]);
  const [alternate, setAlternate] = useState<RoutePoint | null>(null);

  // Computed cruise performance
  const [cruisePerf, setCruisePerf] = useState<{
    tas: number;
    fuelFlow: number;
  } | null>(null);

  // Form state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);



  // Update cruise performance when aircraft or settings change
  useEffect(() => {
    if (!selectedAircraft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCruisePerf(null);
      return;
    }

    const alt = parseFloat(cruiseAltitude) || 6500;
    const pwr = parseFloat(cruisePower) || 65;

    const perf = getCruisePerformance(selectedAircraft.cruiseTable, alt, pwr);
    setCruisePerf(perf);
  }, [selectedAircraft, cruiseAltitude, cruisePower]);

  const handleAircraftSelect = (aircraft: ResolvedAircraftPerformance) => {
    setSelectedAircraft(aircraft);
  };

  const canCreate =
    planName.trim() &&
    selectedAircraft &&
    departure &&
    destination &&
    cruisePerf;

  const handleCreate = async () => {
    if (!canCreate || !selectedAircraft || !departure || !destination || !cruisePerf) {
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Serialize aircraft
      const planeData = serializeAircraft(selectedAircraft);

      // Create the flight plan
      const flightPlan = createFlightPlan({
        name: planName.trim(),
        date: planDate || undefined,
        cruiseAltitude: parseFloat(cruiseAltitude) || 6500,
        cruisePower: parseFloat(cruisePower) || 65,
        plane: planeData,
        departure: {
          name: departure.name,
          lat: departure.lat,
          lon: departure.lon,
        },
        destination: {
          name: destination.name,
          lat: destination.lat,
          lon: destination.lon,
        },
        alternate: alternate
          ? {
              name: alternate.name,
              lat: alternate.lat,
              lon: alternate.lon,
            }
          : undefined,
      });

      // Build route points array: [departure, ...waypoints, destination]
      const routePoints: RoutePoint[] = [
        departure,
        ...waypoints.filter((wp) => wp.name !== ""),
        destination,
      ];

      // Store created leg IDs to trigger recalculation later
      let firstLegId: string | undefined;

      // Generate legs from route
      for (let i = 0; i < routePoints.length - 1; i++) {
        const from = routePoints[i];
        const to = routePoints[i + 1];

        // Calculate distance and bearing
        const distance = calculateHaversineDistance(from.lat, from.lon, to.lat, to.lon);
        const bearing = calculateInitialBearing(from.lat, from.lon, to.lat, to.lon);

        // Get magnetic variation at midpoint
        const midLat = (from.lat + to.lat) / 2;
        const midLon = (from.lon + to.lon) / 2;
        const magVariation = magvar(midLat, midLon, 0);

        // Calculate climb data for first leg
        let climbData: {
          climbDist?: number;
          climbFuel?: number;
        } = {};

        if (i === 0 && selectedAircraft.climbTable.length > 0) {
          const targetAlt = parseFloat(cruiseAltitude) || 6500;
          // Use 20°C as standard OAT for flight plan estimation
          const climbPerf = calculateClimbPerformance(
            selectedAircraft.climbTable,
            0, // fromPA
            targetAlt, // toPA
            20 // OAT (standard condition)
          );

          if (climbPerf) {
            climbData = {
              climbDist: Math.round(climbPerf.distance * 10) / 10,
              climbFuel: Math.round(climbPerf.fuel * 10) / 10,
            };
          }
        }

        // Calculate descent data for last leg of main route (when there's an alternate)
        // This marks the destination leg so alternate detection works
        let descentData: {
          descentTas?: number;
          descentDist?: number;
          descentFuel?: number;
        } = {};

        const isLastMainLeg = i === routePoints.length - 2;
        if (isLastMainLeg && alternate && selectedAircraft.climbTable.length > 0) {
          const targetAlt = parseFloat(cruiseAltitude) || 6500;
          // Descent is typically faster and uses less fuel than climb
          // Approximate: 500 fpm descent, ~3 NM per 1000ft at typical speeds
          const descentDist = (targetAlt / 1000) * 3;
          const descentTime = targetAlt / 500; // minutes
          const descentFuel = (descentTime / 60) * cruisePerf.fuelFlow * 0.5; // ~50% of cruise fuel flow

          descentData = {
            descentTas: cruisePerf.tas, // Use cruise TAS for descent estimation
            descentDist: Math.round(descentDist * 10) / 10,
            descentFuel: Math.round(descentFuel * 10) / 10,
          };
        }

        // Create leg data (cumulative values will be calculated by recalculateSubsequentLegs)
        const legData: Omit<FlightPlanLeg, "id" | "index"> = {
          th: Math.round(bearing), // True course
          tas: cruisePerf.tas,
          wd: undefined,
          ws: undefined,
          var: magVariation,
          md: -magVariation, // Legacy field (inverted)
          dist: Math.round(distance * 10) / 10,
          ff: cruisePerf.fuelFlow,
          fuelUnit: "gph",
          plane: planeData,
          unit: "kt",
          from: {
            name: from.name,
            lat: from.lat,
            lon: from.lon,
          },
          to: {
            name: to.name,
            lat: to.lat,
            lon: to.lon,
          },
          desc: `${from.name} to ${to.name}`,
          depTime: departureTime || undefined,
          ...climbData,
          ...descentData,
        };

        // Add leg to flight plan
        const result = addOrUpdateLeg(flightPlan.id, legData);
        if (i === 0 && result) {
          firstLegId = result.leg.id;
        }
      }

      // Add alternate leg if specified
      if (alternate) {
        const altDistance = calculateHaversineDistance(
          destination.lat,
          destination.lon,
          alternate.lat,
          alternate.lon
        );
        const altBearing = calculateInitialBearing(
          destination.lat,
          destination.lon,
          alternate.lat,
          alternate.lon
        );

        const altMidLat = (destination.lat + alternate.lat) / 2;
        const altMidLon = (destination.lon + alternate.lon) / 2;
        const altMagVariation = magvar(altMidLat, altMidLon, 0);

        // Calculate descent data for alternate leg (required for alternate detection)
        const targetAlt = parseFloat(cruiseAltitude) || 6500;
        const altDescentDist = (targetAlt / 1000) * 3;
        const altDescentTime = targetAlt / 500; // minutes
        const altDescentFuel = (altDescentTime / 60) * cruisePerf.fuelFlow * 0.5;

        const alternateLegData: Omit<FlightPlanLeg, "id" | "index"> = {
          th: Math.round(altBearing),
          tas: cruisePerf.tas,
          wd: undefined,
          ws: undefined,
          var: altMagVariation,
          md: -altMagVariation,
          dist: Math.round(altDistance * 10) / 10,
          ff: cruisePerf.fuelFlow,
          fuelUnit: "gph",
          plane: planeData,
          unit: "kt",
          from: {
            name: destination.name,
            lat: destination.lat,
            lon: destination.lon,
          },
          to: {
            name: alternate.name,
            lat: alternate.lat,
            lon: alternate.lon,
          },
          desc: `${destination.name} to ${alternate.name} (Alternate)`,
          depTime: departureTime || undefined,
          additionalFuel: 45, // 45 minutes reserve for alternate
          // Descent data required for alternate detection
          descentTas: cruisePerf.tas,
          descentDist: Math.round(altDescentDist * 10) / 10,
          descentFuel: Math.round(altDescentFuel * 10) / 10,
        };

        addOrUpdateLeg(flightPlan.id, alternateLegData);
      }

      // Re-save first leg to trigger recalculation of all subsequent legs
      // This uses the same logic as when saving from /leg page
      if (firstLegId) {
        const updatedPlan = getFlightPlanById(flightPlan.id);
        if (updatedPlan && updatedPlan.legs.length > 0) {
          const firstLeg = updatedPlan.legs[0];
          addOrUpdateLeg(flightPlan.id, firstLeg, firstLegId);
        }
      }

      // Navigate to the new flight plan
      router.push(`/flight-plans/${flightPlan.id}`);
    } catch (err) {
      console.error("Failed to create flight plan:", err);
      setError(err instanceof Error ? err.message : "Failed to create flight plan");
      setIsCreating(false);
    }
  };

  return (
    <PageLayout currentPage="flight-plans">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-20 min-h-screen">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/flight-plans"
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Create Flight Plan</h1>
            <p className="text-sm text-slate-400 mt-1">
              Set up your route and aircraft to generate a complete flight plan
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Plan Details Section */}
          <section className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
            <h2
              className="text-sm font-semibold mb-4 uppercase tracking-wide"
              style={{ color: "oklch(0.65 0.15 230)" }}
            >
              Plan Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Plan Name */}
              <div className="md:col-span-3 lg:col-span-1">
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Plan Name
                  <Tooltip content="A descriptive name for your flight plan" />
                </label>
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-slate-600 text-white"
                  placeholder="e.g., Weekend trip to coast"
                />
              </div>

              {/* Date */}
              <div>
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Date
                  <Tooltip content="The planned date of your flight" />
                </label>
                <input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-slate-600 text-white cursor-pointer"
                />
              </div>

              {/* Departure Time */}
              <div>
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Departure Time
                  <Tooltip content="Planned departure time in 24-hour format (e.g., 0830 for 8:30 AM)" />
                </label>
                <input
                  type="text"
                  value={departureTime}
                  onChange={(e) => {
                    // Only allow digits, max 4 characters
                    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setDepartureTime(value);
                  }}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-slate-600 text-white"
                  placeholder="e.g., 0830"
                  maxLength={4}
                />
              </div>
            </div>
          </section>

          {/* Aircraft Section */}
          <section className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
            <h2
              className="text-sm font-semibold mb-4 uppercase tracking-wide"
              style={{ color: "oklch(0.65 0.15 230)" }}
            >
              Aircraft & Performance
            </h2>

            <div className="space-y-4">
              {/* Aircraft Selector */}
              <div>
                <label
                  className="flex items-center text-sm font-medium mb-2"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Aircraft
                  <Tooltip content="Select the aircraft you'll be flying. Performance data will be used for fuel and time calculations." />
                </label>
                <AircraftSelector
                  aircraft={selectedAircraft}
                  onClick={() => setIsAircraftModalOpen(true)}
                />
              </div>

              {/* Cruise Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cruise Altitude */}
                <div>
                  <label
                    className="flex items-center text-sm font-medium mb-2"
                    style={{ color: "oklch(0.72 0.015 240)" }}
                  >
                    Cruise Altitude
                    <Tooltip content="Your planned cruising altitude. Used to look up TAS and fuel flow from aircraft performance tables." />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={cruiseAltitude}
                      onChange={(e) => setCruiseAltitude(e.target.value)}
                      className="w-full px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right"
                      placeholder="6500"
                      min="0"
                      max="25000"
                      step="500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-white pointer-events-none">
                      ft
                    </span>
                  </div>
                </div>

                {/* Cruise Power */}
                <div>
                  <label
                    className="flex items-center text-sm font-medium mb-2"
                    style={{ color: "oklch(0.72 0.015 240)" }}
                  >
                    Cruise Power
                    <Tooltip content="Power setting as percentage of maximum. 65% is typical for fuel-efficient cruise, 75% for faster cruise." />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={cruisePower}
                      onChange={(e) => setCruisePower(e.target.value)}
                      className="w-full px-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right"
                      placeholder="65"
                      min="50"
                      max="100"
                      step="5"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-white pointer-events-none">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Cruise Performance Preview */}
              {cruisePerf && (
                <div className="bg-slate-900/50 rounded-xl border border-slate-600 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                    Calculated Cruise Performance
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {cruisePerf.tas}{" "}
                        <span className="text-sm font-normal text-slate-400">KTAS</span>
                      </div>
                      <div className="text-xs text-slate-400">True Airspeed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {cruisePerf.fuelFlow}{" "}
                        <span className="text-sm font-normal text-slate-400">GPH</span>
                      </div>
                      <div className="text-xs text-slate-400">Fuel Flow</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Route Section */}
          <section className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
            <RoutePointsInput
              departure={departure}
              destination={destination}
              waypoints={waypoints}
              alternate={alternate}
              onDepartureChange={setDeparture}
              onDestinationChange={setDestination}
              onWaypointsChange={setWaypoints}
              onAlternateChange={setAlternate}
            />

            {/* Route Summary */}
            {departure && destination && (
              <div className="mt-4 bg-slate-900/50 rounded-xl border border-slate-600 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                  Route Summary
                </div>
                <div className="text-sm text-slate-300">
                  {waypoints.filter((wp) => wp.name).length + 1} leg
                  {waypoints.filter((wp) => wp.name).length > 0 ? "s" : ""}
                  {alternate && " + alternate"}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {departure.name} → {waypoints.filter((wp) => wp.name).map((wp) => wp.name).join(" → ")}
                  {waypoints.filter((wp) => wp.name).length > 0 && " → "}
                  {destination.name}
                  {alternate && ` → ${alternate.name}`}
                </div>
              </div>
            )}
          </section>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400">
              {error}
            </div>
          )}

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={!canCreate || isCreating}
            className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold text-lg transition-all cursor-pointer ${
              canCreate && !isCreating
                ? "bg-sky-600 hover:bg-sky-700 text-white"
                : "bg-slate-700 text-slate-400 cursor-not-allowed"
            }`}
          >
            <PaperAirplaneIcon className="w-6 h-6" />
            {isCreating ? "Creating..." : "Create Flight Plan"}
          </button>

          {/* Validation hints */}
          {!canCreate && (
            <div className="text-sm text-slate-400 text-center">
              {!planName.trim() && <div>Enter a plan name</div>}
              {!selectedAircraft && <div>Select an aircraft</div>}
              {!departure && <div>Set departure point</div>}
              {!destination && <div>Set destination point</div>}
            </div>
          )}
        </div>
      </div>

      {/* Aircraft Selector Modal */}
      <AircraftSelectorModal
        isOpen={isAircraftModalOpen}
        onClose={() => setIsAircraftModalOpen(false)}
        onApply={handleAircraftSelect}
        initialAircraft={selectedAircraft || undefined}
      />

      <Footer description="Create a new flight plan with your route and aircraft settings." />
    </PageLayout>
  );
}
