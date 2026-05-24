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
}

const CESIUM_ION_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;

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

export function GpxReplayGlobe({ points, currentIndex, currentTimeMs }: GpxReplayGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<import("cesium").Viewer | null>(null);
  const cesiumRef = useRef<typeof import("cesium") | null>(null);
  const replayLineRef = useRef<import("cesium").Entity | null>(null);
  const currentMarkerRef = useRef<import("cesium").Entity | null>(null);
  const renderedPathRef = useRef<import("cesium").Cartesian3[]>([]);
  const markerPositionRef = useRef<import("cesium").Cartesian3 | null>(null);
  const lastRenderedIndexRef = useRef<number>(-1);
  const fittedRef = useRef(false);
  const [viewerReady, setViewerReady] = useState(false);
  const [loadError, setLoadError] = useState("");

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
    fittedRef.current = false;
    renderedPathRef.current = [];
    markerPositionRef.current = null;
    lastRenderedIndexRef.current = -1;
  }, [safePoints]);

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
            // Terrain is optional. Keep the globe running even if it fails.
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
        next.push(Cesium.Cartesian3.fromDegrees(p.lon, p.lat, Math.max(0, p.ele || 0)));
      }
      renderedPathRef.current = next;
      lastRenderedIndexRef.current = targetBaseIndex;
    } else if (targetBaseIndex > lastRendered) {
      for (let i = lastRendered + 1; i <= targetBaseIndex; i += 1) {
        const p = safePoints[i];
        renderedPathRef.current.push(Cesium.Cartesian3.fromDegrees(p.lon, p.lat, Math.max(0, p.ele || 0)));
      }
      lastRenderedIndexRef.current = targetBaseIndex;
    }

    markerPositionRef.current = Cesium.Cartesian3.fromDegrees(
      interpolated.lon,
      interpolated.lat,
      Math.max(10, interpolated.ele || 0)
    );

    if (!fittedRef.current) {
      const allPositions = safePoints.map((p) =>
        Cesium.Cartesian3.fromDegrees(p.lon, p.lat, Math.max(0, p.ele || 0))
      );
      const sphere = Cesium.BoundingSphere.fromPoints(allPositions);
      viewer.camera.flyToBoundingSphere(sphere, {
        duration: 1.25,
        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), Math.max(sphere.radius * 1.5, 2000)),
      });
      fittedRef.current = true;
    }
  }, [safePoints, clampedIndex, currentTimeMs, viewerReady]);

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
              Cesium.Cartesian3.fromDegrees(p.lon, p.lat, Math.max(0, p.ele || 0))
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
