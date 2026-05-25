"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { CameraPose, OrientationStatus } from "./GpxReplayGlobe";
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

interface GpxReplayClientProps {
  initialGpx?: string;
  initialGpxName?: string;
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

const SPEED_OPTIONS = [1, 10, 50, 100] as const;
type SpeedOption = (typeof SPEED_OPTIONS)[number];

function isSpeedOption(value: number): value is SpeedOption {
  return (SPEED_OPTIONS as readonly number[]).includes(value);
}

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

type ShareStatus = "idle" | "loading" | "copied" | "error";

type ViewMode = "free" | "cinematic" | "cockpit";

const VIEW_MODES: ViewMode[] = ["free", "cinematic", "cockpit"];

function isViewMode(value: string): value is ViewMode {
  return (VIEW_MODES as string[]).includes(value);
}

type MapStyle = "standard" | "photorealistic";

const MAP_STYLES: MapStyle[] = ["standard", "photorealistic"];

function isMapStyle(value: string): value is MapStyle {
  return (MAP_STYLES as string[]).includes(value);
}

const HAS_GOOGLE_MAPS_KEY = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

function parseCameraParam(value: string | null): CameraPose | null {
  if (!value) return null;
  const parts = value.split(",").map((p) => Number.parseFloat(p));
  if (parts.length !== 5 || parts.some((n) => !Number.isFinite(n))) return null;
  const [lon, lat, alt, hdg, pit] = parts;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lon, lat, alt, hdg, pit };
}

function serializeCamera(pose: CameraPose): string {
  return [
    pose.lon.toFixed(5),
    pose.lat.toFixed(5),
    Math.round(pose.alt).toString(),
    pose.hdg.toFixed(1),
    pose.pit.toFixed(1),
  ].join(",");
}

export function GpxReplayClient({ initialGpx, initialGpxName }: GpxReplayClientProps = {}) {
  const searchParams = useSearchParams();
  const initialTParam = searchParams.get("t");
  const initialSpeedParam = searchParams.get("speed");
  const initialViewParam = searchParams.get("view");
  const initialCamParam = searchParams.get("cam");

  const initialElapsedMs = useMemo(() => {
    const parsed = initialTParam ? Number.parseInt(initialTParam, 10) : 0;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }, [initialTParam]);

  const initialSpeed = useMemo<SpeedOption>(() => {
    const parsed = initialSpeedParam ? Number.parseInt(initialSpeedParam, 10) : 10;
    return isSpeedOption(parsed) ? parsed : 10;
  }, [initialSpeedParam]);

  const initialViewMode = useMemo<ViewMode>(() => {
    if (initialViewParam && isViewMode(initialViewParam)) return initialViewParam;
    return "free";
  }, [initialViewParam]);

  const initialCamera = useMemo<CameraPose | null>(
    () => parseCameraParam(initialCamParam),
    [initialCamParam]
  );

  const cameraStateRef = useRef<CameraPose | null>(initialCamera);
  const requestOrientationRef = useRef<(() => Promise<void>) | null>(null);
  const [orientationStatus, setOrientationStatus] = useState<OrientationStatus>("unknown");

  const [points, setPoints] = useState<ReplayPoint[]>([]);
  const [rawGpx, setRawGpx] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<SpeedOption>(initialSpeed);
  const [elapsedMs, setElapsedMs] = useState(initialElapsedMs);
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const [shareUrl, setShareUrl] = useState<string>("");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [mapStyle, setMapStyle] = useState<MapStyle>("standard");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTickRef = useRef<number | null>(null);
  const initialGpxAppliedRef = useRef(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const fullscreenWrapperRef = useRef<HTMLDivElement>(null);

  const usedNativeFullscreenRef = useRef(false);

  useEffect(() => {
    const onChange = () => {
      if (!usedNativeFullscreenRef.current) return;
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const el = fullscreenWrapperRef.current;
      const active = doc.fullscreenElement === el || doc.webkitFullscreenElement === el;
      setIsFullscreen(active);
      if (!active) usedNativeFullscreenRef.current = false;
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  useEffect(() => {
    if (!isFullscreen || usedNativeFullscreenRef.current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen || usedNativeFullscreenRef.current) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isFullscreen]);

  const handleFullscreenToggle = useCallback(async () => {
    const el = fullscreenWrapperRef.current as
      | (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> | void })
      | null;
    if (!el) return;
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      webkitFullscreenElement?: Element | null;
    };

    if (isFullscreen) {
      if (usedNativeFullscreenRef.current) {
        try {
          if (typeof doc.exitFullscreen === "function") await doc.exitFullscreen();
          else if (typeof doc.webkitExitFullscreen === "function") await doc.webkitExitFullscreen();
        } catch (err) {
          console.error("Exit fullscreen failed", err);
        }
      } else {
        setIsFullscreen(false);
      }
      return;
    }

    const request =
      typeof el.requestFullscreen === "function"
        ? el.requestFullscreen.bind(el)
        : typeof el.webkitRequestFullscreen === "function"
          ? el.webkitRequestFullscreen.bind(el)
          : null;

    if (!request) {
      setIsFullscreen(true);
      return;
    }

    try {
      usedNativeFullscreenRef.current = true;
      await request();
    } catch (err) {
      console.error("Request fullscreen failed", err);
      usedNativeFullscreenRef.current = false;
      setIsFullscreen(true);
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [settingsOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (initialViewParam && isViewMode(initialViewParam)) return;
    const stored = window.localStorage.getItem("gpxReplay.viewMode");
    if (stored && isViewMode(stored)) {
      setViewMode(stored);
      return;
    }
    const legacy = window.localStorage.getItem("gpxReplay.autoCamera");
    if (legacy === "true") setViewMode("cinematic");
  }, [initialViewParam]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("gpxReplay.viewMode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("gpxReplay.mapStyle");
    if (stored && isMapStyle(stored)) {
      if (stored === "photorealistic" && !HAS_GOOGLE_MAPS_KEY) return;
      setMapStyle(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("gpxReplay.mapStyle", mapStyle);
  }, [mapStyle]);

  const handleViewModeInterrupt = useCallback(() => {
    setViewMode("free");
  }, []);

  useEffect(() => {
    if (!shareModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShareModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shareModalOpen]);

  useEffect(() => {
    if (!shareLinkCopied) return;
    const id = window.setTimeout(() => setShareLinkCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [shareLinkCopied]);

  const handleCopyShareLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareLinkCopied(true);
    } catch {
      // ignore — input is still selectable
    }
  }, [shareUrl]);

  useEffect(() => {
    if (!initialGpx || initialGpxAppliedRef.current) return;
    initialGpxAppliedRef.current = true;
    try {
      const parsed = parseGpxText(initialGpx);
      setPoints(parsed);
      setRawGpx(initialGpx);
      setError("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse shared GPX.";
      setError(message);
    }
  }, [initialGpx]);

  const timeline = useMemo(() => {
    if (points.length === 0) {
      return { startMs: 0, endMs: 0, durationMs: 0 };
    }
    const startMs = points[0].timeMs;
    const endMs = points[points.length - 1].timeMs;
    return { startMs, endMs, durationMs: Math.max(0, endMs - startMs) };
  }, [points]);

  const clampedElapsedMs = Math.min(elapsedMs, timeline.durationMs);
  const currentTimeMs = timeline.startMs + clampedElapsedMs;

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

  const currentSpeed = useMemo(() => {
    if (points.length < 2) return { knots: null as number | null, mph: null as number | null };

    const i = Math.max(0, Math.min(currentIndex, points.length - 2));
    const from = points[i];
    const to = points[i + 1];

    const dtMs = to.timeMs - from.timeMs;
    if (dtMs <= 0) return { knots: null, mph: null };

    const groundNm = calculateHaversineDistance(from.lat, from.lon, to.lat, to.lon);
    const verticalNm = Math.abs(to.ele - from.ele) / 1852;
    const segmentDistanceNm = Math.sqrt(groundNm * groundNm + verticalNm * verticalNm);

    const hours = dtMs / 3_600_000;
    if (hours <= 0) return { knots: null, mph: null };

    const knots = segmentDistanceNm / hours;
    const mph = knots * 1.15078;
    return { knots, mph };
  }, [points, currentIndex]);

  const currentAltitudeFt = useMemo(() => {
    if (points.length === 0) return null as number | null;
    if (points.length === 1) return points[0].ele * 3.28084;

    const i = Math.max(0, Math.min(currentIndex, points.length - 2));
    const from = points[i];
    const to = points[i + 1];
    const segmentDuration = to.timeMs - from.timeMs;

    if (segmentDuration <= 0) return from.ele * 3.28084;

    const tRaw = (currentTimeMs - from.timeMs) / segmentDuration;
    const t = Math.max(0, Math.min(1, tRaw));
    const eleM = from.ele + (to.ele - from.ele) * t;
    return eleM * 3.28084;
  }, [points, currentIndex, currentTimeMs]);

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

  useEffect(() => {
    setShareStatus("idle");
    setShareUrl("");
  }, [rawGpx]);

  useEffect(() => {
    if (shareStatus !== "copied" && shareStatus !== "error") return;
    const id = setTimeout(() => setShareStatus("idle"), 2500);
    return () => clearTimeout(id);
  }, [shareStatus]);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".gpx")) {
      setError("Please select a .gpx file.");
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseGpxText(text);
      setPoints(parsed);
      setRawGpx(text);
      setElapsedMs(0);
      setIsPlaying(false);
      setError("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse GPX file.";
      setError(message);
      setPoints([]);
      setRawGpx("");
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

  const handleShare = useCallback(async () => {
    if (!rawGpx || shareStatus === "loading") return;
    setShareStatus("loading");

    try {
      const response = await fetch("/api/replay/share", {
        method: "POST",
        headers: { "Content-Type": "application/gpx+xml" },
        body: rawGpx,
      });

      if (!response.ok) {
        throw new Error(`Share failed: ${response.status}`);
      }

      const data = (await response.json()) as { shortUrl: string };
      const url = new URL(data.shortUrl);
      url.searchParams.set("t", String(Math.round(clampedElapsedMs)));
      url.searchParams.set("speed", String(speed));
      url.searchParams.set("view", viewMode);
      const camPose = cameraStateRef.current;
      if (camPose) {
        url.searchParams.set("cam", serializeCamera(camPose));
      }
      const finalUrl = url.toString();

      setShareUrl(finalUrl);
      try {
        await navigator.clipboard.writeText(finalUrl);
      } catch {
        // clipboard may fail (permissions, insecure context) — modal lets user copy manually
      }
      setShareStatus("copied");
      setShareModalOpen(true);
    } catch (err) {
      console.error(err);
      setShareStatus("error");
    }
  }, [rawGpx, clampedElapsedMs, speed, shareStatus, viewMode]);

  const formatUtc = (valueMs: number): string => {
    if (!Number.isFinite(valueMs) || valueMs <= 0) return "--:--:--";
    return new Date(valueMs).toISOString().slice(11, 19);
  };

  const formatUtcShort = (valueMs: number): string => {
    if (!Number.isFinite(valueMs) || valueMs <= 0) return "--:--";
    return new Date(valueMs).toISOString().slice(11, 16);
  };

  const canShare = points.length >= 2 && rawGpx.length > 0;

  const shareLabel = (() => {
    switch (shareStatus) {
      case "loading":
        return "Creating link…";
      case "copied":
        return "Link copied!";
      case "error":
        return "Share failed";
      default:
        return "Share";
    }
  })();

  return (
    <PageLayout currentPage="replay">
      <CalculatorPageHeader
        title="GPX Replay 3D"
        description="Drop a GPX track and replay it over time in a 3D globe."
      />

      <main className="w-full max-w-6xl">
        <div
          className={`rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 border border-gray-700 ${
            isFullscreen ? "" : "backdrop-blur-sm"
          }`}
        >
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

          <div className="mb-6 pb-6 border-b border-gray-700 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2 text-white">
                Flight Track Replay
              </h2>
              <p className="text-sm" style={{ color: "oklch(0.7 0.02 240)" }}>
                {points.length === 0
                  ? "Upload a GPX file with timestamps to animate position in 3D. Controls support 10x, 50x, and 100x playback speeds."
                  : initialGpxName
                    ? "Shared replay. Use the slider and play controls below."
                    : "Use the slider and play controls below. Load a different file anytime."}
              </p>
            </div>
            {points.length > 0 ? (
              <div className="shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  title="Load a different GPX file"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors bg-slate-700 hover:bg-slate-600 text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h7l2 2h7v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 11v6M9 14h6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="hidden sm:inline">New GPX</span>
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={!canShare || shareStatus === "loading"}
                  title="Copy a shareable link to current position"
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    shareStatus === "error"
                      ? "bg-red-600 text-white"
                      : "bg-cyan-600 hover:bg-cyan-500 text-white"
                  }`}
                >
                  {shareStatus === "loading" ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
                    </svg>
                  )}
                  <span className="hidden sm:inline">{shareLabel}</span>
                </button>
              </div>
            ) : null}
          </div>

          {points.length === 0 ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`mb-6 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
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
            </div>
          ) : null}

          {error ? (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {points.length > 0 ? (
          <>
          <div
            ref={fullscreenWrapperRef}
            className={
              isFullscreen
                ? "fixed inset-0 z-[9999] bg-slate-950 flex flex-col w-screen h-dvh"
                : "relative"
            }
          >
            <div className={isFullscreen ? "flex-1 relative" : ""}>
              <GpxReplayGlobe
                points={points}
                currentIndex={currentIndex}
                currentTimeMs={currentTimeMs}
                viewMode={viewMode}
                mapStyle={mapStyle}
                onViewModeInterrupt={handleViewModeInterrupt}
                isFullscreen={isFullscreen}
                initialCamera={initialCamera}
                cameraStateRef={cameraStateRef}
                onOrientationStatusChange={setOrientationStatus}
                requestOrientationRef={requestOrientationRef}
              />
            </div>

            <button
              type="button"
              onClick={handleFullscreenToggle}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={isFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen"}
              className="absolute top-3 right-3 z-[600] flex h-9 w-9 items-center justify-center rounded-md bg-slate-900/80 text-white border border-slate-600 cursor-pointer hover:bg-slate-800 transition-colors"
            >
              {isFullscreen ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            {points.length > 0 ? (
              <div className="absolute top-16 right-3 z-[600] flex flex-col gap-2 rounded-lg bg-slate-900/80 border border-slate-600 px-3 py-2 backdrop-blur min-w-[7rem]">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none">
                    Speed
                  </div>
                  <div className="mt-1 text-base font-semibold tabular-nums text-white leading-none">
                    {currentSpeed.knots !== null ? `${currentSpeed.knots.toFixed(0)} KT` : "--"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none">
                    Altitude
                  </div>
                  <div className="mt-1 text-base font-semibold tabular-nums text-white leading-none">
                    {currentAltitudeFt !== null
                      ? `${Math.round(currentAltitudeFt).toLocaleString()} ft`
                      : "--"}
                  </div>
                </div>
              </div>
            ) : null}

            <div
              className={
                isFullscreen
                  ? "absolute bottom-4 left-4 right-4 z-[600] flex items-center gap-3 rounded-lg bg-slate-900/85 border border-gray-700 px-3 py-2 backdrop-blur"
                  : "mt-4 flex items-center gap-3 rounded-lg bg-slate-900/60 border border-gray-700 px-3 py-2"
              }
            >
            <button
              type="button"
              onClick={() => setIsPlaying((prev) => !prev)}
              disabled={points.length < 2 || timeline.durationMs <= 0}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white cursor-pointer transition-colors"
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <span className="text-xs tabular-nums shrink-0" style={{ color: "oklch(0.7 0.02 240)" }}>
              <span className="sm:hidden">{formatUtcShort(currentTimeMs)}</span>
              <span className="hidden sm:inline">{formatUtc(currentTimeMs)}</span>
            </span>

            <input
              type="range"
              min={0}
              max={Math.max(0, timeline.durationMs)}
              step={100}
              value={clampedElapsedMs}
              onChange={(e) => handleSliderChange(Number.parseInt(e.target.value, 10))}
              disabled={points.length < 2 || timeline.durationMs <= 0}
              className="flex-1 min-w-0 accent-cyan-500 cursor-pointer disabled:cursor-not-allowed"
            />

            <span className="text-xs tabular-nums shrink-0" style={{ color: "oklch(0.6 0.02 240)" }}>
              <span className="sm:hidden">{formatUtcShort(timeline.endMs)}</span>
              <span className="hidden sm:inline">{formatUtc(timeline.endMs)}</span>
            </span>

            <div className="relative shrink-0" ref={settingsRef}>
              <button
                type="button"
                onClick={() => setSettingsOpen((prev) => !prev)}
                aria-label="Playback settings"
                aria-expanded={settingsOpen}
                title="Playback settings"
                className={`flex h-8 w-8 items-center justify-center rounded-md border text-xs cursor-pointer transition-colors ${
                  settingsOpen || viewMode !== "free"
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                    : "bg-slate-800 border-slate-700 text-gray-300 hover:bg-slate-700"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
                  />
                </svg>
              </button>

              {settingsOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-64 rounded-lg bg-slate-900 border border-slate-600 shadow-xl z-50 p-3 space-y-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Playback Speed
                    </div>
                    <div className="grid grid-cols-4 gap-1 rounded-md bg-slate-800/60 p-0.5">
                      {SPEED_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setSpeed(option);
                            setSettingsOpen(false);
                          }}
                          className={`px-2 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                            speed === option
                              ? "bg-cyan-500 text-slate-950"
                              : "text-gray-300 hover:bg-slate-700"
                          }`}
                        >
                          {option}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-700 pt-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Camera
                    </div>
                    <div className="grid grid-cols-3 gap-1 rounded-md bg-slate-800/60 p-0.5">
                      {(
                        [
                          { value: "free" as const, label: "Free" },
                          { value: "cinematic" as const, label: "Cinematic" },
                          { value: "cockpit" as const, label: "Cockpit" },
                        ]
                      ).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setViewMode(opt.value);
                            setSettingsOpen(false);
                          }}
                          disabled={points.length < 2 && opt.value !== "free"}
                          className={`px-2 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors whitespace-nowrap text-center disabled:cursor-not-allowed disabled:opacity-50 ${
                            viewMode === opt.value
                              ? "bg-cyan-500 text-slate-950"
                              : "text-gray-300 hover:bg-slate-700"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-1.5 text-[10px] text-slate-400 leading-tight">
                      {viewMode === "free"
                        ? "Manual camera. Drag to look around."
                        : viewMode === "cinematic"
                          ? "Cinematic chase + side angles on turns."
                          : "First-person view from the aircraft."}
                    </div>
                    {viewMode === "cockpit" && orientationStatus === "needs-permission" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSettingsOpen(false);
                          void requestOrientationRef.current?.();
                        }}
                        className="mt-2 w-full rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold px-3 py-1.5 cursor-pointer transition-colors"
                      >
                        Enable head tracking
                      </button>
                    ) : null}
                  </div>

                  <div className="border-t border-slate-700 pt-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Map Style
                    </div>
                    <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-800/60 p-0.5">
                      {(
                        [
                          { value: "standard" as const, label: "Standard" },
                          { value: "photorealistic" as const, label: "Photoreal 3D" },
                        ]
                      ).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setMapStyle(opt.value);
                            setSettingsOpen(false);
                          }}
                          disabled={opt.value === "photorealistic" && !HAS_GOOGLE_MAPS_KEY}
                          className={`px-2 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors whitespace-nowrap text-center disabled:cursor-not-allowed disabled:opacity-50 ${
                            mapStyle === opt.value
                              ? "bg-cyan-500 text-slate-950"
                              : "text-gray-300 hover:bg-slate-700"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-1.5 text-[10px] text-slate-400 leading-tight">
                      {mapStyle === "standard"
                        ? "Satellite imagery + DEM terrain."
                        : "Google photorealistic 3D mesh (like Google Earth)."}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 items-stretch">
            <StatCard
              label="Speed"
              tooltip="Computed from 3D distance between adjacent GPX points divided by their timestamp delta. Close to ground speed — without wind or aircraft anemometer data it is impossible to derive TAS or other speeds that would be more useful."
              value={currentSpeed.knots !== null ? `${currentSpeed.knots.toFixed(1)} KT` : "--"}
            />
            <StatCard
              label="Current Altitude"
              tooltip="GPX altitude is sampled at points. During playback, altitude is linearly interpolated between the current point and the next point by time."
              value={currentAltitudeFt !== null ? `${Math.round(currentAltitudeFt).toLocaleString()} ft` : "--"}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 items-stretch">
            <StatCard
              label="Track Distance"
              value={points.length > 1 ? `${formatDistance(totalDistanceNm, 1)} NM` : "0 NM"}
            />
            <StatCard
              label="Replay Duration"
              value={timeline.durationMs > 0 ? `${Math.round(timeline.durationMs / 60000)} min` : "0 min"}
            />
            <StatCard label="Track Points" value={points.length.toString()} />
            <StatCard label="Current Point" value={points.length > 0 ? (currentIndex + 1).toString() : "0"} />
          </div>
          </>
          ) : null}

          <div className="mt-6 text-xs" style={{ color: "oklch(0.62 0.02 240)" }}>
            <div className="flex items-center gap-2">
              <span>Need help?</span>
              <Tooltip content="The replay uses GPX track point times. If your file has no timestamps, export again with time data enabled." />
            </div>
          </div>
        </div>
      </main>

      <Footer description="Replay GPX tracks in a 3D globe with smooth time-based line animation." />

      {shareModalOpen && shareUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Share replay"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShareModalOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Share this replay</h3>
                <p className="text-xs mt-1" style={{ color: "oklch(0.7 0.02 240)" }}>
                  Anyone with the link can view the track at the current position, view mode, and camera angle.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                aria-label="Close"
                className="shrink-0 h-8 w-8 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer flex items-center justify-center"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 rounded-md bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-slate-100 font-mono outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={handleCopyShareLink}
                className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium cursor-pointer transition-colors ${
                  shareLinkCopied
                    ? "bg-emerald-600 text-white"
                    : "bg-cyan-600 hover:bg-cyan-500 text-white"
                }`}
              >
                {shareLinkCopied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageLayout>
  );
}

function StatCard({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  return (
    <div className="flex flex-col h-full rounded-lg border border-gray-700 bg-slate-900/40 p-3">
      <div className="text-xs uppercase tracking-wide flex items-center gap-2" style={{ color: "oklch(0.6 0.02 240)" }}>
        <span>{label}</span>
        {tooltip ? <Tooltip content={tooltip} /> : null}
      </div>
      <div className="mt-auto pt-2 text-white text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
