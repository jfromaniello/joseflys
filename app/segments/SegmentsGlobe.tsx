"use client";

import { useEffect, useRef, useState } from "react";
import type { NavigationSegment } from "@/lib/segmentCalculations";
import { Geodesic } from "geographiclib-geodesic";

interface SegmentsGlobeProps {
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  fromName: string;
  toName: string;
  segments: NavigationSegment[];
  orthodromicDistance: number;
  totalDistance: number;
}

export function SegmentsGlobe({
  fromLat,
  fromLon,
  toLat,
  toLon,
  fromName,
  toName,
  segments,
  orthodromicDistance,
  totalDistance,
}: SegmentsGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<import("cesium").Viewer | null>(null);
  const cesiumRef = useRef<typeof import("cesium") | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);
  const lastRouteRef = useRef<string>("");
  const [viewerReady, setViewerReady] = useState(false);

  // Effect 1: Create viewer once (only when container is ready)
  useEffect(() => {
    if (!containerRef.current) return;

    // Dynamic import of Cesium to avoid SSR issues
    import("cesium").then((Cesium) => {
      // Check again after import completes (prevents double creation in Strict Mode)
      if (!containerRef.current || viewerRef.current) return;

      // Store Cesium module for later use
      cesiumRef.current = Cesium;

      // Configure Cesium asset paths
      (window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = "/cesium";

      // Create the viewer
      const viewer = new Cesium.Viewer(containerRef.current!, {
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

      // Remove default attribution
      (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = "none";

      // Force Cesium to fill container - apply to all nested elements
      setTimeout(() => {
        if (!containerRef.current) return;

        // Set all Cesium container elements to 100% height
        const elements = [
          '.cesium-viewer',
          '.cesium-widget',
          '.cesium-viewer-cesiumWidgetContainer',
          'canvas'
        ];

        elements.forEach(selector => {
          const element = containerRef.current!.querySelector(selector) as HTMLElement;
          if (element) {
            element.style.width = '100%';
            element.style.height = '100%';
            if (selector === '.cesium-viewer') {
              element.style.position = 'absolute';
              element.style.top = '0';
              element.style.left = '0';
            }
            if (selector === 'canvas') {
              element.style.display = 'block';
            }
          }
        });

        // Force resize after applying styles
        viewer.resize();

        // Signal that viewer is ready for entities
        setViewerReady(true);
      }, 0);
    });

    // Cleanup
    return () => {
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch (e) {
          console.error("Error destroying Cesium viewer:", e);
        }
        viewerRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Effect 2: Update route data (when segments or locations change)
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;

    // Wait for viewer to be ready
    if (!viewer || !Cesium || !viewerReady) return;

    // Check if the route changed (origin/destination moved)
    const currentRoute = `${fromLat},${fromLon},${toLat},${toLon}`;
    const routeChanged = lastRouteRef.current !== currentRoute;
    lastRouteRef.current = currentRoute;

    // Clear existing entities
    viewer.entities.removeAll();

    // Generate great circle points for visualization
    const greatCirclePoints = generateGreatCirclePoints(
      fromLat,
      fromLon,
      toLat,
      toLon,
      200,
      Cesium
    );

    // Add great circle path (dashed green line)
    viewer.entities.add({
      name: "Great Circle Route",
      polyline: {
        positions: greatCirclePoints,
        width: 3,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.fromCssColorString("#10b981").withAlpha(0.8),
          dashLength: 16.0,
        }),
        clampToGround: false,
        arcType: Cesium.ArcType.GEODESIC,
      },
      description: `
        <div style="font-family: system-ui; padding: 8px;">
          <strong>Great Circle Route</strong><br/>
          Distance: ${orthodromicDistance.toFixed(1)} NM<br/>
          (Shortest possible path)
        </div>
      `,
    });

    // Add rhumb line segments with color gradient
    segments.forEach((segment, index) => {
      const color = getSegmentColor(index, segments.length, Cesium);

      // Rhumb line segment
      viewer.entities.add({
        name: `Segment ${segment.segmentNumber}`,
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([
            segment.startLon,
            segment.startLat,
            segment.endLon,
            segment.endLat,
          ]),
          width: 4,
          material: color,
          clampToGround: false,
          arcType: Cesium.ArcType.RHUMB,
        },
        description: `
          <div style="font-family: system-ui; padding: 8px;">
            <strong>Segment ${segment.segmentNumber}</strong><br/>
            Heading: ${formatHeading(segment.heading)}<br/>
            Distance: ${segment.distance.toFixed(1)} NM<br/>
            Cumulative: ${segment.cumulativeDistance.toFixed(1)} NM
          </div>
        `,
      });

      // Add waypoint markers (except for the last segment)
      if (index < segments.length - 1) {
        viewer.entities.add({
          name: `Waypoint ${index + 1}`,
          position: Cesium.Cartesian3.fromDegrees(
            segment.endLon,
            segment.endLat,
            1000 // Slightly elevated
          ),
          point: {
            pixelSize: 8,
            color: Cesium.Color.fromCssColorString("#06b6d4"),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
          },
          description: `
            <div style="font-family: system-ui; padding: 8px;">
              <strong>Waypoint ${index + 1}</strong><br/>
              ${segment.endLat.toFixed(4)}°, ${segment.endLon.toFixed(4)}°
            </div>
          `,
        });
      }
    });

    // Add origin marker (green)
    viewer.entities.add({
      name: fromName,
      position: Cesium.Cartesian3.fromDegrees(fromLon, fromLat, 5000),
      point: {
        pixelSize: 12,
        color: Cesium.Color.fromCssColorString("#10b981"),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
      },
      label: {
        text: "Origin",
        font: "14px sans-serif",
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -15),
      },
      description: `
        <div style="font-family: system-ui; padding: 8px;">
          <strong>Origin</strong><br/>
          ${fromName}<br/>
          ${fromLat.toFixed(4)}°, ${fromLon.toFixed(4)}°
        </div>
      `,
    });

    // Add destination marker (red)
    viewer.entities.add({
      name: toName,
      position: Cesium.Cartesian3.fromDegrees(toLon, toLat, 5000),
      point: {
        pixelSize: 12,
        color: Cesium.Color.fromCssColorString("#ef4444"),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
      },
      label: {
        text: "Destination",
        font: "14px sans-serif",
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -15),
      },
      description: `
        <div style="font-family: system-ui; padding: 8px;">
          <strong>Destination</strong><br/>
          ${toName}<br/>
          ${toLat.toFixed(4)}°, ${toLon.toFixed(4)}°
        </div>
      `,
    });

    // Only fly to route on initial load or when route changes (not when segment count changes)
    if (isInitialLoadRef.current || routeChanged) {
      isInitialLoadRef.current = false;

      const centerLat = (fromLat + toLat) / 2;
      const centerLon = (fromLon + toLon) / 2;
      const distanceMeters = orthodromicDistance * 1852;
      const cameraAltitude = Math.max(distanceMeters * 1.2, 5000000);

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          centerLon,
          centerLat,
          cameraAltitude
        ),
        duration: 2,
      });
    }
  }, [
    viewerReady,
    fromLat,
    fromLon,
    toLat,
    toLon,
    fromName,
    toName,
    segments,
    orthodromicDistance,
    totalDistance,
  ]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[600px] rounded-xl overflow-hidden border-2 border-gray-700"
      style={{ position: 'relative', userSelect: 'none', WebkitUserSelect: 'none' }}
    />
  );
}

// Helper function to generate great circle points using Geodesic
function generateGreatCirclePoints(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  numPoints: number,
  Cesium: typeof import("cesium")
): import("cesium").Cartesian3[] {
  const line = Geodesic.WGS84.InverseLine(fromLat, fromLon, toLat, toLon);
  const inverse = Geodesic.WGS84.Inverse(fromLat, fromLon, toLat, toLon);
  const totalDistance = inverse.s12 ?? 0;

  const positions: number[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const distance = (totalDistance * i) / numPoints;
    const waypoint = line.Position(distance);
    const lat = waypoint.lat2 ?? fromLat;
    const lon = waypoint.lon2 ?? fromLon;

    positions.push(lon, lat);
  }

  return Cesium.Cartesian3.fromDegreesArray(positions);
}

// Generate color gradient for segments (cyan to purple)
function getSegmentColor(index: number, total: number, Cesium: typeof import("cesium")): import("cesium").Color {
  const hue = 180 + (280 - 180) * (index / Math.max(total - 1, 1));
  const color = hslToRgb(hue / 360, 0.7, 0.5);
  return Cesium.Color.fromBytes(color.r, color.g, color.b, 255);
}

// Convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

// Format heading with degree symbol
function formatHeading(heading: number): string {
  return `${String(Math.round(heading)).padStart(3, "0")}°`;
}
