"use client";

import { useState, useEffect } from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { Runway } from "./types";

interface AerodromeDescriptionProps {
  code: string | null;
  name: string;
  type: "AD" | "LA" | "LAD";
  lat: number;
  lon: number;
  elevation: number | null;
  runways: Runway[];
}

interface DescriptionResponse {
  description: string;
  generatedAt: string;
  cached: boolean;
}

export function AerodromeDescription({
  code,
  name,
  type,
  lat,
  lon,
  elevation,
  runways,
}: AerodromeDescriptionProps) {
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDescription = async () => {
      if (!code) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/aerodrome-description", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            name,
            type,
            lat,
            lon,
            elevation,
            runways: runways.map((r) => ({
              id: r.id,
              length: r.length,
              width: r.width,
              surface: r.surface,
              surfaceName: r.surfaceName,
              lighted: r.lighted,
              closed: r.closed,
              ends: r.ends,
            })),
          }),
        });

        if (!response.ok) {
          if (response.status === 503) {
            // OpenAI not configured - silently fail
            setLoading(false);
            return;
          }
          throw new Error("Failed to fetch description");
        }

        const data: DescriptionResponse = await response.json();
        setDescription(data.description);
      } catch (err) {
        console.error("Error fetching aerodrome description:", err);
        setError("Unable to load description");
      } finally {
        setLoading(false);
      }
    };

    fetchDescription();
  }, [code, name, type, lat, lon, elevation, runways]);

  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <SparklesIcon className="w-4 h-4 animate-pulse" />
          <span>Generating description...</span>
        </div>
      </div>
    );
  }

  if (error || !description) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-700">
      <div className="flex items-center gap-2 mb-2">
        <SparklesIcon className="w-4 h-4 text-violet-400" />
        <span className="text-xs text-slate-400 uppercase tracking-wide">About this aerodrome</span>
      </div>
      <div className="text-sm text-slate-300 leading-relaxed space-y-2">
        {description.split("\n\n").map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
