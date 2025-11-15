"use client";

import { useState, useEffect, Fragment } from "react";
import { Menu, MenuButton, MenuItems, MenuItem, Transition } from "@headlessui/react";
import { PageLayout } from "../components/PageLayout";
import { Footer } from "../components/Footer";
import { CalculatorPageHeader } from "../components/CalculatorPageHeader";
import { calculateCourse } from "@/lib/courseCalculations";
import { DeviationEntry } from "../components/CompassDeviationModal";
import { DistanceCalculatorModal } from "../components/DistanceCalculatorModal";
import { TASCalculatorModal } from "../components/TASCalculatorModal";
import { compressForUrl, decompressFromUrl } from "@/lib/urlCompression";
import { loadAircraftFromUrl, serializeAircraft } from "@/lib/aircraftStorage";
import { AircraftPerformance } from "@/lib/aircraftPerformance";
import { CourseSpeedInputs, SpeedUnit } from "./components/CourseSpeedInputs";
import { WindInputs } from "./components/WindInputs";
import { CorrectionsInputs } from "./components/CorrectionsInputs";
import { ShareButtonSimple } from "../components/ShareButtonSimple";
import { toKnots } from "@/lib/speedConversion";
import { Tooltip } from "@/app/components/Tooltip";
import { formatCourse, formatAngle } from "@/lib/formatters";

interface CourseCalculatorClientProps {
  initialTh: string;
  initialTas: string;
  initialWd: string;
  initialWs: string;
  initialMagVar: string; // WMM convention (positive=E, negative=W)
  initialDist: string;
  initialFf: string;
  initialDevTable: string;
  initialPlane?: string;
  initialDesc: string;
  initialSpeedUnit: string;
  initialFuelUnit: string;
  initialWaypoints: string;
  initialDepTime: string;
  initialElapsedMin: string;
  initialPrevFuel: string;
}

export function CourseCalculatorClient({
  initialTh,
  initialTas,
  initialWd,
  initialWs,
  initialMagVar,
  initialDevTable,
  initialPlane,
  initialDesc,
  initialSpeedUnit,
}: CourseCalculatorClientProps) {
  const [trueHeading, setTrueHeading] = useState<string>(initialTh);
  const [tas, setTas] = useState<string>(initialTas);
  const [windDir, setWindDir] = useState<string>(initialWd);
  const [windSpeed, setWindSpeed] = useState<string>(initialWs);
  const [magVar, setMagVar] = useState<string>(initialMagVar);
  const [description, setDescription] = useState<string>(initialDesc);
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>(
    (initialSpeedUnit as SpeedUnit) || 'kt'
  );
  const [isDistanceModalOpen, setIsDistanceModalOpen] = useState(false);
  const [isTASModalOpen, setIsTASModalOpen] = useState(false);

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

  // Update URL when parameters change (client-side only, no page reload)
  useEffect(() => {
    const params = new URLSearchParams();
    if (trueHeading) params.set("th", trueHeading);
    if (tas) params.set("tas", tas);
    if (windDir) params.set("wd", windDir);
    if (windSpeed) params.set("ws", windSpeed);
    if (magVar) params.set("var", magVar); // Use 'var' (WMM convention) instead of 'md' (legacy)
    if (description) params.set("desc", description);
    if (speedUnit !== 'kt') params.set("unit", speedUnit);

    // Add aircraft with deviation table if exists
    if (aircraft && deviationTable.length > 0) {
      // Update aircraft with current deviation table
      const updatedAircraft = {
        ...aircraft,
        deviationTable: deviationTable,
      };
      // For course page, only serialize name, model, and deviation table
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

    // Use window.history.replaceState instead of router.replace to avoid server requests
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [trueHeading, tas, windDir, windSpeed, magVar, description, deviationTable, speedUnit, aircraft]);

  // Calculate results during render (not in useEffect to avoid cascading renders)
  const th = parseFloat(trueHeading);
  const tasVal = parseFloat(tas);
  // Convert TAS to knots for calculations
  const tasInKnots = !isNaN(tasVal) ? toKnots(tasVal, speedUnit) : NaN;
  const wd = windDir ? parseFloat(windDir) : 0; // Default to 0 if empty
  const ws = windSpeed ? parseFloat(windSpeed) : 0; // Default to 0 if empty

  // Convert magVar (WMM convention) to md (legacy) for calculations
  // WMM: positive=East, negative=West
  // Legacy: positive=West, negative=East
  // So: md = -magVar
  const md = magVar ? -parseFloat(magVar) : 0;

  // Load example data
  const loadExample = () => {
    setTrueHeading("090");
    setTas("120");
    setWindDir("180");
    setWindSpeed("25");
    setMagVar("5"); // WMM convention: positive = East
    setDescription("SAZS to SACO (Example)");
  };

  const handleDistanceCalculatorApply = (data: {
    bearing: number;
    distance: number;
    fromName: string;
    toName: string;
  }) => {
    setTrueHeading(data.bearing.toString().padStart(3, '0'));
    if (!description) {
      setDescription(`${data.fromName} to ${data.toName}`);
    }
  };

  const handleTASCalculatorApply = (data: { tas: number; speedUnit: SpeedUnit }) => {
    setTas(data.tas.toString());
    setSpeedUnit(data.speedUnit);
  };

  const results =
    !isNaN(th) &&
    !isNaN(tasInKnots) &&
    tasInKnots > 0
      ? calculateCourse({ th, tas: tasInKnots, md, wd, ws })
      : null;

  return (
    <PageLayout currentPage="course">
      <CalculatorPageHeader
        title="Course Calculator"
        description="Calculate wind correction angle, ground speed, and compass heading from true heading and wind conditions"
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
                  Course Calculator
                </h2>
                <p className="text-sm print:hidden" style={{ color: "oklch(0.7 0.02 240)" }}>
                  Enter true heading, TAS, and wind to get compass course and ground speed
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
                    Search for two cities or airports to automatically populate True Heading and Description fields
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
                    Load sample data to see how the calculator works
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
                            } group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sky-400`}
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
                            } group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm`}
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
                            } group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm`}
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
              magVar={magVar}
              setMagVar={setMagVar}
              deviationTable={deviationTable}
              onDeviationTableChange={setDeviationTable}
              aircraft={aircraft}
              onAircraftChange={setAircraft}
            />
          </div>

          {/* Results */}
          {results !== null && (
            <div className="space-y-6 print:space-y-3">
              {/* Intermediate Results */}
              <div className="print-page-break-before">
                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
                  Intermediate Values
                </h3>

                {/* All intermediate values in one row on desktop */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* Wind Correction Angle */}
                  <div className="p-3 rounded-lg bg-slate-900/30 border border-gray-700">
                    <div className="flex items-center justify-center mb-1">
                      <p className="text-xs font-medium" style={{ color: "white" }}>
                        WCA
                      </p>
                      <Tooltip content="Wind Correction Angle: The angle you need to adjust your heading to compensate for wind drift. Positive (East) means crosswind from right, negative (West) means crosswind from left." />
                    </div>
                    <p className="text-xl font-bold text-center" style={{ color: "white" }}>
                      {formatAngle(results.windCorrectionAngle, 0)}
                    </p>
                  </div>

                  {/* Magnetic Heading */}
                  <div className="p-3 rounded-lg bg-slate-900/30 border border-gray-700">
                    <div className="flex items-center justify-center mb-1">
                      <p className="text-xs font-medium" style={{ color: "white" }}>
                        MH
                      </p>
                      <Tooltip content="Magnetic Heading: The heading after applying wind correction angle and magnetic deviation. This is used to calculate the final Compass Course." />
                    </div>
                    <p className="text-xl font-bold text-center" style={{ color: "white" }}>
                      {String(Math.round(results.magneticHeading)).padStart(3, '0')}°
                    </p>
                  </div>

                  {/* Crosswind */}
                  <div className="p-3 rounded-lg bg-slate-900/30 border border-gray-700">
                    <div className="flex items-center justify-center mb-1">
                      <p className="text-xs font-medium" style={{ color: "white" }}>
                        Crosswind
                      </p>
                      <Tooltip content="The component of wind blowing perpendicular to your flight path. 'From right' means wind from your right, 'from left' means wind from your left." />
                    </div>
                    <p className="text-xl font-bold text-center" style={{ color: "white" }}>
                      {Math.round(Math.abs(results.crosswind))} KT
                    </p>
                    <p className="text-xs text-center mt-0.5" style={{ color: "oklch(0.7 0.02 240)" }}>
                      {results.crosswind > 0 ? "from right" : results.crosswind < 0 ? "from left" : "none"}
                    </p>
                  </div>

                  {/* Headwind/Tailwind */}
                  <div className="p-3 rounded-lg bg-slate-900/30 border border-gray-700">
                    <div className="flex items-center justify-center mb-1">
                      <p className="text-xs font-medium" style={{ color: "white" }}>
                        {results.headwind <= 0 ? "Headwind" : "Tailwind"}
                      </p>
                      <Tooltip content="The component of wind blowing along your flight path. Headwind slows you down, tailwind speeds you up. This directly affects your ground speed." />
                    </div>
                    <p className="text-xl font-bold text-center" style={{ color: "white" }}>
                      {Math.round(Math.abs(results.headwind))} KT
                    </p>
                  </div>

                  {/* ETAS */}
                  <div className={`p-3 rounded-lg ${results.etas ? 'bg-slate-900/30 border-amber-500/30' : 'bg-slate-900/20 border-gray-800'} border`}>
                    <div className="flex items-center justify-center mb-1">
                      <p className="text-xs font-medium" style={{ color: results.etas ? "oklch(0.65 0.15 60)" : "oklch(0.4 0.02 240)" }}>
                        ETAS
                      </p>
                      <Tooltip content="Effective True Air Speed - Your actual effective forward speed when flying at a large crab angle. ETAS = TAS × cos(WCA). Only calculated when wind correction angle exceeds 10°." />
                    </div>
                    <p className="text-xl font-bold text-center" style={{ color: results.etas ? "white" : "oklch(0.35 0.02 240)" }}>
                      {results.etas ? `${Math.round(results.etas)} KT` : '—'}
                    </p>
                    <p className="text-xs text-center mt-0.5" style={{ color: "oklch(0.4 0.02 240)" }}>
                      {results.etas ? 'WCA > 10°' : 'WCA ≤ 10°'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Primary Results */}
              <div>
                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
                  Results
                </h3>

                <div className="space-y-4">
                  {/* Primary Results - Ground Speed and Compass Course */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 primary-results-grid">
                    {/* Ground Speed */}
                    <div className="p-6 rounded-xl text-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
                      <div className="flex items-center justify-center mb-2">
                        <p
                          className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                          style={{ color: "oklch(0.65 0.15 230)" }}
                        >
                          Ground Speed
                        </p>
                        <Tooltip content="Ground Speed (GS) is your actual speed over the ground, accounting for wind. This is what determines your actual time en route. When WCA > 10°, GS is calculated using ETAS for improved accuracy." />
                      </div>
                      <p
                        className="text-3xl sm:text-4xl font-bold"
                        style={{ color: "white" }}
                      >
                        {Math.round(results.groundSpeed)}
                      </p>
                      <p
                        className="text-sm mt-1"
                        style={{ color: "oklch(0.6 0.02 240)" }}
                      >
                        KT
                      </p>
                    </div>

                    {/* Compass Course */}
                    <div className="p-6 rounded-xl text-center bg-linear-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30">
                      <div className="flex items-center justify-center mb-2">
                        <p
                          className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
                          style={{ color: "oklch(0.65 0.15 230)" }}
                        >
                          Compass Course
                        </p>
                        <Tooltip content="The actual heading to fly on your aircraft's compass. If you have a deviation table set, this is corrected for compass deviation. Otherwise, this equals your magnetic heading." />
                      </div>
                      <p
                        className="text-3xl sm:text-4xl font-bold"
                        style={{ color: "white" }}
                      >
                        {formatCourse(results.compassCourse)}
                      </p>
                      <p
                        className="text-sm mt-1"
                        style={{ color: "oklch(0.6 0.02 240)" }}
                        suppressHydrationWarning
                      >
                        {results.hasDeviationTable
                          ? "with deviation table"
                          : "= magnetic heading"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Two Column Layout on Desktop */}
              <div className="pt-4 print:hidden grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
                {/* Start Leg Planning Button */}
                <a
                  href={`/leg?th=${trueHeading}&tas=${tas}&wd=${windDir}&ws=${windSpeed}&var=${magVar}${description ? `&desc=${encodeURIComponent(description)}` : ''}${speedUnit !== 'kt' ? `&unit=${speedUnit}` : ''}${deviationTable.length > 0 ? `&devTable=${compressForUrl(deviationTable)}` : ''}`}
                  className="block px-6 py-4 rounded-xl bg-linear-to-br from-emerald-500/10 to-green-500/10 border-2 border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/20 transition-all text-center group"
                >
                  <div className="flex items-center justify-center gap-3">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="oklch(0.7 0.15 150)"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      />
                    </svg>
                    <span className="text-base font-semibold" style={{ color: "oklch(0.7 0.15 150)" }}>
                      Start Leg Planning
                    </span>
                    <svg
                      className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="oklch(0.7 0.15 150)"
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
                  <p className="text-xs mt-2" style={{ color: "oklch(0.6 0.02 240)" }}>
                    Continue with distance, fuel consumption, waypoints, and time estimates
                  </p>
                </a>

                {/* Share & Print Buttons (stacked) */}
                <div className="flex flex-col gap-2">
                  <ShareButtonSimple
                    shareData={{
                      title: "José's Course Calculator",
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
              {" "}<span className="font-semibold">For complete flight planning with fuel, time estimates, and waypoints, use the <a href="/leg" className="underline hover:text-sky-400 transition-colors">Leg Planner</a>.</span>
            </p>
          </div>
        </div>

      </main>

      <Footer description="Aviation calculations based on wind triangle principles" />

      {/* Distance Calculator Modal */}
      <DistanceCalculatorModal
        isOpen={isDistanceModalOpen}
        onClose={() => setIsDistanceModalOpen(false)}
        onApply={handleDistanceCalculatorApply}
        description="Search for cities or airports to populate True Heading and Description fields for your course calculation"
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
    </PageLayout>
  );
}
