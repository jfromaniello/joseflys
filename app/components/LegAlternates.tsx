"use client";

import { useState, useEffect } from "react";
import {
  findCorridorAlternates,
  getLegBoundingBox,
  type AlternateWithDistance,
  type Coordinate,
  type AerodromeData,
} from "@/lib/corridorAlternates";

interface LegAlternatesProps {
  from: Coordinate;
  to: Coordinate;
  corridorWidthNM?: number;
  elapsedDistanceNM?: number; // Distance from flight plan start to this leg's start
}

export function LegAlternates({
  from,
  to,
  corridorWidthNM = 5,
  elapsedDistanceNM = 0,
}: LegAlternatesProps) {
  const [alternates, setAlternates] = useState<AlternateWithDistance[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;

    const fetchAlternates = async () => {
      setLoading(true);
      try {
        const bounds = getLegBoundingBox(from, to, corridorWidthNM + 5);
        const res = await fetch(
          `/api/aerodromes?minLat=${bounds.minLat}&maxLat=${bounds.maxLat}&minLon=${bounds.minLon}&maxLon=${bounds.maxLon}`
        );
        const data = await res.json();
        const aerodromes: AerodromeData[] = data.data || [];

        const filtered = findCorridorAlternates(
          from,
          to,
          aerodromes,
          corridorWidthNM
        );
        setAlternates(filtered);
      } catch {
        setAlternates([]);
      }
      setLoading(false);
    };

    fetchAlternates();
  }, [expanded, from, to, corridorWidthNM]);

  const adCount = alternates.filter((a) => a.type === "AD").length;
  const ladCount = alternates.filter((a) => a.type === "LAD").length;

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer hover:text-sky-300"
        style={{ color: "oklch(0.65 0.1 230)" }}
      >
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        Nearby Alternates (±{corridorWidthNM} NM corridor)
        {expanded && !loading && alternates.length > 0 && (
          <span className="text-gray-500">
            — {adCount} AD, {ladCount} LAD
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-2 pl-6">
          {loading ? (
            <p className="text-xs text-gray-500">Loading...</p>
          ) : alternates.length === 0 ? (
            <p className="text-xs text-gray-500">
              No aerodromes or LADs found within the corridor
            </p>
          ) : (
            <div className="space-y-1.5">
              {/* Copy button */}
              <button
                onClick={async () => {
                  const rows = alternates.map((alt) => {
                    const totalDist = Math.round((elapsedDistanceNM + alt.distanceFromStart) * 10) / 10;
                    return {
                      type: alt.type,
                      side: alt.side,
                      icao: alt.code || "-",
                      name: alt.name,
                      dist: `@${totalDist} NM`,
                      offRoute: `${alt.distanceFromRoute} NM ${alt.side}`,
                    };
                  });

                  // Plain text (tab-separated)
                  const textRows = rows.map(r => `${r.type}\t${r.side}\t${r.icao}\t${r.name}\t${r.dist}\t${r.offRoute}`).join("\n");
                  const plainText = "Type\tSide\tICAO\tName\tDistance\tOff Route\n" + textRows;

                  // HTML table (for Word)
                  const htmlRows = rows.map(r =>
                    `<tr><td>${r.type}</td><td>${r.side}</td><td>${r.icao}</td><td>${r.name}</td><td>${r.dist}</td><td>${r.offRoute}</td></tr>`
                  ).join("");
                  const html = `<table border="1"><tr><th>Type</th><th>Side</th><th>ICAO</th><th>Name</th><th>Distance</th><th>Off Route</th></tr>${htmlRows}</table>`;

                  // Copy both formats
                  try {
                    await navigator.clipboard.write([
                      new ClipboardItem({
                        "text/plain": new Blob([plainText], { type: "text/plain" }),
                        "text/html": new Blob([html], { type: "text/html" }),
                      }),
                    ]);
                  } catch {
                    // Fallback to plain text
                    await navigator.clipboard.writeText(plainText);
                  }
                }}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-700/50 hover:bg-slate-600/50 text-gray-400 hover:text-white transition-colors cursor-pointer mb-2"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy to clipboard
              </button>
              {alternates.map((alt, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs"
                >
                  {/* Type indicator */}
                  <span
                    className="w-2 h-2 rounded-sm shrink-0"
                    style={{
                      backgroundColor:
                        alt.type === "AD" ? "#0288D1" : "#D32F2F",
                    }}
                    title={alt.type === "AD" ? "Aerodrome" : "LAD"}
                  />

                  {/* Side indicator */}
                  <span
                    className="w-4 text-center font-mono shrink-0"
                    style={{ color: "oklch(0.6 0.05 240)" }}
                    title={alt.side === "L" ? "Left of route" : "Right of route"}
                  >
                    {alt.side}
                  </span>

                  {/* Name with Google Maps link */}
                  <a
                    href={`https://www.google.com/maps?q=${alt.lat},${alt.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white font-medium truncate flex-1 min-w-0 hover:text-sky-300 transition-colors"
                    title="Open in Google Maps"
                  >
                    {alt.code && (
                      <span className="text-sky-400 mr-1">{alt.code}</span>
                    )}
                    {alt.name}
                    <svg className="w-3 h-3 inline-block ml-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>

                  {/* Distance info */}
                  <span
                    className="shrink-0 tabular-nums"
                    style={{ color: "oklch(0.6 0.05 240)" }}
                    title={`${Math.round((elapsedDistanceNM + alt.distanceFromStart) * 10) / 10} NM from flight start, ${alt.distanceFromRoute} NM ${alt.side === "L" ? "left" : "right"} of route`}
                  >
                    @{Math.round((elapsedDistanceNM + alt.distanceFromStart) * 10) / 10} NM • {alt.distanceFromRoute} NM {alt.side}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
