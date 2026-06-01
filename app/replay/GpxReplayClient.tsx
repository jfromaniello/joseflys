"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { PageLayout } from "../components/PageLayout";
import { CalculatorPageHeader } from "../components/CalculatorPageHeader";
import { Footer } from "../components/Footer";
import { Tooltip } from "../components/Tooltip";
import {
  isSpeedOption,
  type CameraPose,
  type OrientationStatus,
  type ReplayPoint,
  type SpeedOption,
  type ViewMode,
} from "./types";
import { parseGpxText } from "./parseGpx";
import { parseCameraParam } from "./cameraParams";
import {
  computeAltitudeFt,
  computeGroundSpeed,
  computeTimeline,
  computeTotalDistanceNm,
  computeVerticalSpeedFpm,
  findPointIndexByTime,
} from "./replayMetrics";
import { createShareUrl, type ShareStatus } from "./shareReplay";
import { useFullscreen } from "./useFullscreen";
import { usePersistedMapStyle, usePersistedViewMode } from "./useReplayPreferences";
import { useReplayRecorder } from "./useReplayRecorder";
import { ReplayToolbar } from "./components/ReplayToolbar";
import { GpxDropzone } from "./components/GpxDropzone";
import { FullscreenButton } from "./components/FullscreenButton";
import { TelemetryOverlay } from "./components/TelemetryOverlay";
import { ReplayControls } from "./components/ReplayControls";
import { StatsGrid } from "./components/StatsGrid";
import { ShareModal } from "./components/ShareModal";
import { RecordModal } from "./components/RecordModal";

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

const HAS_GOOGLE_MAPS_KEY = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

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

  const initialCamera = useMemo<CameraPose | null>(
    () => parseCameraParam(initialCamParam),
    [initialCamParam]
  );

  const cameraStateRef = useRef<CameraPose | null>(initialCamera);
  const requestOrientationRef = useRef<(() => Promise<OrientationStatus>) | null>(null);
  const [orientationStatus, setOrientationStatus] = useState<OrientationStatus>("unknown");
  const [headTrackingEnabled, setHeadTrackingEnabled] = useState(false);

  const [points, setPoints] = useState<ReplayPoint[]>([]);
  const [rawGpx, setRawGpx] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<SpeedOption>(initialSpeed);
  const [elapsedMs, setElapsedMs] = useState(initialElapsedMs);
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const [shareUrl, setShareUrl] = useState<string>("");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTickRef = useRef<number | null>(null);
  const initialGpxAppliedRef = useRef(false);
  const globeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const { isFullscreen, wrapperRef: fullscreenWrapperRef, toggleFullscreen } = useFullscreen();
  const [viewMode, setViewMode] = usePersistedViewMode(initialViewParam);
  const [mapStyle, setMapStyle] = usePersistedMapStyle(HAS_GOOGLE_MAPS_KEY);

  // Switching away from cockpit always disables head-tracking. Head-tracking can
  // only be enabled while in cockpit, so this is the single place it resets.
  const changeViewMode = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
      if (mode !== "cockpit") setHeadTrackingEnabled(false);
    },
    [setViewMode]
  );

  const handleViewModeInterrupt = useCallback(() => {
    changeViewMode("free");
  }, [changeViewMode]);

  const handleHeadTrackingToggle = useCallback(async () => {
    if (headTrackingEnabled) {
      setHeadTrackingEnabled(false);
      return;
    }
    let status = orientationStatus;
    if (status === "needs-permission" && requestOrientationRef.current) {
      status = await requestOrientationRef.current();
    }
    if (status === "granted") setHeadTrackingEnabled(true);
  }, [headTrackingEnabled, orientationStatus]);

  // --- Apply a shared GPX passed in from the server (/replay/:id) ---
  useEffect(() => {
    if (!initialGpx || initialGpxAppliedRef.current) return;
    initialGpxAppliedRef.current = true;
    try {
      const parsed = parseGpxText(initialGpx);
      // One-shot load of server-provided GPX into state on mount. Parsing relies
      // on DOMParser (client only), so it can't run in a lazy initializer.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPoints(parsed);
      setRawGpx(initialGpx);
      setError("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse shared GPX.";
      setError(message);
    }
  }, [initialGpx]);

  // --- Derived replay metrics ---
  const timeline = useMemo(() => computeTimeline(points), [points]);
  const clampedElapsedMs = Math.min(elapsedMs, timeline.durationMs);
  const currentTimeMs = timeline.startMs + clampedElapsedMs;

  const currentIndex = useMemo(
    () => (points.length === 0 ? 0 : findPointIndexByTime(points, currentTimeMs)),
    [points, currentTimeMs]
  );
  const totalDistanceNm = useMemo(() => computeTotalDistanceNm(points), [points]);
  const currentSpeed = useMemo(
    () => computeGroundSpeed(points, currentIndex),
    [points, currentIndex]
  );
  const currentAltitudeFt = useMemo(
    () => computeAltitudeFt(points, currentIndex, currentTimeMs),
    [points, currentIndex, currentTimeMs]
  );
  const currentVerticalSpeedFpm = useMemo(
    () => computeVerticalSpeedFpm(points, currentIndex, currentTimeMs),
    [points, currentIndex, currentTimeMs]
  );

  const recorder = useReplayRecorder({
    canvasRef: globeCanvasRef,
    points,
    startMs: timeline.startMs,
    durationMs: timeline.durationMs,
    setElapsedMs,
    setIsPlaying,
  });

  const handleRecord = useCallback(() => {
    recorder.reset();
    setRecordModalOpen(true);
  }, [recorder]);

  const handleCloseRecordModal = useCallback(() => {
    setRecordModalOpen(false);
    recorder.reset();
  }, [recorder]);

  // --- Playback animation loop (real time × speed) ---
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
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, speed, timeline.durationMs]);

  // Auto-clear the "copied"/"error" share feedback after a short delay.
  useEffect(() => {
    if (shareStatus !== "copied" && shareStatus !== "error") return;
    const id = setTimeout(() => setShareStatus("idle"), 2500);
    return () => clearTimeout(id);
  }, [shareStatus]);

  const resetShare = useCallback(() => {
    setShareStatus("idle");
    setShareUrl("");
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
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
        resetShare();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to parse GPX file.";
        setError(message);
        setPoints([]);
        setRawGpx("");
        setElapsedMs(0);
        setIsPlaying(false);
        resetShare();
      }
    },
    [resetShare]
  );

  const handleSliderChange = useCallback((value: number) => {
    setElapsedMs(value);
    setIsPlaying(false);
  }, []);

  const handleShare = useCallback(async () => {
    if (!rawGpx || shareStatus === "loading") return;
    setShareStatus("loading");

    try {
      const finalUrl = await createShareUrl(rawGpx, {
        elapsedMs: clampedElapsedMs,
        speed,
        viewMode,
        camera: cameraStateRef.current,
      });
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

  const canShare = points.length >= 2 && rawGpx.length > 0;
  const hasTrack = points.length > 0;

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
              if (file) void handleFile(file);
              e.currentTarget.value = "";
            }}
          />

          <ReplayToolbar
            pointCount={points.length}
            initialGpxName={initialGpxName}
            onNewGpx={() => inputRef.current?.click()}
            onShare={handleShare}
            canShare={canShare}
            shareStatus={shareStatus}
            onRecord={handleRecord}
            canRecord={recorder.supported}
          />

          {!hasTrack ? (
            <GpxDropzone onFile={(file) => void handleFile(file)} onChoose={() => inputRef.current?.click()} />
          ) : null}

          {error ? (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {hasTrack ? (
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
                    headTrackingEnabled={headTrackingEnabled}
                    canvasRef={globeCanvasRef}
                  />
                </div>

                <FullscreenButton isFullscreen={isFullscreen} onToggle={() => void toggleFullscreen()} />

                <TelemetryOverlay
                  speedKnots={currentSpeed.knots}
                  altitudeFt={currentAltitudeFt}
                  verticalSpeedFpm={currentVerticalSpeedFpm}
                />

                <ReplayControls
                  isFullscreen={isFullscreen}
                  isPlaying={isPlaying}
                  onTogglePlay={() => setIsPlaying((prev) => !prev)}
                  elapsedMs={clampedElapsedMs}
                  endMs={timeline.endMs}
                  currentTimeMs={currentTimeMs}
                  durationMs={timeline.durationMs}
                  pointCount={points.length}
                  onSliderChange={handleSliderChange}
                  speed={speed}
                  onSpeedChange={setSpeed}
                  viewMode={viewMode}
                  onViewModeChange={changeViewMode}
                  mapStyle={mapStyle}
                  onMapStyleChange={setMapStyle}
                  hasGoogleMapsKey={HAS_GOOGLE_MAPS_KEY}
                  orientationStatus={orientationStatus}
                  headTrackingEnabled={headTrackingEnabled}
                  onHeadTrackingToggle={() => void handleHeadTrackingToggle()}
                />
              </div>

              <StatsGrid
                speedKnots={currentSpeed.knots}
                altitudeFt={currentAltitudeFt}
                verticalSpeedFpm={currentVerticalSpeedFpm}
                totalDistanceNm={totalDistanceNm}
                durationMs={timeline.durationMs}
                pointCount={points.length}
                currentIndex={currentIndex}
              />
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
        <ShareModal url={shareUrl} onClose={() => setShareModalOpen(false)} />
      ) : null}

      {recordModalOpen ? (
        <RecordModal
          status={recorder.status}
          progress={recorder.progress}
          resultUrl={recorder.resultUrl}
          error={recorder.error}
          supported={recorder.supported}
          onStart={(s) => recorder.startRecording(s)}
          onClose={handleCloseRecordModal}
        />
      ) : null}
    </PageLayout>
  );
}
