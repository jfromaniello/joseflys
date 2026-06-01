"use client";

import { useEffect, useState } from "react";
import {
  analyzeCircuit,
  mergeFlightCircuits,
  type FlightCircuits,
  type PatternAerodrome,
} from "./analysis";
import type { ReplayPoint } from "./types";

/** Downsamples to at most `max` points for the resolver request. */
function downsample(points: ReplayPoint[], max: number): Array<{ lat: number; lon: number }> {
  if (points.length <= max) return points.map((p) => ({ lat: p.lat, lon: p.lon }));
  const step = (points.length - 1) / (max - 1);
  const out: Array<{ lat: number; lon: number }> = [];
  for (let i = 0; i < max; i += 1) {
    const p = points[Math.round(i * step)];
    out.push({ lat: p.lat, lon: p.lon });
  }
  return out;
}

/** Fetches every aerodrome the track passes near. */
async function fetchAerodromes(
  points: ReplayPoint[],
  signal: AbortSignal
): Promise<PatternAerodrome[]> {
  const res = await fetch("/api/replay/aerodrome", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ points: downsample(points, 200) }),
    signal,
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { aerodromes: PatternAerodrome[] };
  return data.aerodromes ?? [];
}

/**
 * Resolves the aerodrome(s) a flight visits and runs the traffic-pattern
 * analysis at each, merging them into one {@link FlightCircuits} (combined leg
 * strip + unified landings). Returns null while loading or when no circuit/
 * landing can be analyzed anywhere along the track.
 */
export function useCircuitAnalysis(points: ReplayPoint[]): FlightCircuits | null {
  const [flight, setFlight] = useState<FlightCircuits | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      if (points.length < 10) {
        setFlight(null);
        return;
      }
      try {
        const aerodromes = await fetchAerodromes(points, controller.signal);
        if (controller.signal.aborted) return;

        const analyses = aerodromes
          .map((ad) => analyzeCircuit(points, ad))
          .filter((a): a is NonNullable<typeof a> => a != null && a.landings.length > 0);

        // Phases come from the whole track, so the analysis is shown even when
        // no aerodrome was resolved (e.g. a flight away from any known field).
        const merged = mergeFlightCircuits(analyses, points);
        setFlight(merged.phases.length > 0 || merged.landings.length > 0 ? merged : null);
      } catch {
        if (!controller.signal.aborted) setFlight(null);
      }
    })();

    return () => controller.abort();
  }, [points]);

  return flight;
}
