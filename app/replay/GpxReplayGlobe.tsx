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
  getInterpolatedPoint,
  lerpAngle,
  type CamEvent,
  type CamMode,
} from "./cameraMath";

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied" | "prompt">;
};

interface GpxReplayGlobeProps {
  points: ReplayPoint[];
  currentIndex: number;
  currentTimeMs: number;
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
}

const CESIUM_ION_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function GpxReplayGlobe({
  points,
  currentIndex,
  currentTimeMs,
  viewMode,
  mapStyle = "standard",
  onViewModeInterrupt,
  isFullscreen = false,
  initialCamera = null,
  cameraStateRef,
  onOrientationStatusChange,
  requestOrientationRef,
  canvasRef,
  headTrackingEnabled = false,
}: GpxReplayGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<import("cesium").Viewer | null>(null);
  const cesiumRef = useRef<typeof import("cesium") | null>(null);
  const replayLineRef = useRef<import("cesium").Entity | null>(null);
  const currentMarkerRef = useRef<import("cesium").Entity | null>(null);
  const renderedPathRef = useRef<import("cesium").Cartesian3[]>([]);
  const markerPositionRef = useRef<import("cesium").Cartesian3 | null>(null);
  const lastRenderedIndexRef = useRef<number>(-1);
  const fittedRef = useRef(false);

  const safePointsRef = useRef<ReplayPoint[]>([]);
  const currentTimeMsRef = useRef<number>(0);
  const boundingSphereRef = useRef<import("cesium").BoundingSphere | null>(null);
  const camEventsRef = useRef<CamEvent[]>([]);
  const camCurrentModeRef = useRef<CamMode | null>(null);
  const camIsFlyingRef = useRef<boolean>(false);
  const viewModeRef = useRef<ViewMode>(viewMode);
  const onInterruptRef = useRef<(() => void) | undefined>(onViewModeInterrupt);
  const altitudeOffsetRef = useRef<number>(0);
  const lastValidHeadingRef = useRef<number | null>(null);
  const cockpitHeadingOffsetRef = useRef<number>(0);
  const cockpitPitchOffsetRef = useRef<number>(0);
  const cockpitBaselineAlphaRef = useRef<number | null>(null);
  const cockpitBaselineBetaRef = useRef<number | null>(null);
  const googleTilesetRef = useRef<import("cesium").Cesium3DTileset | null>(null);

  const [viewerReady, setViewerReady] = useState(false);
  const [providerEpoch, setProviderEpoch] = useState(0);
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
    const adjusted = (eleMeters || 0) + altitudeOffsetRef.current;
    return Math.max(0, adjusted);
  };

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

  const clampedIndex = useMemo(() => {
    if (safePoints.length === 0) return 0;
    return Math.max(0, Math.min(currentIndex, safePoints.length - 1));
  }, [currentIndex, safePoints.length]);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

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
    markerPositionRef.current = null;
    lastRenderedIndexRef.current = -1;
    altitudeOffsetRef.current = 0;
  }, [safePoints]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !viewerReady || safePoints.length === 0) return;

    const terrainProvider = viewer.terrainProvider;
    if (!terrainProvider || terrainProvider instanceof Cesium.EllipsoidTerrainProvider) {
      altitudeOffsetRef.current = 0;
      return;
    }

    let cancelled = false;
    const first = safePoints[0];
    const cartographic = Cesium.Cartographic.fromDegrees(first.lon, first.lat);

    Cesium.sampleTerrainMostDetailed(terrainProvider, [cartographic])
      .then((updated) => {
        if (cancelled) return;
        const sampled = updated[0];
        if (!sampled || !Number.isFinite(sampled.height)) return;

        const offset = sampled.height - (first.ele || 0);
        if (Math.abs(offset) > 200) {
          altitudeOffsetRef.current = 0;
          return;
        }

        altitudeOffsetRef.current = offset;
        renderedPathRef.current = [];
        lastRenderedIndexRef.current = -1;

        const positions = safePoints.map((p) =>
          Cesium.Cartesian3.fromDegrees(p.lon, p.lat, getAdjustedAltitude(p.ele))
        );
        boundingSphereRef.current = Cesium.BoundingSphere.fromPoints(positions);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "";
        if (message) console.error("Terrain sampling failed", err);
      });

    return () => {
      cancelled = true;
    };
  }, [safePoints, viewerReady, providerEpoch]);

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

        (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = "none";

        replayLineRef.current = viewer.entities.add({
          name: "Replay Track",
          polyline: {
            positions: new Cesium.CallbackProperty(() => renderedPathRef.current, false),
            width: 4,
            material: Cesium.Color.fromCssColorString("#22d3ee").withAlpha(0.95),
            clampToGround: false,
            arcType: Cesium.ArcType.GEODESIC,
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
          point: {
            pixelSize: 12,
            color: Cesium.Color.fromCssColorString("#f59e0b"),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
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
          maximumLevel: 19,
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
          viewer.terrainProvider = terrain;
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
      lastRenderedIndexRef.current = -1;
      (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = "none";
      if (imageryLoaded) setLoadError("");
      setProviderEpoch((n) => n + 1);
    })();

    return () => {
      cancelled = true;
    };
  }, [mapStyle, viewerReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;

    if (!viewer || !Cesium || !viewerReady) return;

    if (safePoints.length < 2) {
      renderedPathRef.current = [];
      markerPositionRef.current = null;
      lastRenderedIndexRef.current = -1;
      return;
    }

    const interpolated = getInterpolatedPoint(safePoints, clampedIndex, currentTimeMs);
    if (!interpolated) return;

    const targetBaseIndex = Math.max(0, Math.min(clampedIndex, safePoints.length - 1));
    const lastRendered = lastRenderedIndexRef.current;

    if (lastRendered === -1 || targetBaseIndex < lastRendered) {
      const next: import("cesium").Cartesian3[] = [];
      for (let i = 0; i <= targetBaseIndex; i += 1) {
        const p = safePoints[i];
        next.push(Cesium.Cartesian3.fromDegrees(p.lon, p.lat, getAdjustedAltitude(p.ele)));
      }
      renderedPathRef.current = next;
      lastRenderedIndexRef.current = targetBaseIndex;
    } else if (targetBaseIndex > lastRendered) {
      for (let i = lastRendered + 1; i <= targetBaseIndex; i += 1) {
        const p = safePoints[i];
        renderedPathRef.current.push(Cesium.Cartesian3.fromDegrees(p.lon, p.lat, getAdjustedAltitude(p.ele)));
      }
      lastRenderedIndexRef.current = targetBaseIndex;
    }

    const markerAltitude = Math.max(10, (interpolated.ele || 0) + altitudeOffsetRef.current);
    markerPositionRef.current = Cesium.Cartesian3.fromDegrees(
      interpolated.lon,
      interpolated.lat,
      markerAltitude
    );

    if (!fittedRef.current && viewModeRef.current === "free") {
      const allPositions = safePoints.map((p) =>
        Cesium.Cartesian3.fromDegrees(p.lon, p.lat, getAdjustedAltitude(p.ele))
      );
      const sphere = Cesium.BoundingSphere.fromPoints(allPositions);
      viewer.camera.flyToBoundingSphere(sphere, {
        duration: 1.25,
        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), Math.max(sphere.radius * 1.5, 2000)),
      });
      fittedRef.current = true;
    }
  }, [safePoints, clampedIndex, currentTimeMs, viewerReady]);

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
          : findActiveCamMode(camEventsRef.current, currentMs);

      const sphere = boundingSphereRef.current;
      const pose = computeCameraPose(
        Cesium,
        mode,
        aircraft,
        motionHeading,
        sphere,
        cockpitHeadingOffsetRef.current,
        cockpitPitchOffsetRef.current
      );

      if (mode !== camCurrentModeRef.current) {
        camCurrentModeRef.current = mode;
        camIsFlyingRef.current = true;
        viewer.camera.flyTo({
          destination: pose.destination,
          orientation: { heading: pose.heading, pitch: pose.pitch, roll: 0 },
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
      viewer.camera.setView({
        destination: newPos,
        orientation: { heading: newHeading, pitch: newPitch, roll: 0 },
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
    <div className={isFullscreen ? "relative h-full" : "relative"}>
      <div
        ref={containerRef}
        className={`w-full overflow-hidden ${
          isFullscreen ? "h-full" : "h-[580px] rounded-xl border-2 border-gray-700"
        }`}
        style={{
          position: "relative",
          userSelect: "none",
          WebkitUserSelect: "none",
          touchAction: "none",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "auto",
        }}
      />

      {viewerReady && (
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
          {viewMode === "cinematic" ? "Cinematic camera" : "Cockpit view"} — drag to take over
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
