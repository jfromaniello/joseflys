"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import {
  loadCustomAircraft,
  deleteCustomAircraft,
  forkAircraft,
  exportAircraftToJSON,
  importAircraftFromJSON,
} from "@/lib/aircraftStorage";
import { AircraftPerformance, PRESET_AIRCRAFT } from "@/lib/aircraft";
import { Navbar } from "../components/Navbar";

export default function MyPlanesClient() {
  const router = useRouter();
  const [customAircraft, setCustomAircraft] = useState<AircraftPerformance[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedTab, setSelectedTab] = useState(0); // 0 = Custom, 1 = Preset
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    // Load custom aircraft on mount
    const loaded = loadCustomAircraft();
    setCustomAircraft(loaded);
  }, []);

  // Reset page when search query or tab changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, selectedTab]);

  const handleDelete = (model: string) => {
    if (confirm("Are you sure you want to delete this aircraft?")) {
      deleteCustomAircraft(model);
      setCustomAircraft(loadCustomAircraft());
    }
  };

  const handleFork = (aircraft: AircraftPerformance) => {
    const forked = forkAircraft(aircraft);
    // Reload custom aircraft list
    setCustomAircraft(loadCustomAircraft());
    // Navigate to editor
    router.push(`/aircraft/${forked.model}`);
  };

  const handleEdit = (model: string) => {
    router.push(`/aircraft/${model}`);
  };

  const handleExport = (aircraft: AircraftPerformance) => {
    const json = exportAircraftToJSON(aircraft);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${aircraft.name.replace(/\s+/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const imported = importAircraftFromJSON(content);
      if (imported) {
        setCustomAircraft(loadCustomAircraft());
        alert(`Successfully imported "${imported.name}"`);
      } else {
        alert("Failed to import aircraft. Please check the JSON file.");
      }
    };
    reader.readAsText(file);

    // Reset input to allow importing same file again
    event.target.value = "";
  };

  // Filter aircraft based on search query
  const filterAircraft = (aircraft: AircraftPerformance[]) => {
    if (!searchQuery.trim()) return aircraft;

    const query = searchQuery.toLowerCase();
    return aircraft.filter(plane =>
      plane.name.toLowerCase().includes(query) ||
      plane.model.toLowerCase().includes(query) ||
      (plane.engine?.type?.toLowerCase().includes(query))
    );
  };

  // Get paginated aircraft
  const getPaginatedAircraft = (aircraft: AircraftPerformance[]) => {
    const filtered = filterAircraft(aircraft);
    const start = currentPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return {
      items: filtered.slice(start, end),
      totalPages: Math.ceil(filtered.length / ITEMS_PER_PAGE),
      totalItems: filtered.length,
    };
  };

  const customData = getPaginatedAircraft(customAircraft);
  const presetData = getPaginatedAircraft(PRESET_AIRCRAFT as AircraftPerformance[]);

  const renderPagination = (totalPages: number, totalItems: number) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-900/30 rounded-lg border border-slate-700">
        <div className="text-sm text-slate-400">
          Showing {currentPage * ITEMS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalItems)} of {totalItems}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`px-3 py-1 rounded text-sm transition-colors cursor-pointer ${
                  i === currentPage
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage >= totalPages - 1}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <Navbar currentPage="my-planes" />

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 md:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">My Planes</h1>
              <p className="text-slate-400 text-sm">
                All data is stored locally on your device only
              </p>
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1 md:flex-initial">
                <input
                  type="text"
                  placeholder="Search aircraft..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full md:w-64 px-4 py-2 pl-10 bg-slate-900/50 border-2 border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                />
                <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                onClick={handleImportClick}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Import
              </button>
            </div>
          </div>

          {/* Tabs */}
          <TabGroup selectedIndex={selectedTab} onChange={setSelectedTab}>
            <TabList className="flex gap-2 border-b border-slate-700 mb-6">
              <Tab className="px-4 py-2 text-sm font-medium transition-colors cursor-pointer focus:outline-none data-[selected]:text-white data-[selected]:border-b-2 data-[selected]:border-sky-500 data-[hover]:text-slate-300 text-slate-400">
                Custom Aircraft ({customData.totalItems})
              </Tab>
              <Tab className="px-4 py-2 text-sm font-medium transition-colors cursor-pointer focus:outline-none data-[selected]:text-white data-[selected]:border-b-2 data-[selected]:border-sky-500 data-[hover]:text-slate-300 text-slate-400">
                Preset Aircraft ({presetData.totalItems})
              </Tab>
            </TabList>

            <TabPanels>
              {/* Custom Aircraft Tab */}
              <TabPanel>
                {customData.totalItems === 0 ? (
                  <div className="text-center py-12 border border-slate-700 rounded-xl bg-slate-900/30">
                    <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <p className="text-slate-400 text-lg">
                      {searchQuery ? 'No aircraft match your search.' : 'No custom aircraft yet.'}
                    </p>
                    <p className="text-slate-500 text-sm mt-2">
                      {searchQuery ? 'Try a different search term.' : 'Fork a preset aircraft or import a JSON file to get started.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-xl border border-slate-700">
                      <table className="w-full">
                        <thead className="bg-slate-900/50">
                          <tr className="border-b border-slate-700">
                            <th className="text-left py-3 px-4 text-slate-300 font-semibold">Name</th>
                            <th className="text-left py-3 px-4 text-slate-300 font-semibold">Inherits From</th>
                            <th className="text-left py-3 px-4 text-slate-300 font-semibold">Model ID</th>
                            <th className="text-right py-3 px-4 text-slate-300 font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customData.items.map((plane) => {
                            const parent = plane.inherit ? PRESET_AIRCRAFT.find(p => p.model === plane.inherit) : null;
                            return (
                              <tr key={plane.model} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                                <td className="py-3 px-4">
                                  <span className="text-white font-medium">{plane.name}</span>
                                </td>
                                <td className="py-3 px-4">
                                  {parent ? (
                                    <span className="text-sm px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                                      {parent.name}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 text-sm">Standalone</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-slate-400 font-mono text-sm">{plane.model}</span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => handleEdit(plane.model)}
                                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleFork(plane)}
                                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm transition-colors cursor-pointer"
                                    >
                                      Fork
                                    </button>
                                    <button
                                      onClick={() => handleExport(plane)}
                                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors cursor-pointer"
                                    >
                                      Export
                                    </button>
                                    <button
                                      onClick={() => handleDelete(plane.model)}
                                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {renderPagination(customData.totalPages, customData.totalItems)}
                  </>
                )}
              </TabPanel>

              {/* Preset Aircraft Tab */}
              <TabPanel>
                {presetData.totalItems === 0 ? (
                  <div className="text-center py-12 border border-slate-700 rounded-xl bg-slate-900/30">
                    <p className="text-slate-400 text-lg">No aircraft match your search.</p>
                    <p className="text-slate-500 text-sm mt-2">Try a different search term.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-xl border border-slate-700">
                      <table className="w-full">
                        <thead className="bg-slate-900/50">
                          <tr className="border-b border-slate-700">
                            <th className="text-left py-3 px-4 text-slate-300 font-semibold">Name</th>
                            <th className="text-left py-3 px-4 text-slate-300 font-semibold">Engine</th>
                            <th className="text-center py-3 px-4 text-slate-300 font-semibold">Max Power</th>
                            <th className="text-center py-3 px-4 text-slate-300 font-semibold">Cruise Range</th>
                            <th className="text-right py-3 px-4 text-slate-300 font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {presetData.items.map((plane) => (
                            <tr key={plane.model} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                              <td className="py-3 px-4">
                                <div>
                                  <div className="text-white font-medium">{plane.name}</div>
                                  <div className="text-slate-400 text-sm font-mono">{plane.model}</div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-slate-300 text-sm">{plane.engine?.type || "N/A"}</span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="text-slate-300">{plane.engine?.ratedHP || "N/A"} HP</span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {plane.cruiseTable && plane.cruiseTable.length > 0 ? (
                                  <span className="text-slate-300 text-sm">
                                    {Math.min(...plane.cruiseTable.map(c => c.tas))}-{Math.max(...plane.cruiseTable.map(c => c.tas))} KT
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-sm">N/A</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => handleFork(plane)}
                                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm transition-colors cursor-pointer"
                                    title="Create a custom copy"
                                  >
                                    Fork
                                  </button>
                                  <button
                                    onClick={() => handleExport(plane)}
                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors cursor-pointer"
                                    title="Export as JSON"
                                  >
                                    Export
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {renderPagination(presetData.totalPages, presetData.totalItems)}
                  </>
                )}
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
      </div>
    </div>
  );
}
