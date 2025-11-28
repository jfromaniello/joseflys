/**
 * Route Points Input Component
 * Allows users to input departure, waypoints, destination, and alternate for a flight plan
 */

"use client";

import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { LocationSearchInput, LocationResult } from "@/app/components/LocationSearchInput";

export interface RoutePoint {
  lat: number;
  lon: number;
  name: string;
}

interface RoutePointsInputProps {
  departure: RoutePoint | null;
  destination: RoutePoint | null;
  waypoints: RoutePoint[];
  alternate: RoutePoint | null;
  onDepartureChange: (point: RoutePoint | null) => void;
  onDestinationChange: (point: RoutePoint | null) => void;
  onWaypointsChange: (points: RoutePoint[]) => void;
  onAlternateChange: (point: RoutePoint | null) => void;
}

// Convert between RoutePoint and LocationResult (they're compatible)
function toLocationResult(point: RoutePoint | null): LocationResult | null {
  return point;
}

function toRoutePoint(location: LocationResult | null): RoutePoint | null {
  return location;
}

export function RoutePointsInput({
  departure,
  destination,
  waypoints,
  alternate,
  onDepartureChange,
  onDestinationChange,
  onWaypointsChange,
  onAlternateChange,
}: RoutePointsInputProps) {
  const addWaypoint = () => {
    onWaypointsChange([...waypoints, { lat: 0, lon: 0, name: "" }]);
  };

  const updateWaypoint = (index: number, point: RoutePoint | null) => {
    if (point === null) {
      const newWaypoints = waypoints.filter((_, i) => i !== index);
      onWaypointsChange(newWaypoints);
    } else {
      const newWaypoints = [...waypoints];
      newWaypoints[index] = point;
      onWaypointsChange(newWaypoints);
    }
  };

  const removeWaypoint = (index: number) => {
    const newWaypoints = waypoints.filter((_, i) => i !== index);
    onWaypointsChange(newWaypoints);
  };

  const hasEmptyWaypoint = waypoints.some((wp) => wp.name === "");

  return (
    <div className="space-y-4">
      <h3
        className="text-sm font-semibold mb-3 uppercase tracking-wide"
        style={{ color: "oklch(0.65 0.15 230)" }}
      >
        Route
      </h3>

      {/* Departure */}
      <LocationSearchInput
        value={toLocationResult(departure)}
        onChange={(loc) => onDepartureChange(toRoutePoint(loc))}
        label="Departure"
        tooltip="The starting point of your flight. Enter a city name, airport code, or coordinates."
        placeholder="e.g., KJFK, New York, or 40.6413,-73.7781"
        selectedBorderColor="border-green-500/50"
      />

      {/* Waypoints */}
      {waypoints.map((waypoint, index) => (
        <div key={index} className="relative">
          <LocationSearchInput
            value={waypoint.name ? toLocationResult(waypoint) : null}
            onChange={(loc) => updateWaypoint(index, toRoutePoint(loc))}
            label={`Waypoint ${index + 1}`}
            tooltip="An intermediate point along your route. Each waypoint creates a new leg."
            placeholder="Search or enter coordinates..."
            selectedBorderColor="border-blue-500/50"
          />
          <button
            onClick={() => removeWaypoint(index)}
            className="absolute -right-2 top-0 p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400 cursor-pointer"
            title="Remove waypoint"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      ))}

      {/* Add Waypoint Button */}
      {!hasEmptyWaypoint && (
        <button
          onClick={addWaypoint}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border-2 border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 transition-colors w-full justify-center cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          Add Waypoint
        </button>
      )}

      {/* Destination */}
      <LocationSearchInput
        value={toLocationResult(destination)}
        onChange={(loc) => onDestinationChange(toRoutePoint(loc))}
        label="Destination"
        tooltip="The final destination of your flight."
        placeholder="e.g., KLAX, Los Angeles, or 33.9425,-118.4081"
        selectedBorderColor="border-red-500/50"
      />

      {/* Alternate */}
      <LocationSearchInput
        value={toLocationResult(alternate)}
        onChange={(loc) => onAlternateChange(toRoutePoint(loc))}
        label="Alternate (Optional)"
        tooltip="An alternate airport in case you cannot land at your destination. Creates an additional leg with reserve fuel calculations."
        placeholder="e.g., KONT, Ontario, or coordinates..."
        selectedBorderColor="border-amber-500/50"
      />
    </div>
  );
}
