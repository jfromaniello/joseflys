/**
 * Leg Route Points List
 * Displays Start/Checkpoints/End of Leg with geocoding search
 */

"use client";

import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Tooltip } from "@/app/components/Tooltip";
import { LocationSearchInput, LocationResult } from "@/app/components/LocationSearchInput";

export interface LegCheckpoint {
  lat: number;
  lon: number;
  name: string;
}

interface LegWaypointsTableProps {
  fromPoint: LegCheckpoint | null;
  toPoint: LegCheckpoint | null;
  checkpoints: LegCheckpoint[];
  onFromChange: (point: LegCheckpoint | null) => void;
  onToChange: (point: LegCheckpoint | null) => void;
  onCheckpointsChange: (points: LegCheckpoint[]) => void;
}

// Convert between LegCheckpoint and LocationResult (they're compatible)
function toLocationResult(point: LegCheckpoint | null): LocationResult | null {
  return point;
}

function toLegCheckpoint(location: LocationResult | null): LegCheckpoint | null {
  return location;
}

export function LegWaypointsTable({
  fromPoint,
  toPoint,
  checkpoints,
  onFromChange,
  onToChange,
  onCheckpointsChange,
}: LegWaypointsTableProps) {
  const handleAddCheckpoint = () => {
    onCheckpointsChange([...checkpoints, { name: "", lat: 0, lon: 0 }]);
  };

  const handleRemoveCheckpoint = (index: number) => {
    const newCheckpoints = [...checkpoints];
    newCheckpoints.splice(index, 1);
    onCheckpointsChange(newCheckpoints);
  };

  const handleUpdateCheckpoint = (index: number, location: LocationResult | null) => {
    if (location === null) {
      // Clear the checkpoint but keep the slot
      const newCheckpoints = [...checkpoints];
      newCheckpoints[index] = { name: "", lat: 0, lon: 0 };
      onCheckpointsChange(newCheckpoints);
    } else {
      const newCheckpoints = [...checkpoints];
      newCheckpoints[index] = location;
      onCheckpointsChange(newCheckpoints);
    }
  };

  const handleMoveCheckpointUp = (index: number) => {
    if (index === 0) return;
    const newCheckpoints = [...checkpoints];
    [newCheckpoints[index - 1], newCheckpoints[index]] = [newCheckpoints[index], newCheckpoints[index - 1]];
    onCheckpointsChange(newCheckpoints);
  };

  const handleMoveCheckpointDown = (index: number) => {
    if (index === checkpoints.length - 1) return;
    const newCheckpoints = [...checkpoints];
    [newCheckpoints[index], newCheckpoints[index + 1]] = [newCheckpoints[index + 1], newCheckpoints[index]];
    onCheckpointsChange(newCheckpoints);
  };

  return (
    <div className="leg-waypoints">
      <h3
        className="text-sm font-semibold mb-3 uppercase tracking-wide"
        style={{ color: "oklch(0.65 0.15 230)" }}
      >
        Route Points
      </h3>

      <div className="space-y-3">
        {/* Start of Leg */}
        <LocationSearchInput
          value={toLocationResult(fromPoint)}
          onChange={(loc) => onFromChange(toLegCheckpoint(loc))}
          label="Start of Leg"
          tooltip="Search for the starting point of this leg or paste coordinates (e.g., 40.6413, -73.7781)"
          placeholder="Search airport, city, or paste coordinates..."
          selectedBorderColor="border-green-500/50"
        />

        {/* Checkpoints */}
        {checkpoints.map((checkpoint, index) => (
          <div key={index}>
            {index === 0 && (
              <div className="flex items-center justify-between mb-2">
                <label
                  className="flex items-center text-sm font-medium"
                  style={{ color: "oklch(0.72 0.015 240)" }}
                >
                  Checkpoints
                  <Tooltip content="Add intermediate checkpoints along your route" />
                </label>
                <button
                  onClick={handleAddCheckpoint}
                  className="px-3 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-medium transition-all cursor-pointer"
                >
                  + Add Checkpoint
                </button>
              </div>
            )}

            {checkpoint.name ? (
              // Selected checkpoint with reorder controls
              <div className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-blue-500/50 text-white">
                <div className="flex items-center justify-between gap-3">
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleMoveCheckpointUp(index)}
                      disabled={index === 0}
                      className={`p-1 rounded ${index === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-blue-400 cursor-pointer'} transition-colors`}
                      title="Move up"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveCheckpointDown(index)}
                      disabled={index === checkpoints.length - 1}
                      className={`p-1 rounded ${index === checkpoints.length - 1 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-blue-400 cursor-pointer'} transition-colors`}
                      title="Move down"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Location info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-medium truncate">
                      {checkpoint.name.split(",")[0]}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {checkpoint.lat.toFixed(5)}, {checkpoint.lon.toFixed(5)}
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveCheckpoint(index)}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                    title="Remove"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              // Empty checkpoint search input
              <LocationSearchInput
                value={null}
                onChange={(loc) => handleUpdateCheckpoint(index, loc)}
                showLabel={false}
                placeholder="Search airport, city, or paste coordinates..."
                selectedBorderColor="border-blue-500/50"
              />
            )}
          </div>
        ))}

        {/* End of Leg */}
        <LocationSearchInput
          value={toLocationResult(toPoint)}
          onChange={(loc) => onToChange(toLegCheckpoint(loc))}
          label="End of Leg"
          tooltip="Search for the ending point of this leg or paste coordinates"
          placeholder="Search airport, city, or paste coordinates..."
          selectedBorderColor="border-red-500/50"
        />

        {/* Add Checkpoint button (if no checkpoints yet) */}
        {checkpoints.length === 0 && (
          <div className="flex justify-center">
            <button
              onClick={handleAddCheckpoint}
              className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-medium transition-all cursor-pointer flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Add Checkpoint
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
