/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import Link from "next/link";
import { Menu, MenuButton, MenuItems, MenuItem, Transition } from "@headlessui/react";
import { PageLayout } from "../components/PageLayout";
import { Footer } from "../components/Footer";
import { CalculatorPageHeader } from "../components/CalculatorPageHeader";
import { calculateCourse, calculateWaypoints, Waypoint, FlightParameters } from "@/lib/courseCalculations";
import { DeviationEntry } from "../components/CompassDeviationModal";
import { WaypointsModal } from "../components/WaypointsModal";
import { DistanceCalculatorModal } from "../components/DistanceCalculatorModal";
import { TASCalculatorModal } from "../components/TASCalculatorModal";
import { compressForUrl, decompressFromUrl } from "@/lib/urlCompression";
import { loadAircraftFromUrl, serializeAircraft } from "@/lib/aircraftStorage";
import { AircraftPerformance } from "@/lib/aircraftPerformance";
import { quantizeCoordinate } from "@/lib/coordinateUrlParams";
import { calculateHaversineDistance, calculateInitialBearing } from "@/lib/distanceCalculations";
import { magvar } from "magvar";
import { ToastContainer } from "../components/Toast";
import { CourseSpeedInputs, SpeedUnit } from "../course/components/CourseSpeedInputs";
import { WindInputs } from "../course/components/WindInputs";
import { CorrectionsInputs } from "../course/components/CorrectionsInputs";
import { FuelUnit } from "../course/components/RangeFuelInputs";
import { FlightParametersInputs } from "../course/components/FlightParametersInputs";
import { ClimbDataInputs } from "../course/components/ClimbDataInputs";
import { DescentDataInputs } from "../course/components/DescentDataInputs";
import { AdditionalFuelInput } from "../course/components/AdditionalFuelInput";
import { IntermediateResults } from "../course/components/IntermediateResults";
import { PrimaryResults } from "../course/components/PrimaryResults";
import { WaypointsResults } from "../course/components/WaypointsResults";
import { ShareButtonSimple } from "../components/ShareButtonSimple";
import { NewLegButton } from "../components/NewLegButton";
import { Tooltip } from "../components/Tooltip";
import { FlightPlanModal } from "../components/FlightPlanModal";
import { LegWaypointsTable } from "./components/LegWaypointsTable";
import {
  addOrUpdateLeg,
  getFlightPlanById,
  type FlightPlan,
  type FlightPlanLeg,
  calculateLegResults,
} from "@/lib/flightPlan";
import { BookmarkIcon } from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolidIcon } from "@heroicons/react/24/solid";
import { extractNextLegParams } from "@/lib/nextLegParams";

interface LegPlannerClientProps {
  initialTh: string;
  initialTas: string;
  initialWd: string;
  initialWs: string;
  initialMagVar: string; // WMM convention (positive=E, negative=W)
  initialDist: string;
  initialFf: string;
  initialDevTable: string;
  initialPlane: string;
  initialDesc: string;
  initialSpeedUnit: string;
  initialFuelUnit: string;
  initialWaypoints: string;
  initialDepTime: string;
  initialElapsedMin: string;
  initialElapsedDist: string;
  initialPrevFuel: string;
  initialClimbTas: string;
  initialClimbDist: string;
  initialClimbFuel: string;
  initialClimbWd: string;
  initialClimbWs: string;
  initialDescentTas: string;
  initialDescentDist: string;
  initialDescentFuel: string;
  initialDescentWd: string;
  initialDescentWs: string;
  initialAdditionalFuel: string;
  initialApproachLandingFuel: string;
  initialFlightPlanId: string;
  initialLegId: string;
  initialFromCity: string;
  initialToCity: string;
  initialFrom?: { lat: string; lon: string; name?: string };
  initialTo?: { lat: string; lon: string; name?: string };
  initialCheckpoints: Array<{ lat: string; lon: string; name?: string }>;
}

export function LegPlannerClient({
  initialTh,
  initialTas,
  initialWd,
  initialWs,
  initialMagVar,
  initialDist,
  initialFf,
  initialDevTable,
  initialPlane,
  initialDesc,
  initialSpeedUnit,
  initialFuelUnit,
  initialWaypoints,
  initialDepTime,
  initialElapsedMin,
  initialElapsedDist,
  initialPrevFuel,
  initialClimbTas,
  initialClimbDist,
  initialClimbFuel,
  initialClimbWd,
  initialClimbWs,
  initialDescentTas,
  initialDescentDist,
  initialDescentFuel,
  initialDescentWd,
  initialDescentWs,
  initialAdditionalFuel,
  initialApproachLandingFuel,
  initialFlightPlanId,
  initialLegId,
  initialFromCity,
  initialToCity,
  initialFrom,
  initialTo,
  initialCheckpoints,
}: LegPlannerClientProps) {
  const [trueHeading, setTrueHeading] = useState<string>(initialTh);
  const [tas, setTas] = useState<string>(initialTas);
  const [windDir, setWindDir] = useState<string>(initialWd);
  const [windSpeed, setWindSpeed] = useState<string>(initialWs);
  const [magVar, setMagVar] = useState<string>(initialMagVar);
  const [distance, setDistance] = useState<string>(initialDist);
  const [fuelFlow, setFuelFlow] = useState<string>(initialFf);
  const [description, setDescription] = useState<string>(initialDesc);
  const [departureTime, setDepartureTime] = useState<string>(initialDepTime);
  const [elapsedMinutes, setElapsedMinutes] = useState<string>(initialElapsedMin);
  const [elapsedDistance, setElapsedDistance] = useState<string>(initialElapsedDist);
  const [previousFuelUsed, setPreviousFuelUsed] = useState<string>(initialPrevFuel);
  const [climbTas, setClimbTas] = useState<string>(initialClimbTas);
  const [climbDistance, setClimbDistance] = useState<string>(initialClimbDist);
  const [climbFuelUsed, setClimbFuelUsed] = useState<string>(initialClimbFuel);
  const [climbWindDir, setClimbWindDir] = useState<string>(initialClimbWd);
  const [climbWindSpeed, setClimbWindSpeed] = useState<string>(initialClimbWs);
  const [descentTas, setDescentTas] = useState<string>(initialDescentTas);
  const [descentDistance, setDescentDistance] = useState<string>(initialDescentDist);
  const [descentFuelUsed, setDescentFuelUsed] = useState<string>(initialDescentFuel);
  const [descentWindDir, setDescentWindDir] = useState<string>(initialDescentWd);
  const [descentWindSpeed, setDescentWindSpeed] = useState<string>(initialDescentWs);
  const [additionalFuel, setAdditionalFuel] = useState<string>(initialAdditionalFuel);
  const [approachLandingFuel, setApproachLandingFuel] = useState<string>(initialApproachLandingFuel);
  const [fromCity, setFromCity] = useState<string>(initialFromCity);
  const [toCity, setToCity] = useState<string>(initialToCity);

  // New waypoint-based navigation
  const [fromPoint, setFromPoint] = useState<{ lat: number; lon: number; name: string } | null>(() => {
    if (initialFrom?.lat && initialFrom?.lon) {
      return {
        lat: parseFloat(initialFrom.lat),
        lon: parseFloat(initialFrom.lon),
        name: initialFrom.name || "Leg Start",
      };
    }
    return null;
  });
  const [toPoint, setToPoint] = useState<{ lat: number; lon: number; name: string } | null>(() => {
    if (initialTo?.lat && initialTo?.lon) {
      return {
        lat: parseFloat(initialTo.lat),
        lon: parseFloat(initialTo.lon),
        name: initialTo.name || "Leg End",
      };
    }
    return null;
  });
  const [checkpoints, setCheckpoints] = useState<Array<{ lat: number; lon: number; name: string }>>(() => {
    return initialCheckpoints.map((p) => ({
      lat: parseFloat(p.lat),
      lon: parseFloat(p.lon),
      name: p.name || "Waypoint",
    }));
  });

  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>(
    (initialSpeedUnit as SpeedUnit) || 'kt'
  );
  const [fuelUnit, setFuelUnit] = useState<FuelUnit>(
    (initialFuelUnit as FuelUnit) || 'gph'
  );
  const [isWaypointsModalOpen, setIsWaypointsModalOpen] = useState(false);
  const [isDistanceModalOpen, setIsDistanceModalOpen] = useState(false);
  const [isTASModalOpen, setIsTASModalOpen] = useState(false);
  const [isFlightPlanModalOpen, setIsFlightPlanModalOpen] = useState(false);

  // Toast notifications state
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: "info" | "success" | "warning" }>>([]);

  // Flight plan tracking state
  const [flightPlanId, setFlightPlanId] = useState<string>(initialFlightPlanId);
  const [legId, setLegId] = useState<string>(initialLegId);
  const [currentFlightPlan, setCurrentFlightPlan] = useState<FlightPlan | null>(() => {
    if (initialFlightPlanId) {
      return getFlightPlanById(initialFlightPlanId);
    }
    return null;
  });

  // Aircraft state - initialize from URL if plane param exists
  const [aircraft, setAircraft] = useState<AircraftPerformance | null>(() => {
    if (initialPlane) {
      return loadAircraftFromUrl(initialPlane);
    }
    return null;
  });

  // Compass deviation table state - initialize from aircraft or legacy devTable param
  const [deviationTable, setDeviationTable] = useState<DeviationEntry[]>(() => {
    // Priority 1: From aircraft if loaded
    if (aircraft?.deviationTable) {
      return aircraft.deviationTable;
    }

    // Priority 2: Legacy devTable param (compressed JSON)
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

  // Auto-populate from last leg when only flight plan ID is provided
  useEffect(() => {
    // Only run if we have a flight plan ID but no other parameters
    const hasNoOtherParams = !initialTh && !initialTas && !initialMagVar && !initialDist && !initialFf;

    if (initialFlightPlanId && hasNoOtherParams) {

      const plan = getFlightPlanById(initialFlightPlanId);
      if (plan && plan.legs.length > 0) {
        // Get the last leg
        const lastLeg = plan.legs[plan.legs.length - 1];

        // Calculate its results
        const legResults = calculateLegResults(lastLeg);

        // Extract next leg parameters
        const nextParams = extractNextLegParams(lastLeg, legResults, initialFlightPlanId);

        // Pre-fill all fields
        setTrueHeading("");
        setTas(nextParams.tas);
        setWindDir(nextParams.windDir);
        setWindSpeed(nextParams.windSpeed);
        setMagVar(nextParams.magVar || "");
        setDistance("");
        setFuelFlow(nextParams.fuelFlow);
        setDepartureTime(nextParams.departureTime);
        setElapsedMinutes(nextParams.elapsedMinutes.toString());
        setPreviousFuelUsed(nextParams.fuelUsed !== undefined ? nextParams.fuelUsed.toFixed(1) : "");
        setSpeedUnit(nextParams.speedUnit as SpeedUnit);
        setFuelUnit(nextParams.fuelUnit as FuelUnit);

        // Set "From" location from previous leg's "To" location
        if (nextParams.toPoint) {
          setFromPoint(nextParams.toPoint);
        }

        // Load aircraft if present
        if (nextParams.plane) {
          const loadedAircraft = loadAircraftFromUrl(nextParams.plane);
          if (loadedAircraft) {
            setAircraft(loadedAircraft);
            if (loadedAircraft.deviationTable) {
              setDeviationTable(loadedAircraft.deviationTable);
            }
          }
        }
      }
    }
  }, [initialDist, initialFf, initialFlightPlanId, initialMagVar, initialTas, initialTh]); // Run only once on mount

  // Toast notification helper
  const showToast = (message: string, type: "info" | "success" | "warning" = "info") => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Auto-calculate True Heading, Distance, and Mag Var when from/to are entered
  // Track the last from/to to detect actual changes (not just re-renders)
  const lastFromToRef = useRef<{ from: typeof fromPoint; to: typeof toPoint }>({ from: null, to: null });
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (!fromPoint || !toPoint) return;

    // Check if from/to actually changed (not just a re-render)
    const fromChanged = !lastFromToRef.current.from ||
      lastFromToRef.current.from.lat !== fromPoint.lat ||
      lastFromToRef.current.from.lon !== fromPoint.lon;

    const toChanged = !lastFromToRef.current.to ||
      lastFromToRef.current.to.lat !== toPoint.lat ||
      lastFromToRef.current.to.lon !== toPoint.lon;

    // Only auto-calculate if from/to actually changed
    if (!fromChanged && !toChanged) return;

    // Skip auto-calculation on initial load if values are already set from URL
    if (isInitialLoadRef.current && (trueHeading || distance || magVar)) {
      isInitialLoadRef.current = false;
      // Don't update the ref yet - we want to recalculate when user changes from/to
      return;
    }
    isInitialLoadRef.current = false;

    // Update the ref with current values (after all early returns)
    lastFromToRef.current = { from: fromPoint, to: toPoint };

    // Calculate distance and bearing using WGS-84 geodesic
    const calculatedDistance = calculateHaversineDistance(
      fromPoint.lat,
      fromPoint.lon,
      toPoint.lat,
      toPoint.lon
    );

    const calculatedBearing = calculateInitialBearing(
      fromPoint.lat,
      fromPoint.lon,
      toPoint.lat,
      toPoint.lon
    );

    // Calculate magnetic variation at midpoint
    const midLat = (fromPoint.lat + toPoint.lat) / 2;
    const midLon = (fromPoint.lon + toPoint.lon) / 2;
    const magVariation = magvar(midLat, midLon, 0); // altitude 0 for simplicity

    const updatedValues: string[] = [];

    // Always update these values when from/to changes
    // Format TH as 3-digit integer (e.g., 005, 090, 270)
    const roundedBearing = Math.round(calculatedBearing);
    const formattedBearing = String(roundedBearing).padStart(3, '0');
    setTrueHeading(formattedBearing);
    updatedValues.push(`TH ${formattedBearing}°`);

    setDistance(calculatedDistance.toFixed(1));
    updatedValues.push(`Dist ${calculatedDistance.toFixed(1)} NM`);

    setMagVar(magVariation.toFixed(1));
    const magVarStr = magVariation > 0 ? `${magVariation.toFixed(1)}°E` : `${Math.abs(magVariation).toFixed(1)}°W`;
    updatedValues.push(`Var ${magVarStr}`);

    // Show single consolidated toast
    const fromName = fromPoint.name.split(",")[0];
    const toName = toPoint.name.split(",")[0];
    const valuesText = updatedValues.join(", ");
    showToast(`${fromName} → ${toName}: ${valuesText}`, "success");
  }, [fromPoint, toPoint]); // Only re-run when from/to points change

  // Update URL when parameters change (client-side only, no page reload)
  useEffect(() => {
    const params = new URLSearchParams();
    if (trueHeading) params.set("th", trueHeading);
    if (tas) params.set("tas", tas);
    if (windDir) params.set("wd", windDir);
    if (windSpeed) params.set("ws", windSpeed);
    if (magVar) params.set("var", magVar); // Use 'var' (WMM convention) instead of 'md' (legacy)
    if (distance) params.set("dist", distance);
    if (fuelFlow) params.set("ff", fuelFlow);
    if (description) params.set("desc", description);
    if (departureTime) params.set("depTime", departureTime);
    if (elapsedMinutes) params.set("elapsedMin", elapsedMinutes);
    if (elapsedDistance) params.set("elapsedDist", elapsedDistance);
    if (previousFuelUsed) params.set("prevFuel", previousFuelUsed);
    if (climbTas) params.set("climbTas", climbTas);
    if (climbDistance) params.set("climbDist", climbDistance);
    if (climbFuelUsed) params.set("climbFuel", climbFuelUsed);
    if (climbWindDir) params.set("cwd", climbWindDir);
    if (climbWindSpeed) params.set("cws", climbWindSpeed);
    if (descentTas) params.set("descentTas", descentTas);
    if (descentDistance) params.set("descentDist", descentDistance);
    if (descentFuelUsed) params.set("descentFuel", descentFuelUsed);
    if (descentWindDir) params.set("dwd", descentWindDir);
    if (descentWindSpeed) params.set("dws", descentWindSpeed);
    if (additionalFuel) params.set("af", additionalFuel);
    if (approachLandingFuel) params.set("alf", approachLandingFuel);
    if (fromCity) params.set("fc", fromCity);
    if (toCity) params.set("tc", toCity);
    if (speedUnit !== 'kt') params.set("unit", speedUnit);
    if (fuelUnit !== 'gph') params.set("funit", fuelUnit);

    // Add aircraft with deviation table if exists
    if (aircraft && deviationTable.length > 0) {
      // Update aircraft with current deviation table
      const updatedAircraft = {
        ...aircraft,
        deviationTable: deviationTable,
      };
      // For leg page, only serialize name, model, and deviation table
      const serialized = serializeAircraft(updatedAircraft, {
        includeDeviationTable: true,
      });
      params.set("plane", serialized);
    } else if (deviationTable.length > 0) {
      // Legacy: just deviation table (compressed)
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

    // Add flight plan tracking params
    if (flightPlanId) params.set("fp", flightPlanId);
    if (legId) params.set("lid", legId);

    // Add from/to/via points (compact coordinate format)
    if (fromPoint) {
      const fromCompact = `${quantizeCoordinate(fromPoint.lat)}~${quantizeCoordinate(fromPoint.lon)}~${fromPoint.name}`;
      params.set("from", fromCompact);
      params.set("s", "5"); // Scale factor
    }

    if (toPoint) {
      const toCompact = `${quantizeCoordinate(toPoint.lat)}~${quantizeCoordinate(toPoint.lon)}~${toPoint.name}`;
      params.set("to", toCompact);
      if (!fromPoint) params.set("s", "5"); // Add scale if not already set
    }

    checkpoints.forEach((cp, index) => {
      const cpCompact = `${quantizeCoordinate(cp.lat)}~${quantizeCoordinate(cp.lon)}~${cp.name}`;
      params.set(`cp[${index}]`, cpCompact);
      if (!fromPoint && !toPoint) params.set("s", "5"); // Add scale if not already set
    });

    // Use window.history.replaceState instead of router.replace to avoid server requests
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [trueHeading, tas, windDir, windSpeed, magVar, distance, fuelFlow, description, departureTime, elapsedMinutes, elapsedDistance, previousFuelUsed, climbTas, climbDistance, climbFuelUsed, climbWindDir, climbWindSpeed, descentTas, descentDistance, descentFuelUsed, descentWindDir, descentWindSpeed, additionalFuel, approachLandingFuel, fromCity, toCity, deviationTable, waypoints, speedUnit, fuelUnit, aircraft, flightPlanId, legId, fromPoint, toPoint, checkpoints]);

  // Calculate results during render (not in useEffect to avoid cascading renders)
  // Parse basic values needed for validation and other components
  const elapsedMins = elapsedMinutes ? parseInt(elapsedMinutes) : undefined;
  const prevFuel = previousFuelUsed ? parseFloat(previousFuelUsed) : undefined;
  const tasVal = parseFloat(tas);
  const thVal = parseFloat(trueHeading);
  const dist = distance ? parseFloat(distance) : undefined;
  const ff = fuelFlow ? parseFloat(fuelFlow) : undefined;

  // Load example data
  const loadExample = () => {
    setTrueHeading("090");
    setTas("120");
    setWindDir("180");
    setWindSpeed("25");
    setMagVar("5"); // WMM convention: 5°E
    setDistance("85");
    setFuelFlow("8");
    setDescription("SAZS to SACO (Example Flight)");
    setDepartureTime("1430");
    setElapsedMinutes("0");
    setPreviousFuelUsed("");

    // Set example waypoints
    const exampleWaypoints = [
      { name: "Rio Segundo", distance: 28 },
      { name: "Villa Maria", distance: 52 },
      { name: "Laboulaye", distance: 75 }
    ];
    setWaypoints(exampleWaypoints);
  };

  const handleDistanceCalculatorApply = (data: {
    bearing: number;
    distance: number;
    fromName: string;
    toName: string;
  }) => {
    setTrueHeading(data.bearing.toString().padStart(3, '0'));
    setDistance(data.distance.toString());
    setFromCity(data.fromName);
    setToCity(data.toName);
    if (!description) {
      setDescription(`${data.fromName} to ${data.toName}`);
    }
  };

  const handleTASCalculatorApply = (data: { tas: number; speedUnit: SpeedUnit }) => {
    setTas(data.tas.toString());
    setSpeedUnit(data.speedUnit);
  };

  // Helper to convert string to number (required fields)
  const toNumber = (value: string): number => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  // Helper to convert string to optional number
  const toOptionalNumber = (value: string): number | undefined => {
    if (!value || value.trim() === "") return undefined;
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  };

  /**
   * Build leg data from current state
   * Single source of truth for mapping view state to FlightPlanLeg
   */
  const buildLegDataFromState = (): Omit<FlightPlanLeg, "id" | "index"> => {
    // Convert magVar (WMM convention) to md (legacy) for storage
    // WMM: positive=E, negative=W
    // Legacy: positive=W, negative=E
    // So: md = -magVar
    const legacyMD = magVar ? -parseFloat(magVar) : 0;

    return {
      th: toNumber(trueHeading),
      tas: toNumber(tas),
      wd: toOptionalNumber(windDir),
      ws: toOptionalNumber(windSpeed),
      md: legacyMD,
      var: toOptionalNumber(magVar), // Store WMM convention alongside legacy
      dist: toNumber(distance),
      waypoints: waypoints.length > 0 ? waypoints : undefined,
      fromCity: fromCity || undefined,
      toCity: toCity || undefined,
      from: fromPoint || undefined,
      to: toPoint || undefined,
      checkpoints: checkpoints.length > 0 ? checkpoints : undefined,
      ff: toNumber(fuelFlow),
      fuelUnit,
      prevFuel: toOptionalNumber(previousFuelUsed),
      plane: aircraft ? serializeAircraft(aircraft, { includeDeviationTable: true }) : "",
      depTime: departureTime,
      elapsedMin: toOptionalNumber(elapsedMinutes),
      elapsedDist: toOptionalNumber(elapsedDistance),
      climbTas: toOptionalNumber(climbTas),
      climbDist: toOptionalNumber(climbDistance),
      climbFuel: toOptionalNumber(climbFuelUsed),
      climbWd: toOptionalNumber(climbWindDir),
      climbWs: toOptionalNumber(climbWindSpeed),
      descentTas: toOptionalNumber(descentTas),
      descentDist: toOptionalNumber(descentDistance),
      descentFuel: toOptionalNumber(descentFuelUsed),
      descentWd: toOptionalNumber(descentWindDir),
      descentWs: toOptionalNumber(descentWindSpeed),
      additionalFuel: toOptionalNumber(additionalFuel),
      approachLandingFuel: toOptionalNumber(approachLandingFuel),
      desc: description,
      unit: speedUnit,
    };
  };

  const handleFlightPlanSelect = (flightPlan: FlightPlan) => {
    // Use the helper to build leg data
    const legData = buildLegDataFromState();

    // Save or update the leg
    const result = addOrUpdateLeg(flightPlan.id, legData, legId || undefined);

    if (result) {
      setFlightPlanId(result.flightPlan.id);
      setLegId(result.leg.id);
      setCurrentFlightPlan(result.flightPlan);
    }
  };

  // Calculate course using leg data from state
  // Validation: need valid heading and TAS
  const results =
    !isNaN(thVal) &&
    !isNaN(tasVal) &&
    tasVal > 0
      ? calculateCourse(buildLegDataFromState())
      : null;

  // Calculate waypoint results
  const elapsedDist = elapsedDistance ? parseFloat(elapsedDistance) : undefined;
  const flightParams: FlightParameters = {
    departureTime: departureTime || undefined,
    elapsedMinutes: elapsedMinutes ? parseInt(elapsedMinutes) : undefined,
    elapsedDistance: elapsedDist,
    previousFuelUsed: prevFuel,
  };

  // Calculate waypoints (includes "Top of Climb" and "Descent Started" automatically if phase data exists)
  // Convert checkpoints to waypoints if we have from/to coordinates, otherwise use legacy waypoints
  const waypointsForCalculation = useMemo(() => {
    if (fromPoint && toPoint && checkpoints.length > 0) {
      // Convert checkpoints with coordinates to waypoint format (name + cumulative distance)
      // Start point is implicit at distance 0, so we only include checkpoints and end point
      const converted: Waypoint[] = [];
      let cumulativeDistance = 0;
      let prevLat = fromPoint.lat;
      let prevLon = fromPoint.lon;

      // Add each checkpoint
      for (const checkpoint of checkpoints) {
        if (!checkpoint.lat || !checkpoint.lon) continue;
        const segmentDist = calculateHaversineDistance(prevLat, prevLon, checkpoint.lat, checkpoint.lon);
        cumulativeDistance += segmentDist;
        converted.push({ name: checkpoint.name, distance: cumulativeDistance });
        prevLat = checkpoint.lat;
        prevLon = checkpoint.lon;
      }

      // Add end point
      const finalSegmentDist = calculateHaversineDistance(prevLat, prevLon, toPoint.lat, toPoint.lon);
      cumulativeDistance += finalSegmentDist;
      converted.push({ name: toPoint.name, distance: cumulativeDistance });

      return converted;
    }
    return waypoints;
  }, [fromPoint, toPoint, checkpoints, waypoints]);

  const waypointResults =
    results && dist !== undefined
      ? calculateWaypoints(waypointsForCalculation, results.groundSpeed, ff, flightParams, dist, results.climbPhase, ff, results.descentPhase)
      : [];


  return (
    <PageLayout currentPage="leg">
      <CalculatorPageHeader
        title="Leg Planner"
        description="Complete flight leg planning with course calculations, fuel consumption, waypoints, and time estimates"
        subtitle={description || undefined}
      />

      <main className="w-full max-w-4xl">
        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">
          {/* Section Header */}
          <div className="mb-6 pb-6 border-b border-gray-700 print:mb-3 print:pb-3">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <h2
                  className="text-xl sm:text-2xl font-bold mb-2 print:text-lg print:mb-1"
                  style={{ color: "white" }}
                >
                  Flight Parameters
                </h2>
                <p className="text-sm print:hidden" style={{ color: "oklch(0.7 0.02 240)" }}>
                  Enter heading, TAS, wind, distance, and fuel flow to get complete leg planning with waypoints and ETAs
                </p>
              </div>
              {/* Buttons - Desktop */}
              <div className="hidden md:flex gap-2">
                {/* Distance Calculator Button */}
                <div className="relative group">
                  <button
                    onClick={() => setIsDistanceModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-gray-600 hover:border-sky-500/50 hover:bg-sky-500/10 transition-all text-sm font-medium cursor-pointer whitespace-nowrap"
                    style={{ color: "oklch(0.65 0.15 230)" }}
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
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      />
                    </svg>
                    Route Lookup
                  </button>
                  {/* Custom Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none whitespace-nowrap border border-gray-700 z-50">
                    Search for two cities or airports to automatically populate True Heading, Distance, and Description fields
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900"></div>
                  </div>
                </div>
                {/* TAS Calculator Button */}
                <div className="relative group">
                  <button
                    onClick={() => setIsTASModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-gray-600 hover:border-green-500/50 hover:bg-green-500/10 transition-all text-sm font-medium cursor-pointer whitespace-nowrap"
                    style={{ color: "oklch(0.7 0.15 150)" }}
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
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    TAS Calculator
                  </button>
                  {/* Custom Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none whitespace-nowrap border border-gray-700 z-50">
                    Calculate True Airspeed from CAS, OAT, and altitude
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900"></div>
                  </div>
                </div>
                {/* Load Example Button */}
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
                    Load sample flight data to see how the calculator works
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900"></div>
                  </div>
                </div>
              </div>

              {/* Buttons - Mobile Menu */}
              <Menu as="div" className="relative md:hidden">
                <MenuButton className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-600 hover:bg-slate-700 transition-all text-sm font-medium cursor-pointer text-gray-300">
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
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                  Tools
                </MenuButton>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <MenuItems className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-slate-800 shadow-lg border border-gray-700 focus:outline-none z-10">
                    <div className="p-1">
                      <MenuItem>
                        {({ active }) => (
                          <button
                            onClick={() => setIsDistanceModalOpen(true)}
                            className={`${
                              active ? 'bg-slate-700' : ''
                            } group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sky-400 cursor-pointer`}
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
                                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                              />
                            </svg>
                            Route Lookup
                          </button>
                        )}
                      </MenuItem>
                      <MenuItem>
                        {({ active }) => (
                          <button
                            onClick={() => setIsTASModalOpen(true)}
                            className={`${
                              active ? 'bg-slate-700' : ''
                            } group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer`}
                            style={{ color: "oklch(0.7 0.15 150)" }}
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
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                              />
                            </svg>
                            TAS Calculator
                          </button>
                        )}
                      </MenuItem>
                      <MenuItem>
                        {({ active }) => (
                          <button
                            onClick={loadExample}
                            className={`${
                              active ? 'bg-slate-700' : ''
                            } group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer`}
                            style={{ color: "oklch(0.75 0.15 300)" }}
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
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                              />
                            </svg>
                            Load Example
                          </button>
                        )}
                      </MenuItem>
                    </div>
                  </MenuItems>
                </Transition>
              </Menu>
            </div>
          </div>

          {/* Description Input */}
          <div className="mb-6 print:mb-3">
            <label
              className="flex items-center text-sm font-medium mb-2 print:hidden"
              style={{ color: "oklch(0.72 0.015 240)" }}
            >
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white print:hidden"
              placeholder="e.g., KJFK to KLAX"
            />
          </div>

          {/* Input Fields - Grouped */}
          <div className="space-y-6 mb-8 print:space-y-3 print:mb-4">
            {/* Route Points (From/Via/To) - NEW: Priority placement */}
            <LegWaypointsTable
              fromPoint={fromPoint}
              toPoint={toPoint}
              checkpoints={checkpoints}
              onFromChange={setFromPoint}
              onToChange={setToPoint}
              onCheckpointsChange={setCheckpoints}
            />

            {/* Course & Speed */}
            <CourseSpeedInputs
              trueHeading={trueHeading}
              setTrueHeading={setTrueHeading}
              tas={tas}
              setTas={setTas}
              speedUnit={speedUnit}
              setSpeedUnit={setSpeedUnit}
            />

            {/* Leg Distance & Waypoints */}
            <div className="leg-distance-waypoints">
              <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
                Leg Distance & Waypoints
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem] gap-x-4 gap-y-4 lg:items-center print:grid-cols-[auto_1fr]">
                {/* Distance Label */}
                <label
                  className="flex items-center text-sm font-medium mb-2 lg:mb-0 lg:col-span-1 col-span-1"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Distance
                  <Tooltip content="The total distance of this flight leg in nautical miles. You can use the Route Lookup tool above to automatically calculate distance between two locations." />
                </label>

                {/* Distance Input */}
                <div className="relative lg:col-span-1 col-span-1">
                  <input
                    type="number"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    className="w-full px-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white text-right"
                    placeholder="0.0"
                    min="0"
                    step="0.1"
                  />
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                    style={{ color: "white" }}
                  >
                    NM
                  </span>
                </div>

                {/* Gap */}
                <div className="hidden lg:block print:hidden"></div>

                {/* Waypoints Label */}
                <label
                  className="flex items-center text-sm font-medium mb-2 lg:mb-0 lg:col-span-1 col-span-1 print-hide-waypoints"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Waypoints
                  <Tooltip content="Add intermediate waypoints for this leg. The calculator will compute ETAs and fuel consumption for each waypoint based on your ground speed and fuel flow." />
                </label>

                {/* Legacy Waypoints Button - DEPRECATED (hidden) */}
                <button
                  onClick={() => setIsWaypointsModalOpen(true)}
                  className="hidden"
                >
                  {waypoints.length > 0 ? (
                    <div className="flex flex-col items-center">
                      <span>✓ Waypoints Set</span>
                      <span className="text-xs mt-0.5">{waypoints.length} waypoint{waypoints.length !== 1 ? 's' : ''}</span>
                    </div>
                  ) : (
                    "Set Waypoints"
                  )}
                </button>
              </div>
            </div>

            {/* Wind */}
            <WindInputs
              windDir={windDir}
              setWindDir={setWindDir}
              windSpeed={windSpeed}
              setWindSpeed={setWindSpeed}
            />

            {/* Corrections */}
            <CorrectionsInputs
              magVar={magVar}
              setMagVar={setMagVar}
              deviationTable={deviationTable}
              onDeviationTableChange={setDeviationTable}
              aircraft={aircraft}
              onAircraftChange={setAircraft}
            />

            {/* Fuel Consumption */}
            <div className="fuel-consumption">
              <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
                Fuel Consumption
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-[10.5rem_6rem_5rem] gap-x-4 gap-y-4 lg:items-center print:grid-cols-[auto_1fr]">
                {/* Fuel Flow Label */}
                <label
                  className="flex items-center text-sm font-medium mb-2 lg:mb-0 lg:col-span-1 col-span-1"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Fuel Flow
                  <Tooltip content="Your aircraft's fuel consumption rate. This will be used to calculate total fuel used for the leg and ETAs for waypoints. Select your preferred units." />
                </label>

                {/* Container for input + selector on mobile */}
                <div className="grid grid-cols-[1fr_auto] gap-x-4 lg:contents print:grid">
                  {/* Fuel Flow Input */}
                  <input
                    type="number"
                    value={fuelFlow}
                    onChange={(e) => setFuelFlow(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                    placeholder="0.0"
                    min="0"
                    step="0.1"
                  />

                  {/* Fuel Unit Selector */}
                  <select
                    value={fuelUnit}
                    onChange={(e) => setFuelUnit(e.target.value as FuelUnit)}
                    className="w-22 lg:w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 text-white cursor-pointer appearance-none"
                    style={{
                      backgroundImage: 'none',
                    }}
                  >
                    <option value="gph">GPH</option>
                    <option value="lph">LPH</option>
                    <option value="pph">PPH</option>
                    <option value="kgh">KGH</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Flight Time Tracking */}
            <FlightParametersInputs
              departureTime={departureTime}
              setDepartureTime={setDepartureTime}
              elapsedMinutes={elapsedMinutes}
              setElapsedMinutes={setElapsedMinutes}
              elapsedDistance={elapsedDistance}
              setElapsedDistance={setElapsedDistance}
              previousFuelUsed={previousFuelUsed}
              setPreviousFuelUsed={setPreviousFuelUsed}
              fuelUnit={fuelUnit}
            />

            {/* Climb Data */}
            <ClimbDataInputs
              climbTas={climbTas}
              setClimbTas={setClimbTas}
              climbDistance={climbDistance}
              setClimbDistance={setClimbDistance}
              climbFuelUsed={climbFuelUsed}
              setClimbFuelUsed={setClimbFuelUsed}
              climbWindDir={climbWindDir}
              setClimbWindDir={setClimbWindDir}
              climbWindSpeed={climbWindSpeed}
              setClimbWindSpeed={setClimbWindSpeed}
              speedUnit={speedUnit}
              fuelUnit={fuelUnit}
            />

            {/* Descent Data */}
            <DescentDataInputs
              descentTas={descentTas}
              setDescentTas={setDescentTas}
              descentDistance={descentDistance}
              setDescentDistance={setDescentDistance}
              descentFuelUsed={descentFuelUsed}
              setDescentFuelUsed={setDescentFuelUsed}
              descentWindDir={descentWindDir}
              setDescentWindDir={setDescentWindDir}
              descentWindSpeed={descentWindSpeed}
              setDescentWindSpeed={setDescentWindSpeed}
              speedUnit={speedUnit}
              fuelUnit={fuelUnit}
            />

            {/* Additional Fuel */}
            <AdditionalFuelInput
              additionalFuel={additionalFuel}
              setAdditionalFuel={setAdditionalFuel}
              approachLandingFuel={approachLandingFuel}
              setApproachLandingFuel={setApproachLandingFuel}
              hasDescentData={!!(descentTas || descentDistance || descentFuelUsed)}
            />
          </div>

          {/* Results */}
          {results !== null && (
            <div className="space-y-6 print:space-y-3">
              {/* Intermediate Results */}
              <IntermediateResults
                results={results}
                fuelUnit={fuelUnit}
                fuelFlow={ff}
              />

              {/* Primary Results */}
              <PrimaryResults
                results={results}
                windDir={windDir}
                windSpeed={windSpeed}
                trueHeading={trueHeading}
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

              {/* Action Buttons - Organized by Priority */}
              {results.eta !== undefined && (() => {
                // Serialize plane data for next leg
                let serializedPlane: string | undefined = undefined;
                if (aircraft) {
                  const updatedAircraft = {
                    ...aircraft,
                    deviationTable: deviationTable.length > 0 ? deviationTable : aircraft.deviationTable,
                  };
                  serializedPlane = serializeAircraft(updatedAircraft, {
                    includeDeviationTable: true,
                  });
                }

                // Check if current leg is the last leg in the plan
                const currentLegIndex = legId && currentFlightPlan
                  ? currentFlightPlan.legs.find(l => l.id === legId)?.index
                  : undefined;
                const isLastLeg = currentLegIndex !== undefined && currentFlightPlan
                  ? currentLegIndex === currentFlightPlan.legs.length - 1
                  : false;

                // Calculate number of primary buttons to show
                const primaryButtonCount = (flightPlanId ? 1 : 0) + (isLastLeg ? 1 : 0) + (flightPlanId ? 1 : 0);
                const gridColsClass = primaryButtonCount === 3 ? 'md:grid-cols-3'
                  : primaryButtonCount === 2 ? 'md:grid-cols-2'
                  : 'md:grid-cols-1';

                return (
                  <div className="pt-4 print:hidden space-y-3">
                    {/* Primary Actions - Flight Plan Management */}
                    <div className={`grid grid-cols-1 gap-2 ${gridColsClass} md:max-w-lg md:mx-auto`}>
                      {/* Update/Save Flight Plan Button - Always show */}
                      <button
                        onClick={() => setIsFlightPlanModalOpen(true)}
                        className={`w-full px-6 py-3 rounded-xl border-2 transition-all text-center flex items-center justify-center gap-2 cursor-pointer ${
                          flightPlanId
                            ? "border-blue-500 bg-blue-600/20 hover:bg-blue-600/30"
                            : "border-gray-600 hover:border-gray-500 hover:bg-slate-700/50"
                        }`}
                        style={{ color: flightPlanId ? "oklch(0.8 0.15 230)" : "oklch(0.7 0.02 240)" }}
                      >
                        {flightPlanId ? (
                          <BookmarkSolidIcon className="w-5 h-5" />
                        ) : (
                          <BookmarkIcon className="w-5 h-5" />
                        )}
                        <span className="text-sm font-medium">
                          {flightPlanId && legId && currentFlightPlan
                            ? `Update Leg ${(currentFlightPlan.legs.find(l => l.id === legId)?.index ?? 0) + 1}`
                            : flightPlanId && currentFlightPlan
                            ? `Add Leg to ${currentFlightPlan.name}`
                            : "Save to Flight Plan"}
                        </span>
                      </button>

                      {/* Add New Leg Button - Second, only if current leg is last leg */}
                      {isLastLeg && (
                        <NewLegButton
                          magVar={magVar}
                          departureTime={departureTime}
                          deviationTable={initialDevTable}
                          plane={serializedPlane}
                          fuelFlow={fuelFlow}
                          tas={tas}
                          speedUnit={speedUnit}
                          fuelUnit={fuelUnit}
                          elapsedMinutes={(elapsedMins || 0) + Math.round((results.eta || 0) * 60)}
                          elapsedDistance={(elapsedDist || 0) + (dist || 0)}
                          windDir={windDir}
                          windSpeed={windSpeed}
                          fuelUsed={results.fuelUsed}
                          flightPlanId={flightPlanId}
                          flightPlanName={currentFlightPlan?.name}
                          toPoint={toPoint || undefined}
                        />
                      )}

                      {/* Open Plan Button - Third, only show if there's a flight plan */}
                      {flightPlanId && (
                        <Link
                          href={`/flight-plans/${flightPlanId}`}
                          className="w-full px-6 py-3 rounded-xl border-2 border-gray-600 hover:border-gray-500 hover:bg-slate-700/50 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
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
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <span className="text-sm font-medium">Open Plan</span>
                        </Link>
                      )}
                    </div>

                    {/* Secondary Actions - Share & Print */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:max-w-lg md:mx-auto">
                      <ShareButtonSimple
                        shareData={{
                          title: "José's Leg Planner",
                          text: `Wind: ${windDir}° at ${windSpeed} kt, Heading: ${trueHeading}° → GS: ${results?.groundSpeed.toFixed(1)} kt`,
                        }}
                      />
                      <button
                        onClick={() => window.print()}
                        className="w-full px-6 py-3 rounded-xl border-2 border-gray-600 hover:border-gray-500 hover:bg-slate-700/50 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
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
                            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                          />
                        </svg>
                        <span className="text-sm font-medium">Print</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
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
              the wind is coming FROM. WCA with E means turn left, WCA with W
              means turn right. {" "}
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

      {/* Distance Calculator Modal */}
      <DistanceCalculatorModal
        isOpen={isDistanceModalOpen}
        onClose={() => setIsDistanceModalOpen(false)}
        onApply={handleDistanceCalculatorApply}
        description="Search for cities or airports to populate True Heading, Distance, and Description fields for your flight plan"
      />

      {/* TAS Calculator Modal */}
      <TASCalculatorModal
        isOpen={isTASModalOpen}
        onClose={() => setIsTASModalOpen(false)}
        onApply={handleTASCalculatorApply}
        initialSpeedUnit={speedUnit}
        applyButtonText="Apply to Course"
        description="Calculate True Airspeed from Calibrated Airspeed, Outside Air Temperature, and Pressure Altitude"
      />

      {/* Flight Plan Modal */}
      <FlightPlanModal
        isOpen={isFlightPlanModalOpen}
        onClose={() => setIsFlightPlanModalOpen(false)}
        onSelect={handleFlightPlanSelect}
        currentFlightPlanId={flightPlanId}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </PageLayout>
  );
}
