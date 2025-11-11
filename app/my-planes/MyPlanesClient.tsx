"use client";

import { useState, useEffect } from "react";
import { loadCustomAircraft, deleteCustomAircraft, updateAircraft } from "@/lib/aircraftStorage";
import { AircraftPerformance } from "@/lib/aircraftPerformance";
import { Navbar } from "../components/Navbar";

export default function MyPlanesClient() {
  const [aircraft, setAircraft] = useState<AircraftPerformance[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    // Load aircraft on mount
    const loaded = loadCustomAircraft();
    setAircraft(loaded);
  }, []);

  const handleDelete = (model: string) => {
    if (confirm("Are you sure you want to delete this aircraft?")) {
      deleteCustomAircraft(model);
      setAircraft(loadCustomAircraft());
    }
  };

  const handleStartEdit = (plane: AircraftPerformance) => {
    setEditingId(plane.model);
    setEditName(plane.name);
  };

  const handleSaveEdit = (model: string) => {
    if (editName.trim()) {
      updateAircraft(model, { name: editName.trim() });
      setAircraft(loadCustomAircraft());
    }
    setEditingId(null);
    setEditName("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
      <Navbar currentPage="my-planes" />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 md:p-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Planes</h1>

          <p className="text-slate-400 text-sm mb-6">
            All data is stored locally on your device only
          </p>

          {aircraft.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg">No saved aircraft yet.</p>
              <p className="text-slate-500 text-sm mt-2">
                Create custom aircraft from the Course, Leg, or Climb calculators.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Name</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Model ID</th>
                    <th className="text-center py-3 px-4 text-slate-300 font-semibold">Standard Weight</th>
                    <th className="text-center py-3 px-4 text-slate-300 font-semibold">Max Weight</th>
                    <th className="text-center py-3 px-4 text-slate-300 font-semibold">Climb Table</th>
                    <th className="text-center py-3 px-4 text-slate-300 font-semibold">Deviation Table</th>
                    <th className="text-right py-3 px-4 text-slate-300 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {aircraft.map((plane) => (
                    <tr key={plane.model} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        {editingId === plane.model ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-3 py-1 bg-slate-700 text-white rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(plane.model);
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                          />
                        ) : (
                          <span className="text-white">{plane.name}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-400 font-mono text-sm">{plane.model}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={plane.standardWeight !== undefined ? "text-green-400" : "text-slate-500"}>
                          {plane.standardWeight !== undefined ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={plane.maxWeight !== undefined ? "text-green-400" : "text-slate-500"}>
                          {plane.maxWeight !== undefined ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={plane.climbTable && plane.climbTable.length > 0 ? "text-green-400" : "text-slate-500"}>
                          {plane.climbTable && plane.climbTable.length > 0 ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={plane.deviationTable && plane.deviationTable.length > 0 ? "text-green-400" : "text-slate-500"}>
                          {plane.deviationTable && plane.deviationTable.length > 0 ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {editingId === plane.model ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(plane.model)}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded text-sm transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(plane)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                              >
                                Rename
                              </button>
                              <button
                                onClick={() => handleDelete(plane.model)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
