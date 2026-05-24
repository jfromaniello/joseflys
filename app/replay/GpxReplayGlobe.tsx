"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface ReplayPoint {
  lat: number;
  lon: number;
  ele: number;
  timeMs: number;
}

interface GpxReplayGlobeProps {
  points: ReplayPoint[];
  currentIndex: number;
  currentTimeMs: number;
  autoCamera: boolean;
  onAutoCameraInterrupt?: () => void;
}

type CamMode = "chase" | "side-left" | "side-right" | "panorama-start" | "panorama-end";

interface CamEvent {
  startMs: number;
  endMs: number;
  mode: CamMode;
}

const CESIUM_ION_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

function bearingRad(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  return Math.atan2(y, x);
}

function signedDegDelta(aDeg: number, bDeg: number): number {
  return ((bDeg - aDeg + 540) % 360) - 180;
}

function lerpAngle(from: number, to: number, t: number): number {
  const TWO_PI = Math.PI * 2;
  const diff = ((to - from + Math.PI * 3) % TWO_PI) - Math.PI;
  return from + diff * t;
}

function findIndexAtTime(points: ReplayPoint[], targetMs: number): number {
  if (points.length === 0) return 0;
  let low = 0;
  let high = points.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const v = points[mid].timeMs;
    if (v === targetMs) return mid;
    if (v < targetMs) low = mid + 1;
    else high = mid - 1;
  }
  return Math.max(0, Math.min(high, points.length - 1));
}

function getInterpolatedPoint(points: ReplayPoint[], clampedIndex: number, currentTimeMs: number): ReplayPoint | null {
  if (points.length === 0) return null;
  const from = points[clampedIndex];
  if (!from) return null;
  if (clampedIndex >= points.length - 1) return from;
  const to = points[clampedIndex + 1];
  if (!to) return from;
  const segmentDuration = to.timeMs - from.timeMs;
  if (segmentDuration <= 0) return from;
  const tRaw = (currentTimeMs - from.timeMs) / segmentDuration;
  const t = Math.max(0, Math.min(1, tRaw));
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lon: from.lon + (to.lon - from.lon) * t,
    ele: from.ele + (to.ele - from.ele) * t,
    timeMs: currentTimeMs,
  };
}

function interpolateAtTime(points: ReplayPoint[], targetMs: number): ReplayPoint | null {
  if (points.length === 0) return null;
  const idx = findIndexAtTime(points, targetMs);
  return getInterpolatedPoint(points, idx, targetMs);
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dPhi = toRad(lat2 - lat1);
  const dLam = toRad(lon2 - lon1);
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function computeMotionHeadingRad(points: ReplayPoint[], currentTimeMs: number, windowMs: number): number | null {
  if (points.length < 2) return null;
  const half = windowMs / 2;
  const start = interpolateAtTime(points, currentTimeMs - half);
  const end = interpolateAtTime(points, currentTimeMs + half);
  if (!start || !end) return null;
  if (Math.abs(end.lat - start.lat) < 1e-7 && Math.abs(end.lon - start.lon) < 1e-7) return null;
  return bearingRad(start.lat, start.lon, end.lat, end.lon);
}

// Adaptive heading: widens the time window until at least minDistMeters of motion is captured,
// up to maxWindowMs. Stabilizes heading at low speed (taxi).
function computeMotionHeadingAdaptive(
  points: ReplayPoint[],
  currentTimeMs: number,
  minDistMeters: number,
  maxWindowMs: number
): number | null {
  if (points.length < 2) return null;
  const samples = [3000, 5000, 8000, 12000, 18000, 26000, 36000];
  for (const halfWindow of samples) {
    if (halfWindow * 2 > maxWindowMs) break;
    const before = interpolateAtTime(points, currentTimeMs - halfWindow);
    const after = interpolateAtTime(points, currentTimeMs + halfWindow);
    if (!before || !after) continue;
    const d = haversineMeters(before.lat, before.lon, after.lat, after.lon);
    if (d >= minDistMeters) {
      return bearingRad(before.lat, before.lon, after.lat, after.lon);
    }
  }
  return null;
}

function speedMpsAt(points: ReplayPoint[], currentTimeMs: number, windowMs: number): number {
  if (points.length < 2) return 0;
  const half = windowMs / 2;
  const before = interpolateAtTime(points, currentTimeMs - half);
  const after = interpolateAtTime(points, currentTimeMs + half);
  if (!before || !after) return 0;
  const d = haversineMeters(before.lat, before.lon, after.lat, after.lon);
  const dt = (after.timeMs - before.timeMs) / 1000;
  if (dt <= 0) return 0;
  return d / dt;
}

function computeCamEvents(points: ReplayPoint[]): CamEvent[] {
  if (points.length < 10) return [];
  const events: CamEvent[] = [];
  const firstMs = points[0].timeMs;
  const lastMs = points[points.length - 1].timeMs;
  const duration = lastMs - firstMs;
  if (duration < 15000) return [];

  events.push({ startMs: firstMs, endMs: firstMs + 4500, mode: "panorama-start" });

  const headingWindowMs = 18000;
  const stepMs = Math.max(8000, Math.min(20000, duration / 25));
  const minSpeedForEventMps = 25;
  const minIntervalMs = 40000;
  let lastEventEndMs = firstMs + 12000;
  let prevHeadingDeg: number | null = null;

  for (let t = firstMs + headingWindowMs; t < lastMs - 12000; t += stepMs) {
    const h = computeMotionHeadingAdaptive(points, t, 200, headingWindowMs);
    if (h === null) {
      prevHeadingDeg = null;
      continue;
    }
    const hDeg = (h * 180) / Math.PI;

    if (prevHeadingDeg !== null && t > lastEventEndMs + minIntervalMs) {
      const delta = signedDegDelta(prevHeadingDeg, hDeg);
      if (Math.abs(delta) > 32) {
        const speed = speedMpsAt(points, t, 8000);
        if (speed >= minSpeedForEventMps) {
          const mode: CamMode = delta > 0 ? "side-right" : "side-left";
          events.push({ startMs: t, endMs: t + 7000, mode });
          lastEventEndMs = t + 7000;
        }
      }
    }
    prevHeadingDeg = hDeg;
  }

  events.push({ startMs: lastMs - 4500, endMs: lastMs, mode: "panorama-end" });
  return events.sort((a, b) => a.startMs - b.startMs);
}

function findActiveCamMode(events: CamEvent[], currentMs: number): CamMode {
  for (const e of events) {
    if (currentMs >= e.startMs && currentMs <= e.endMs) return e.mode;
  }
  return "chase";
}

interface CamPose {
  destination: import("cesium").Cartesian3;
  heading: number;
  pitch: number;
}

function computePoseFromAircraft(
  Cesium: typeof import("cesium"),
  target: import("cesium").Cartesian3,
  cameraHeadingRad: number,
  horizontalRange: number,
  heightOffset: number,
  pitchRad: number
): CamPose {
  const enu = Cesium.Transforms.eastNorthUpToFixedFrame(target);
  const eastOff = -Math.sin(cameraHeadingRad) * horizontalRange;
  const northOff = -Math.cos(cameraHeadingRad) * horizontalRange;
  const offsetENU = new Cesium.Cartesian3(eastOff, northOff, heightOffset);
  const offsetECEF = Cesium.Matrix4.multiplyByPointAsVector(enu, offsetENU, new Cesium.Cartesian3());
  const camPos = Cesium.Cartesian3.add(target, offsetECEF, new Cesium.Cartesian3());
  return { destination: camPos, heading: cameraHeadingRad, pitch: pitchRad };
}

function computeCameraPose(
  Cesium: typeof import("cesium"),
  mode: CamMode,
  aircraftPos: import("cesium").Cartesian3,
  motionHeadingRad: number,
  sphere: import("cesium").BoundingSphere | null
): CamPose {
  switch (mode) {
    case "chase":
      return computePoseFromAircraft(Cesium, aircraftPos, motionHeadingRad, 2500, 900, toRad(-18));
    case "side-left":
      return computePoseFromAircraft(Cesium, aircraftPos, motionHeadingRad - Math.PI / 2, 2400, 600, toRad(-12));
    case "side-right":
      return computePoseFromAircraft(Cesium, aircraftPos, motionHeadingRad + Math.PI / 2, 2400, 600, toRad(-12));
    case "panorama-start":
    case "panorama-end": {
      const range = sphere ? Math.max(sphere.radius * 1.6, 4500) : 6000;
      const height = sphere ? Math.max(sphere.radius * 1.1, 2800) : 3500;
      return computePoseFromAircraft(Cesium, aircraftPos, motionHeadingRad, range, height, toRad(-38));
    }
    default:
      return computePoseFromAircraft(Cesium, aircraftPos, motionHeadingRad, 2500, 900, toRad(-18));
  }
}

export function GpxReplayGlobe({
  points,
  currentIndex,
  currentTimeMs,
  autoCamera,
  onAutoCameraInterrupt,
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
  const autoCameraRef = useRef<boolean>(autoCamera);
  const onInterruptRef = useRef<(() => void) | undefined>(onAutoCameraInterrupt);
  const altitudeOffsetRef = useRef<number>(0);
  const lastValidHeadingRef = useRef<number | null>(null);

  const [viewerReady, setViewerReady] = useState(false);
  const [loadError, setLoadError] = useState("");

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
    autoCameraRef.current = autoCamera;
  }, [autoCamera]);

  useEffect(() => {
    onInterruptRef.current = onAutoCameraInterrupt;
  }, [onAutoCameraInterrupt]);

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
  }, [safePoints, viewerReady]);

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
        });

        viewer.imageryLayers.removeAll();
        let imageryLoaded = false;

        if (!imageryLoaded) {
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
            if (message) {
              console.error("ArcGIS imagery failed", err);
            }
            imageryLoaded = false;
          }
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
            if (message) {
              console.error("OSM imagery failed", err);
            }
            setLoadError("Could not load imagery providers (ion, ArcGIS, OSM).");
          }
        }

        if (CESIUM_ION_TOKEN) {
          try {
            Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;
            viewer.terrainProvider = await Cesium.createWorldTerrainAsync({
              requestVertexNormals: true,
              requestWaterMask: true,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : "";
            if (message) {
              console.error("Cesium terrain failed", err);
            }
          }
        }

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
      setViewerReady(false);
      setLoadError("");
    };
  }, []);

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

    if (!fittedRef.current && !autoCameraRef.current) {
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
    if (!viewer || !Cesium || !viewerReady || !autoCamera) return;

    fittedRef.current = true;
    camCurrentModeRef.current = null;
    camIsFlyingRef.current = false;
    lastValidHeadingRef.current = null;

    const onPreRender = () => {
      if (!autoCameraRef.current) return;
      if (camIsFlyingRef.current) return;

      const aircraft = markerPositionRef.current;
      const pointsNow = safePointsRef.current;
      const currentMs = currentTimeMsRef.current;
      if (!aircraft || pointsNow.length < 2) return;

      const adaptiveHeading = computeMotionHeadingAdaptive(pointsNow, currentMs, 150, 30000);
      if (adaptiveHeading !== null) {
        lastValidHeadingRef.current = adaptiveHeading;
      }
      const motionHeading =
        lastValidHeadingRef.current ?? viewer.camera.heading;

      const mode = findActiveCamMode(camEventsRef.current, currentMs);
      const sphere = boundingSphereRef.current;
      const pose = computeCameraPose(Cesium, mode, aircraft, motionHeading, sphere);

      if (mode !== camCurrentModeRef.current) {
        camCurrentModeRef.current = mode;
        camIsFlyingRef.current = true;
        viewer.camera.flyTo({
          destination: pose.destination,
          orientation: { heading: pose.heading, pitch: pose.pitch, roll: 0 },
          duration: 2.5,
          complete: () => {
            camIsFlyingRef.current = false;
          },
          cancel: () => {
            camIsFlyingRef.current = false;
          },
        });
        return;
      }

      const posDamping = 0.05;
      const headingDamping = 0.03;
      const pitchDamping = 0.05;
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
    };
  }, [autoCamera, viewerReady]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-full h-[580px] rounded-xl overflow-hidden border-2 border-gray-700"
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
        <div className="absolute top-3 right-3 z-[500] rounded-md bg-slate-900/80 text-xs text-slate-100 border border-slate-600 px-3 py-2">
          <div>Right click + drag: tilt / horizon</div>
          <div>Shift + drag: free look</div>
          <div>Wheel: zoom</div>
        </div>
      )}

      {viewerReady && (
        <button
          type="button"
          className="absolute top-3 left-3 z-[500] rounded-md bg-slate-900/80 text-xs text-white border border-slate-600 px-3 py-2 cursor-pointer hover:bg-slate-800"
          onClick={() => {
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
          Recenter
        </button>
      )}

      {autoCamera && viewerReady && (
        <div className="absolute bottom-3 left-3 z-[500] rounded-md bg-cyan-900/60 border border-cyan-500/50 px-3 py-1.5 text-xs text-cyan-100 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          Auto camera on — drag to take over
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
