"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";

interface DistanceMapProps {
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  fromName?: string;
  toName?: string;
}

// Component to fit bounds when coordinates change
function MapBounds({ fromLat, fromLon, toLat, toLon }: {
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
}) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds(
      [fromLat, fromLon],
      [toLat, toLon]
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, fromLat, fromLon, toLat, toLon]);

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
  toLat,
  toLon,
  fromName,
  toName,
}: DistanceMapProps) {
  const fromPosition: [number, number] = [fromLat, fromLon];
  const toPosition: [number, number] = [toLat, toLon];
  const linePositions: [number, number][] = [fromPosition, toPosition];

  return (
    <div className="w-full h-96 rounded-xl overflow-hidden border-2 border-gray-700 print:h-[320px] print:border print:border-gray-400">
      <MapContainer
        center={[
          (fromLat + toLat) / 2,
          (fromLon + toLon) / 2,
        ]}
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

        {/* To marker */}
        <Marker position={toPosition} icon={toIcon} />

        {/* Great circle line (simplified as straight line on map) */}
        <Polyline
          positions={linePositions}
          pathOptions={{
            color: '#0ea5e9',
            weight: 3,
            opacity: 0.8,
            dashArray: '10, 10',
          }}
        />

        {/* Auto-fit bounds */}
        <MapBounds fromLat={fromLat} fromLon={fromLon} toLat={toLat} toLon={toLon} />
      </MapContainer>
    </div>
  );
}
