"use client";

import { useEffect, useState } from "react";
import { analyzeCircuit, type CircuitAnalysis, type PatternAerodrome } from "./patternAnalysis";
import type { ReplayPoint } from "./types";

/** Fetches the aerodrome nearest a coordinate from the server resolver. */
async function fetchAerodrome(
  lat: number,
  lon: number,
  signal: AbortSignal
): Promise<PatternAerodrome | null> {
  const res = await fetch(`/api/replay/aerodrome?lat=${lat}&lon=${lon}`, { signal });
  if (!res.ok) return null;
  const data = (await res.json()) as { aerodrome: PatternAerodrome | null };
  return data.aerodrome;
}

/**
 * Resolves the departure/arrival aerodrome for a track and runs the traffic-
 * pattern analysis. Tries the track's start point first, then the end (a flight
 * may begin airborne but land at a field). Returns null while loading or when no
 * circuit can be analyzed.
 */
export function useCircuitAnalysis(points: ReplayPoint[]): CircuitAnalysis | null {
  const [analysis, setAnalysis] = useState<CircuitAnalysis | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      if (points.length < 10) {
        setAnalysis(null);
        return;
      }
      const candidates = [points[0], points[points.length - 1]];
      try {
        for (const p of candidates) {
          const aerodrome = await fetchAerodrome(p.lat, p.lon, controller.signal);
          if (controller.signal.aborted) return;
          const result = aerodrome ? analyzeCircuit(points, aerodrome) : null;
          if (result) {
            setAnalysis(result);
            return;
          }
        }
        setAnalysis(null);
      } catch {
        if (!controller.signal.aborted) setAnalysis(null);
      }
    })();

    return () => controller.abort();
  }, [points]);

  return analysis;
}
