"use client";

import { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { Navbar } from "@/app/components/Navbar";
import {
  AircraftPerformance,
  ResolvedAircraftPerformance,
  ClimbPerformance,
  CruisePerformance,
  TakeoffPerformance,
  LandingPerformance,
  DeviationEntry,
  PRESET_AIRCRAFT,
} from "@/lib/aircraft";
import {
  getRawAircraftByModel,
  updateAircraft,
  resolveAircraft,
} from "@/lib/aircraftStorage";

interface AircraftEditorClientProps {
  aircraftId: string;
}

export function AircraftEditorClient({ aircraftId }: AircraftEditorClientProps) {
  const router = useRouter();
  const [aircraft, setAircraft] = useState<AircraftPerformance | null>(null);
  const [resolved, setResolved] = useState<ResolvedAircraftPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Track which sections are inheriting from preset (only for inherited aircraft)
  const [inheritWeights, setInheritWeights] = useState(true);
  const [inheritEngine, setInheritEngine] = useState(true);
  const [inheritLimits, setInheritLimits] = useState(true);
  const [inheritClimbTable, setInheritClimbTable] = useState(true);
  const [inheritCruiseTable, setInheritCruiseTable] = useState(true);
  const [inheritTakeoffTable, setInheritTakeoffTable] = useState(true);
  const [inheritLandingTable, setInheritLandingTable] = useState(true);
  const [inheritDeviationTable, setInheritDeviationTable] = useState(true);

  useEffect(() => {
    const loaded = getRawAircraftByModel(aircraftId);
    if (!loaded) {
      router.push("/my-planes");
      return;
    }

    const resolved = resolveAircraft(loaded);
    setAircraft(loaded);
    setResolved(resolved);

    // Initialize inheritance flags based on what's actually stored
    if (loaded.inherit) {
      setInheritWeights(!loaded.weights);
      setInheritEngine(!loaded.engine);
      setInheritLimits(!loaded.limits);
      setInheritClimbTable(!loaded.climbTable);
      setInheritCruiseTable(!loaded.cruiseTable);
      setInheritTakeoffTable(!loaded.takeoffTable);
      setInheritLandingTable(!loaded.landingTable);
      setInheritDeviationTable(!loaded.deviationTable);
    } else {
      // Not inheriting, so all sections are custom
      setInheritWeights(false);
      setInheritEngine(false);
      setInheritLimits(false);
      setInheritClimbTable(false);
      setInheritCruiseTable(false);
      setInheritTakeoffTable(false);
      setInheritLandingTable(false);
      setInheritDeviationTable(false);
    }

    setLoading(false);
  }, [aircraftId, router]);

  const handleSave = async () => {
    if (!aircraft) return;

    setSaving(true);
    try {
      // Build the aircraft to save, respecting inheritance flags
      const toSave: AircraftPerformance = {
        name: aircraft.name,
        model: aircraft.model,
        inherit: aircraft.inherit,
      };

      // Only include sections that are NOT inheriting
      if (!inheritWeights && aircraft.weights) {
        toSave.weights = aircraft.weights;
      }
      if (!inheritEngine && aircraft.engine) {
        toSave.engine = aircraft.engine;
      }
      if (!inheritLimits && aircraft.limits) {
        toSave.limits = aircraft.limits;
      }
      if (!inheritClimbTable && aircraft.climbTable) {
        toSave.climbTable = aircraft.climbTable;
      }
      if (!inheritCruiseTable && aircraft.cruiseTable) {
        toSave.cruiseTable = aircraft.cruiseTable;
      }
      if (!inheritTakeoffTable && aircraft.takeoffTable) {
        toSave.takeoffTable = aircraft.takeoffTable;
      }
      if (!inheritLandingTable && aircraft.landingTable) {
        toSave.landingTable = aircraft.landingTable;
      }
      if (!inheritDeviationTable && aircraft.deviationTable) {
        toSave.deviationTable = aircraft.deviationTable;
      }

      // Always include other optional fields
      if (aircraft.serviceCeiling) toSave.serviceCeiling = aircraft.serviceCeiling;

      // Update in localStorage (replace mode to properly remove sections)
      updateAircraft(toSave.model, toSave, true);

      // Navigate back to my-planes
      router.push("/my-planes");
    } catch (error) {
      console.error("Failed to save aircraft:", error);
      alert("Failed to save aircraft");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push("/my-planes");
  };

  // Helper to update resolved aircraft when aircraft changes
  const updateAircraftField = (updates: Partial<AircraftPerformance>) => {
    const updated = { ...aircraft!, ...updates };
    setAircraft(updated);
    setResolved(resolveAircraft(updated));
  };

  // Climb table manipulation functions
  const addClimbRow = () => {
    const lastRow = resolved!.climbTable[resolved!.climbTable.length - 1];
    const newRow: ClimbPerformance = {
      altitudeFrom: lastRow?.altitudeTo || 0,
      altitudeTo: (lastRow?.altitudeTo || 0) + 2000,
      rateOfClimb: 500,
      climbTAS: 70,
      fuelFlow: 6.0,
    };

    const updatedTable = [...resolved!.climbTable, newRow];
    updateAircraftField({ climbTable: updatedTable });
  };

  const removeClimbRow = (index: number) => {
    if (resolved!.climbTable.length > 1) {
      const updatedTable = resolved!.climbTable.filter((_, i) => i !== index);
      updateAircraftField({ climbTable: updatedTable });
    }
  };

  const updateClimbRow = (index: number, field: keyof ClimbPerformance, value: number) => {
    const updatedTable = [...resolved!.climbTable];
    updatedTable[index] = { ...updatedTable[index], [field]: value };
    updateAircraftField({ climbTable: updatedTable });
  };

  // Cruise table manipulation functions
  const addCruiseRow = () => {
    const lastRow = resolved!.cruiseTable[resolved!.cruiseTable.length - 1];
    const newRow: CruisePerformance = {
      altitude: lastRow?.altitude ? lastRow.altitude + 1000 : 3000,
      rpm: lastRow?.rpm || 2400,
      percentPower: lastRow?.percentPower || 65,
      tas: lastRow?.tas || 100,
      fuelFlow: lastRow?.fuelFlow || 6.0,
    };

    const updatedTable = [...resolved!.cruiseTable, newRow];
    updateAircraftField({ cruiseTable: updatedTable });
  };

  const removeCruiseRow = (index: number) => {
    if (resolved!.cruiseTable.length > 1) {
      const updatedTable = resolved!.cruiseTable.filter((_, i) => i !== index);
      updateAircraftField({ cruiseTable: updatedTable });
    }
  };

  const updateCruiseRow = (index: number, field: keyof CruisePerformance, value: number) => {
    const updatedTable = [...resolved!.cruiseTable];
    updatedTable[index] = { ...updatedTable[index], [field]: value };
    updateAircraftField({ cruiseTable: updatedTable });
  };

  // Takeoff table manipulation functions
  const addTakeoffRow = () => {
    const lastRow = resolved!.takeoffTable?.[resolved!.takeoffTable.length - 1];
    const newRow: TakeoffPerformance = {
      altitude: lastRow?.altitude ? lastRow.altitude + 1000 : 0,
      oat: lastRow?.oat ? lastRow.oat + 10 : 0,
      groundRoll: lastRow?.groundRoll || 1000,
      over50ft: lastRow?.over50ft || 2000,
    };

    const updatedTable = [...(resolved!.takeoffTable || []), newRow];
    updateAircraftField({ takeoffTable: updatedTable });
  };

  const removeTakeoffRow = (index: number) => {
    if (resolved!.takeoffTable && resolved!.takeoffTable.length > 1) {
      const updatedTable = resolved!.takeoffTable.filter((_, i) => i !== index);
      updateAircraftField({ takeoffTable: updatedTable });
    }
  };

  const updateTakeoffRow = (index: number, field: keyof TakeoffPerformance, value: number) => {
    if (!resolved!.takeoffTable) return;
    const updatedTable = [...resolved!.takeoffTable];
    updatedTable[index] = { ...updatedTable[index], [field]: value };
    updateAircraftField({ takeoffTable: updatedTable });
  };

  // Landing table manipulation functions
  const addLandingRow = () => {
    const lastRow = resolved!.landingTable?.[resolved!.landingTable.length - 1];
    const newRow: LandingPerformance = {
      altitude: lastRow?.altitude ? lastRow.altitude + 1000 : 0,
      oat: lastRow?.oat ? lastRow.oat + 10 : 0,
      groundRoll: lastRow?.groundRoll || 500,
      over50ft: lastRow?.over50ft || 1500,
    };

    const updatedTable = [...(resolved!.landingTable || []), newRow];
    updateAircraftField({ landingTable: updatedTable });
  };

  const removeLandingRow = (index: number) => {
    if (resolved!.landingTable && resolved!.landingTable.length > 1) {
      const updatedTable = resolved!.landingTable.filter((_, i) => i !== index);
      updateAircraftField({ landingTable: updatedTable });
    }
  };

  const updateLandingRow = (index: number, field: keyof LandingPerformance, value: number) => {
    if (!resolved!.landingTable) return;
    const updatedTable = [...resolved!.landingTable];
    updatedTable[index] = { ...updatedTable[index], [field]: value };
    updateAircraftField({ landingTable: updatedTable });
  };

  // Deviation table manipulation functions
  const addDeviationRow = () => {
    const lastRow = resolved!.deviationTable?.[resolved!.deviationTable.length - 1];
    const newRow: DeviationEntry = {
      forHeading: lastRow?.forHeading !== undefined ? (lastRow.forHeading + 30) % 360 : 0,
      steerHeading: lastRow?.steerHeading !== undefined ? (lastRow.steerHeading + 30) % 360 : 0,
    };

    const updatedTable = [...(resolved!.deviationTable || []), newRow];
    updateAircraftField({ deviationTable: updatedTable });
  };

  const removeDeviationRow = (index: number) => {
    if (resolved!.deviationTable && resolved!.deviationTable.length > 1) {
      const updatedTable = resolved!.deviationTable.filter((_, i) => i !== index);
      updateAircraftField({ deviationTable: updatedTable });
    }
  };

  const updateDeviationRow = (index: number, field: keyof DeviationEntry, value: number) => {
    if (!resolved!.deviationTable) return;
    const updatedTable = [...resolved!.deviationTable];
    updatedTable[index] = { ...updatedTable[index], [field]: value };
    updateAircraftField({ deviationTable: updatedTable });
  };

  // Toggle inheritance for a section
  const toggleInheritance = (section: 'weights' | 'engine' | 'limits' | 'climbTable' | 'cruiseTable' | 'takeoffTable' | 'landingTable' | 'deviationTable', inherit: boolean) => {
    if (section === 'weights') {
      setInheritWeights(inherit);
      if (inherit) {
        // Remove custom weights, will inherit from preset
        const updated = { ...aircraft! };
        delete updated.weights;
        setAircraft(updated);
        setResolved(resolveAircraft(updated));
      } else {
        // Copy current resolved weights to make them custom
        const updated = { ...aircraft!, weights: { ...resolved!.weights } };
        setAircraft(updated);
        setResolved(resolveAircraft(updated));
      }
    } else if (section === 'engine') {
      setInheritEngine(inherit);
      if (inherit) {
        const updated = { ...aircraft! };
        delete updated.engine;
        setAircraft(updated);
        setResolved(resolveAircraft(updated));
      } else {
        const updated = { ...aircraft!, engine: { ...resolved!.engine } };
        setAircraft(updated);
        setResolved(resolveAircraft(updated));
      }
    } else if (section === 'limits') {
      setInheritLimits(inherit);
      if (inherit) {
        const updated = { ...aircraft! };
        delete updated.limits;
        setAircraft(updated);
        setResolved(resolveAircraft(updated));
      } else {
        const updated = { ...aircraft!, limits: { ...resolved!.limits } };
        setAircraft(updated);
        setResolved(resolveAircraft(updated));
      }
    } else if (section === 'climbTable') {
      setInheritClimbTable(inherit);
      if (inherit) {
        const updated = { ...aircraft! };
        delete updated.climbTable;
        setAircraft(updated);
        setResolved(resolveAircraft(updated));
      } else {
        const updated = { ...aircraft!, climbTable: JSON.parse(JSON.stringify(resolved!.climbTable)) };
        setAircraft(updated);
        setResolved(resolveAircraft(updated));
      }
    } else if (section === 'cruiseTable') {
      setInheritCruiseTable(inherit);
      if (inherit) {
        const updated = { ...aircraft! };
        delete updated.cruiseTable;
        setAircraft(updated);
        setResolved(resolveAircraft(updated));
      } else {
        const updated = { ...aircraft!, cruiseTable: JSON.parse(JSON.stringify(resolved!.cruiseTable)) };
        setAircraft(updated);
        setResolved(resolveAircraft(updated));
      }
    } else if (section === 'takeoffTable') {
      setInheritTakeoffTable(inherit);
      if (inherit) {
        const updated = { ...aircraft! };
        delete updated.takeoffTable;
        setAircraft(updated);
        setResolved(resolveAircraft(updated));
      } else {
        const updated = { ...aircraft!, takeoffTable: resolved!.takeoffTable ? JSON.parse(JSON.stringify(resolved!.takeoffTable)) : [] };
        setAircraft(updated);
        setResolved(resolveAircraft(updated));
      }
    } else if (section === 'landingTable') {
      setInheritLandingTable(inherit);
      if (inherit) {
        const updated = { ...aircraft! };
        delete updated.landingTable;
        setAircraft(updated);
        setResolved(resolveAircraft(updated));
      } else {
        const updated = { ...aircraft!, landingTable: resolved!.landingTable ? JSON.parse(JSON.stringify(resolved!.landingTable)) : [] };
        setAircraft(updated);
        setResolved(resolveAircraft(updated));
      }
    } else if (section === 'deviationTable') {
      setInheritDeviationTable(inherit);
      if (inherit) {
        const updated = { ...aircraft! };
        delete updated.deviationTable;
        setAircraft(updated);
        setResolved(resolveAircraft(updated));
      } else {
        const updated = { ...aircraft!, deviationTable: resolved!.deviationTable ? JSON.parse(JSON.stringify(resolved!.deviationTable)) : [] };
        setAircraft(updated);
        setResolved(resolveAircraft(updated));
      }
    }
  };

  if (loading || !aircraft || !resolved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <Navbar currentPage="my-planes" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-white text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  const isPreset = PRESET_AIRCRAFT.some(p => p.model === aircraft.model);
  const parent = aircraft.inherit ? PRESET_AIRCRAFT.find(p => p.model === aircraft.inherit) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <Navbar currentPage="my-planes" />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-white">
                {isPreset ? "View Aircraft" : "Edit Aircraft"}
              </h1>
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  {isPreset ? "Close" : "Cancel"}
                </button>
                {!isPreset && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                )}
              </div>
            </div>
            <p className="text-slate-400 text-sm">
              {parent && (
                <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-300 rounded mr-2 text-xs">
                  Inherits from {parent.name}
                </span>
              )}
              {isPreset ? "Preset aircraft are read-only. Fork to create a custom copy." : "Modify aircraft performance data"}
            </p>
          </div>

          {/* Tabs */}
          <TabGroup>
            <TabList className="flex gap-2 border-b border-slate-700 mb-6 overflow-x-auto">
              {["Basic Info", "Engine & Limits", "Climb Table", "Cruise Table", "Takeoff/Landing", "Compass Deviation"].map((tab) => (
                <Tab key={tab} as={Fragment}>
                  {({ selected }) => (
                    <button
                      className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        selected
                          ? "text-sky-400 border-b-2 border-sky-400"
                          : "text-slate-400 hover:text-slate-300"
                      }`}
                    >
                      {tab}
                    </button>
                  )}
                </Tab>
              ))}
            </TabList>

            <TabPanels>
              {/* Basic Info Tab */}
              <TabPanel>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Aircraft Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Aircraft Name
                      </label>
                      <input
                        type="text"
                        value={aircraft.name}
                        onChange={(e) => updateAircraftField({ name: e.target.value })}
                        disabled={isPreset}
                        className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Model ID */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Model ID
                      </label>
                      <input
                        type="text"
                        value={aircraft.model}
                        disabled
                        className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-slate-600 text-slate-400 font-mono cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Weights */}
                  {(() => {
                    const weights = resolved.weights;
                    if (!weights) return null;

                    return (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-white">Aircraft Weights</h3>
                          {aircraft.inherit && parent && !isPreset && (
                            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={inheritWeights}
                                onChange={(e) => toggleInheritance('weights', e.target.checked)}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-sky-600 focus:ring-2 focus:ring-sky-500 cursor-pointer"
                              />
                              <span>Use {parent.name} settings</span>
                            </label>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Empty Weight (lbs)
                            </label>
                            <input
                              type="number"
                              value={weights.emptyWeight}
                              onChange={(e) => updateAircraftField({
                                weights: {
                                  emptyWeight: parseFloat(e.target.value) || 0,
                                  standardWeight: weights.standardWeight,
                                  maxGrossWeight: weights.maxGrossWeight,
                                }
                              })}
                              disabled={isPreset || inheritWeights}
                              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Standard Weight (lbs)
                            </label>
                            <input
                              type="number"
                              value={weights.standardWeight || ""}
                              onChange={(e) => updateAircraftField({
                                weights: {
                                  emptyWeight: weights.emptyWeight,
                                  standardWeight: parseFloat(e.target.value) || undefined,
                                  maxGrossWeight: weights.maxGrossWeight,
                                }
                              })}
                              disabled={isPreset || inheritWeights}
                              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Max Gross Weight (lbs)
                            </label>
                            <input
                              type="number"
                              value={weights.maxGrossWeight}
                              onChange={(e) => updateAircraftField({
                                weights: {
                                  emptyWeight: weights.emptyWeight,
                                  standardWeight: weights.standardWeight,
                                  maxGrossWeight: parseFloat(e.target.value) || 0,
                                }
                              })}
                              disabled={isPreset || inheritWeights}
                              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </TabPanel>

              {/* Engine & Limits Tab */}
              <TabPanel>
                <div className="space-y-8">
                  {/* Engine Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Engine Data</h3>
                      {aircraft.inherit && parent && !isPreset && (
                        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={inheritEngine}
                            onChange={(e) => toggleInheritance('engine', e.target.checked)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-sky-600 focus:ring-2 focus:ring-sky-500 cursor-pointer"
                          />
                          <span>Use {parent.name} settings</span>
                        </label>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Engine Type
                        </label>
                        <input
                          type="text"
                          value={resolved.engine.type}
                          onChange={(e) => updateAircraftField({
                            engine: { ...resolved.engine, type: e.target.value }
                          })}
                          disabled={isPreset || inheritEngine}
                          className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Max RPM
                        </label>
                        <input
                          type="number"
                          value={resolved.engine.maxRPM}
                          onChange={(e) => updateAircraftField({
                            engine: { ...resolved.engine, maxRPM: parseFloat(e.target.value) || 0 }
                          })}
                          disabled={isPreset || inheritEngine}
                          className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Rated HP
                        </label>
                        <input
                          type="number"
                          value={resolved.engine.ratedHP}
                          onChange={(e) => updateAircraftField({
                            engine: { ...resolved.engine, ratedHP: parseFloat(e.target.value) || 0 }
                          })}
                          disabled={isPreset || inheritEngine}
                          className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Usable Fuel (gallons)
                        </label>
                        <input
                          type="number"
                          value={resolved.engine.usableFuelGallons}
                          onChange={(e) => updateAircraftField({
                            engine: { ...resolved.engine, usableFuelGallons: parseFloat(e.target.value) || 0 }
                          })}
                          disabled={isPreset || inheritEngine}
                          className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          SFC (lbs/hp/hr) - Optional
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={resolved.engine.specificFuelConsumption || ""}
                          onChange={(e) => updateAircraftField({
                            engine: { ...resolved.engine, specificFuelConsumption: parseFloat(e.target.value) || undefined }
                          })}
                          disabled={isPreset || inheritEngine}
                          placeholder="0.45"
                          className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Limits Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">V-Speeds & Limitations</h3>
                      {aircraft.inherit && parent && !isPreset && (
                        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={inheritLimits}
                            onChange={(e) => toggleInheritance('limits', e.target.checked)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-sky-600 focus:ring-2 focus:ring-sky-500 cursor-pointer"
                          />
                          <span>Use {parent.name} settings</span>
                        </label>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          VNE (KIAS)
                        </label>
                        <input
                          type="number"
                          value={resolved.limits.vne}
                          onChange={(e) => updateAircraftField({
                            limits: { ...resolved.limits, vne: parseFloat(e.target.value) || 0 }
                          })}
                          disabled={isPreset || inheritLimits}
                          className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          VNO (KIAS)
                        </label>
                        <input
                          type="number"
                          value={resolved.limits.vno}
                          onChange={(e) => updateAircraftField({
                            limits: { ...resolved.limits, vno: parseFloat(e.target.value) || 0 }
                          })}
                          disabled={isPreset || inheritLimits}
                          className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          VA (KIAS)
                        </label>
                        <input
                          type="number"
                          value={resolved.limits.va}
                          onChange={(e) => updateAircraftField({
                            limits: { ...resolved.limits, va: parseFloat(e.target.value) || 0 }
                          })}
                          disabled={isPreset || inheritLimits}
                          className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          VFE (KIAS)
                        </label>
                        <input
                          type="number"
                          value={resolved.limits.vfe}
                          onChange={(e) => updateAircraftField({
                            limits: { ...resolved.limits, vfe: parseFloat(e.target.value) || 0 }
                          })}
                          disabled={isPreset || inheritLimits}
                          className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          VS (KIAS)
                        </label>
                        <input
                          type="number"
                          value={resolved.limits.vs}
                          onChange={(e) => updateAircraftField({
                            limits: { ...resolved.limits, vs: parseFloat(e.target.value) || 0 }
                          })}
                          disabled={isPreset || inheritLimits}
                          className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          VS0 (KIAS)
                        </label>
                        <input
                          type="number"
                          value={resolved.limits.vs0}
                          onChange={(e) => updateAircraftField({
                            limits: { ...resolved.limits, vs0: parseFloat(e.target.value) || 0 }
                          })}
                          disabled={isPreset || inheritLimits}
                          className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabPanel>

              {/* Climb Table Tab */}
              <TabPanel>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Climb Performance Table</h3>
                    <p className="text-sm text-slate-400 mb-4">
                      Defines climb performance at different altitude ranges. Rate of climb, TAS, and fuel flow help calculate climb time and fuel consumption.
                    </p>
                    <div className="flex items-center justify-between">
                      <div></div>
                      <div className="flex items-center gap-4">
                        {aircraft.inherit && parent && !isPreset && (
                          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={inheritClimbTable}
                              onChange={(e) => toggleInheritance('climbTable', e.target.checked)}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-sky-600 focus:ring-2 focus:ring-sky-500 cursor-pointer"
                            />
                            <span>Use {parent.name} settings</span>
                          </label>
                        )}
                        {!isPreset && !inheritClimbTable && (
                          <button
                            onClick={addClimbRow}
                            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                          >
                            + Add Row
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Table with horizontal scroll on mobile */}
                  <div className="overflow-x-auto rounded-xl border border-slate-700">
                    <table className="w-full min-w-[800px]">
                      <thead className="bg-slate-900/50">
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">From Alt (ft)</th>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">To Alt (ft)</th>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">ROC (fpm)</th>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">TAS (KT)</th>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">Fuel Flow (gph)</th>
                          {!isPreset && !inheritClimbTable && (
                            <th className="text-center py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {resolved.climbTable.map((row, index) => (
                          <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                value={row.altitudeFrom}
                                onChange={(e) => updateClimbRow(index, 'altitudeFrom', parseFloat(e.target.value) || 0)}
                                disabled={isPreset || inheritClimbTable}
                                className="w-full min-w-[100px] px-3 py-2 rounded-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                value={row.altitudeTo}
                                onChange={(e) => updateClimbRow(index, 'altitudeTo', parseFloat(e.target.value) || 0)}
                                disabled={isPreset || inheritClimbTable}
                                className="w-full min-w-[100px] px-3 py-2 rounded-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                value={row.rateOfClimb}
                                onChange={(e) => updateClimbRow(index, 'rateOfClimb', parseFloat(e.target.value) || 0)}
                                disabled={isPreset || inheritClimbTable}
                                className="w-full min-w-[100px] px-3 py-2 rounded-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                value={row.climbTAS}
                                onChange={(e) => updateClimbRow(index, 'climbTAS', parseFloat(e.target.value) || 0)}
                                disabled={isPreset || inheritClimbTable}
                                className="w-full min-w-[100px] px-3 py-2 rounded-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                step="0.1"
                                value={row.fuelFlow}
                                onChange={(e) => updateClimbRow(index, 'fuelFlow', parseFloat(e.target.value) || 0)}
                                disabled={isPreset || inheritClimbTable}
                                className="w-full min-w-[100px] px-3 py-2 rounded-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>
                            {!isPreset && !inheritClimbTable && (
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => removeClimbRow(index)}
                                  disabled={resolved.climbTable.length === 1}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                                  title="Remove row"
                                >
                                  Remove
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabPanel>

              {/* Cruise Table Tab */}
              <TabPanel>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Cruise Performance Table</h3>
                    <p className="text-sm text-slate-400 mb-4">
                      Cruise performance at different altitudes and power settings. Use this data to plan your cruise speed and fuel consumption at various power levels.
                    </p>
                    <div className="flex items-center justify-between">
                      <div></div>
                      <div className="flex items-center gap-4">
                        {aircraft.inherit && parent && !isPreset && (
                          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={inheritCruiseTable}
                              onChange={(e) => toggleInheritance('cruiseTable', e.target.checked)}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-sky-600 focus:ring-2 focus:ring-sky-500 cursor-pointer"
                            />
                            <span>Use {parent.name} settings</span>
                          </label>
                        )}
                        {!isPreset && !inheritCruiseTable && (
                          <button
                            onClick={addCruiseRow}
                            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                          >
                            + Add Row
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Table with horizontal scroll on mobile */}
                  <div className="overflow-x-auto rounded-xl border border-slate-700">
                    <table className="w-full min-w-[800px]">
                      <thead className="bg-slate-900/50">
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">Altitude (ft)</th>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">RPM</th>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">Power (%)</th>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">TAS (KT)</th>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">Fuel Flow (gph)</th>
                          {!isPreset && !inheritCruiseTable && (
                            <th className="text-center py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {resolved.cruiseTable.map((row, index) => (
                          <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                value={row.altitude}
                                onChange={(e) => updateCruiseRow(index, 'altitude', parseFloat(e.target.value) || 0)}
                                disabled={isPreset || inheritCruiseTable}
                                className="w-full min-w-[100px] px-3 py-2 rounded-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                value={row.rpm}
                                onChange={(e) => updateCruiseRow(index, 'rpm', parseFloat(e.target.value) || 0)}
                                disabled={isPreset || inheritCruiseTable}
                                className="w-full min-w-[100px] px-3 py-2 rounded-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                value={row.percentPower}
                                onChange={(e) => updateCruiseRow(index, 'percentPower', parseFloat(e.target.value) || 0)}
                                disabled={isPreset || inheritCruiseTable}
                                className="w-full min-w-[100px] px-3 py-2 rounded-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                value={row.tas}
                                onChange={(e) => updateCruiseRow(index, 'tas', parseFloat(e.target.value) || 0)}
                                disabled={isPreset || inheritCruiseTable}
                                className="w-full min-w-[100px] px-3 py-2 rounded-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                step="0.1"
                                value={row.fuelFlow}
                                onChange={(e) => updateCruiseRow(index, 'fuelFlow', parseFloat(e.target.value) || 0)}
                                disabled={isPreset || inheritCruiseTable}
                                className="w-full min-w-[100px] px-3 py-2 rounded-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>
                            {!isPreset && !inheritCruiseTable && (
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => removeCruiseRow(index)}
                                  disabled={resolved.cruiseTable.length === 1}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                                  title="Remove row"
                                >
                                  Remove
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabPanel>

              {/* Takeoff/Landing Tab */}
              <TabPanel>
                <div className="space-y-8">
                  {/* Takeoff Performance Table */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Takeoff Performance Table</h3>
                      <p className="text-sm text-slate-400 mb-4">
                        Takeoff distances at different altitudes and temperatures. Ground roll is the distance needed to lift off, while Over 50ft includes the distance to clear a 50-foot obstacle.
                      </p>
                      <div className="flex items-center justify-between">
                        <div></div>
                        <div className="flex items-center gap-4">
                          {aircraft.inherit && parent && !isPreset && (
                            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={inheritTakeoffTable}
                                onChange={(e) => toggleInheritance('takeoffTable', e.target.checked)}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-sky-600 focus:ring-2 focus:ring-sky-500 cursor-pointer"
                              />
                              <span>Use {parent.name} settings</span>
                            </label>
                          )}
                          {!isPreset && !inheritTakeoffTable && (
                            <button
                              onClick={addTakeoffRow}
                              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                            >
                              + Add Row
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-700">
                      <table className="w-full min-w-[800px]">
                        <thead className="bg-slate-900/50">
                          <tr className="border-b border-slate-700">
                            <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">Altitude (ft)</th>
                            <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">OAT (°C)</th>
                            <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">Ground Roll (ft)</th>
                            <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">Over 50ft (ft)</th>
                            {!isPreset && !inheritTakeoffTable && (
                              <th className="text-center py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">Actions</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {(resolved.takeoffTable || []).map((row, index) => (
                            <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  value={row.altitude}
                                  onChange={(e) => updateTakeoffRow(index, 'altitude', parseFloat(e.target.value) || 0)}
                                  disabled={isPreset || inheritTakeoffTable}
                                  className="w-full min-w-[100px] px-3 py-2 rounded-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  value={row.oat}
                                  onChange={(e) => updateTakeoffRow(index, 'oat', parseFloat(e.target.value) || 0)}
                                  disabled={isPreset || inheritTakeoffTable}
                                  className="w-full min-w-[100px] px-3 py-2 rounded-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  value={row.groundRoll}
                                  onChange={(e) => updateTakeoffRow(index, 'groundRoll', parseFloat(e.target.value) || 0)}
                                  disabled={isPreset || inheritTakeoffTable}
                                  className="w-full min-w-[100px] px-3 py-2 rounded-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  value={row.over50ft}
                                  onChange={(e) => updateTakeoffRow(index, 'over50ft', parseFloat(e.target.value) || 0)}
                                  disabled={isPreset || inheritTakeoffTable}
                                  className="w-full min-w-[100px] px-3 py-2 rounded-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              </td>
                              {!isPreset && !inheritTakeoffTable && (
                                <td className="py-3 px-4 text-center">
                                  <button
                                    onClick={() => removeTakeoffRow(index)}
                                    disabled={(resolved.takeoffTable?.length || 0) === 1}
                                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                                  >
                                    Remove
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Landing Performance Table */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Landing Performance Table</h3>
                      <p className="text-sm text-slate-400 mb-4">
                        Landing distances at different altitudes and temperatures. Ground roll is the distance from touchdown to full stop, while Over 50ft includes the approach distance from a 50-foot obstacle.
                      </p>
                      <div className="flex items-center justify-between">
                        <div></div>
                        <div className="flex items-center gap-4">
                          {aircraft.inherit && parent && !isPreset && (
                            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={inheritLandingTable}
                                onChange={(e) => toggleInheritance('landingTable', e.target.checked)}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-sky-600 focus:ring-2 focus:ring-sky-500 cursor-pointer"
                              />
                              <span>Use {parent.name} settings</span>
                            </label>
                          )}
                          {!isPreset && !inheritLandingTable && (
                            <button
                              onClick={addLandingRow}
                              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                            >
                              + Add Row
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-700">
                      <table className="w-full min-w-[800px]">
                        <thead className="bg-slate-900/50">
                          <tr className="border-b border-slate-700">
                            <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">Altitude (ft)</th>
                            <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">OAT (°C)</th>
                            <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">Ground Roll (ft)</th>
                            <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">Over 50ft (ft)</th>
                            {!isPreset && !inheritLandingTable && (
                              <th className="text-center py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">Actions</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {(resolved.landingTable || []).map((row, index) => (
                            <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  value={row.altitude}
                                  onChange={(e) => updateLandingRow(index, 'altitude', parseFloat(e.target.value) || 0)}
                                  disabled={isPreset || inheritLandingTable}
                                  className="w-full min-w-[100px] px-3 py-2 rounded-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  value={row.oat}
                                  onChange={(e) => updateLandingRow(index, 'oat', parseFloat(e.target.value) || 0)}
                                  disabled={isPreset || inheritLandingTable}
                                  className="w-full min-w-[100px] px-3 py-2 rounded-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  value={row.groundRoll}
                                  onChange={(e) => updateLandingRow(index, 'groundRoll', parseFloat(e.target.value) || 0)}
                                  disabled={isPreset || inheritLandingTable}
                                  className="w-full min-w-[100px] px-3 py-2 rounded-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  value={row.over50ft}
                                  onChange={(e) => updateLandingRow(index, 'over50ft', parseFloat(e.target.value) || 0)}
                                  disabled={isPreset || inheritLandingTable}
                                  className="w-full min-w-[100px] px-3 py-2 rounded-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              </td>
                              {!isPreset && !inheritLandingTable && (
                                <td className="py-3 px-4 text-center">
                                  <button
                                    onClick={() => removeLandingRow(index)}
                                    disabled={(resolved.landingTable?.length || 0) === 1}
                                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                                  >
                                    Remove
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </TabPanel>

              {/* Compass Deviation Tab */}
              <TabPanel>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Compass Deviation Table</h3>
                    <p className="text-sm text-slate-400 mb-4">
                      Maps the magnetic heading you want to fly to the compass heading you need to steer. This compensates for magnetic interference from the aircraft&apos;s metal and electrical systems.
                    </p>
                    <div className="flex items-center justify-between">
                      <div></div>
                      <div className="flex items-center gap-4">
                        {aircraft.inherit && parent && !isPreset && (
                          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={inheritDeviationTable}
                              onChange={(e) => toggleInheritance('deviationTable', e.target.checked)}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-sky-600 focus:ring-2 focus:ring-sky-500 cursor-pointer"
                            />
                            <span>Use {parent.name} settings</span>
                          </label>
                        )}
                        {!isPreset && !inheritDeviationTable && (
                          <button
                            onClick={addDeviationRow}
                            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                          >
                            + Add Row
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-700">
                    <table className="w-full min-w-[600px]">
                      <thead className="bg-slate-900/50">
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">For Heading (Magnetic °)</th>
                          <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">Steer Heading (Compass °)</th>
                          {!isPreset && !inheritDeviationTable && (
                            <th className="text-center py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {(resolved.deviationTable || []).map((row, index) => (
                          <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                min="0"
                                max="359"
                                value={row.forHeading}
                                onChange={(e) => updateDeviationRow(index, 'forHeading', parseFloat(e.target.value) || 0)}
                                disabled={isPreset || inheritDeviationTable}
                                className="w-full min-w-[120px] px-3 py-2 rounded-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                min="0"
                                max="359"
                                value={row.steerHeading}
                                onChange={(e) => updateDeviationRow(index, 'steerHeading', parseFloat(e.target.value) || 0)}
                                disabled={isPreset || inheritDeviationTable}
                                className="w-full min-w-[120px] px-3 py-2 rounded-lg bg-slate-900/50 border-2 border-slate-600 text-white text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>
                            {!isPreset && !inheritDeviationTable && (
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => removeDeviationRow(index)}
                                  disabled={(resolved.deviationTable?.length || 0) === 1}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                  Remove
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="text-sm text-slate-400 bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                    <p className="mb-2 font-medium text-slate-300">What is compass deviation?</p>
                    <p>
                      Compass deviation is the error caused by magnetic fields within your aircraft (metal parts, electrical systems, etc.).
                      This table maps the <strong>magnetic heading you want to fly</strong> to the <strong>compass heading you need to steer</strong> to compensate for these errors.
                    </p>
                  </div>
                </div>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
      </div>
    </div>
  );
}
