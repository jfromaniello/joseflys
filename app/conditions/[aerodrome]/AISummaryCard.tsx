"use client";

import { useState, useEffect } from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";

interface AISummaryCardProps {
  aerodromeCode: string;
  aerodrome: {
    name: string;
    type: string;
    elevation: number | null;
    lat: number;
    lon: number;
  } | null;
  metar: {
    rawOb: string;
    temp: number | null;
    dewp: number | null;
    wdir: number | null;
    wspd: number | null;
    wgst: number | null;
    altim: number | null;
    visib: string | null;
    fltCat: string | null;
  } | null;
  taf: {
    rawTAF: string;
  } | null;
  runways: Array<{
    id: string;
    length: number;
    width: number;
    surface: string;
    lighted: boolean;
    closed: boolean;
  }>;
  recommendedRunway: {
    endId: string;
    headwind: number;
    crosswind: number;
  } | null;
  notams: Array<{
    keyword: string;
    traditionalMessageFrom4thWord: string;
  }> | null;
  weather: {
    temperature?: number;
    humidity?: number;
    windSpeed?: number;
    windDirection?: number;
    cloudCover?: number;
    visibility?: number;
  } | null;
  sunTimes: {
    civilDawn: string;
    sunrise: string;
    sunset: string;
    civilDusk: string;
    isVfrLegal: boolean;
    phase: "night" | "civil-twilight" | "day";
  } | null;
}

export function AISummaryCard({
  aerodromeCode,
  aerodrome,
  metar,
  taf,
  runways,
  recommendedRunway,
  notams,
  weather,
  sunTimes,
}: AISummaryCardProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/conditions-summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            aerodromeCode,
            aerodrome,
            metar,
            taf,
            runways,
            recommendedRunway,
            notams: notams?.map((n) => ({
              keyword: n.keyword,
              traditionalMessageFrom4thWord: n.traditionalMessageFrom4thWord,
            })),
            weather,
            sunTimes,
          }),
        });

        if (!response.ok) {
          if (response.status === 503) {
            setError("AI summary not available");
          } else {
            setError("Failed to generate summary");
          }
          return;
        }

        const data = await response.json();
        setSummary(data.summary);
        setGeneratedAt(data.generatedAt);
        setCached(data.cached);
      } catch (err) {
        console.error("Failed to fetch AI summary:", err);
        setError("Failed to load summary");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [aerodromeCode, aerodrome, metar, taf, runways, recommendedRunway, notams, weather, sunTimes]);

  // Don't render if there's an error (feature not available)
  if (error === "AI summary not available") {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-sm rounded-xl border border-purple-500/30 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <SparklesIcon className="w-5 h-5 text-purple-400" />
        <h2 className="text-lg font-semibold text-white">AI Briefing</h2>
        {cached && (
          <span className="text-xs text-purple-400/60 ml-auto">cached</span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-6">
          <div className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
          <span className="text-purple-300/70">Generating briefing...</span>
        </div>
      ) : error ? (
        <div className="text-red-400/70 py-4">{error}</div>
      ) : summary ? (
        <div className="space-y-3">
          {/* Render markdown-like content */}
          <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
            {summary.split("\n").map((line, i) => {
              // Bold headers
              if (line.startsWith("**") && line.endsWith("**")) {
                return (
                  <p key={i} className="font-semibold text-purple-300 mt-3 first:mt-0">
                    {line.replace(/\*\*/g, "")}
                  </p>
                );
              }
              // Headers with content after **
              if (line.includes("**")) {
                const parts = line.split("**");
                return (
                  <p key={i} className="mt-2 first:mt-0">
                    {parts.map((part, j) =>
                      j % 2 === 1 ? (
                        <span key={j} className="font-semibold text-purple-300">
                          {part}
                        </span>
                      ) : (
                        <span key={j}>{part}</span>
                      )
                    )}
                  </p>
                );
              }
              // Regular lines
              if (line.trim()) {
                return (
                  <p key={i} className="mt-1 first:mt-0">
                    {line}
                  </p>
                );
              }
              return null;
            })}
          </div>

          {/* Generated at */}
          {generatedAt && (
            <div className="text-xs text-purple-400/50 text-right pt-2 border-t border-purple-500/20">
              Generated {new Date(generatedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
