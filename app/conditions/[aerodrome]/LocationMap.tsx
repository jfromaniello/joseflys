"use client";

import dynamic from "next/dynamic";
import type { Icon } from "leaflet";
import { AerodromeResult } from "@/app/components/AerodromeSearchInput";
import { CardAnchor } from "./CardAnchor";

// Dynamic import for Leaflet (SSR issues)
const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), { ssr: false });

// Fix for Leaflet default marker icon not loading in webpack/Next.js
// Must be created client-side only
let defaultIcon: Icon | undefined;
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require("leaflet");
  require("leaflet/dist/leaflet.css");
  defaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

interface LocationMapProps {
  aerodrome: AerodromeResult;
}

export function LocationMap({ aerodrome }: LocationMapProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-white">Location Map</h2>
        <CardAnchor id="map" />
      </div>
      <div className="h-80 rounded-lg overflow-hidden">
        <MapContainer
          center={[aerodrome.lat, aerodrome.lon]}
          zoom={14}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[aerodrome.lat, aerodrome.lon]} icon={defaultIcon}>
            <Popup>
              <div className="text-center">
                <strong>{aerodrome.code || aerodrome.name}</strong>
                <br />
                {aerodrome.name}
                {aerodrome.elevation !== null && (
                  <>
                    <br />
                    Elev: {aerodrome.elevation} ft
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
