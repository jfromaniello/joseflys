"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { PageLayout } from "../components/PageLayout";
import { CalculatorPageHeader } from "../components/CalculatorPageHeader";
import { Footer } from "../components/Footer";
import { Tooltip } from "../components/Tooltip";
import { formatDistance } from "@/lib/formatters";
import { calculateHaversineDistance } from "@/lib/distanceCalculations";

interface ReplayPoint {
  lat: number;
  lon: number;
  ele: number;
  timeMs: number;
}

const GpxReplayGlobe = dynamic(
  () => import("./GpxReplayGlobe").then((mod) => ({ default: mod.GpxReplayGlobe })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[580px] rounded-xl border-2 border-gray-700 bg-slate-900/30 flex items-center justify-center">
        <div className="text-gray-400">Loading 3D replay globe...</div>
      </div>
    ),
  }
);

const SPEED_OPTIONS = [10, 50, 100] as const;

function findPointIndexByTime(points: ReplayPoint[], targetTimeMs: number): number {
  if (points.length <= 1) return 0;
  let low = 0;
  let high = points.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = points[mid].timeMs;

    if (value === targetTimeMs) return mid;
    if (value < targetTimeMs) low = mid + 1;
    else high = mid - 1;
  }

  return Math.max(0, Math.min(high, points.length - 1));
}

function parseGpxText(content: string): ReplayPoint[] {
  const parser = new DOMParser();
  const xml = parser.parseFromString(content, "application/xml");
  const parseError = xml.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid GPX file format.");
  }

  const trackPoints = Array.from(xml.querySelectorAll("trkpt"));
  if (trackPoints.length < 2) {
    throw new Error("GPX file must contain at least two track points.");
  }

  const parsed = trackPoints
    .map((point): ReplayPoint | null => {
      const latAttr = point.getAttribute("lat");
      const lonAttr = point.getAttribute("lon");
      const eleText = point.querySelector("ele")?.textContent ?? "0";
      const timeText = point.querySelector("time")?.textContent;

      if (!latAttr || !lonAttr || !timeText) return null;

      const lat = Number.parseFloat(latAttr);
      const lon = Number.parseFloat(lonAttr);
      const ele = Number.parseFloat(eleText);
      const timeMs = Date.parse(timeText);

      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(timeMs)) {
        return null;
      }

      return {
        lat,
        lon,
        ele: Number.isFinite(ele) ? ele : 0,
        timeMs,
      };
    })
    .filter((p): p is ReplayPoint => p !== null)
    .sort((a, b) => a.timeMs - b.timeMs);

  if (parsed.length < 2) {
    throw new Error("Track points must include valid coordinates and timestamps.");
  }

  return parsed;
}

export function GpxReplayClient() {
  const [points, setPoints] = useState<ReplayPoint[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEED_OPTIONS)[number]>(10);
  const [elapsedMs, setElapsedMs] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTickRef = useRef<number | null>(null);

  const timeline = useMemo(() => {
    if (points.length === 0) {
      return {
        startMs: 0,
        endMs: 0,
        durationMs: 0,
      };
    }

    const startMs = points[0].timeMs;
    const endMs = points[points.length - 1].timeMs;

    return {
      startMs,
      endMs,
      durationMs: Math.max(0, endMs - startMs),
    };
  }, [points]);

  const currentTimeMs = timeline.startMs + elapsedMs;

  const currentIndex = useMemo(() => {
    if (points.length === 0) return 0;
    return findPointIndexByTime(points, currentTimeMs);
  }, [points, currentTimeMs]);

  const totalDistanceNm = useMemo(() => {
    if (points.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < points.length; i += 1) {
      total += calculateHaversineDistance(
        points[i - 1].lat,
        points[i - 1].lon,
        points[i].lat,
        points[i].lon
      );
    }
    return total;
  }, [points]);

  useEffect(() => {
    if (!isPlaying || timeline.durationMs <= 0) {
      lastTickRef.current = null;
      return;
    }

    let rafId = 0;

    const tick = (now: number) => {
      if (lastTickRef.current === null) {
        lastTickRef.current = now;
      }

      const deltaReal = now - lastTickRef.current;
      lastTickRef.current = now;

      setElapsedMs((prev) => {
        const next = prev + deltaReal * speed;
        if (next >= timeline.durationMs) {
          setIsPlaying(false);
          return timeline.durationMs;
        }
        return next;
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isPlaying, speed, timeline.durationMs]);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".gpx")) {
      setError("Please select a .gpx file.");
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseGpxText(text);
      setPoints(parsed);
      setElapsedMs(0);
      setIsPlaying(false);
      setError("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse GPX file.";
      setError(message);
      setPoints([]);
      setElapsedMs(0);
      setIsPlaying(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  const handleSliderChange = (value: number) => {
    setElapsedMs(value);
    setIsPlaying(false);
  };

  const formatUtc = (valueMs: number): string => {
    if (!Number.isFinite(valueMs) || valueMs <= 0) return "--:--:--";
    return new Date(valueMs).toISOString().slice(11, 19);
  };

  return (
    <PageLayout currentPage="replay">
      <CalculatorPageHeader
        title="GPX Replay 3D"
        description="Drop a GPX track and replay it over time in a 3D globe."
      />

      <main className="w-full max-w-6xl">
        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">
          <div className="mb-6 pb-6 border-b border-gray-700">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-white">
              Flight Track Replay
            </h2>
            <p className="text-sm" style={{ color: "oklch(0.7 0.02 240)" }}>
              Upload a GPX file with timestamps to animate position in 3D. Controls support
              10x, 50x, and 100x playback speeds.
            </p>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`mb-6 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
              isDragOver ? "border-sky-400 bg-sky-500/10" : "border-gray-600 bg-slate-900/40"
            }`}
          >
            <p className="text-white font-medium mb-2">Drag and drop your GPX file here</p>
            <p className="text-sm mb-4" style={{ color: "oklch(0.65 0.02 240)" }}>
              File must include track point timestamps (`time` in `trkpt`).
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium cursor-pointer transition-colors"
            >
              Choose GPX File
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".gpx,application/gpx+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void handleFile(file);
                }
                e.currentTarget.value = "";
              }}
            />
          </div>

          {error ? (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <GpxReplayGlobe
            points={points}
            currentIndex={currentIndex}
            currentTimeMs={currentTimeMs}
          />

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[8rem_1fr_auto] gap-4 items-center">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying((prev) => !prev)}
                disabled={points.length < 2 || timeline.durationMs <= 0}
                className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white cursor-pointer transition-colors"
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setElapsedMs(0);
                  setIsPlaying(false);
                }}
                disabled={points.length < 2}
                className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white cursor-pointer transition-colors"
              >
                Reset
              </button>
            </div>

            <div>
              <input
                type="range"
                min={0}
                max={Math.max(0, timeline.durationMs)}
                step={100}
                value={Math.min(elapsedMs, timeline.durationMs)}
                onChange={(e) => handleSliderChange(Number.parseInt(e.target.value, 10))}
                disabled={points.length < 2 || timeline.durationMs <= 0}
                className="w-full accent-cyan-500 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="mt-1 flex justify-between text-xs" style={{ color: "oklch(0.6 0.02 240)" }}>
                <span>{formatUtc(timeline.startMs)}</span>
                <span>{formatUtc(currentTimeMs)}</span>
                <span>{formatUtc(timeline.endMs)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: "oklch(0.7 0.02 240)" }}>
                Speed
              </span>
              {SPEED_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSpeed(option)}
                  className={`px-2.5 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                    speed === option
                      ? "bg-cyan-500 text-slate-950"
                      : "bg-slate-700 text-gray-200 hover:bg-slate-600"
                  }`}
                >
                  {option}x
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Track Points" value={points.length.toString()} />
            <StatCard label="Current Point" value={points.length > 0 ? (currentIndex + 1).toString() : "0"} />
            <StatCard
              label="Track Distance"
              value={points.length > 1 ? `${formatDistance(totalDistanceNm, 1)} NM` : "0 NM"}
            />
            <StatCard
              label="Replay Duration"
              value={timeline.durationMs > 0 ? `${Math.round(timeline.durationMs / 60000)} min` : "0 min"}
            />
          </div>

          <div className="mt-6 text-xs" style={{ color: "oklch(0.62 0.02 240)" }}>
            <div className="flex items-center gap-2">
              <span>Need help?</span>
              <Tooltip content="The replay uses GPX track point times. If your file has no timestamps, export again with time data enabled." />
            </div>
          </div>
        </div>
      </main>

      <Footer description="Replay GPX tracks in a 3D globe with smooth time-based line animation." />
    </PageLayout>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-700 bg-slate-900/40 p-3">
      <div className="text-xs uppercase tracking-wide" style={{ color: "oklch(0.6 0.02 240)" }}>
        {label}
      </div>
      <div className="mt-1 text-white text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
