"use client";

import { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { Navbar } from "@/app/components/Navbar";
import {
  ResolvedAircraftPerformance,
  PRESET_AIRCRAFT,
} from "@/lib/aircraft";
import {
  getRawAircraftByModel,
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

interface ViewAircraftClientProps {
  aircraftId: string;
  initialAircraft?: ResolvedAircraftPerformance | null;
}

export function ViewAircraftClient({ aircraftId, initialAircraft }: ViewAircraftClientProps) {
  const router = useRouter();
  // Use initialAircraft for SSR, loading only needed for custom aircraft
  const [resolved, setResolved] = useState<ResolvedAircraftPerformance | null>(initialAircraft ?? null);
  const [loading, setLoading] = useState(!initialAircraft);

  // Chart metric states
  const [climbChartMetric, setClimbChartMetric] = useState<'time' | 'fuel' | 'distance'>('time');
  const [cruiseChartMetric, setCruiseChartMetric] = useState<'tas' | 'fuelFlow'>('tas');
  const [takeoffChartMetric, setTakeoffChartMetric] = useState<'groundRoll' | 'over50ft'>('groundRoll');

  useEffect(() => {
    // If we already have initialAircraft (preset), no need to load
    if (initialAircraft) return;

    // Try to load from custom aircraft (localStorage)
    const loaded = getRawAircraftByModel(aircraftId);
    if (loaded) {
      setResolved(resolveAircraft(loaded));
      setLoading(false);
      return;
    }

    // Not found - redirect
    router.push("/my-planes");
  }, [aircraftId, router, initialAircraft]);

  // Check if this is a preset aircraft
  const isPreset = !!initialAircraft || PRESET_AIRCRAFT.some(p => p.model === aircraftId);

  // Helper functions for climb table
  const getClimbUniquePAs = () => {
    if (!resolved?.climbTable) return [];
    return [...new Set(resolved.climbTable.map(r => r.pressureAltitude))].sort((a, b) => a - b);
  };

  const getClimbUniqueOATs = () => {
    if (!resolved?.climbTable) return [];
    return [...new Set(resolved.climbTable.map(r => r.oat))].sort((a, b) => a - b);
  };

  const findClimbEntry = (pa: number, oat: number) => {
    return resolved?.climbTable?.find(r => r.pressureAltitude === pa && r.oat === oat);
  };

  // Helper functions for takeoff table
  const getTakeoffUniquePAs = () => {
    if (!resolved?.takeoffTable) return [];
    return [...new Set(resolved.takeoffTable.map(r => r.altitude))].sort((a, b) => a - b);
  };

  const getTakeoffUniqueOATs = () => {
    if (!resolved?.takeoffTable) return [];
    return [...new Set(resolved.takeoffTable.map(r => r.oat))].sort((a, b) => a - b);
  };

  const findTakeoffEntry = (pa: number, oat: number) => {
    return resolved?.takeoffTable?.find(r => r.altitude === pa && r.oat === oat);
  };

  // Helper functions for landing table
  const getLandingUniquePAs = () => {
    if (!resolved?.landingTable) return [];
    return [...new Set(resolved.landingTable.map(r => r.altitude))].sort((a, b) => a - b);
  };

  const getLandingUniqueOATs = () => {
    if (!resolved?.landingTable) return [];
    return [...new Set(resolved.landingTable.map(r => r.oat))].sort((a, b) => a - b);
  };

  const findLandingEntry = (pa: number, oat: number) => {
    return resolved?.landingTable?.find(r => r.altitude === pa && r.oat === oat);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!resolved) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <Navbar currentPage="my-planes" />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{resolved.name}</h1>
              <p className="text-slate-400">
                Model: {resolved.model}
                {isPreset && <span className="ml-2 px-2 py-0.5 bg-sky-600/20 text-sky-300 text-xs rounded-full">Preset</span>}
              </p>
            </div>
            <div className="flex gap-3">
              {!isPreset && (
                <button
                  onClick={() => router.push(`/aircraft/${aircraftId}`)}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  Edit Aircraft
                </button>
              )}
              <button
                onClick={() => router.push("/my-planes")}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                Back to My Planes
              </button>
            </div>
          </div>

          {/* Description & Wikipedia */}
          {(resolved.description || resolved.wikipediaUrl) && (
            <div className="mt-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700">
              {resolved.description && (
                <p className="text-slate-300 text-sm leading-relaxed">{resolved.description}</p>
              )}
              {resolved.wikipediaUrl && (
                <a
                  href={resolved.wikipediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-sky-400 hover:text-sky-300 text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                  Learn more on Wikipedia
                </a>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">
          <TabGroup>
            <TabList className="flex gap-2 border-b border-slate-700 mb-6 overflow-x-auto pb-2">
              {["Overview", "Climb", "Cruise", "Takeoff/Landing", "Compass Deviation"].map((tab) => (
                <Tab key={tab} as={Fragment}>
                  {({ selected }) => (
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        selected
                          ? "bg-sky-600 text-white"
                          : "text-slate-400 hover:text-white hover:bg-slate-700"
                      }`}
                    >
                      {tab}
                    </button>
                  )}
                </Tab>
              ))}
            </TabList>

            <TabPanels>
              {/* Overview Tab */}
              <TabPanel>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Weights */}
                  <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-700">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-sky-600/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                      </span>
                      Weights
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Empty Weight</span>
                        <span className="text-white font-medium">{resolved.weights.emptyWeight.toLocaleString()} lbs</span>
                      </div>
                      {resolved.weights.standardWeight && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Standard Weight</span>
                          <span className="text-white font-medium">{resolved.weights.standardWeight.toLocaleString()} lbs</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-400">Max Gross Weight</span>
                        <span className="text-white font-medium">{resolved.weights.maxGrossWeight.toLocaleString()} lbs</span>
                      </div>
                    </div>
                  </div>

                  {/* Engine */}
                  <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-700">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-orange-600/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </span>
                      Engine
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Type</span>
                        <span className="text-white font-medium">{resolved.engine.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Rated HP</span>
                        <span className="text-white font-medium">{resolved.engine.ratedHP} HP</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Max RPM</span>
                        <span className="text-white font-medium">{resolved.engine.maxRPM.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Usable Fuel</span>
                        <span className="text-white font-medium">{resolved.engine.usableFuelGallons} gal</span>
                      </div>
                    </div>
                  </div>

                  {/* V-Speeds */}
                  <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-700">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </span>
                      V-Speeds
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vne</span>
                        <span className="text-white font-medium">{resolved.limits.vne} kt</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vno</span>
                        <span className="text-white font-medium">{resolved.limits.vno} kt</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Va</span>
                        <span className="text-white font-medium">{resolved.limits.va} kt</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vfe</span>
                        <span className="text-white font-medium">{resolved.limits.vfe} kt</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vs</span>
                        <span className="text-white font-medium">{resolved.limits.vs} kt</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vs0</span>
                        <span className="text-white font-medium">{resolved.limits.vs0} kt</span>
                      </div>
                    </div>
                  </div>

                  {/* Data Summary */}
                  <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-700 md:col-span-2 lg:col-span-3">
                    <h3 className="text-lg font-semibold text-white mb-4">Performance Data Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="p-3 rounded-lg bg-slate-800/50">
                        <div className="text-slate-400 mb-1">Climb Table</div>
                        <div className="text-white font-medium">{resolved.climbTable?.length || 0} entries</div>
                        <div className="text-xs text-slate-500">{getClimbUniqueOATs().length} OAT columns</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-800/50">
                        <div className="text-slate-400 mb-1">Cruise Table</div>
                        <div className="text-white font-medium">{resolved.cruiseTable?.length || 0} entries</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-800/50">
                        <div className="text-slate-400 mb-1">Takeoff Table</div>
                        <div className="text-white font-medium">{resolved.takeoffTable?.length || 0} entries</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-800/50">
                        <div className="text-slate-400 mb-1">Landing Table</div>
                        <div className="text-white font-medium">{resolved.landingTable?.length || 0} entries</div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabPanel>

              {/* Climb Tab */}
              <TabPanel>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Climb Performance Table</h3>
                    <p className="text-sm text-slate-400 mb-4">
                      POH-style climb data: cumulative time, fuel, and distance from sea level.
                    </p>
                  </div>

                  {resolved.climbTable && resolved.climbTable.length > 0 ? (
                    <>
                      {/* POH-style table */}
                      <div className="overflow-x-auto rounded-xl border border-slate-700">
                        <table className="w-full">
                          <thead className="bg-slate-900/50">
                            <tr className="border-b border-slate-700">
                              <th rowSpan={2} className="text-center py-3 px-4 text-slate-300 font-semibold text-sm border-r border-slate-700 w-24">
                                PA (ft)
                              </th>
                              {getClimbUniqueOATs().map(oat => (
                                <th key={oat} colSpan={3} className="text-center py-2 px-2 text-sky-300 font-semibold text-sm border-r border-slate-700 last:border-r-0">
                                  {oat}°C
                                </th>
                              ))}
                            </tr>
                            <tr className="border-b border-slate-700">
                              {getClimbUniqueOATs().map(oat => (
                                <Fragment key={oat}>
                                  <th className="text-center py-2 px-2 text-slate-400 font-medium text-xs">Time</th>
                                  <th className="text-center py-2 px-2 text-slate-400 font-medium text-xs">Fuel</th>
                                  <th className="text-center py-2 px-2 text-slate-400 font-medium text-xs border-r border-slate-700 last:border-r-0">Dist</th>
                                </Fragment>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {getClimbUniquePAs().map(pa => (
                              <tr key={pa} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                                <td className="py-2 px-4 text-center border-r border-slate-700 text-white font-medium">
                                  {pa.toLocaleString()}
                                </td>
                                {getClimbUniqueOATs().map(oat => {
                                  const entry = findClimbEntry(pa, oat);
                                  return (
                                    <Fragment key={oat}>
                                      <td className="py-2 px-2 text-center text-slate-300 text-sm">{entry?.timeFromSL ?? '-'}</td>
                                      <td className="py-2 px-2 text-center text-slate-300 text-sm">{entry?.fuelFromSL ?? '-'}</td>
                                      <td className="py-2 px-2 text-center text-slate-300 text-sm border-r border-slate-700 last:border-r-0">{entry?.distanceFromSL ?? '-'}</td>
                                    </Fragment>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Chart */}
                      <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/30">
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
                              data={getClimbUniquePAs().map(pa => {
                                const point: Record<string, number> = { pa };
                                getClimbUniqueOATs().forEach(oat => {
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
                              })}
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
                              {getClimbUniqueOATs().map((oat, index) => {
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
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-slate-400">No climb performance data available</div>
                  )}
                </div>
              </TabPanel>

              {/* Cruise Tab */}
              <TabPanel>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Cruise Performance Table</h3>
                    <p className="text-sm text-slate-400 mb-4">
                      Cruise performance at different altitudes and power settings.
                    </p>
                  </div>

                  {resolved.cruiseTable && resolved.cruiseTable.length > 0 ? (
                    <>
                      {/* Table */}
                      <div className="overflow-x-auto rounded-xl border border-slate-700">
                        <table className="w-full">
                          <thead className="bg-slate-900/50">
                            <tr className="border-b border-slate-700">
                              <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm">Altitude (ft)</th>
                              <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm">RPM</th>
                              <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm">% Power</th>
                              <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm">TAS (kt)</th>
                              <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm">Fuel Flow (GPH)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resolved.cruiseTable.map((row, index) => (
                              <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                                <td className="py-3 px-4 text-white">{row.altitude.toLocaleString()}</td>
                                <td className="py-3 px-4 text-slate-300">{row.rpm.toLocaleString()}</td>
                                <td className="py-3 px-4 text-slate-300">{row.percentPower}%</td>
                                <td className="py-3 px-4 text-slate-300">{row.tas}</td>
                                <td className="py-3 px-4 text-slate-300">{row.fuelFlow}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Chart */}
                      <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/30">
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
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-slate-400">No cruise performance data available</div>
                  )}
                </div>
              </TabPanel>

              {/* Takeoff/Landing Tab */}
              <TabPanel>
                <div className="space-y-8">
                  {/* Takeoff */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Takeoff Performance</h3>
                      <p className="text-sm text-slate-400 mb-4">
                        Ground roll and over-50ft distances at each pressure altitude and temperature.
                      </p>
                    </div>

                    {resolved.takeoffTable && resolved.takeoffTable.length > 0 ? (
                      <>
                        <div className="overflow-x-auto rounded-xl border border-slate-700">
                          <table className="w-full">
                            <thead className="bg-slate-900/50">
                              <tr className="border-b border-slate-700">
                                <th rowSpan={2} className="text-center py-3 px-4 text-slate-300 font-semibold text-sm border-r border-slate-700 w-24">
                                  PA (ft)
                                </th>
                                {getTakeoffUniqueOATs().map(oat => (
                                  <th key={oat} colSpan={2} className="text-center py-2 px-2 text-orange-300 font-semibold text-sm border-r border-slate-700 last:border-r-0">
                                    {oat}°C
                                  </th>
                                ))}
                              </tr>
                              <tr className="border-b border-slate-700">
                                {getTakeoffUniqueOATs().map(oat => (
                                  <Fragment key={oat}>
                                    <th className="text-center py-2 px-2 text-slate-400 font-medium text-xs">Roll</th>
                                    <th className="text-center py-2 px-2 text-slate-400 font-medium text-xs border-r border-slate-700 last:border-r-0">50ft</th>
                                  </Fragment>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {getTakeoffUniquePAs().map(pa => (
                                <tr key={pa} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                                  <td className="py-2 px-4 text-center border-r border-slate-700 text-white font-medium">
                                    {pa.toLocaleString()}
                                  </td>
                                  {getTakeoffUniqueOATs().map(oat => {
                                    const entry = findTakeoffEntry(pa, oat);
                                    return (
                                      <Fragment key={oat}>
                                        <td className="py-2 px-2 text-center text-slate-300 text-sm">{entry?.groundRoll ?? '-'}</td>
                                        <td className="py-2 px-2 text-center text-slate-300 text-sm border-r border-slate-700 last:border-r-0">{entry?.over50ft ?? '-'}</td>
                                      </Fragment>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Takeoff Chart */}
                        <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/30">
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
                                data={getTakeoffUniquePAs().map(pa => {
                                  const point: Record<string, number> = { pa };
                                  getTakeoffUniqueOATs().forEach(oat => {
                                    const entry = findTakeoffEntry(pa, oat);
                                    if (entry) {
                                      point[`${oat}°C`] = takeoffChartMetric === 'groundRoll' ? entry.groundRoll : entry.over50ft;
                                    }
                                  });
                                  return point;
                                })}
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
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-slate-400">No takeoff performance data available</div>
                    )}
                  </div>

                  {/* Landing */}
                  <div className="space-y-6 pt-8 border-t border-slate-700">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Landing Performance</h3>
                      <p className="text-sm text-slate-400 mb-4">
                        Ground roll and over-50ft distances at each pressure altitude and temperature.
                      </p>
                    </div>

                    {resolved.landingTable && resolved.landingTable.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-slate-700">
                        <table className="w-full">
                          <thead className="bg-slate-900/50">
                            <tr className="border-b border-slate-700">
                              <th rowSpan={2} className="text-center py-3 px-4 text-slate-300 font-semibold text-sm border-r border-slate-700 w-24">
                                PA (ft)
                              </th>
                              {getLandingUniqueOATs().map(oat => (
                                <th key={oat} colSpan={2} className="text-center py-2 px-2 text-emerald-300 font-semibold text-sm border-r border-slate-700 last:border-r-0">
                                  {oat}°C
                                </th>
                              ))}
                            </tr>
                            <tr className="border-b border-slate-700">
                              {getLandingUniqueOATs().map(oat => (
                                <Fragment key={oat}>
                                  <th className="text-center py-2 px-2 text-slate-400 font-medium text-xs">Roll</th>
                                  <th className="text-center py-2 px-2 text-slate-400 font-medium text-xs border-r border-slate-700 last:border-r-0">50ft</th>
                                </Fragment>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {getLandingUniquePAs().map(pa => (
                              <tr key={pa} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                                <td className="py-2 px-4 text-center border-r border-slate-700 text-white font-medium">
                                  {pa.toLocaleString()}
                                </td>
                                {getLandingUniqueOATs().map(oat => {
                                  const entry = findLandingEntry(pa, oat);
                                  return (
                                    <Fragment key={oat}>
                                      <td className="py-2 px-2 text-center text-slate-300 text-sm">{entry?.groundRoll ?? '-'}</td>
                                      <td className="py-2 px-2 text-center text-slate-300 text-sm border-r border-slate-700 last:border-r-0">{entry?.over50ft ?? '-'}</td>
                                    </Fragment>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-400">No landing performance data available</div>
                    )}
                  </div>
                </div>
              </TabPanel>

              {/* Compass Deviation Tab */}
              <TabPanel>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Compass Deviation Table</h3>
                    <p className="text-sm text-slate-400 mb-4">
                      Compass deviation correction for different headings.
                    </p>
                  </div>

                  {resolved.deviationTable && resolved.deviationTable.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-700">
                      <table className="w-full">
                        <thead className="bg-slate-900/50">
                          <tr className="border-b border-slate-700">
                            <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm">For Heading (°)</th>
                            <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm">Steer Heading (°)</th>
                            <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm">Deviation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resolved.deviationTable.map((row, index) => (
                            <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                              <td className="py-3 px-4 text-white">{row.forHeading}°</td>
                              <td className="py-3 px-4 text-slate-300">{row.steerHeading}°</td>
                              <td className="py-3 px-4 text-slate-300">
                                {row.steerHeading - row.forHeading > 0 ? '+' : ''}{row.steerHeading - row.forHeading}°
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400">No compass deviation data available</div>
                  )}
                </div>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
      </main>
    </div>
  );
}
