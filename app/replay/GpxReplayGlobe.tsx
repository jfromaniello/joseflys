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

export function GpxReplayGlobe({ points, currentIndex, currentTimeMs }: GpxReplayGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<import("cesium").Viewer | null>(null);
  const cesiumRef = useRef<typeof import("cesium") | null>(null);
  const [viewerReady, setViewerReady] = useState(false);

  const clampedIndex = useMemo(() => {
    if (points.length === 0) return 0;
    return Math.max(0, Math.min(currentIndex, points.length - 1));
  }, [currentIndex, points.length]);

  useEffect(() => {
    if (!containerRef.current) return;

    import("cesium").then((Cesium) => {
      if (!containerRef.current || viewerRef.current) return;

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
      });

      viewerRef.current = viewer;
      (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = "none";

      setTimeout(() => {
        if (!containerRef.current || !viewerRef.current) return;
        const elements = [
          ".cesium-viewer",
          ".cesium-widget",
          ".cesium-viewer-cesiumWidgetContainer",
          "canvas",
        ];

        elements.forEach((selector) => {
          const element = containerRef.current?.querySelector(selector) as HTMLElement | null;
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

        viewerRef.current?.resize();
        setViewerReady(true);
      }, 0);
    });

    return () => {
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch {
        }
        viewerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !viewerReady) return;

    viewer.entities.removeAll();

    if (points.length === 0) return;

    const pathPositions = points.map((p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.ele));

    const replayPositions = pathPositions.slice(0, clampedIndex + 1);

    if (clampedIndex < points.length - 1) {
      const from = points[clampedIndex];
      const to = points[clampedIndex + 1];
      const segmentDuration = to.timeMs - from.timeMs;
      if (segmentDuration > 0) {
        const tRaw = (currentTimeMs - from.timeMs) / segmentDuration;
        const t = Math.max(0, Math.min(1, tRaw));
        const lat = from.lat + (to.lat - from.lat) * t;
        const lon = from.lon + (to.lon - from.lon) * t;
        const ele = from.ele + (to.ele - from.ele) * t;
        replayPositions.push(Cesium.Cartesian3.fromDegrees(lon, lat, ele));
      }
    }
    viewer.entities.add({
      name: "Replay",
      polyline: {
        positions: replayPositions,
        width: 5,
        material: Cesium.Color.fromCssColorString("#22d3ee"),
        arcType: Cesium.ArcType.RHUMB,
      },
    });

    if (clampedIndex === 0 && pathPositions.length > 1) {
      const sphere = Cesium.BoundingSphere.fromPoints(pathPositions);
      viewer.camera.flyToBoundingSphere(sphere, {
        offset: new Cesium.HeadingPitchRange(0, -0.8, 0),
        duration: 0,
      });
    }
  }, [points, clampedIndex, currentTimeMs, viewerReady]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[580px] rounded-xl overflow-hidden border-2 border-gray-700"
      style={{ position: "relative", userSelect: "none", WebkitUserSelect: "none" }}
    />
  );
}
