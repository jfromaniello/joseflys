"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { GeoPoint } from "@/lib/skyArt";

interface SkyArtMapProps {
  strokes: GeoPoint[][];
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  center: GeoPoint;
  templateName: string;
  onCenterChange?: (lat: number, lon: number) => void;
}

// Component to fit bounds when path changes
function MapBounds({
  bounds,
}: {
  bounds: SkyArtMapProps["bounds"];
}) {
  const map = useMap();

  useEffect(() => {
    const leafletBounds = L.latLngBounds(
      [bounds.minLat, bounds.minLon],
      [bounds.maxLat, bounds.maxLon]
    );
    map.fitBounds(leafletBounds, { padding: [50, 50] });
  }, [map, bounds]);

  return null;
}

// Component to handle map clicks for repositioning
function MapClickHandler({
  onCenterChange,
}: {
  onCenterChange?: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      if (onCenterChange) {
        onCenterChange(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Create custom start/end markers
const createStartIcon = () => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#10b981" stroke="white" stroke-width="2"/>
        <polygon points="10,7 17,12 10,17" fill="white"/>
      </svg>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const createEndIcon = () => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#ef4444" stroke="white" stroke-width="2"/>
        <rect x="8" y="8" width="8" height="8" fill="white"/>
      </svg>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const startIcon = createStartIcon();
const endIcon = createEndIcon();

// Generate color for each stroke (gradient effect)
function getStrokeColor(index: number, total: number): string {
  if (total === 1) return "#06b6d4"; // cyan-500
  const hue = 180 + (280 - 180) * (index / Math.max(total - 1, 1));
  return `hsl(${hue}, 70%, 50%)`;
}

export function SkyArtMap({
  strokes,
  bounds,
  templateName,
  onCenterChange,
}: SkyArtMapProps) {
  // Get start and end points
  const startPoint = strokes.length > 0 && strokes[0].length > 0 ? strokes[0][0] : null;
  const lastStroke = strokes[strokes.length - 1];
  const endPoint = lastStroke && lastStroke.length > 0 ? lastStroke[lastStroke.length - 1] : null;

  // Calculate center for initial view
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const centerLon = (bounds.minLon + bounds.maxLon) / 2;

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden border-2 border-gray-700">
      <MapContainer
        center={[centerLat, centerLon]}
        zoom={10}
        className="w-full h-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Render each stroke as a polyline */}
        {strokes.map((stroke, strokeIndex) => {
          const positions: [number, number][] = stroke.map((p) => [p.lat, p.lon]);
          const color = getStrokeColor(strokeIndex, strokes.length);

          return (
            <Polyline
              key={`stroke-${strokeIndex}`}
              positions={positions}
              pathOptions={{
                color: color,
                weight: 3,
                opacity: 0.9,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>Stroke {strokeIndex + 1}</strong>
                  <br />
                  Points: {stroke.length}
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Start marker */}
        {startPoint && (
          <Marker position={[startPoint.lat, startPoint.lon]} icon={startIcon}>
            <Popup>
              <div className="text-sm">
                <strong>Start</strong>
                <br />
                {templateName}
                <br />
                {startPoint.lat.toFixed(4)}°, {startPoint.lon.toFixed(4)}°
              </div>
            </Popup>
          </Marker>
        )}

        {/* End marker */}
        {endPoint && (
          <Marker position={[endPoint.lat, endPoint.lon]} icon={endIcon}>
            <Popup>
              <div className="text-sm">
                <strong>End</strong>
                <br />
                {endPoint.lat.toFixed(4)}°, {endPoint.lon.toFixed(4)}°
              </div>
            </Popup>
          </Marker>
        )}

        {/* Auto-fit bounds */}
        <MapBounds bounds={bounds} />
        
        {/* Click handler for repositioning */}
        <MapClickHandler onCenterChange={onCenterChange} />
      </MapContainer>
      
      {/* Instructions */}
      {onCenterChange && (
        <div className="mt-2 text-center text-xs text-gray-400">
          Click anywhere on the map to move the design to that location
        </div>
      )}
    </div>
  );
}
