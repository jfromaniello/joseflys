"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Geodesic } from "geographiclib-geodesic";
import type { NavigationSegment } from "@/lib/segmentCalculations";
import { formatHeading, formatSegmentDistance } from "@/lib/segmentCalculations";

interface SegmentsMapProps {
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  fromName: string;
  toName: string;
  segments: NavigationSegment[];
  orthodromicDistance: number;
  totalDistance: number;
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
    const bounds = L.latLngBounds([
      [fromLat, fromLon],
      [toLat, toLon]
    ]);
    map.fitBounds(bounds, { padding: [80, 80] });
  }, [map, fromLat, fromLon, toLat, toLon]);

  return null;
}

// Normalize longitude to be continuous (unwrap)
// Keeps longitudes close together by adding/subtracting 360° as needed
function normalizeLongitude(lon: number, referenceLon: number): number {
  while (lon - referenceLon > 180) lon -= 360;
  while (lon - referenceLon < -180) lon += 360;
  return lon;
}

// Generate points along the great circle for visualization
// Returns array of points with unwrapped longitudes for continuous drawing
function generateGreatCirclePoints(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  numPoints: number = 200
): [number, number][] {
  const line = Geodesic.WGS84.InverseLine(fromLat, fromLon, toLat, toLon);
  const inverse = Geodesic.WGS84.Inverse(fromLat, fromLon, toLat, toLon);
  const totalDistance = inverse.s12 ?? 0;

  const points: [number, number][] = [];
  let previousLon = fromLon;

  for (let i = 0; i <= numPoints; i++) {
    const distance = (totalDistance * i) / numPoints;
    const waypoint = line.Position(distance);
    const lat = waypoint.lat2 ?? fromLat;
    let lon = waypoint.lon2 ?? fromLon;

    // Unwrap longitude to be continuous with previous point
    lon = normalizeLongitude(lon, previousLon);

    points.push([lat, lon]);
    previousLon = lon;
  }

  return points;
}

// Fix for default marker icons in Leaflet with Next.js
const createCustomIcon = (color: string, size: number = 30) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <svg width="${size}" height="${size + 10}" viewBox="0 0 ${size} ${size + 10}" xmlns="http://www.w3.org/2000/svg">
        <path d="M${size/2} 0C${size*0.3} 0 ${size*0.167} ${size*0.15} ${size*0.167} ${size*0.333}c0 ${size*0.267} ${size*0.333} ${size*0.667} ${size*0.333} ${size*0.667}s${size*0.333}-${size*0.4} ${size*0.333}-${size*0.667}c0-${size*0.183}-${size*0.15}-${size*0.333}-${size*0.333}-${size*0.333}z"
              fill="${color}"
              stroke="white"
              stroke-width="2"/>
        <circle cx="${size/2}" cy="${size*0.333}" r="${size*0.133}" fill="white"/>
      </svg>
    `,
    iconSize: [size, size + 10],
    iconAnchor: [size/2, size + 10],
  });
};

const createWaypointIcon = () => {
  return L.divIcon({
    className: 'custom-waypoint',
    html: `
      <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
        <circle cx="6" cy="6" r="5" fill="#06b6d4" stroke="white" stroke-width="1.5"/>
        <circle cx="6" cy="6" r="2" fill="white"/>
      </svg>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

const fromIcon = createCustomIcon('#10b981', 35); // green-500
const toIcon = createCustomIcon('#ef4444', 35); // red-500
const waypointIcon = createWaypointIcon();

// Generate color gradient for segments
function getSegmentColor(index: number, total: number): string {
  // Gradient from cyan to purple
  const hue = 180 + (280 - 180) * (index / Math.max(total - 1, 1));
  return `hsl(${hue}, 70%, 50%)`;
}

export function SegmentsMap({
  fromLat,
  fromLon,
  toLat,
  toLon,
  fromName,
  toName,
  segments,
  orthodromicDistance,
}: SegmentsMapProps) {
  const fromPosition: [number, number] = [fromLat, fromLon];

  // Normalize destination longitude to be continuous with origin
  const normalizedToLon = normalizeLongitude(toLon, fromLon);
  const toPosition: [number, number] = [toLat, normalizedToLon];

  // Generate great circle path with unwrapped longitudes
  const greatCirclePoints = generateGreatCirclePoints(fromLat, fromLon, toLat, toLon);

  // Normalize segments to use unwrapped longitudes
  const normalizedSegments = segments.map(seg => {
    const startLon = normalizeLongitude(seg.startLon, fromLon);
    const endLon = normalizeLongitude(seg.endLon, startLon);

    return {
      ...seg,
      startLon,
      endLon,
    };
  });

  // Calculate center
  const centerLat = (fromLat + toLat) / 2;
  const centerLon = (fromLon + toLon) / 2;

  return (
    <div className="w-full h-[600px] rounded-xl overflow-hidden border-2 border-gray-700">
      <MapContainer
        center={[centerLat, centerLon]}
        zoom={3}
        className="w-full h-full"
        scrollWheelZoom={true}
        worldCopyJump={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Great Circle Path (dashed green line with unwrapped longitudes) */}
        <Polyline
          positions={greatCirclePoints}
          pathOptions={{
            color: '#10b981',
            weight: 2,
            opacity: 0.6,
            dashArray: '8, 8',
          }}
        >
          <Popup>
            <div className="text-sm">
              <strong>Great Circle Route</strong>
              <br />
              Distance: {formatSegmentDistance(orthodromicDistance)} NM
              <br />
              (Shortest possible path)
            </div>
          </Popup>
        </Polyline>

        {/* Rhumb Line Segments (colored solid lines with unwrapped longitudes) */}
        {normalizedSegments.map((segment, index) => {
          const segmentPositions: [number, number][] = [
            [segment.startLat, segment.startLon],
            [segment.endLat, segment.endLon]
          ];
          const color = getSegmentColor(index, normalizedSegments.length);

          return (
            <Polyline
              key={`segment-${index}`}
              positions={segmentPositions}
              pathOptions={{
                color: color,
                weight: 3,
                opacity: 0.8,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>Segment {segment.segmentNumber}</strong>
                  <br />
                  Heading: {formatHeading(segment.heading)}
                  <br />
                  Distance: {formatSegmentDistance(segment.distance)} NM
                  <br />
                  Cumulative: {formatSegmentDistance(segment.cumulativeDistance)} NM
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Waypoint markers (at end of each segment except last) */}
        {normalizedSegments.slice(0, -1).map((segment, index) => (
          <Marker
            key={`waypoint-${index}`}
            position={[segment.endLat, segment.endLon]}
            icon={waypointIcon}
          >
            <Popup>
              <div className="text-xs">
                <strong>Waypoint {index + 1}</strong>
                <br />
                {segment.endLat.toFixed(4)}°, {segment.endLon.toFixed(4)}°
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Origin marker */}
        <Marker position={fromPosition} icon={fromIcon}>
          <Popup>
            <div className="text-sm">
              <strong>Origin</strong>
              <br />
              {fromName}
              <br />
              {fromLat.toFixed(4)}°, {fromLon.toFixed(4)}°
            </div>
          </Popup>
        </Marker>

        {/* Destination marker */}
        <Marker position={toPosition} icon={toIcon}>
          <Popup>
            <div className="text-sm">
              <strong>Destination</strong>
              <br />
              {toName}
              <br />
              {toLat.toFixed(4)}°, {toLon.toFixed(4)}°
            </div>
          </Popup>
        </Marker>

        {/* Auto-fit bounds */}
        <MapBounds fromLat={fromLat} fromLon={fromLon} toLat={toLat} toLon={toLon} />
      </MapContainer>
    </div>
  );
}
