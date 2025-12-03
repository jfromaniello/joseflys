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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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

  // State for adding new OAT column
  const [showNewOATInput, setShowNewOATInput] = useState(false);
  const [newOATValue, setNewOATValue] = useState("");

  // State for climb chart metric selection
  const [climbChartMetric, setClimbChartMetric] = useState<'time' | 'fuel' | 'distance'>('time');

  // State for takeoff/landing OAT column inputs
  const [showNewTakeoffOATInput, setShowNewTakeoffOATInput] = useState(false);
  const [newTakeoffOATValue, setNewTakeoffOATValue] = useState("");
  const [showNewLandingOATInput, setShowNewLandingOATInput] = useState(false);
  const [newLandingOATValue, setNewLandingOATValue] = useState("");

  // State for takeoff chart metric selection
  const [takeoffChartMetric, setTakeoffChartMetric] = useState<'groundRoll' | 'over50ft'>('groundRoll');

  // State for cruise chart metric selection
  const [cruiseChartMetric, setCruiseChartMetric] = useState<'tas' | 'fuelFlow'>('tas');

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

  // Climb table manipulation functions (POH-style: PA rows × OAT columns)

  // Get unique PA values sorted ascending
  const getUniquePAs = () => {
    return [...new Set(resolved!.climbTable.map(r => r.pressureAltitude))].sort((a, b) => a - b);
  };

  // Get unique OAT values sorted ascending
  const getUniqueOATs = () => {
    return [...new Set(resolved!.climbTable.map(r => r.oat))].sort((a, b) => a - b);
  };

  // Find a climb entry by PA and OAT
  const findClimbEntry = (pa: number, oat: number) => {
    return resolved!.climbTable.find(r => r.pressureAltitude === pa && r.oat === oat);
  };

  // Add a new PA row (creates entries for all OAT columns)
  const addClimbPARow = () => {
    const existingPAs = getUniquePAs();
    const existingOATs = getUniqueOATs();
    const lastPA = existingPAs.length > 0 ? existingPAs[existingPAs.length - 1] : 0;
    const newPA = lastPA + 2000;

    // Create new entries for each OAT column
    const newEntries: ClimbPerformance[] = existingOATs.map(oat => {
      // Estimate values based on previous PA row
      const prevEntry = findClimbEntry(lastPA, oat);
      return {
        pressureAltitude: newPA,
        oat,
        timeFromSL: prevEntry ? prevEntry.timeFromSL + 5 : 0,
        fuelFromSL: prevEntry ? prevEntry.fuelFromSL + 1 : 0,
        distanceFromSL: prevEntry ? prevEntry.distanceFromSL + 8 : 0,
      };
    });

    const updatedTable = [...resolved!.climbTable, ...newEntries];
    updateAircraftField({ climbTable: updatedTable });
  };

  // Remove a PA row (removes entries for all OAT columns at that PA)
  const removeClimbPARow = (pa: number) => {
    const existingPAs = getUniquePAs();
    if (existingPAs.length <= 1) return; // Must keep at least one PA row

    const updatedTable = resolved!.climbTable.filter(r => r.pressureAltitude !== pa);
    updateAircraftField({ climbTable: updatedTable });
  };

  // Add a new OAT column (creates entries for all PA rows)
  const addClimbOATColumn = (newOAT: number) => {
    const existingPAs = getUniquePAs();
    const existingOATs = getUniqueOATs();

    // Check if OAT already exists
    if (existingOATs.includes(newOAT)) {
      return; // Don't add duplicate
    }

    // Find closest existing OAT to use as reference for initial values
    const closestOAT = existingOATs.reduce((prev, curr) =>
      Math.abs(curr - newOAT) < Math.abs(prev - newOAT) ? curr : prev
    , existingOATs[0]);

    // Create new entries for each PA row
    const newEntries: ClimbPerformance[] = existingPAs.map(pa => {
      const refEntry = findClimbEntry(pa, closestOAT);
      // Estimate: performance degrades ~3% per 10°C increase
      const tempDiff = newOAT - closestOAT;
      const factor = 1 + (tempDiff / 10) * 0.03;
      return {
        pressureAltitude: pa,
        oat: newOAT,
        timeFromSL: refEntry ? Math.round(refEntry.timeFromSL * factor) : 0,
        fuelFromSL: refEntry ? Math.round(refEntry.fuelFromSL * factor * 10) / 10 : 0,
        distanceFromSL: refEntry ? Math.round(refEntry.distanceFromSL * factor) : 0,
      };
    });

    const updatedTable = [...resolved!.climbTable, ...newEntries];
    updateAircraftField({ climbTable: updatedTable });
  };

  // Remove an OAT column (removes entries for all PA rows at that OAT)
  const removeClimbOATColumn = (oat: number) => {
    const existingOATs = getUniqueOATs();
    if (existingOATs.length <= 1) return; // Must keep at least one OAT column

    const updatedTable = resolved!.climbTable.filter(r => r.oat !== oat);
    updateAircraftField({ climbTable: updatedTable });
  };

  // Update a specific cell in the climb table (identified by PA + OAT)
  const updateClimbCell = (pa: number, oat: number, field: 'timeFromSL' | 'fuelFromSL' | 'distanceFromSL', value: number) => {
    const updatedTable = resolved!.climbTable.map(entry => {
      if (entry.pressureAltitude === pa && entry.oat === oat) {
        return { ...entry, [field]: value };
      }
      return entry;
    });
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

  // Takeoff table manipulation functions (POH-style: PA rows × OAT columns)

  // Get unique PA values from takeoff table
  const getTakeoffUniquePAs = () => {
    if (!resolved!.takeoffTable) return [];
    return [...new Set(resolved!.takeoffTable.map(r => r.altitude))].sort((a, b) => a - b);
  };

  // Get unique OAT values from takeoff table
  const getTakeoffUniqueOATs = () => {
    if (!resolved!.takeoffTable) return [];
    return [...new Set(resolved!.takeoffTable.map(r => r.oat))].sort((a, b) => a - b);
  };

  // Find a takeoff entry by PA and OAT
  const findTakeoffEntry = (pa: number, oat: number) => {
    return resolved!.takeoffTable?.find(r => r.altitude === pa && r.oat === oat);
  };

  // Add a new PA row for takeoff (creates entries for all OAT columns)
  const addTakeoffPARow = () => {
    const existingPAs = getTakeoffUniquePAs();
    const existingOATs = getTakeoffUniqueOATs().length > 0 ? getTakeoffUniqueOATs() : [0, 20, 40];
    const lastPA = existingPAs.length > 0 ? existingPAs[existingPAs.length - 1] : 0;
    const newPA = lastPA + 2000;

    const newEntries: TakeoffPerformance[] = existingOATs.map(oat => {
      const prevEntry = findTakeoffEntry(lastPA, oat);
      return {
        altitude: newPA,
        oat,
        groundRoll: prevEntry ? Math.round(prevEntry.groundRoll * 1.15) : 1000,
        over50ft: prevEntry ? Math.round(prevEntry.over50ft * 1.15) : 2000,
      };
    });

    const updatedTable = [...(resolved!.takeoffTable || []), ...newEntries];
    updateAircraftField({ takeoffTable: updatedTable });
  };

  // Remove a PA row from takeoff table
  const removeTakeoffPARow = (pa: number) => {
    const existingPAs = getTakeoffUniquePAs();
    if (existingPAs.length <= 1) return;

    const updatedTable = resolved!.takeoffTable!.filter(r => r.altitude !== pa);
    updateAircraftField({ takeoffTable: updatedTable });
  };

  // Add a new OAT column for takeoff
  const addTakeoffOATColumn = (newOAT: number) => {
    const existingPAs = getTakeoffUniquePAs();
    const existingOATs = getTakeoffUniqueOATs();

    if (existingOATs.includes(newOAT)) return;

    const closestOAT = existingOATs.length > 0
      ? existingOATs.reduce((prev, curr) => Math.abs(curr - newOAT) < Math.abs(prev - newOAT) ? curr : prev, existingOATs[0])
      : 20;

    const newEntries: TakeoffPerformance[] = existingPAs.map(pa => {
      const refEntry = findTakeoffEntry(pa, closestOAT);
      const tempDiff = newOAT - closestOAT;
      const factor = 1 + (tempDiff / 10) * 0.035;
      return {
        altitude: pa,
        oat: newOAT,
        groundRoll: refEntry ? Math.round(refEntry.groundRoll * factor) : 1000,
        over50ft: refEntry ? Math.round(refEntry.over50ft * factor) : 2000,
      };
    });

    const updatedTable = [...(resolved!.takeoffTable || []), ...newEntries];
    updateAircraftField({ takeoffTable: updatedTable });
  };

  // Remove an OAT column from takeoff table
  const removeTakeoffOATColumn = (oat: number) => {
    const existingOATs = getTakeoffUniqueOATs();
    if (existingOATs.length <= 1) return;

    const updatedTable = resolved!.takeoffTable!.filter(r => r.oat !== oat);
    updateAircraftField({ takeoffTable: updatedTable });
  };

  // Update a specific cell in takeoff table
  const updateTakeoffCell = (pa: number, oat: number, field: 'groundRoll' | 'over50ft', value: number) => {
    const updatedTable = resolved!.takeoffTable!.map(entry => {
      if (entry.altitude === pa && entry.oat === oat) {
        return { ...entry, [field]: value };
      }
      return entry;
    });
    updateAircraftField({ takeoffTable: updatedTable });
  };

  // Landing table manipulation functions (POH-style: PA rows × OAT columns)

  // Get unique PA values from landing table
  const getLandingUniquePAs = () => {
    if (!resolved!.landingTable) return [];
    return [...new Set(resolved!.landingTable.map(r => r.altitude))].sort((a, b) => a - b);
  };

  // Get unique OAT values from landing table
  const getLandingUniqueOATs = () => {
    if (!resolved!.landingTable) return [];
    return [...new Set(resolved!.landingTable.map(r => r.oat))].sort((a, b) => a - b);
  };

  // Find a landing entry by PA and OAT
  const findLandingEntry = (pa: number, oat: number) => {
    return resolved!.landingTable?.find(r => r.altitude === pa && r.oat === oat);
  };

  // Add a new PA row for landing
  const addLandingPARow = () => {
    const existingPAs = getLandingUniquePAs();
    const existingOATs = getLandingUniqueOATs().length > 0 ? getLandingUniqueOATs() : [0, 20, 40];
    const lastPA = existingPAs.length > 0 ? existingPAs[existingPAs.length - 1] : 0;
    const newPA = lastPA + 2000;

    const newEntries: LandingPerformance[] = existingOATs.map(oat => {
      const prevEntry = findLandingEntry(lastPA, oat);
      return {
        altitude: newPA,
        oat,
        groundRoll: prevEntry ? Math.round(prevEntry.groundRoll * 1.1) : 500,
        over50ft: prevEntry ? Math.round(prevEntry.over50ft * 1.1) : 1500,
      };
    });

    const updatedTable = [...(resolved!.landingTable || []), ...newEntries];
    updateAircraftField({ landingTable: updatedTable });
  };

  // Remove a PA row from landing table
  const removeLandingPARow = (pa: number) => {
    const existingPAs = getLandingUniquePAs();
    if (existingPAs.length <= 1) return;

    const updatedTable = resolved!.landingTable!.filter(r => r.altitude !== pa);
    updateAircraftField({ landingTable: updatedTable });
  };

  // Add a new OAT column for landing
  const addLandingOATColumn = (newOAT: number) => {
    const existingPAs = getLandingUniquePAs();
    const existingOATs = getLandingUniqueOATs();

    if (existingOATs.includes(newOAT)) return;

    const closestOAT = existingOATs.length > 0
      ? existingOATs.reduce((prev, curr) => Math.abs(curr - newOAT) < Math.abs(prev - newOAT) ? curr : prev, existingOATs[0])
      : 20;

    const newEntries: LandingPerformance[] = existingPAs.map(pa => {
      const refEntry = findLandingEntry(pa, closestOAT);
      const tempDiff = newOAT - closestOAT;
      const factor = 1 + (tempDiff / 10) * 0.025;
      return {
        altitude: pa,
        oat: newOAT,
        groundRoll: refEntry ? Math.round(refEntry.groundRoll * factor) : 500,
        over50ft: refEntry ? Math.round(refEntry.over50ft * factor) : 1500,
      };
    });

    const updatedTable = [...(resolved!.landingTable || []), ...newEntries];
    updateAircraftField({ landingTable: updatedTable });
  };

  // Remove an OAT column from landing table
  const removeLandingOATColumn = (oat: number) => {
    const existingOATs = getLandingUniqueOATs();
    if (existingOATs.length <= 1) return;

    const updatedTable = resolved!.landingTable!.filter(r => r.oat !== oat);
    updateAircraftField({ landingTable: updatedTable });
  };

  // Update a specific cell in landing table
  const updateLandingCell = (pa: number, oat: number, field: 'groundRoll' | 'over50ft', value: number) => {
    const updatedTable = resolved!.landingTable!.map(entry => {
      if (entry.altitude === pa && entry.oat === oat) {
        return { ...entry, [field]: value };
      }
      return entry;
    });
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

              {/* Climb Table Tab - POH Style */}
              <TabPanel>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Climb Performance Table</h3>
                    <p className="text-sm text-slate-400 mb-4">
                      POH-style climb data: cumulative time, fuel, and distance from sea level at each pressure altitude and temperature.
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* OAT Column chips */}
                        <span className="text-sm text-slate-400">OAT columns:</span>
                        {getUniqueOATs().map(oat => (
                          <span
                            key={oat}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-sky-600/20 border border-sky-500/30 rounded-full text-sm text-sky-300"
                          >
                            {oat}°C
                            {!isPreset && !inheritClimbTable && getUniqueOATs().length > 1 && (
                              <button
                                onClick={() => removeClimbOATColumn(oat)}
                                className="ml-1 text-sky-400 hover:text-red-400 cursor-pointer"
                                title={`Remove ${oat}°C column`}
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ))}
                        {!isPreset && !inheritClimbTable && (
                          showNewOATInput ? (
                            <span className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                value={newOATValue}
                                onChange={(e) => setNewOATValue(e.target.value)}
                                placeholder="°C"
                                autoFocus
                                className="w-16 px-2 py-1 rounded bg-slate-900 border border-sky-500/50 text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && newOATValue) {
                                    addClimbOATColumn(parseFloat(newOATValue));
                                    setNewOATValue("");
                                    setShowNewOATInput(false);
                                  } else if (e.key === 'Escape') {
                                    setNewOATValue("");
                                    setShowNewOATInput(false);
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  if (newOATValue) {
                                    addClimbOATColumn(parseFloat(newOATValue));
                                    setNewOATValue("");
                                    setShowNewOATInput(false);
                                  }
                                }}
                                className="px-2 py-1 bg-sky-600 hover:bg-sky-700 rounded text-white text-sm cursor-pointer"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => {
                                  setNewOATValue("");
                                  setShowNewOATInput(false);
                                }}
                                className="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded text-white text-sm cursor-pointer"
                              >
                                ✕
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setShowNewOATInput(true)}
                              className="px-3 py-1 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 rounded-full text-sm text-sky-300 transition-colors cursor-pointer"
                              title="Add new OAT column"
                            >
                              + OAT
                            </button>
                          )
                        )}
                      </div>
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
                      </div>
                    </div>
                  </div>

                  {/* POH-style table: rows = PA, columns = OAT */}
                  <div className="overflow-x-auto rounded-xl border border-slate-700">
                    <table className="w-full">
                      <thead className="bg-slate-900/50">
                        {/* Header row 1: PA label + OAT values */}
                        <tr className="border-b border-slate-700">
                          <th
                            rowSpan={2}
                            className="text-center py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap border-r border-slate-700 w-24"
                          >
                            PA (ft)
                          </th>
                          {getUniqueOATs().map(oat => (
                            <th
                              key={oat}
                              colSpan={3}
                              className="text-center py-2 px-2 text-sky-300 font-semibold text-sm whitespace-nowrap border-r border-slate-700 last:border-r-0"
                            >
                              {oat}°C
                            </th>
                          ))}
                          {!isPreset && !inheritClimbTable && (
                            <th rowSpan={2} className="w-16"></th>
                          )}
                        </tr>
                        {/* Header row 2: Time/Fuel/Dist labels */}
                        <tr className="border-b border-slate-700">
                          {getUniqueOATs().map(oat => (
                            <Fragment key={oat}>
                              <th className="text-center py-2 px-1 text-slate-400 font-medium text-xs whitespace-nowrap">
                                Time
                              </th>
                              <th className="text-center py-2 px-1 text-slate-400 font-medium text-xs whitespace-nowrap">
                                Fuel
                              </th>
                              <th className="text-center py-2 px-1 text-slate-400 font-medium text-xs whitespace-nowrap border-r border-slate-700 last:border-r-0">
                                Dist
                              </th>
                            </Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {getUniquePAs().map(pa => (
                          <tr key={pa} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                            {/* PA value */}
                            <td className="py-2 px-2 text-center border-r border-slate-700">
                              <span className="text-white font-medium">{pa.toLocaleString()}</span>
                            </td>
                            {/* Values for each OAT column */}
                            {getUniqueOATs().map(oat => {
                              const entry = findClimbEntry(pa, oat);
                              return (
                                <Fragment key={oat}>
                                  <td className="py-1 px-1">
                                    <input
                                      type="number"
                                      step="1"
                                      value={entry?.timeFromSL ?? 0}
                                      onChange={(e) => updateClimbCell(pa, oat, 'timeFromSL', parseFloat(e.target.value) || 0)}
                                      disabled={isPreset || inheritClimbTable}
                                      className="w-full min-w-[50px] px-2 py-1.5 rounded bg-slate-900/50 border border-slate-600 text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                    />
                                  </td>
                                  <td className="py-1 px-1">
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={entry?.fuelFromSL ?? 0}
                                      onChange={(e) => updateClimbCell(pa, oat, 'fuelFromSL', parseFloat(e.target.value) || 0)}
                                      disabled={isPreset || inheritClimbTable}
                                      className="w-full min-w-[50px] px-2 py-1.5 rounded bg-slate-900/50 border border-slate-600 text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                    />
                                  </td>
                                  <td className="py-1 px-1 border-r border-slate-700 last:border-r-0">
                                    <input
                                      type="number"
                                      step="1"
                                      value={entry?.distanceFromSL ?? 0}
                                      onChange={(e) => updateClimbCell(pa, oat, 'distanceFromSL', parseFloat(e.target.value) || 0)}
                                      disabled={isPreset || inheritClimbTable}
                                      className="w-full min-w-[50px] px-2 py-1.5 rounded bg-slate-900/50 border border-slate-600 text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                    />
                                  </td>
                                </Fragment>
                              );
                            })}
                            {/* Remove row button */}
                            {!isPreset && !inheritClimbTable && (
                              <td className="py-1 px-2 text-center">
                                <button
                                  onClick={() => removeClimbPARow(pa)}
                                  disabled={getUniquePAs().length <= 1}
                                  className="text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                  title="Remove this PA row"
                                >
                                  ✕
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add PA Row button */}
                  {!isPreset && !inheritClimbTable && (
                    <button
                      onClick={addClimbPARow}
                      className="w-full py-3 border-2 border-dashed border-slate-600 hover:border-sky-500/50 rounded-xl text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      + Add PA Row
                    </button>
                  )}

                  {/* Legend */}
                  <div className="text-xs text-slate-500 space-y-1">
                    <p><strong>Time:</strong> Minutes from sea level</p>
                    <p><strong>Fuel:</strong> Gallons from sea level</p>
                    <p><strong>Dist:</strong> Nautical miles from sea level</p>
                  </div>

                  {/* Climb Performance Chart */}
                  {resolved.climbTable.length > 0 && (
                    <div className="mt-8 p-4 rounded-xl border border-slate-700 bg-slate-900/30">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-white">Climb Performance Chart</h4>
                        <div className="flex gap-1">
                          {(['time', 'fuel', 'distance'] as const).map((metric) => (
                            <button
                              key={metric}
                              onClick={() => setClimbChartMetric(metric)}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                                climbChartMetric === metric
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              }`}
                            >
                              {metric === 'time' ? 'Time' : metric === 'fuel' ? 'Fuel' : 'Distance'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={(() => {
                              // Transform climb table data for Recharts
                              const pas = getUniquePAs();
                              const oats = getUniqueOATs();
                              return pas.map(pa => {
                                const point: Record<string, number> = { pa };
                                oats.forEach(oat => {
                                  const entry = findClimbEntry(pa, oat);
                                  if (entry) {
                                    point[`${oat}°C`] = climbChartMetric === 'time'
                                      ? entry.timeFromSL
                                      : climbChartMetric === 'fuel'
                                        ? entry.fuelFromSL
                                        : entry.distanceFromSL;
                                  }
                                });
                                return point;
                              });
                            })()}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis
                              dataKey="pa"
                              stroke="#9CA3AF"
                              fontSize={12}
                              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                              label={{ value: 'Pressure Altitude (ft)', position: 'insideBottom', offset: -5, fill: '#9CA3AF', fontSize: 11 }}
                            />
                            <YAxis
                              stroke="#9CA3AF"
                              fontSize={12}
                              domain={['auto', 'auto']}
                              label={{
                                value: climbChartMetric === 'time' ? 'Time (min)' : climbChartMetric === 'fuel' ? 'Fuel (gal)' : 'Distance (NM)',
                                angle: -90,
                                position: 'insideLeft',
                                fill: '#9CA3AF',
                                fontSize: 11
                              }}
                            />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #475569', borderRadius: '8px' }}
                              labelStyle={{ color: '#F1F5F9' }}
                              itemStyle={{ color: '#F1F5F9' }}
                              labelFormatter={(value) => `PA: ${Number(value).toLocaleString()} ft`}
                            />
                            <Legend verticalAlign="top" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
                            {getUniqueOATs().map((oat, index) => {
                              // Generate colors for each OAT line
                              const colors = ['#38BDF8', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#FB7185'];
                              return (
                                <Line
                                  key={oat}
                                  type="monotone"
                                  dataKey={`${oat}°C`}
                                  stroke={colors[index % colors.length]}
                                  strokeWidth={2}
                                  dot={{ fill: colors[index % colors.length], strokeWidth: 0, r: 3 }}
                                  activeDot={{ r: 5 }}
                                />
                              );
                            })}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 text-center">
                        {climbChartMetric === 'time' && 'Time to climb from sea level at each OAT'}
                        {climbChartMetric === 'fuel' && 'Fuel consumed climbing from sea level at each OAT'}
                        {climbChartMetric === 'distance' && 'Distance covered climbing from sea level at each OAT'}
                      </p>
                    </div>
                  )}
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

                  {/* Cruise Performance Chart */}
                  {resolved.cruiseTable.length > 0 && (
                    <div className="mt-8 p-4 rounded-xl border border-slate-700 bg-slate-900/30">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-white">Cruise Performance Chart</h4>
                        <div className="flex gap-1">
                          {(['tas', 'fuelFlow'] as const).map((metric) => (
                            <button
                              key={metric}
                              onClick={() => setCruiseChartMetric(metric)}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                                cruiseChartMetric === metric
                                  ? 'bg-violet-600 text-white'
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              }`}
                            >
                              {metric === 'tas' ? 'TAS' : 'Fuel Flow'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={(() => {
                              // Group by altitude, with lines for each power setting
                              const altitudes = [...new Set(resolved.cruiseTable.map(r => r.altitude))].sort((a, b) => a - b);
                              const powerSettings = [...new Set(resolved.cruiseTable.map(r => r.percentPower))].sort((a, b) => a - b);

                              return altitudes.map(alt => {
                                const point: Record<string, number> = { altitude: alt };
                                powerSettings.forEach(power => {
                                  const entry = resolved.cruiseTable.find(r => r.altitude === alt && r.percentPower === power);
                                  if (entry) {
                                    point[`${power}%`] = cruiseChartMetric === 'tas' ? entry.tas : entry.fuelFlow;
                                  }
                                });
                                return point;
                              });
                            })()}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis
                              dataKey="altitude"
                              stroke="#9CA3AF"
                              fontSize={12}
                              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                              label={{ value: 'Pressure Altitude (ft)', position: 'insideBottom', offset: -5, fill: '#9CA3AF', fontSize: 11 }}
                            />
                            <YAxis
                              stroke="#9CA3AF"
                              fontSize={12}
                              domain={['auto', 'auto']}
                              label={{
                                value: cruiseChartMetric === 'tas' ? 'TAS (kt)' : 'Fuel Flow (GPH)',
                                angle: -90,
                                position: 'insideLeft',
                                fill: '#9CA3AF',
                                fontSize: 11
                              }}
                            />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #475569', borderRadius: '8px' }}
                              labelStyle={{ color: '#F1F5F9' }}
                              itemStyle={{ color: '#F1F5F9' }}
                              labelFormatter={(value) => `Altitude: ${Number(value).toLocaleString()} ft`}
                            />
                            <Legend verticalAlign="top" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
                            {[...new Set(resolved.cruiseTable.map(r => r.percentPower))].sort((a, b) => a - b).map((power, index) => {
                              const colors = ['#A78BFA', '#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6', '#4C1D95'];
                              return (
                                <Line
                                  key={power}
                                  type="monotone"
                                  dataKey={`${power}%`}
                                  name={`${power}% Power`}
                                  stroke={colors[index % colors.length]}
                                  strokeWidth={2}
                                  dot={{ fill: colors[index % colors.length], strokeWidth: 0, r: 3 }}
                                  activeDot={{ r: 5 }}
                                />
                              );
                            })}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 text-center">
                        {cruiseChartMetric === 'tas' && 'True Airspeed at each altitude and power setting'}
                        {cruiseChartMetric === 'fuelFlow' && 'Fuel consumption at each altitude and power setting'}
                      </p>
                    </div>
                  )}
                </div>
              </TabPanel>

              {/* Takeoff/Landing Tab - POH Style */}
              <TabPanel>
                <div className="space-y-8">
                  {/* Takeoff Performance Table */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Takeoff Performance Table</h3>
                      <p className="text-sm text-slate-400 mb-4">
                        POH-style takeoff distances: ground roll and over-50ft distance at each pressure altitude and temperature.
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-slate-400">OAT columns:</span>
                          {getTakeoffUniqueOATs().map(oat => (
                            <span
                              key={oat}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-orange-600/20 border border-orange-500/30 rounded-full text-sm text-orange-300"
                            >
                              {oat}°C
                              {!isPreset && !inheritTakeoffTable && getTakeoffUniqueOATs().length > 1 && (
                                <button
                                  onClick={() => removeTakeoffOATColumn(oat)}
                                  className="ml-1 text-orange-400 hover:text-red-400 cursor-pointer"
                                  title={`Remove ${oat}°C column`}
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          ))}
                          {!isPreset && !inheritTakeoffTable && (
                            showNewTakeoffOATInput ? (
                              <span className="inline-flex items-center gap-1">
                                <input
                                  type="number"
                                  value={newTakeoffOATValue}
                                  onChange={(e) => setNewTakeoffOATValue(e.target.value)}
                                  placeholder="°C"
                                  autoFocus
                                  className="w-16 px-2 py-1 rounded bg-slate-900 border border-orange-500/50 text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newTakeoffOATValue) {
                                      addTakeoffOATColumn(parseFloat(newTakeoffOATValue));
                                      setNewTakeoffOATValue("");
                                      setShowNewTakeoffOATInput(false);
                                    } else if (e.key === 'Escape') {
                                      setNewTakeoffOATValue("");
                                      setShowNewTakeoffOATInput(false);
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    if (newTakeoffOATValue) {
                                      addTakeoffOATColumn(parseFloat(newTakeoffOATValue));
                                      setNewTakeoffOATValue("");
                                      setShowNewTakeoffOATInput(false);
                                    }
                                  }}
                                  className="px-2 py-1 bg-orange-600 hover:bg-orange-700 rounded text-white text-sm cursor-pointer"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setNewTakeoffOATValue("");
                                    setShowNewTakeoffOATInput(false);
                                  }}
                                  className="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded text-white text-sm cursor-pointer"
                                >
                                  ✕
                                </button>
                              </span>
                            ) : (
                              <button
                                onClick={() => setShowNewTakeoffOATInput(true)}
                                className="px-3 py-1 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 rounded-full text-sm text-orange-300 transition-colors cursor-pointer"
                                title="Add new OAT column"
                              >
                                + OAT
                              </button>
                            )
                          )}
                        </div>
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
                        </div>
                      </div>
                    </div>

                    {/* POH-style table: rows = PA, columns = OAT */}
                    <div className="overflow-x-auto rounded-xl border border-slate-700">
                      <table className="w-full">
                        <thead className="bg-slate-900/50">
                          <tr className="border-b border-slate-700">
                            <th
                              rowSpan={2}
                              className="text-center py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap border-r border-slate-700 w-24"
                            >
                              PA (ft)
                            </th>
                            {getTakeoffUniqueOATs().map(oat => (
                              <th
                                key={oat}
                                colSpan={2}
                                className="text-center py-2 px-2 text-orange-300 font-semibold text-sm whitespace-nowrap border-r border-slate-700 last:border-r-0"
                              >
                                {oat}°C
                              </th>
                            ))}
                            {!isPreset && !inheritTakeoffTable && (
                              <th rowSpan={2} className="w-12"></th>
                            )}
                          </tr>
                          <tr className="border-b border-slate-700">
                            {getTakeoffUniqueOATs().map(oat => (
                              <Fragment key={oat}>
                                <th className="text-center py-2 px-1 text-slate-400 font-medium text-xs whitespace-nowrap">
                                  Roll
                                </th>
                                <th className="text-center py-2 px-1 text-slate-400 font-medium text-xs whitespace-nowrap border-r border-slate-700 last:border-r-0">
                                  50ft
                                </th>
                              </Fragment>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {getTakeoffUniquePAs().map(pa => (
                            <tr key={pa} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                              <td className="py-2 px-2 text-center border-r border-slate-700">
                                <span className="text-white font-medium">{pa.toLocaleString()}</span>
                              </td>
                              {getTakeoffUniqueOATs().map(oat => {
                                const entry = findTakeoffEntry(pa, oat);
                                return (
                                  <Fragment key={oat}>
                                    <td className="py-1 px-1">
                                      <input
                                        type="number"
                                        value={entry?.groundRoll ?? 0}
                                        onChange={(e) => updateTakeoffCell(pa, oat, 'groundRoll', parseFloat(e.target.value) || 0)}
                                        disabled={isPreset || inheritTakeoffTable}
                                        className="w-full min-w-[60px] px-2 py-1.5 rounded bg-slate-900/50 border border-slate-600 text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                      />
                                    </td>
                                    <td className="py-1 px-1 border-r border-slate-700 last:border-r-0">
                                      <input
                                        type="number"
                                        value={entry?.over50ft ?? 0}
                                        onChange={(e) => updateTakeoffCell(pa, oat, 'over50ft', parseFloat(e.target.value) || 0)}
                                        disabled={isPreset || inheritTakeoffTable}
                                        className="w-full min-w-[60px] px-2 py-1.5 rounded bg-slate-900/50 border border-slate-600 text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                      />
                                    </td>
                                  </Fragment>
                                );
                              })}
                              {!isPreset && !inheritTakeoffTable && (
                                <td className="py-1 px-2 text-center">
                                  <button
                                    onClick={() => removeTakeoffPARow(pa)}
                                    disabled={getTakeoffUniquePAs().length <= 1}
                                    className="text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                    title="Remove this PA row"
                                  >
                                    ✕
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Add PA Row button */}
                    {!isPreset && !inheritTakeoffTable && (
                      <button
                        onClick={addTakeoffPARow}
                        className="w-full py-3 border-2 border-dashed border-slate-600 hover:border-orange-500/50 rounded-xl text-slate-400 hover:text-orange-300 transition-colors cursor-pointer"
                      >
                        + Add PA Row
                      </button>
                    )}

                    {/* Legend */}
                    <div className="text-xs text-slate-500 space-y-1">
                      <p><strong>Roll:</strong> Ground roll distance (ft)</p>
                      <p><strong>50ft:</strong> Total distance over 50ft obstacle (ft)</p>
                    </div>

                    {/* Takeoff Performance Chart */}
                    {(resolved.takeoffTable?.length || 0) > 0 && (
                      <div className="mt-6 p-4 rounded-xl border border-slate-700 bg-slate-900/30">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-semibold text-white">Takeoff Performance Chart</h4>
                          <div className="flex gap-1">
                            {(['groundRoll', 'over50ft'] as const).map((metric) => (
                              <button
                                key={metric}
                                onClick={() => setTakeoffChartMetric(metric)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                                  takeoffChartMetric === metric
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                              >
                                {metric === 'groundRoll' ? 'Ground Roll' : 'Over 50ft'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={(() => {
                                const pas = getTakeoffUniquePAs();
                                const oats = getTakeoffUniqueOATs();
                                return pas.map(pa => {
                                  const point: Record<string, number> = { pa };
                                  oats.forEach(oat => {
                                    const entry = findTakeoffEntry(pa, oat);
                                    if (entry) {
                                      point[`${oat}°C`] = takeoffChartMetric === 'groundRoll'
                                        ? entry.groundRoll
                                        : entry.over50ft;
                                    }
                                  });
                                  return point;
                                });
                              })()}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                              <XAxis
                                dataKey="pa"
                                stroke="#9CA3AF"
                                fontSize={12}
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                label={{ value: 'Pressure Altitude (ft)', position: 'insideBottom', offset: -5, fill: '#9CA3AF', fontSize: 11 }}
                              />
                              <YAxis
                                stroke="#9CA3AF"
                                fontSize={12}
                                domain={['auto', 'auto']}
                                label={{
                                  value: takeoffChartMetric === 'groundRoll' ? 'Ground Roll (ft)' : 'Over 50ft (ft)',
                                  angle: -90,
                                  position: 'insideLeft',
                                  fill: '#9CA3AF',
                                  fontSize: 11
                                }}
                              />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #475569', borderRadius: '8px' }}
                                labelStyle={{ color: '#F1F5F9' }}
                                itemStyle={{ color: '#F1F5F9' }}
                                labelFormatter={(value) => `PA: ${Number(value).toLocaleString()} ft`}
                              />
                              <Legend verticalAlign="top" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
                              {getTakeoffUniqueOATs().map((oat, index) => {
                                const colors = ['#FB923C', '#FBBF24', '#34D399', '#38BDF8', '#A78BFA', '#FB7185'];
                                return (
                                  <Line
                                    key={oat}
                                    type="monotone"
                                    dataKey={`${oat}°C`}
                                    stroke={colors[index % colors.length]}
                                    strokeWidth={2}
                                    dot={{ fill: colors[index % colors.length], strokeWidth: 0, r: 3 }}
                                    activeDot={{ r: 5 }}
                                  />
                                );
                              })}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 text-center">
                          {takeoffChartMetric === 'groundRoll' && 'Ground roll distance at each pressure altitude and OAT'}
                          {takeoffChartMetric === 'over50ft' && 'Total takeoff distance over 50ft obstacle at each PA and OAT'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Landing Performance Table */}
                  <div className="space-y-6 pt-8 border-t border-slate-700">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Landing Performance Table</h3>
                      <p className="text-sm text-slate-400 mb-4">
                        POH-style landing distances: ground roll and over-50ft distance at each pressure altitude and temperature.
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-slate-400">OAT columns:</span>
                          {getLandingUniqueOATs().map(oat => (
                            <span
                              key={oat}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600/20 border border-emerald-500/30 rounded-full text-sm text-emerald-300"
                            >
                              {oat}°C
                              {!isPreset && !inheritLandingTable && getLandingUniqueOATs().length > 1 && (
                                <button
                                  onClick={() => removeLandingOATColumn(oat)}
                                  className="ml-1 text-emerald-400 hover:text-red-400 cursor-pointer"
                                  title={`Remove ${oat}°C column`}
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          ))}
                          {!isPreset && !inheritLandingTable && (
                            showNewLandingOATInput ? (
                              <span className="inline-flex items-center gap-1">
                                <input
                                  type="number"
                                  value={newLandingOATValue}
                                  onChange={(e) => setNewLandingOATValue(e.target.value)}
                                  placeholder="°C"
                                  autoFocus
                                  className="w-16 px-2 py-1 rounded bg-slate-900 border border-emerald-500/50 text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newLandingOATValue) {
                                      addLandingOATColumn(parseFloat(newLandingOATValue));
                                      setNewLandingOATValue("");
                                      setShowNewLandingOATInput(false);
                                    } else if (e.key === 'Escape') {
                                      setNewLandingOATValue("");
                                      setShowNewLandingOATInput(false);
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    if (newLandingOATValue) {
                                      addLandingOATColumn(parseFloat(newLandingOATValue));
                                      setNewLandingOATValue("");
                                      setShowNewLandingOATInput(false);
                                    }
                                  }}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-white text-sm cursor-pointer"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setNewLandingOATValue("");
                                    setShowNewLandingOATInput(false);
                                  }}
                                  className="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded text-white text-sm cursor-pointer"
                                >
                                  ✕
                                </button>
                              </span>
                            ) : (
                              <button
                                onClick={() => setShowNewLandingOATInput(true)}
                                className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-full text-sm text-emerald-300 transition-colors cursor-pointer"
                                title="Add new OAT column"
                              >
                                + OAT
                              </button>
                            )
                          )}
                        </div>
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
                        </div>
                      </div>
                    </div>

                    {/* POH-style table: rows = PA, columns = OAT */}
                    <div className="overflow-x-auto rounded-xl border border-slate-700">
                      <table className="w-full">
                        <thead className="bg-slate-900/50">
                          <tr className="border-b border-slate-700">
                            <th
                              rowSpan={2}
                              className="text-center py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap border-r border-slate-700 w-24"
                            >
                              PA (ft)
                            </th>
                            {getLandingUniqueOATs().map(oat => (
                              <th
                                key={oat}
                                colSpan={2}
                                className="text-center py-2 px-2 text-emerald-300 font-semibold text-sm whitespace-nowrap border-r border-slate-700 last:border-r-0"
                              >
                                {oat}°C
                              </th>
                            ))}
                            {!isPreset && !inheritLandingTable && (
                              <th rowSpan={2} className="w-12"></th>
                            )}
                          </tr>
                          <tr className="border-b border-slate-700">
                            {getLandingUniqueOATs().map(oat => (
                              <Fragment key={oat}>
                                <th className="text-center py-2 px-1 text-slate-400 font-medium text-xs whitespace-nowrap">
                                  Roll
                                </th>
                                <th className="text-center py-2 px-1 text-slate-400 font-medium text-xs whitespace-nowrap border-r border-slate-700 last:border-r-0">
                                  50ft
                                </th>
                              </Fragment>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {getLandingUniquePAs().map(pa => (
                            <tr key={pa} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                              <td className="py-2 px-2 text-center border-r border-slate-700">
                                <span className="text-white font-medium">{pa.toLocaleString()}</span>
                              </td>
                              {getLandingUniqueOATs().map(oat => {
                                const entry = findLandingEntry(pa, oat);
                                return (
                                  <Fragment key={oat}>
                                    <td className="py-1 px-1">
                                      <input
                                        type="number"
                                        value={entry?.groundRoll ?? 0}
                                        onChange={(e) => updateLandingCell(pa, oat, 'groundRoll', parseFloat(e.target.value) || 0)}
                                        disabled={isPreset || inheritLandingTable}
                                        className="w-full min-w-[60px] px-2 py-1.5 rounded bg-slate-900/50 border border-slate-600 text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                      />
                                    </td>
                                    <td className="py-1 px-1 border-r border-slate-700 last:border-r-0">
                                      <input
                                        type="number"
                                        value={entry?.over50ft ?? 0}
                                        onChange={(e) => updateLandingCell(pa, oat, 'over50ft', parseFloat(e.target.value) || 0)}
                                        disabled={isPreset || inheritLandingTable}
                                        className="w-full min-w-[60px] px-2 py-1.5 rounded bg-slate-900/50 border border-slate-600 text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                      />
                                    </td>
                                  </Fragment>
                                );
                              })}
                              {!isPreset && !inheritLandingTable && (
                                <td className="py-1 px-2 text-center">
                                  <button
                                    onClick={() => removeLandingPARow(pa)}
                                    disabled={getLandingUniquePAs().length <= 1}
                                    className="text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                    title="Remove this PA row"
                                  >
                                    ✕
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Add PA Row button */}
                    {!isPreset && !inheritLandingTable && (
                      <button
                        onClick={addLandingPARow}
                        className="w-full py-3 border-2 border-dashed border-slate-600 hover:border-emerald-500/50 rounded-xl text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer"
                      >
                        + Add PA Row
                      </button>
                    )}

                    {/* Legend */}
                    <div className="text-xs text-slate-500 space-y-1">
                      <p><strong>Roll:</strong> Ground roll distance from touchdown (ft)</p>
                      <p><strong>50ft:</strong> Total distance over 50ft obstacle (ft)</p>
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
