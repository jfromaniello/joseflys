"use client";

import { Fragment, useState, useMemo } from "react";
import type { ClimbPerformance } from "@/lib/aircraft/types";
import {
  cumulativeToSegments,
  segmentsToCumulative,
  type ClimbSegment,
  rocToDeltaTime,
  estimateDeltaDistance,
} from "@/lib/climbCalculations";

interface ClimbTableSegmentEditorProps {
  climbTable: ClimbPerformance[];
  onChange: (table: ClimbPerformance[]) => void;
  disabled?: boolean;
}

export function ClimbTableSegmentEditor({
  climbTable,
  onChange,
  disabled = false,
}: ClimbTableSegmentEditorProps) {
  const [editingSegment, setEditingSegment] = useState<string | null>(null);

  // Convert to segments for display
  const segments = useMemo(() => cumulativeToSegments(climbTable), [climbTable]);

  // Get unique OATs
  const oats = useMemo(() => {
    return [...new Set(segments.map((s) => s.oat))].sort((a, b) => a - b);
  }, [segments]);

  // Get unique segment ranges (from→to)
  const segmentRanges = useMemo(() => {
    const ranges = new Map<string, { from: number; to: number }>();
    for (const seg of segments) {
      const key = `${seg.fromAltitude}-${seg.toAltitude}`;
      if (!ranges.has(key)) {
        ranges.set(key, { from: seg.fromAltitude, to: seg.toAltitude });
      }
    }
    return Array.from(ranges.values()).sort((a, b) => a.from - b.from);
  }, [segments]);

  // Find segment by range and OAT
  const findSegment = (from: number, to: number, oat: number) => {
    return segments.find(
      (s) => s.fromAltitude === from && s.toAltitude === to && s.oat === oat
    );
  };

  // Update a segment field
  const updateSegment = (
    from: number,
    to: number,
    oat: number,
    field: keyof ClimbSegment,
    value: number
  ) => {
    const segment = findSegment(from, to, oat);
    if (!segment) return;

    const updatedSegment = { ...segment, [field]: value };

    // If ROC changes, recalculate deltaTime
    if (field === "roc") {
      const deltaAlt = to - from;
      updatedSegment.deltaTime = rocToDeltaTime(value, deltaAlt);
      // Optionally estimate distance too
      updatedSegment.deltaDistance = estimateDeltaDistance(updatedSegment.deltaTime);
    }

    // Update segments and convert back to cumulative
    const updatedSegments = segments.map((s) =>
      s.fromAltitude === from && s.toAltitude === to && s.oat === oat
        ? updatedSegment
        : s
    );

    onChange(segmentsToCumulative(updatedSegments));
  };

  // Add a new altitude level
  const addAltitudeLevel = () => {
    if (segmentRanges.length === 0) {
      // First segment: 0 → 2000
      const newSegments: ClimbSegment[] = oats.length > 0
        ? oats.map((oat) => ({
            fromAltitude: 0,
            toAltitude: 2000,
            oat,
            roc: 600,
            deltaTime: 3.3,
            deltaFuel: 0.3,
            deltaDistance: 4,
          }))
        : [{
            fromAltitude: 0,
            toAltitude: 2000,
            oat: 20,
            roc: 600,
            deltaTime: 3.3,
            deltaFuel: 0.3,
            deltaDistance: 4,
          }];
      onChange(segmentsToCumulative(newSegments));
      return;
    }

    const lastRange = segmentRanges[segmentRanges.length - 1];
    const newFrom = lastRange.to;
    const newTo = newFrom + 2000;

    // Create new segments for each OAT, with reduced performance at higher altitude
    const newSegments: ClimbSegment[] = oats.map((oat) => {
      const prevSegment = findSegment(lastRange.from, lastRange.to, oat);
      const prevRoc = prevSegment?.roc || 500;
      const newRoc = Math.max(100, Math.round(prevRoc * 0.75)); // Reduce ROC at higher altitude
      const deltaAlt = 2000;
      const deltaTime = rocToDeltaTime(newRoc, deltaAlt);

      return {
        fromAltitude: newFrom,
        toAltitude: newTo,
        oat,
        roc: newRoc,
        deltaTime,
        deltaFuel: Math.round((prevSegment?.deltaFuel || 0.3) * 1.2 * 100) / 100,
        deltaDistance: estimateDeltaDistance(deltaTime),
      };
    });

    onChange(segmentsToCumulative([...segments, ...newSegments]));
  };

  // Remove the last altitude level
  const removeLastAltitudeLevel = () => {
    if (segmentRanges.length <= 1) return;

    const lastRange = segmentRanges[segmentRanges.length - 1];
    const updatedSegments = segments.filter(
      (s) => !(s.fromAltitude === lastRange.from && s.toAltitude === lastRange.to)
    );

    onChange(segmentsToCumulative(updatedSegments));
  };

  // Add a new OAT column
  const addOATColumn = (newOAT: number) => {
    if (oats.includes(newOAT)) return;

    // Find closest OAT to use as reference
    const closestOAT = oats.reduce((prev, curr) =>
      Math.abs(curr - newOAT) < Math.abs(prev - newOAT) ? curr : prev
    );

    // Create new segments for the new OAT
    const newSegments: ClimbSegment[] = segmentRanges.map((range) => {
      const refSegment = findSegment(range.from, range.to, closestOAT);
      // Warmer = worse performance
      const tempFactor = newOAT > closestOAT ? 0.95 : 1.05;
      const newRoc = Math.round((refSegment?.roc || 500) * tempFactor);
      const deltaAlt = range.to - range.from;
      const deltaTime = rocToDeltaTime(newRoc, deltaAlt);

      return {
        fromAltitude: range.from,
        toAltitude: range.to,
        oat: newOAT,
        roc: newRoc,
        deltaTime,
        deltaFuel: Math.round((refSegment?.deltaFuel || 0.3) / tempFactor * 100) / 100,
        deltaDistance: estimateDeltaDistance(deltaTime),
      };
    });

    onChange(segmentsToCumulative([...segments, ...newSegments]));
  };

  // Remove an OAT column
  const removeOATColumn = (oat: number) => {
    if (oats.length <= 1) return;
    const updatedSegments = segments.filter((s) => s.oat !== oat);
    onChange(segmentsToCumulative(updatedSegments));
  };

  // State for adding new OAT
  const [showNewOATInput, setShowNewOATInput] = useState(false);
  const [newOATValue, setNewOATValue] = useState("");

  const formatAltitude = (alt: number) => {
    if (alt === 0) return "SL";
    return alt.toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* OAT Column chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-400">OAT columns:</span>
        {oats.map((oat) => (
          <span
            key={oat}
            className="inline-flex items-center gap-1 px-3 py-1 bg-sky-600/20 border border-sky-500/30 rounded-full text-sm text-sky-300"
          >
            {oat}°C
            {!disabled && oats.length > 1 && (
              <button
                onClick={() => removeOATColumn(oat)}
                className="ml-1 text-sky-400 hover:text-red-400 cursor-pointer"
                title={`Remove ${oat}°C column`}
              >
                ×
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          showNewOATInput ? (
            <span className="inline-flex items-center gap-1">
              <input
                type="number"
                value={newOATValue}
                onChange={(e) => setNewOATValue(e.target.value)}
                placeholder="°C"
                autoFocus
                className="w-16 px-2 py-1 rounded bg-slate-900 border border-sky-500/50 text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 [&::-webkit-inner-spin-button]:appearance-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newOATValue) {
                    addOATColumn(parseFloat(newOATValue));
                    setNewOATValue("");
                    setShowNewOATInput(false);
                  } else if (e.key === "Escape") {
                    setNewOATValue("");
                    setShowNewOATInput(false);
                  }
                }}
              />
              <button
                onClick={() => {
                  if (newOATValue) {
                    addOATColumn(parseFloat(newOATValue));
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

      {/* Segment Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full">
          <thead className="bg-slate-900/50">
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-slate-300 font-semibold text-sm whitespace-nowrap border-r border-slate-700 w-32">
                Segment
              </th>
              <th className="text-center py-3 px-2 text-slate-300 font-semibold text-sm whitespace-nowrap border-r border-slate-700 w-20">
                ΔAlt (ft)
              </th>
              {oats.map((oat) => (
                <th
                  key={oat}
                  colSpan={4}
                  className="text-center py-2 px-2 text-sky-300 font-semibold text-sm whitespace-nowrap border-r border-slate-700 last:border-r-0"
                >
                  {oat}°C
                </th>
              ))}
              {!disabled && <th className="w-12"></th>}
            </tr>
            <tr className="border-b border-slate-700 bg-slate-800/30">
              <th></th>
              <th></th>
              {oats.map((oat) => (
                <Fragment key={oat}>
                  <th className="text-center py-2 px-1 text-slate-400 font-medium text-xs whitespace-nowrap">
                    ROC
                  </th>
                  <th className="text-center py-2 px-1 text-slate-400 font-medium text-xs whitespace-nowrap">
                    ΔTime
                  </th>
                  <th className="text-center py-2 px-1 text-slate-400 font-medium text-xs whitespace-nowrap">
                    ΔDist
                  </th>
                  <th className="text-center py-2 px-1 text-slate-400 font-medium text-xs whitespace-nowrap border-r border-slate-700 last:border-r-0">
                    ΔFuel
                  </th>
                </Fragment>
              ))}
              {!disabled && <th></th>}
            </tr>
          </thead>
          <tbody>
            {segmentRanges.map((range, idx) => (
              <tr
                key={`${range.from}-${range.to}`}
                className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors"
              >
                {/* Segment label */}
                <td className="py-2 px-4 border-r border-slate-700">
                  <span className="text-white font-medium text-sm">
                    {formatAltitude(range.from)} → {formatAltitude(range.to)}
                  </span>
                </td>
                {/* Delta altitude */}
                <td className="py-2 px-2 text-center border-r border-slate-700">
                  <span className="text-slate-400 text-sm">
                    {(range.to - range.from).toLocaleString()}
                  </span>
                </td>
                {/* Values for each OAT */}
                {oats.map((oat) => {
                  const segment = findSegment(range.from, range.to, oat);
                  return (
                    <Fragment key={oat}>
                      {/* ROC */}
                      <td className="py-1 px-1">
                        <input
                          type="number"
                          step="10"
                          value={segment?.roc ?? 0}
                          onChange={(e) =>
                            updateSegment(
                              range.from,
                              range.to,
                              oat,
                              "roc",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={disabled}
                          className="w-full min-w-[55px] px-1 py-1.5 rounded bg-slate-900/50 border border-slate-600 text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        />
                      </td>
                      {/* ΔTime */}
                      <td className="py-1 px-1">
                        <input
                          type="number"
                          step="0.1"
                          value={segment?.deltaTime ?? 0}
                          onChange={(e) =>
                            updateSegment(
                              range.from,
                              range.to,
                              oat,
                              "deltaTime",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={disabled}
                          className="w-full min-w-[50px] px-1 py-1.5 rounded bg-slate-900/50 border border-slate-600 text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        />
                      </td>
                      {/* ΔDist */}
                      <td className="py-1 px-1">
                        <input
                          type="number"
                          step="0.1"
                          value={segment?.deltaDistance ?? 0}
                          onChange={(e) =>
                            updateSegment(
                              range.from,
                              range.to,
                              oat,
                              "deltaDistance",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={disabled}
                          className="w-full min-w-[50px] px-1 py-1.5 rounded bg-slate-900/50 border border-slate-600 text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        />
                      </td>
                      {/* ΔFuel */}
                      <td className="py-1 px-1 border-r border-slate-700 last:border-r-0">
                        <input
                          type="number"
                          step="0.01"
                          value={segment?.deltaFuel ?? 0}
                          onChange={(e) =>
                            updateSegment(
                              range.from,
                              range.to,
                              oat,
                              "deltaFuel",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={disabled}
                          className="w-full min-w-[50px] px-1 py-1.5 rounded bg-slate-900/50 border border-slate-600 text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        />
                      </td>
                    </Fragment>
                  );
                })}
                {/* Remove button (only for last row) */}
                {!disabled && (
                  <td className="py-1 px-2 text-center">
                    {idx === segmentRanges.length - 1 && segmentRanges.length > 1 && (
                      <button
                        onClick={removeLastAltitudeLevel}
                        className="text-red-400 hover:text-red-300 cursor-pointer"
                        title="Remove this segment"
                      >
                        ✕
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add segment button */}
      {!disabled && (
        <div className="flex justify-center">
          <button
            onClick={addAltitudeLevel}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm transition-colors cursor-pointer"
          >
            + Add Altitude Segment
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="text-xs text-slate-500 space-y-1">
        <p><strong>ROC:</strong> Rate of Climb (ft/min) - editing recalculates ΔTime automatically</p>
        <p><strong>ΔTime:</strong> Minutes for this segment</p>
        <p><strong>ΔDist:</strong> Nautical miles for this segment</p>
        <p><strong>ΔFuel:</strong> Gallons consumed in this segment</p>
      </div>
    </div>
  );
}
