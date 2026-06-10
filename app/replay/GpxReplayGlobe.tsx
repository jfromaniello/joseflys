"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type {
  CameraPose,
  MapStyle,
  OrientationStatus,
  ReplayPoint,
  ViewMode,
} from "./types";
import {
  computeCamEvents,
  computeCameraPose,
  computeMotionHeadingAdaptive,
  findActiveCamMode,
  findIndexAtTime,
  getInterpolatedPoint,
  lerpAngle,
  sampleField,
  DEFAULT_CHASE_RANGE_M,
  type CamEvent,
  type CamMode,
} from "./cameraMath";
import { estimateAttitude, recordedHeadingRad } from "./aircraftAttitude";
import { createAerodromeFlatteningProvider, type FlattenCenter } from "./terrainFlattening";

/** Imperative controller used by the recorder for deterministic ("Sharp") capture. */
export interface CaptureControl {
  /** Enters capture mode (suspends the live camera follow, resets the trail). */
  begin: () => void;
  /** Positions the aircraft + camera at `timeMs` and waits until tiles are loaded. */
  frameAtTime: (timeMs: number) => Promise<void>;
  /** Leaves capture mode and restores live behavior. */
  end: () => void;
}

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied" | "prompt">;
};

interface GpxReplayGlobeProps {
  points: ReplayPoint[];
  currentTimeMs: number;
  /** Whether playback is running — lets the globe extrapolate motion at its own
   * frame rate for smooth animation, decoupled from React's commit cadence. */
  isPlaying?: boolean;
  /** Playback speed multiplier (used for the smooth-motion extrapolation). */
  speed?: number;
  viewMode: ViewMode;
  mapStyle?: MapStyle;
  onViewModeInterrupt?: () => void;
  isFullscreen?: boolean;
  initialCamera?: CameraPose | null;
  cameraStateRef?: MutableRefObject<CameraPose | null>;
  onOrientationStatusChange?: (status: OrientationStatus) => void;
  requestOrientationRef?: MutableRefObject<(() => Promise<OrientationStatus>) | null>;
  headTrackingEnabled?: boolean;
  /** Receives the live WebGL canvas so the parent can capture frames for video export. */
  canvasRef?: MutableRefObject<HTMLCanvasElement | null>;
  /** Whether the cyan track polyline is rendered. */
  showTrack?: boolean;
  /** Whether a translucent altitude wall is drawn from the track down to the ground. */
  showWall?: boolean;
  /** Chase camera distance in metres behind the aircraft. */
  chaseDistanceM?: number;
  /** Receives an imperative controller for deterministic frame-by-frame capture. */
  captureControlRef?: MutableRefObject<CaptureControl | null>;
  /** Aerodromes to flatten the terrain around (standard map style only). */
  flattenCenters?: FlattenCenter[];
}

const CESIUM_ION_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Aircraft marker model (low-poly Cessna 172). minimumPixelSize keeps it visible
// from afar regardless of the GLB's authored scale; heading offset corrects the
// model's nose axis so it points along the course.
const MODEL_URI = "/models/cessna_172.glb";
const MODEL_SCALE = 1;
const MODEL_MIN_PIXELS = 25;
const MODEL_HEADING_OFFSET_RAD = -Math.PI / 2;

// Minimum clearance (metres) kept between the rendered aircraft and the ground
// below it, so a GPS altitude that dips under the rendered surface (terrain or
// the Google 3D tiles, which both sit on the real terrain) never buries the model.
const GROUND_CLEARANCE_M = 0;

// Recorded bank angle (radians) banked into the cockpit camera. Only avionics
// logs (Garmin CSV) carry rollDeg; plain GPX yields 0 so the horizon stays level
// rather than tilting on a synthetic turn-rate estimate.
function recordedRollRad(points: ReplayPoint[], timeMs: number): number {
  const rollDeg = sampleField(points, timeMs, "rollDeg");
  return rollDeg === null ? 0 : (rollDeg * Math.PI) / 180;
}

export function GpxReplayGlobe({
  points,
  currentTimeMs,
  isPlaying = false,
  speed = 1,
  viewMode,
  mapStyle = "standard",
  onViewModeInterrupt,
  isFullscreen = false,
  initialCamera = null,
  cameraStateRef,
  onOrientationStatusChange,
  requestOrientationRef,
  canvasRef,
  showTrack = true,
  showWall = false,
  chaseDistanceM = DEFAULT_CHASE_RANGE_M,
  captureControlRef,
  flattenCenters,
  headTrackingEnabled = false,
}: GpxReplayGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<import("cesium").Viewer | null>(null);
  const cesiumRef = useRef<typeof import("cesium") | null>(null);
  const replayLineRef = useRef<import("cesium").Entity | null>(null);
  const wallEntityRef = useRef<import("cesium").Entity | null>(null);
  const minEleRef = useRef<number>(0);
  const currentMarkerRef = useRef<import("cesium").Entity | null>(null);
  // `renderedPathRef` holds only whole track points up to the current index
  // (built incrementally, idempotent under repeated runs). `displayPathRef` is
  // what the polyline/wall actually render: the base path plus a single transient
  // "head" vertex at the interpolated aircraft position, rebuilt fresh each frame
  // so the line reaches the model without ever mutating the base array in place.
  const renderedPathRef = useRef<import("cesium").Cartesian3[]>([]);
  const displayPathRef = useRef<import("cesium").Cartesian3[]>([]);
  // Ground floor (terrain height) under each base point / display vertex, so the
  // altitude wall ends at the surface instead of a global minimum.
  const baseFloorsRef = useRef<number[]>([]);
  const wallFloorsRef = useRef<number[]>([]);
  const markerPositionRef = useRef<import("cesium").Cartesian3 | null>(null);
  const lastRenderedIndexRef = useRef<number>(-1);
  const fittedRef = useRef(false);

  const safePointsRef = useRef<ReplayPoint[]>([]);
  const currentTimeMsRef = useRef<number>(0);
  const boundingSphereRef = useRef<import("cesium").BoundingSphere | null>(null);
  const camEventsRef = useRef<CamEvent[]>([]);
  const camCurrentModeRef = useRef<CamMode | null>(null);
  const camIsFlyingRef = useRef<boolean>(false);
  const captureModeRef = useRef<boolean>(false);
  const viewModeRef = useRef<ViewMode>(viewMode);
  const chaseDistanceRef = useRef<number>(chaseDistanceM);
  const onInterruptRef = useRef<(() => void) | undefined>(onViewModeInterrupt);
  const altitudeOffsetRef = useRef<number>(0);
  // Terrain (ground) height in metres sampled per safe-point index; empty until
  // the async terrain sample resolves. Used to clamp render altitude above ground.
  const terrainHeightsRef = useRef<number[]>([]);
  // Anchor for smooth wall-clock extrapolation of playback time between React
  // commits: the last known (absolute track time, performance.now()) pair.
  const playAnchorRef = useRef<{ timeMs: number; wall: number }>({ timeMs: 0, wall: 0 });
  const isPlayingRef = useRef<boolean>(false);
  const speedRef = useRef<number>(1);
  const lastValidHeadingRef = useRef<number | null>(null);
  const cockpitHeadingOffsetRef = useRef<number>(0);
  const cockpitPitchOffsetRef = useRef<number>(0);
  const cockpitBaselineAlphaRef = useRef<number | null>(null);
  const cockpitBaselineBetaRef = useRef<number | null>(null);
  const googleTilesetRef = useRef<import("cesium").Cesium3DTileset | null>(null);
  // World-terrain provider kept solely for sampling ground heights, independent
  // of the rendered provider (which is an ellipsoid in photorealistic mode).
  const samplingTerrainRef = useRef<import("cesium").TerrainProvider | null>(null);

  const [viewerReady, setViewerReady] = useState(false);
  // Bumped when the render terrain/imagery provider changes, to force a re-render.
  const [, setProviderEpoch] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [orientationStatus, setOrientationStatus] = useState<OrientationStatus>("unknown");
  const [showCameraBanner, setShowCameraBanner] = useState(false);

  useEffect(() => {
    if (viewMode === "free") {
      setShowCameraBanner(false);
      return;
    }
    setShowCameraBanner(true);
    const id = window.setTimeout(() => setShowCameraBanner(false), 4000);
    return () => window.clearTimeout(id);
  }, [viewMode]);

  const getAdjustedAltitude = (eleMeters: number): number => {
    return Math.max(0, eleMeters || 0);
  };

  // Ground (real-world MSL terrain) height in metres at a track point. Prefers
  // the most-detailed pre-sampled value (populated for every point regardless of
  // render mode), falling back to the live globe terrain height. This is the same
  // reference in standard and photorealistic modes because the Google 3D tiles
  // sit on the real terrain surface too.
  const groundHeightAt = useCallback((lon: number, lat: number, index?: number): number | undefined => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (viewer && Cesium) {
      const provider = viewer.terrainProvider;
      const globeHasTerrain = provider && !(provider instanceof Cesium.EllipsoidTerrainProvider);
      // Standard mode: the live globe height matches the rendered terrain mesh
      // exactly, so prefer it (the most-detailed pre-sample can read a few metres
      // above the LOD actually drawn, which would float the model).
      if (globeHasTerrain) {
        const h = viewer.scene.globe.getHeight(Cesium.Cartographic.fromDegrees(lon, lat));
        if (Number.isFinite(h)) return h;
      }
    }
    // Photorealistic mode (ellipsoid globe) or live height unavailable: use the
    // pre-sampled world-terrain height, which the Google 3D tiles sit on.
    if (index !== undefined) {
      const sampled = terrainHeightsRef.current[index];
      if (Number.isFinite(sampled)) return sampled;
    }
    return undefined;
  }, []);

  // Render altitude for a trace point: the true GPS altitude, but never below the
  // local ground + a small clearance so it can't be buried under the surface.
  const clampedAlt = useCallback(
    (lon: number, lat: number, ele: number, index?: number): number => {
      const base = ele || 0;
      const ground = groundHeightAt(lon, lat, index);
      return ground !== undefined ? Math.max(base, ground + GROUND_CLEARANCE_M) : base;
    },
    [groundHeightAt]
  );

  const safePoints = useMemo(
    () =>
      points.filter(
        (p) =>
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lon) &&
          Number.isFinite(p.ele) &&
          p.lat >= -90 &&
          p.lat <= 90 &&
          p.lon >= -180 &&
          p.lon <= 180
      ),
    [points]
  );

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  // Keep playback state in refs for the per-frame smooth ticker, and re-anchor
  // the wall-clock extrapolation whenever playback starts/stops or speed changes.
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    playAnchorRef.current = { timeMs: currentTimeMsRef.current, wall: performance.now() };
  }, [isPlaying]);

  useEffect(() => {
    speedRef.current = speed;
    playAnchorRef.current = { timeMs: currentTimeMsRef.current, wall: performance.now() };
  }, [speed]);

  useEffect(() => {
    chaseDistanceRef.current = chaseDistanceM;
  }, [chaseDistanceM]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const id = window.setTimeout(() => {
      try {
        viewer.resize();
      } catch {
        // viewer may have been destroyed
      }
    }, 80);
    return () => window.clearTimeout(id);
  }, [isFullscreen]);

  useEffect(() => {
    onInterruptRef.current = onViewModeInterrupt;
  }, [onViewModeInterrupt]);

  useEffect(() => {
    if (viewMode !== "cockpit") {
      setOrientationStatus("unknown");
      return;
    }
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setOrientationStatus("unavailable");
      return;
    }
    const DOE = window.DeviceOrientationEvent as DeviceOrientationEventWithPermission;
    if (typeof DOE.requestPermission === "function") {
      setOrientationStatus("needs-permission");
    } else {
      setOrientationStatus("granted");
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== "cockpit" || orientationStatus !== "granted" || !headTrackingEnabled) return;
    if (typeof window === "undefined") return;

    cockpitBaselineAlphaRef.current = null;
    cockpitBaselineBetaRef.current = null;

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha === null || event.beta === null) return;
      if (cockpitBaselineAlphaRef.current === null) {
        cockpitBaselineAlphaRef.current = event.alpha;
        cockpitBaselineBetaRef.current = event.beta;
        return;
      }
      let dAlpha = event.alpha - cockpitBaselineAlphaRef.current;
      if (dAlpha > 180) dAlpha -= 360;
      if (dAlpha < -180) dAlpha += 360;
      const dBeta = event.beta - (cockpitBaselineBetaRef.current ?? 0);

      cockpitHeadingOffsetRef.current = -dAlpha * (Math.PI / 180);
      let pitchOffset = dBeta * (Math.PI / 180);
      pitchOffset = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitchOffset));
      cockpitPitchOffsetRef.current = pitchOffset;
    };

    window.addEventListener("deviceorientation", onOrientation);
    return () => {
      window.removeEventListener("deviceorientation", onOrientation);
      cockpitHeadingOffsetRef.current = 0;
      cockpitPitchOffsetRef.current = 0;
      cockpitBaselineAlphaRef.current = null;
      cockpitBaselineBetaRef.current = null;
    };
  }, [viewMode, orientationStatus, headTrackingEnabled]);

  const requestOrientationPermission = useCallback(async (): Promise<OrientationStatus> => {
    if (typeof window === "undefined") return "unavailable";
    const DOE = window.DeviceOrientationEvent as DeviceOrientationEventWithPermission;
    if (typeof DOE.requestPermission !== "function") {
      setOrientationStatus("granted");
      return "granted";
    }
    try {
      const state = await DOE.requestPermission();
      const next: OrientationStatus = state === "granted" ? "granted" : "denied";
      setOrientationStatus(next);
      return next;
    } catch (err) {
      console.error("Orientation permission failed", err);
      setOrientationStatus("denied");
      return "denied";
    }
  }, []);

  useEffect(() => {
    onOrientationStatusChange?.(orientationStatus);
  }, [orientationStatus, onOrientationStatusChange]);

  useEffect(() => {
    if (!requestOrientationRef) return;
    requestOrientationRef.current = requestOrientationPermission;
    return () => {
      if (requestOrientationRef.current === requestOrientationPermission) {
        requestOrientationRef.current = null;
      }
    };
  }, [requestOrientationRef, requestOrientationPermission]);

  useEffect(() => {
    currentTimeMsRef.current = currentTimeMs;
    // Re-anchor the extrapolation to React's authoritative time each commit; the
    // ticker extrapolates forward from here so it stays smooth between commits.
    playAnchorRef.current = { timeMs: currentTimeMs, wall: performance.now() };
  }, [currentTimeMs]);

  useEffect(() => {
    safePointsRef.current = safePoints;
    camEventsRef.current = computeCamEvents(safePoints);
    camCurrentModeRef.current = null;

    const Cesium = cesiumRef.current;
    if (!Cesium || safePoints.length === 0) {
      boundingSphereRef.current = null;
    } else {
      const positions = safePoints.map((p) =>
        Cesium.Cartesian3.fromDegrees(p.lon, p.lat, getAdjustedAltitude(p.ele))
      );
      boundingSphereRef.current = Cesium.BoundingSphere.fromPoints(positions);
    }
  }, [safePoints]);

  useEffect(() => {
    fittedRef.current = false;
    renderedPathRef.current = [];
    displayPathRef.current = [];
    markerPositionRef.current = null;
    lastRenderedIndexRef.current = -1;
    altitudeOffsetRef.current = 0;
    terrainHeightsRef.current = [];
    minEleRef.current = safePoints.reduce(
      (min, p) => (p.ele < min ? p.ele : min),
      safePoints[0]?.ele ?? 0
    );
  }, [safePoints]);

  useEffect(() => {
    const Cesium = cesiumRef.current;
    if (!Cesium || !viewerReady || safePoints.length === 0 || !CESIUM_ION_TOKEN) return;

    let cancelled = false;
    // Sample the real-world terrain height for every track point so the aircraft
    // can be clamped above the ground. Uses a dedicated world-terrain provider so
    // it works even in photorealistic mode (where the rendered provider is an
    // ellipsoid). The Google 3D tiles sit on this same surface, so it's the right
    // reference in both modes.
    const cartographics = safePoints.map((p) => Cesium.Cartographic.fromDegrees(p.lon, p.lat));

    (async () => {
      try {
        if (!samplingTerrainRef.current) {
          samplingTerrainRef.current = await Cesium.createWorldTerrainAsync();
        }
        if (cancelled) return;
        const updated = await Cesium.sampleTerrainMostDetailed(
          samplingTerrainRef.current,
          cartographics
        );
        if (cancelled) return;

        terrainHeightsRef.current = updated.map((c) => c.height);

        // Rebuild the trace so the clamped altitudes take effect.
        renderedPathRef.current = [];
        displayPathRef.current = [];
        lastRenderedIndexRef.current = -1;

        const positions = safePoints.map((p, i) =>
          Cesium.Cartesian3.fromDegrees(p.lon, p.lat, clampedAlt(p.lon, p.lat, p.ele, i))
        );
        boundingSphereRef.current = Cesium.BoundingSphere.fromPoints(positions);
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message) console.error("Terrain sampling failed", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [safePoints, viewerReady, clampedAlt]);

  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      if (args.length === 1 && args[0] && typeof args[0] === "object" && Object.keys(args[0] as object).length === 0) {
        return;
      }
      originalError(...args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const wheelBlocker = (event: WheelEvent) => {
      event.preventDefault();
    };

    container.addEventListener("wheel", wheelBlocker, { passive: false });
    return () => {
      container.removeEventListener("wheel", wheelBlocker);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    void import("cesium")
      .then(async (Cesium) => {
        if (cancelled || !containerRef.current || viewerRef.current) return;

        cesiumRef.current = Cesium;
        (window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = "/cesium";

        if (CESIUM_ION_TOKEN) {
          Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;
        }

        const viewer = new Cesium.Viewer(containerRef.current, {
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          animation: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          infoBox: false,
          shouldAnimate: false,
          baseLayer: false,
          // Required so the WebGL canvas retains its last frame and can be read
          // back for video export (captureStream/drawImage). Minor perf cost.
          contextOptions: { webgl: { preserveDrawingBuffer: true } },
        });

        viewer.scene.globe.enableLighting = false;
        viewer.scene.globe.depthTestAgainstTerrain = false;
        viewer.scene.screenSpaceCameraController.enableTilt = true;
        viewer.scene.screenSpaceCameraController.enableLook = true;

        // Retain many more ancestor tiles so the upsampled parent is always
        // available as a fallback when zooming in (avoids the "data not yet
        // available" placeholder flickering in).
        viewer.scene.globe.tileCacheSize = 1000;

        // Keep the credit container visible — Cesium ion, the imagery (Esri /
        // OSM) and terrain providers all require their attribution to be shown.
        (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = "";

        // Attribution for the aircraft model (CC BY 4.0 requires credit + link).
        viewer.creditDisplay.addStaticCredit(
          new Cesium.Credit(
            'Aircraft: <a href="https://sketchfab.com/3d-models/free-cessna-172-replica-low-poly-basic-model-aa0f72aead044664a0555f047cb36262" target="_blank" rel="noopener">Cessna 172</a> by <a href="https://sketchfab.com/quadzii" target="_blank" rel="noopener">quadzii</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>)',
            true
          )
        );

        wallEntityRef.current = viewer.entities.add({
          name: "Altitude Wall",
          show: false, // set by the showWall toggle effect once ready
          wall: {
            positions: new Cesium.CallbackProperty(() => displayPathRef.current, false),
            // Floor follows the ground under each vertex so the curtain ends at
            // the terrain (never poking below the tile). Falls back to a global
            // minimum if per-vertex floors aren't ready yet.
            minimumHeights: new Cesium.CallbackProperty(() => {
              const floors = wallFloorsRef.current;
              if (floors.length === displayPathRef.current.length) return floors;
              return new Array(displayPathRef.current.length).fill(getAdjustedAltitude(minEleRef.current) - 5);
            }, false),
            material: Cesium.Color.fromCssColorString("#22d3ee").withAlpha(0.35),
            outline: false,
          },
        });

        replayLineRef.current = viewer.entities.add({
          name: "Replay Track",
          polyline: {
            positions: new Cesium.CallbackProperty(() => displayPathRef.current, false),
            width: 4,
            material: Cesium.Color.fromCssColorString("#22d3ee").withAlpha(0.95),
            clampToGround: false,
            // Straight segments (not GEODESIC): the points are ~1 s apart so the
            // visual difference is nil, and GEODESIC subdivision on a per-frame
            // length-changing CallbackProperty leaves a stale "stretched" segment
            // to the moving head vertex (the "death triangle").
            arcType: Cesium.ArcType.NONE,
          },
        });

        currentMarkerRef.current = viewer.entities.add({
          name: "Current Position",
          position: new Cesium.CallbackPositionProperty(
            (_time, result) => {
              const pos = markerPositionRef.current;
              if (!pos) return undefined;
              return Cesium.Cartesian3.clone(pos, result);
            },
            false,
            Cesium.ReferenceFrame.FIXED
          ),
          orientation: new Cesium.CallbackProperty((_time, result) => {
            const pos = markerPositionRef.current;
            if (!pos) return undefined;
            const att = estimateAttitude(safePointsRef.current, currentTimeMsRef.current);
            const hpr = new Cesium.HeadingPitchRoll(
              (att?.headingRad ?? 0) + MODEL_HEADING_OFFSET_RAD,
              att?.pitchRad ?? 0,
              att?.rollRad ?? 0
            );
            return Cesium.Transforms.headingPitchRollQuaternion(
              pos,
              hpr,
              Cesium.Ellipsoid.WGS84,
              Cesium.Transforms.eastNorthUpToFixedFrame,
              result as import("cesium").Quaternion
            );
          }, false),
          model: {
            uri: MODEL_URI,
            scale: MODEL_SCALE,
            minimumPixelSize: MODEL_MIN_PIXELS,
            maximumScale: 20000,
          },
        });

        viewerRef.current = viewer;
        if (canvasRef) canvasRef.current = viewer.scene.canvas;
        setViewerReady(true);

        if (safePointsRef.current.length > 0) {
          const positions = safePointsRef.current.map((p) =>
            Cesium.Cartesian3.fromDegrees(p.lon, p.lat, getAdjustedAltitude(p.ele))
          );
          boundingSphereRef.current = Cesium.BoundingSphere.fromPoints(positions);
        }

        setTimeout(() => {
          if (!containerRef.current || !viewerRef.current) return;

          const elements = [".cesium-viewer", ".cesium-widget", ".cesium-viewer-cesiumWidgetContainer", "canvas"];

          elements.forEach((selector) => {
            const element = containerRef.current!.querySelector(selector) as HTMLElement | null;
            if (!element) return;
            element.style.width = "100%";
            element.style.height = "100%";
            if (selector === ".cesium-viewer") {
              element.style.position = "absolute";
              element.style.top = "0";
              element.style.left = "0";
            }
            if (selector === "canvas") {
              element.style.display = "block";
            }
          });

          viewerRef.current.resize();
        }, 0);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "";
        if (message) {
          console.error("Cesium initialization failed", err);
        }
        setViewerReady(false);
        setLoadError("Could not initialize 3D engine.");
      });

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch {
          // no-op
        }
        viewerRef.current = null;
      }
      replayLineRef.current = null;
      wallEntityRef.current = null;
      currentMarkerRef.current = null;
      googleTilesetRef.current = null;
      if (canvasRef) canvasRef.current = null;
      setViewerReady(false);
      setLoadError("");
    };
    // canvasRef is a stable ref container from the parent; listed to satisfy
    // exhaustive-deps without re-initializing the viewer.
  }, [canvasRef]);

  const initialCameraAppliedRef = useRef(false);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !viewerReady) return;

    if (initialCamera && !initialCameraAppliedRef.current) {
      try {
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(
            initialCamera.lon,
            initialCamera.lat,
            initialCamera.alt
          ),
          orientation: {
            heading: Cesium.Math.toRadians(initialCamera.hdg),
            pitch: Cesium.Math.toRadians(initialCamera.pit),
            roll: 0,
          },
        });
        initialCameraAppliedRef.current = true;
        fittedRef.current = true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message) console.error("setView failed", err);
      }
    }

    if (!cameraStateRef) return;
    const onMoveEnd = () => {
      try {
        const cam = viewer.scene.camera;
        const carto = Cesium.Cartographic.fromCartesian(cam.positionWC);
        cameraStateRef.current = {
          lon: Cesium.Math.toDegrees(carto.longitude),
          lat: Cesium.Math.toDegrees(carto.latitude),
          alt: carto.height,
          hdg: Cesium.Math.toDegrees(cam.heading),
          pit: Cesium.Math.toDegrees(cam.pitch),
        };
      } catch {
        // no-op
      }
    };
    viewer.camera.moveEnd.addEventListener(onMoveEnd);
    onMoveEnd();
    return () => {
      viewer.camera.moveEnd.removeEventListener(onMoveEnd);
    };
  }, [viewerReady, initialCamera, cameraStateRef]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !viewerReady) return;

    let cancelled = false;

    void (async () => {
      if (googleTilesetRef.current) {
        try {
          viewer.scene.primitives.remove(googleTilesetRef.current);
        } catch {
          // no-op
        }
        googleTilesetRef.current = null;
      }
      viewer.imageryLayers.removeAll();

      if (mapStyle === "photorealistic") {
        if (!GOOGLE_MAPS_API_KEY) {
          setLoadError("Google Maps API key not configured.");
          return;
        }
        viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
        altitudeOffsetRef.current = 0;
        renderedPathRef.current = [];
        displayPathRef.current = [];
        lastRenderedIndexRef.current = -1;

        try {
          const tileset = await Cesium.createGooglePhotorealistic3DTileset({
            key: GOOGLE_MAPS_API_KEY,
          });
          if (cancelled) {
            try {
              tileset.destroy();
            } catch {
              // no-op
            }
            return;
          }
          viewer.scene.primitives.add(tileset);
          googleTilesetRef.current = tileset;
          (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = "";
          setLoadError("");
          setProviderEpoch((n) => n + 1);
        } catch (err) {
          const message = err instanceof Error ? err.message : "";
          if (message) console.error("Google 3D Tiles failed", err);
          setLoadError("Could not load photorealistic 3D tiles.");
        }
        return;
      }

      let imageryLoaded = false;
      try {
        const arcGisTiles = new Cesium.UrlTemplateImageryProvider({
          url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          credit: "Esri World Imagery",
          // Cap at the level Esri reliably has worldwide. Beyond it Cesium
          // upsamples the parent tile (blurry but present) instead of requesting
          // a non-existent deeper tile, which renders as "data not yet available".
          maximumLevel: 18,
        });
        viewer.imageryLayers.addImageryProvider(arcGisTiles);
        imageryLoaded = true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message) console.error("ArcGIS imagery failed", err);
      }

      if (!imageryLoaded) {
        try {
          const osm = new Cesium.OpenStreetMapImageryProvider({
            url: "https://tile.openstreetmap.org/",
          });
          viewer.imageryLayers.addImageryProvider(osm);
          imageryLoaded = true;
          setLoadError("Satellite provider unavailable. Using OSM fallback.");
        } catch (err) {
          const message = err instanceof Error ? err.message : "";
          if (message) console.error("OSM imagery failed", err);
          setLoadError("Could not load imagery providers.");
        }
      }

      if (CESIUM_ION_TOKEN) {
        try {
          const terrain = await Cesium.createWorldTerrainAsync({
            requestVertexNormals: true,
            requestWaterMask: true,
          });
          if (cancelled) return;
          // DEM noise makes runways look wavy; flatten a disc around each
          // visited aerodrome so the field renders as flat as it really is.
          const flattened = await createAerodromeFlatteningProvider(Cesium, terrain, flattenCenters ?? []);
          if (cancelled) return;
          viewer.terrainProvider = flattened;
        } catch (err) {
          const message = err instanceof Error ? err.message : "";
          if (message) console.error("Cesium terrain failed", err);
          viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
        }
      } else {
        viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
      }

      if (cancelled) return;
      altitudeOffsetRef.current = 0;
      renderedPathRef.current = [];
      displayPathRef.current = [];
      lastRenderedIndexRef.current = -1;
      if (imageryLoaded) setLoadError("");
      setProviderEpoch((n) => n + 1);
    })();

    return () => {
      cancelled = true;
    };
  }, [mapStyle, viewerReady, flattenCenters]);

  // Positions the aircraft + trace at an absolute track time. Stable (reads only
  // refs) so the per-frame ticker and the capture controller can both call it.
  // The base path is built incrementally; a transient head vertex at the
  // interpolated position keeps the line reaching the model.
  const positionAircraftAtTime = useCallback(
    (timeMs: number) => {
      const Cesium = cesiumRef.current;
      const pts = safePointsRef.current;
      if (!Cesium || pts.length < 2) return;
      currentTimeMsRef.current = timeMs;

      const index = findIndexAtTime(pts, timeMs);
      const targetBaseIndex = Math.max(0, Math.min(index, pts.length - 1));
      const interpolated = getInterpolatedPoint(pts, targetBaseIndex, timeMs);
      if (!interpolated) return;

      const lastRendered = lastRenderedIndexRef.current;
      const addBasePoint = (i: number) => {
        const ground = groundHeightAt(pts[i].lon, pts[i].lat, i);
        const alt = ground !== undefined ? Math.max(pts[i].ele || 0, ground + GROUND_CLEARANCE_M) : pts[i].ele || 0;
        renderedPathRef.current.push(Cesium.Cartesian3.fromDegrees(pts[i].lon, pts[i].lat, alt));
        baseFloorsRef.current.push(ground !== undefined ? ground : alt);
      };
      if (lastRendered === -1 || targetBaseIndex < lastRendered) {
        renderedPathRef.current = [];
        baseFloorsRef.current = [];
        for (let i = 0; i <= targetBaseIndex; i += 1) addBasePoint(i);
      } else if (targetBaseIndex > lastRendered) {
        for (let i = lastRendered + 1; i <= targetBaseIndex; i += 1) addBasePoint(i);
      }
      lastRenderedIndexRef.current = targetBaseIndex;

      // Head/marker altitude: true GPS altitude, clamped above the ground. The
      // ground is interpolated from the most-detailed pre-sampled terrain between
      // the bracketing points (falling back to the live globe height).
      const from = pts[targetBaseIndex];
      const to = pts[targetBaseIndex + 1];
      const t =
        to && to.timeMs > from.timeMs
          ? Math.max(0, Math.min(1, (timeMs - from.timeMs) / (to.timeMs - from.timeMs)))
          : 0;
      const gFrom = groundHeightAt(from.lon, from.lat, targetBaseIndex);
      const gTo = to ? groundHeightAt(to.lon, to.lat, targetBaseIndex + 1) : gFrom;
      const headGround =
        gFrom !== undefined ? (gTo !== undefined ? gFrom + (gTo - gFrom) * t : gFrom) : undefined;
      const headBase = interpolated.ele || 0;
      const headAlt =
        headGround !== undefined ? Math.max(headBase, headGround + GROUND_CLEARANCE_M) : headBase;

      displayPathRef.current = [
        ...renderedPathRef.current,
        Cesium.Cartesian3.fromDegrees(interpolated.lon, interpolated.lat, headAlt),
      ];
      wallFloorsRef.current = [
        ...baseFloorsRef.current,
        headGround !== undefined ? headGround : headAlt,
      ];
      markerPositionRef.current = Cesium.Cartesian3.fromDegrees(
        interpolated.lon,
        interpolated.lat,
        Math.max(headAlt, 10)
      );
    },
    [groundHeightAt]
  );

  // Smooth motion: drive the aircraft/trace from Cesium's own render loop so it
  // updates every rendered frame (not only on React commits). While playing, the
  // track time is extrapolated from the last React anchor with the wall clock —
  // so dropped React frames don't stutter the animation.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !viewerReady) return;

    const tick = () => {
      if (captureModeRef.current) return; // capture positions the aircraft itself
      const pts = safePointsRef.current;
      if (pts.length < 2) return;
      let t: number;
      if (isPlayingRef.current) {
        const anchor = playAnchorRef.current;
        t = anchor.timeMs + (performance.now() - anchor.wall) * speedRef.current;
        const first = pts[0].timeMs;
        const last = pts[pts.length - 1].timeMs;
        t = Math.max(first, Math.min(t, last));
      } else {
        t = currentTimeMsRef.current;
      }
      positionAircraftAtTime(t);
    };

    viewer.scene.preRender.addEventListener(tick);
    return () => {
      viewer.scene.preRender.removeEventListener(tick);
    };
  }, [viewerReady, positionAircraftAtTime]);

  // Initial fit: frame the whole track once after load (free mode only).
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !viewerReady || safePoints.length < 2) return;
    if (fittedRef.current || viewModeRef.current !== "free") return;

    const allPositions = safePoints.map((p) =>
      Cesium.Cartesian3.fromDegrees(p.lon, p.lat, getAdjustedAltitude(p.ele))
    );
    const sphere = Cesium.BoundingSphere.fromPoints(allPositions);
    viewer.camera.flyToBoundingSphere(sphere, {
      duration: 1.25,
      offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), Math.max(sphere.radius * 1.5, 2000)),
    });
    fittedRef.current = true;
  }, [safePoints, viewerReady]);

  useEffect(() => {
    if (!viewerReady) return;
    if (replayLineRef.current) replayLineRef.current.show = showTrack;
  }, [showTrack, viewerReady]);

  useEffect(() => {
    if (!viewerReady) return;
    if (wallEntityRef.current) wallEntityRef.current.show = showWall;
    viewerRef.current?.scene.requestRender();
  }, [showWall, viewerReady]);

  // Imperative controller for deterministic ("Sharp") capture: positions the
  // aircraft + camera directly per time (no flyTo/damping) and waits for tiles.
  useEffect(() => {
    if (!viewerReady || !captureControlRef) return;

    // Deterministic capture reuses the same terrain-clamped positioning as live
    // playback so the recorded frames match exactly.
    const positionAt = (timeMs: number) => positionAircraftAtTime(timeMs);

    const cameraAt = (timeMs: number) => {
      const Cesium = cesiumRef.current;
      const viewer = viewerRef.current;
      if (!Cesium || !viewer || viewModeRef.current === "free") return;
      const aircraft = markerPositionRef.current;
      const pts = safePointsRef.current;
      if (!aircraft || pts.length < 2) return;

      const motionHeading =
        computeMotionHeadingAdaptive(pts, timeMs, 150, 30000) ??
        lastValidHeadingRef.current ??
        viewer.camera.heading;
      lastValidHeadingRef.current = motionHeading;

      const mode: CamMode =
        viewModeRef.current === "cockpit"
          ? "cockpit"
          : viewModeRef.current === "chase"
            ? "chase"
            : findActiveCamMode(camEventsRef.current, timeMs);
      // Cockpit looks along the nose (recorded heading) like live playback.
      const cameraHeading =
        mode === "cockpit" ? (recordedHeadingRad(pts, timeMs) ?? motionHeading) : motionHeading;
      const pose = computeCameraPose(
        Cesium,
        mode,
        aircraft,
        cameraHeading,
        boundingSphereRef.current,
        cockpitHeadingOffsetRef.current,
        cockpitPitchOffsetRef.current,
        chaseDistanceRef.current,
        mode === "cockpit" ? recordedRollRad(pts, timeMs) : 0
      );
      viewer.camera.setView({
        destination: pose.destination,
        orientation: { heading: pose.heading, pitch: pose.pitch, roll: pose.roll },
      });
    };

    // Resolves once imagery/terrain finish streaming (or after a safety cap),
    // then one extra frame so the fully-loaded render has painted.
    const waitForTiles = () =>
      new Promise<void>((resolve) => {
        const viewer = viewerRef.current;
        if (!viewer) {
          resolve();
          return;
        }
        let frames = 0;
        const check = () => {
          frames += 1;
          if (viewer.scene.globe.tilesLoaded || frames > 120) {
            viewer.scene.requestRender();
            requestAnimationFrame(() => resolve());
            return;
          }
          viewer.scene.requestRender();
          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      });

    captureControlRef.current = {
      begin: () => {
        captureModeRef.current = true;
        lastValidHeadingRef.current = null;
        lastRenderedIndexRef.current = -1;
        renderedPathRef.current = [];
        displayPathRef.current = [];
        if (currentMarkerRef.current) {
          currentMarkerRef.current.show = viewModeRef.current !== "cockpit";
        }
      },
      frameAtTime: async (timeMs: number) => {
        positionAt(timeMs);
        cameraAt(timeMs);
        await waitForTiles();
      },
      end: () => {
        captureModeRef.current = false;
      },
    };

    return () => {
      captureControlRef.current = null;
      captureModeRef.current = false;
    };
  }, [viewerReady, captureControlRef, positionAircraftAtTime]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !viewerReady || viewMode === "free") return;

    fittedRef.current = true;
    camCurrentModeRef.current = null;
    camIsFlyingRef.current = false;
    lastValidHeadingRef.current = null;

    const isCockpit = viewMode === "cockpit";

    if (currentMarkerRef.current) {
      currentMarkerRef.current.show = !isCockpit;
    }

    const onPreRender = () => {
      // During deterministic capture the recorder positions the camera itself.
      if (captureModeRef.current) return;
      const currentViewMode = viewModeRef.current;
      if (currentViewMode === "free") return;
      if (camIsFlyingRef.current) return;

      const aircraft = markerPositionRef.current;
      const pointsNow = safePointsRef.current;
      const currentMs = currentTimeMsRef.current;
      if (!aircraft || pointsNow.length < 2) return;

      const adaptiveHeading = computeMotionHeadingAdaptive(pointsNow, currentMs, 150, 30000);
      if (adaptiveHeading !== null) {
        lastValidHeadingRef.current = adaptiveHeading;
      }
      const motionHeading = lastValidHeadingRef.current ?? viewer.camera.heading;

      const mode: CamMode =
        currentViewMode === "cockpit"
          ? "cockpit"
          : currentViewMode === "chase"
            ? "chase"
            : findActiveCamMode(camEventsRef.current, currentMs);

      // The cockpit looks where the nose points (recorded heading, so crosswind
      // crab is visible); external cameras follow the flight path instead.
      const cameraHeading =
        mode === "cockpit" ? (recordedHeadingRad(pointsNow, currentMs) ?? motionHeading) : motionHeading;

      const sphere = boundingSphereRef.current;
      const pose = computeCameraPose(
        Cesium,
        mode,
        aircraft,
        cameraHeading,
        sphere,
        cockpitHeadingOffsetRef.current,
        cockpitPitchOffsetRef.current,
        chaseDistanceRef.current,
        mode === "cockpit" ? recordedRollRad(pointsNow, currentMs) : 0
      );

      if (mode !== camCurrentModeRef.current) {
        camCurrentModeRef.current = mode;
        camIsFlyingRef.current = true;
        viewer.camera.flyTo({
          destination: pose.destination,
          orientation: { heading: pose.heading, pitch: pose.pitch, roll: pose.roll },
          duration: mode === "cockpit" ? 1.2 : 2.5,
          complete: () => {
            camIsFlyingRef.current = false;
          },
          cancel: () => {
            camIsFlyingRef.current = false;
          },
        });
        return;
      }

      const posDamping = mode === "cockpit" ? 0.35 : 0.05;
      const headingDamping = mode === "cockpit" ? 0.2 : 0.03;
      const pitchDamping = mode === "cockpit" ? 0.2 : 0.05;
      const currentPos = viewer.camera.positionWC;
      const newPos = Cesium.Cartesian3.lerp(currentPos, pose.destination, posDamping, new Cesium.Cartesian3());
      const newHeading = lerpAngle(viewer.camera.heading, pose.heading, headingDamping);
      const newPitch = viewer.camera.pitch + (pose.pitch - viewer.camera.pitch) * pitchDamping;
      const newRoll = lerpAngle(viewer.camera.roll, pose.roll, pitchDamping);
      viewer.camera.setView({
        destination: newPos,
        orientation: { heading: newHeading, pitch: newPitch, roll: newRoll },
      });
    };

    const onUserInteract = () => {
      onInterruptRef.current?.();
    };

    viewer.scene.preRender.addEventListener(onPreRender);
    const canvas = viewer.scene.canvas;
    canvas.addEventListener("pointerdown", onUserInteract);
    canvas.addEventListener("wheel", onUserInteract);
    canvas.addEventListener("touchstart", onUserInteract);

    return () => {
      viewer.scene.preRender.removeEventListener(onPreRender);
      canvas.removeEventListener("pointerdown", onUserInteract);
      canvas.removeEventListener("wheel", onUserInteract);
      canvas.removeEventListener("touchstart", onUserInteract);
      camCurrentModeRef.current = null;
      camIsFlyingRef.current = false;
      if (currentMarkerRef.current) {
        currentMarkerRef.current.show = true;
      }
    };
  }, [viewMode, viewerReady]);

  return (
    <div className="relative h-full">
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden"
        style={{
          position: "relative",
          userSelect: "none",
          WebkitUserSelect: "none",
          touchAction: "none",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "auto",
        }}
      />

      {/* In cockpit the camera is locked to the aircraft, so recentering only
          makes sense to re-zero head-tracking offsets; hide it otherwise. */}
      {viewerReady && (viewMode !== "cockpit" || headTrackingEnabled) && (
        <button
          type="button"
          className="absolute top-3 left-3 z-[500] rounded-md bg-slate-900/80 text-xs text-white border border-slate-600 px-3 py-2 cursor-pointer hover:bg-slate-800"
          onClick={() => {
            if (viewMode === "cockpit") {
              cockpitHeadingOffsetRef.current = 0;
              cockpitPitchOffsetRef.current = 0;
              cockpitBaselineAlphaRef.current = null;
              cockpitBaselineBetaRef.current = null;
              return;
            }
            const viewer = viewerRef.current;
            const Cesium = cesiumRef.current;
            if (!viewer || !Cesium || safePoints.length < 2) return;
            const allPositions = safePoints.map((p) =>
              Cesium.Cartesian3.fromDegrees(p.lon, p.lat, getAdjustedAltitude(p.ele))
            );
            const sphere = Cesium.BoundingSphere.fromPoints(allPositions);
            viewer.camera.flyToBoundingSphere(sphere, {
              duration: 1,
              offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), Math.max(sphere.radius * 1.5, 2000)),
            });
          }}
        >
          {viewMode === "cockpit" ? "Recenter view" : "Recenter"}
        </button>
      )}

      {viewMode !== "free" && viewerReady && showCameraBanner && (
        <div className="absolute bottom-3 left-3 z-[500] rounded-md bg-cyan-900/60 border border-cyan-500/50 px-3 py-1.5 text-xs text-cyan-100 flex items-center gap-2 transition-opacity duration-500">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          {viewMode === "cinematic"
            ? "Cinematic camera"
            : viewMode === "chase"
              ? "Chase camera"
              : "Cockpit view"}{" "}
          — drag to take over
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 z-[600] rounded-xl bg-slate-950/70 flex items-center justify-center p-6 text-center">
          <div className="text-sm text-red-200 border border-red-400/40 bg-slate-900/80 rounded-md px-4 py-3">
            {loadError}
          </div>
        </div>
      )}
    </div>
  );
}
