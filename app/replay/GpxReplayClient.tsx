"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { CaptureControl } from "./GpxReplayGlobe";
import { PageLayout } from "../components/PageLayout";
import { Navbar } from "../components/Navbar";
import { CalculatorPageHeader } from "../components/CalculatorPageHeader";
import { Footer } from "../components/Footer";
import { Tooltip } from "../components/Tooltip";
import { formatDistance } from "@/lib/formatters";
import {
  isSpeedOption,
  type CameraPose,
  type OrientationStatus,
  type ReplayPoint,
  type SpeedOption,
  type ViewMode,
} from "./types";
import { parseTrack } from "./parseTrack";
import { parseCameraParam } from "./cameraParams";
import {
  computeAltitudeFt,
  computeGroundSpeed,
  computeTimeline,
  computeTotalDistanceNm,
  computeTrackHeadingDeg,
  computeVerticalSpeedFpm,
  computeWindComponents,
  findPointIndexByTime,
  hasEngineData,
  hasRichTelemetry,
  sampleEngine,
  sampleTelemetry,
} from "./replayMetrics";
import { sampleField } from "./cameraMath";
import { sampleMagneticHeadingDeg } from "./aircraftAttitude";
import { createShareUrl, type ShareStatus } from "./shareReplay";
import { useFullscreen } from "./useFullscreen";
import {
  usePersistedChaseDistance,
  usePersistedMapStyle,
  usePersistedShowPfd,
  usePersistedShowTrack,
  usePersistedShowWall,
  usePersistedViewMode,
} from "./useReplayPreferences";
import { useReplayRecorder } from "./useReplayRecorder";
import { useCircuitAnalysis } from "./useCircuitAnalysis";
import { ReplayToolbar } from "./components/ReplayToolbar";
import { GpxDropzone } from "./components/GpxDropzone";
import { FullscreenButton } from "./components/FullscreenButton";
import { TelemetryOverlay } from "./components/TelemetryOverlay";
import { CockpitPfdOverlay } from "./components/CockpitPfdOverlay";
import { ReplayControls } from "./components/ReplayControls";
import { CircuitTimeline } from "./components/CircuitTimeline";
import { CircuitTable } from "./components/CircuitTable";
import { FlightPhasesTable } from "./components/FlightPhasesTable";
import { circuitPhaseAt } from "./analysis";
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
      <div className="w-full h-full bg-slate-900/30 flex items-center justify-center">
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
  const initialCdParam = searchParams.get("cd");
  const initialWallParam = searchParams.get("wall");

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

  const initialChaseDistance = useMemo<number | null>(() => {
    if (!initialCdParam) return null;
    const parsed = Number.parseInt(initialCdParam, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [initialCdParam]);

  const cameraStateRef = useRef<CameraPose | null>(initialCamera);
  const requestOrientationRef = useRef<(() => Promise<OrientationStatus>) | null>(null);
  const [orientationStatus, setOrientationStatus] = useState<OrientationStatus>("unknown");
  const [headTrackingEnabled, setHeadTrackingEnabled] = useState(false);

  const [points, setPoints] = useState<ReplayPoint[]>([]);
  const [rawGpx, setRawGpx] = useState<string>("");
  const [trackName, setTrackName] = useState<string>(initialGpxName ?? "");
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
  const captureControlRef = useRef<CaptureControl | null>(null);

  const { isFullscreen, wrapperRef: fullscreenWrapperRef, toggleFullscreen } = useFullscreen();
  const [viewMode, setViewMode] = usePersistedViewMode(initialViewParam);
  const [mapStyle, setMapStyle] = usePersistedMapStyle(HAS_GOOGLE_MAPS_KEY);
  const [showTrack, setShowTrack] = usePersistedShowTrack();
  const [showWall, setShowWall] = usePersistedShowWall(initialWallParam);
  const [showPfd, setShowPfd] = usePersistedShowPfd();
  const [chaseDistance, setChaseDistance] = usePersistedChaseDistance(initialChaseDistance);

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
      const { points: parsed } = parseTrack(initialGpx);
      // One-shot load of server-provided track into state on mount. GPX parsing
      // relies on DOMParser (client only), so it can't run in a lazy initializer.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPoints(parsed);
      setRawGpx(initialGpx);
      setError("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse shared track.";
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
  const telemetry = useMemo(
    () => sampleTelemetry(points, currentTimeMs),
    [points, currentTimeMs]
  );
  const derivedSpeed = useMemo(
    () => computeGroundSpeed(points, currentIndex),
    [points, currentIndex]
  );
  // Prefer the avionics-recorded ground speed when present; fall back to the
  // GPS-derived value for plain GPX tracks.
  const currentSpeedKnots = telemetry.groundSpeedKt ?? derivedSpeed.knots;
  const currentAltitudeFt = useMemo(
    () => computeAltitudeFt(points, currentIndex, currentTimeMs),
    [points, currentIndex, currentTimeMs]
  );
  const currentVerticalSpeedFpm = useMemo(
    () => computeVerticalSpeedFpm(points, currentIndex, currentTimeMs),
    [points, currentIndex, currentTimeMs]
  );
  const currentTrackDeg = useMemo(
    () => computeTrackHeadingDeg(points, currentTimeMs),
    [points, currentTimeMs]
  );
  const windComponents = useMemo(
    () => computeWindComponents(telemetry.windDirDeg, telemetry.windSpeedKt, currentTrackDeg),
    [telemetry.windDirDeg, telemetry.windSpeedKt, currentTrackDeg]
  );
  const hasAvionics = useMemo(() => hasRichTelemetry(points), [points]);
  const currentHeadingMagDeg = useMemo(
    () => sampleMagneticHeadingDeg(points, currentTimeMs),
    [points, currentTimeMs]
  );
  const currentRollDeg = useMemo(
    () => sampleField(points, currentTimeMs, "rollDeg"),
    [points, currentTimeMs]
  );
  const currentPitchDeg = useMemo(
    () => sampleField(points, currentTimeMs, "pitchDeg"),
    [points, currentTimeMs]
  );
  const engineAvailable = useMemo(() => hasEngineData(points), [points]);
  const engine = useMemo(
    () => (engineAvailable ? sampleEngine(points, currentTimeMs) : null),
    [engineAvailable, points, currentTimeMs]
  );
  // The glass-cockpit overlay replaces the simple telemetry box in cockpit view
  // when the track carries avionics data and the user hasn't turned it off.
  const pfdActive = viewMode === "cockpit" && hasAvionics && showPfd;
  const flight = useCircuitAnalysis(points);
  // Aerodromes the flight visits, for terrain flattening around their runways.
  const flattenCenters = useMemo(
    () =>
      (flight?.analyses ?? []).map((a) => ({
        lat: a.aerodrome.lat,
        lon: a.aerodrome.lon,
        runwayLengthFt: a.aerodrome.lengthFt,
      })),
    [flight]
  );
  const currentStage = useMemo(() => {
    if (!flight) return null;
    const phase = circuitPhaseAt(flight, currentTimeMs);
    if (phase === "downwind") return "Downwind";
    if (phase === "base") return "Base";
    if (phase === "final") return "Final";
    return null;
  }, [flight, currentTimeMs]);

  const recorder = useReplayRecorder({
    canvasRef: globeCanvasRef,
    points,
    startMs: timeline.startMs,
    durationMs: timeline.durationMs,
    setElapsedMs,
    setIsPlaying,
    captureControlRef,
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
      const name = file.name.toLowerCase();
      if (!name.endsWith(".gpx") && !name.endsWith(".csv")) {
        setError("Please select a .gpx track or a Garmin .csv log.");
        return;
      }

      try {
        const text = await file.text();
        const { points: parsed } = parseTrack(text);
        setPoints(parsed);
        setRawGpx(text);
        setTrackName(file.name);
        setElapsedMs(0);
        setIsPlaying(false);
        setError("");
        resetShare();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to parse track file.";
        setError(message);
        setPoints([]);
        setRawGpx("");
        setTrackName("");
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
        chaseDistance,
        showWall,
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
  }, [rawGpx, clampedElapsedMs, speed, shareStatus, viewMode, chaseDistance, showWall]);

  const canShare = points.length >= 2 && rawGpx.length > 0;
  const hasTrack = points.length > 0;

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept=".gpx,.csv,application/gpx+xml,text/csv"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void handleFile(file);
        e.currentTarget.value = "";
      }}
    />
  );

  // --- Landing state: no track loaded yet (drop target + site footer) ---
  if (!hasTrack) {
    return (
      <PageLayout currentPage="replay">
        <CalculatorPageHeader
          title="Flight Replay 3D"
          description="Drop a GPX track and replay it over time in a 3D globe."
        />

        <main className="w-full max-w-3xl">
          <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 border border-gray-700 backdrop-blur-sm">
            {fileInput}

            {error ? (
              <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <GpxDropzone onFile={(file) => void handleFile(file)} onChoose={() => inputRef.current?.click()} />

            <div className="mt-6 text-xs" style={{ color: "oklch(0.62 0.02 240)" }}>
              <div className="flex items-center gap-2">
                <span>Need help?</span>
                <Tooltip content="The replay uses GPX track point times. If your file has no timestamps, export again with time data enabled." />
              </div>
            </div>
          </div>
        </main>

        <Footer
          description="Replay GPX tracks in a 3D globe with smooth time-based line animation."
          attribution={<ReplayAttribution />}
        />
      </PageLayout>
    );
  }

  // --- Replay state: full-viewport app shell (globe + side analysis panel) ---
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
      <Navbar currentPage="replay" />
      {fileInput}

      <div className="flex flex-col xl:h-[calc(100dvh-3.5rem)]">
        <ReplayToolbar
          trackName={trackName}
          onNewGpx={() => inputRef.current?.click()}
          onShare={handleShare}
          canShare={canShare}
          shareStatus={shareStatus}
          onRecord={handleRecord}
          canRecord={recorder.supported}
        />

        <div className="flex flex-1 min-h-0 flex-col xl:flex-row">
          <div
            ref={fullscreenWrapperRef}
            className={
              isFullscreen
                ? "fixed inset-0 z-[9999] bg-slate-950 flex flex-col w-screen h-dvh"
                : "relative h-[calc(100dvh-9rem)] min-h-[20rem] xl:h-auto xl:flex-1 xl:min-w-0"
            }
          >
            <div className={isFullscreen ? "flex-1 relative" : "h-full"}>
              <GpxReplayGlobe
                points={points}
                currentTimeMs={currentTimeMs}
                isPlaying={isPlaying}
                speed={speed}
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
                showTrack={showTrack}
                showWall={showWall}
                chaseDistanceM={chaseDistance}
                captureControlRef={captureControlRef}
                flattenCenters={flattenCenters}
              />
            </div>

            <FullscreenButton isFullscreen={isFullscreen} onToggle={() => void toggleFullscreen()} />

            {pfdActive ? (
              <CockpitPfdOverlay
                iasKt={telemetry.iasKt}
                groundSpeedKt={currentSpeedKnots}
                tasKt={telemetry.tasKt}
                altitudeFt={currentAltitudeFt}
                vsFpm={telemetry.vsFpm ?? currentVerticalSpeedFpm}
                headingDeg={currentHeadingMagDeg ?? currentTrackDeg}
                rollDeg={currentRollDeg}
                pitchDeg={currentPitchDeg}
                windDirDeg={telemetry.windDirDeg}
                windSpeedKt={telemetry.windSpeedKt}
                oatC={telemetry.oatC}
                aglFt={telemetry.aglFt}
                engine={engine}
              />
            ) : (
              <TelemetryOverlay
                speedKnots={currentSpeedKnots}
                altitudeFt={currentAltitudeFt}
                verticalSpeedFpm={currentVerticalSpeedFpm}
                trackDeg={currentTrackDeg}
                stage={currentStage}
                iasKt={telemetry.iasKt}
                tasKt={telemetry.tasKt}
                windDirDeg={telemetry.windDirDeg}
                windSpeedKt={telemetry.windSpeedKt}
                windComponents={windComponents}
              />
            )}

            <ReplayControls
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
              showTrack={showTrack}
              onShowTrackChange={setShowTrack}
              showWall={showWall}
              onShowWallChange={setShowWall}
              chaseDistance={chaseDistance}
              onChaseDistanceChange={setChaseDistance}
              pfdAvailable={hasAvionics}
              showPfd={showPfd}
              onShowPfdChange={setShowPfd}
            />
          </div>

          <aside className="@container shrink-0 bg-slate-900/30 xl:w-[26rem] xl:border-l xl:border-gray-800 xl:overflow-y-auto">
            <div className="flex flex-col gap-3 p-3">
              {flight ? (
                <>
                  <CircuitTimeline
                    flight={flight}
                    startMs={timeline.startMs}
                    durationMs={timeline.durationMs}
                    currentTimeMs={currentTimeMs}
                    onSeek={handleSliderChange}
                  />
                  <FlightPhasesTable
                    phases={flight.phases}
                    markers={flight.markers}
                    startMs={timeline.startMs}
                    currentTimeMs={currentTimeMs}
                    onSeek={handleSliderChange}
                  />
                  <CircuitTable
                    landings={flight.landings}
                    startMs={timeline.startMs}
                    currentTimeMs={currentTimeMs}
                    onSeek={handleSliderChange}
                  />
                </>
              ) : null}

              <div className="rounded-lg bg-slate-900/60 border border-gray-700 px-4 py-2.5 text-xs tabular-nums text-slate-400">
                {formatDistance(totalDistanceNm, 1)} NM · {Math.round(timeline.durationMs / 60000)} min ·{" "}
                {points.length.toLocaleString()} points
              </div>

              <div className="px-1 text-[10px] leading-relaxed text-slate-500">
                <ReplayAttribution />
              </div>
            </div>
          </aside>
        </div>
      </div>

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
          onStart={(opts) => recorder.startRecording(opts)}
          onClose={handleCloseRecordModal}
          onCancel={() => recorder.reset()}
          speed={speed}
          onSpeedChange={setSpeed}
          viewMode={viewMode}
          onViewModeChange={changeViewMode}
          showTrack={showTrack}
          onShowTrackChange={setShowTrack}
          chaseDistance={chaseDistance}
          onChaseDistanceChange={setChaseDistance}
        />
      ) : null}
    </div>
  );
}

/** Imagery / Cesium / 3D-model credits, shared by the footer and the replay side panel. */
function ReplayAttribution() {
  return (
    <>
      3D globe by{" "}
      <a
        href="https://cesium.com/platform/cesiumjs/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:brightness-125"
        style={{ color: "oklch(0.6 0.1 230)" }}
      >
        CesiumJS
      </a>{" "}
      · imagery © Esri, OpenStreetMap contributors · aircraft model{" "}
      <a
        href="https://sketchfab.com/3d-models/free-cessna-172-replica-low-poly-basic-model-aa0f72aead044664a0555f047cb36262"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:brightness-125"
        style={{ color: "oklch(0.6 0.1 230)" }}
      >
        “Cessna 172”
      </a>{" "}
      by{" "}
      <a
        href="https://sketchfab.com/quadzii"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:brightness-125"
        style={{ color: "oklch(0.6 0.1 230)" }}
      >
        quadzii
      </a>{" "}
      (
      <a
        href="https://creativecommons.org/licenses/by/4.0/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:brightness-125"
        style={{ color: "oklch(0.6 0.1 230)" }}
      >
        CC BY 4.0
      </a>
      )
    </>
  );
}
