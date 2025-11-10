"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";

interface ToLocationMap {
  name: string;
  lat: number;
  lon: number;
}

interface DistanceMapProps {
  fromLat: number;
  fromLon: number;
  toLocations: ToLocationMap[];
  fromName?: string;
}

// Component to fit bounds when coordinates change
function MapBounds({ fromLat, fromLon, toLocations }: {
  fromLat: number;
  fromLon: number;
  toLocations: ToLocationMap[];
}) {
  const map = useMap();

  useEffect(() => {
    if (toLocations.length === 0) return;

    const bounds = L.latLngBounds([[fromLat, fromLon]]);
    toLocations.forEach(loc => {
      bounds.extend([loc.lat, loc.lon]);
    });

    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, fromLat, fromLon, toLocations]);

  return null;
}

// Fix for default marker icons in Leaflet with Next.js
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0C9.5 0 5 4.5 5 10c0 8 10 20 10 20s10-12 10-20c0-5.5-4.5-10-10-10z"
              fill="${color}"
              stroke="white"
              stroke-width="2"/>
        <circle cx="15" cy="10" r="4" fill="white"/>
      </svg>
    `,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
  });
};

const fromIcon = createCustomIcon('#0ea5e9'); // sky-500
const toIcon = createCustomIcon('#8b5cf6'); // purple-500

export function DistanceMap({
  fromLat,
  fromLon,
  toLocations,
  fromName,
}: DistanceMapProps) {
  const fromPosition: [number, number] = [fromLat, fromLon];

  // Calculate center point from all locations
  const centerLat = toLocations.length > 0
    ? (fromLat + toLocations.reduce((sum, loc) => sum + loc.lat, 0) / toLocations.length) / 2
    : fromLat;
  const centerLon = toLocations.length > 0
    ? (fromLon + toLocations.reduce((sum, loc) => sum + loc.lon, 0) / toLocations.length) / 2
    : fromLon;

  // Generate colors for different destinations
  const colors = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

  return (
    <div className="w-full h-96 rounded-xl overflow-hidden border-2 border-gray-700 print:h-[320px] print:border print:border-gray-400">
      <MapContainer
        center={[centerLat, centerLon]}
        zoom={6}
        className="w-full h-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* From marker */}
        <Marker position={fromPosition} icon={fromIcon} />

        {/* To markers and lines for each destination */}
        {toLocations.map((toLocation, index) => {
          const toPosition: [number, number] = [toLocation.lat, toLocation.lon];
          const linePositions: [number, number][] = [fromPosition, toPosition];
          const color = colors[index % colors.length];
          const toIconColored = createCustomIcon(color);

          return (
            <div key={index}>
              {/* To marker */}
              <Marker position={toPosition} icon={toIconColored} />

              {/* Great circle line (simplified as straight line on map) */}
              <Polyline
                positions={linePositions}
                pathOptions={{
                  color: color,
                  weight: 3,
                  opacity: 0.8,
                  dashArray: '10, 10',
                }}
              />
            </div>
          );
        })}

        {/* Auto-fit bounds */}
        <MapBounds fromLat={fromLat} fromLon={fromLon} toLocations={toLocations} />
      </MapContainer>
    </div>
  );
}
