"use client";

import { useEffect, useState, useRef, useMemo, forwardRef, useImperativeHandle } from "react";
import proj4 from "proj4";
import dynamic from "next/dynamic";
import { fetchOSMData, type OSMData, type OSMFeature } from "@/lib/osmData";
import { magvar } from "magvar";
import { formatAngle } from "@/lib/formatters";

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then(mod => mod.Polyline), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), { ssr: false });

// Import leaflet for icon creation
let L: typeof import("leaflet") | null = null;
if (typeof window !== 'undefined') {
  import('leaflet').then(mod => { L = mod; });
}

interface LocationData {
  name: string;
  lat: number;
  lon: number;
  isFlyOver?: boolean; // If true, shown on map but skipped in route line
  distance?: number; // Cumulative NM from start (for display on map)
  cumulativeTime?: number; // Cumulative time in minutes from start
}

interface RouteSegment {
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  isAlternative: boolean;
  groundSpeed?: number; // knots - for time-based tick marks
  // Leg info for labels
  trueCourse?: number; // degrees
  magneticHeading?: number; // degrees
  climbMagneticHeading?: number; // degrees (if different during climb)
  descentMagneticHeading?: number; // degrees (if different during descent)
  distance?: number; // NM
  fuelRemaining?: number; // quantity remaining after this leg
  fuelUnit?: string; // GAL, L, lb, kg
}

type MapMode = 'utm' | 'mercator';

interface LocalChartMapProps {
  locations: LocationData[];
  routeSegments?: RouteSegment[]; // Optional: explicit route segments with alternative marking
  utmZone: number;
  hemisphere: 'N' | 'S';
  mapMode: MapMode;
  printScale?: number; // e.g., 50000 for 1:50,000
  tickIntervalNM?: number; // Distance interval for tick marks on route (e.g., 10, 50, 100 NM)
  timeTickIntervalMin?: number; // Time interval for time-based tick marks (e.g., 10, 15, 20, 30 min)
  showDistanceLabels?: boolean; // Show cumulative distance labels on distance ticks
  showTimeLabels?: boolean; // Show cumulative time labels on time ticks
}

export interface LocalChartMapHandle {
  downloadChart: () => void;
}

interface UTMCoordinate {
  easting: number;
  northing: number;
}

// Chart styling configuration (aeronautical chart colors)
const CHART_STYLES = {
  background: '#f8f9fa',
  grid: {
    major: '#94a3b8',
    minor: '#cbd5e1',
  },
  features: {
    road: {
      motorway: { color: '#374151', width: 3 }, // gray-700 (dark gray)
      trunk: { color: '#4b5563', width: 2.5 }, // gray-600
      primary: { color: '#6b7280', width: 2 }, // gray-500
      secondary: { color: '#9ca3af', width: 1.5 }, // gray-400
    },
    water: { fill: '#bfdbfe', stroke: '#93c5fd', width: 1 }, // blue-200 fill, blue-300 stroke (más suave)
    wetland: { fill: '#dbeafe', stroke: '#93c5fd', width: 1, pattern: true }, // blue-100 (más suave)
    coastline: { color: '#60a5fa', width: 2 }, // blue-400 (más suave)
    beach: { fill: '#fef3c7', stroke: '#f59e0b', width: 1 }, // Sand yellow
    mud: { fill: '#a8a29e', stroke: '#78716c', width: 1 }, // Gray-brown for mud
    salt_pond: { fill: '#e0e7ff', stroke: '#818cf8', width: 1 }, // Light purple for salt
    airport: { fill: '#a855f7', stroke: '#7c3aed', width: 2 },
    railway: { color: '#64748b', width: 1, dash: [5, 5] },
    boundary: { color: '#6b7280', width: 1, dash: [10, 5] },
    city: { color: '#1e293b', size: 9 },
  },
  route: {
    line: { color: '#0ea5e9', width: 3 },
    waypoint: { fill: '#0ea5e9', stroke: '#ffffff', size: 6 }, // 50% del tamaño original
  },
};

export const LocalChartMap = forwardRef<LocalChartMapHandle, LocalChartMapProps>(
  function LocalChartMap({
    locations,
    routeSegments,
    utmZone,
    hemisphere,
    mapMode,
    printScale = 100000, // Default 1:100,000
    tickIntervalNM = 10, // Default 10 NM tick marks
    timeTickIntervalMin = 0, // Default 0 = disabled
    showDistanceLabels = false,
    showTimeLabels = false,
  }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [osmData, setOsmData] = useState<OSMData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const actualScaleRef = useRef<number>(1); // Store the actual scale used for rendering
    const [isRendering, setIsRendering] = useState(false);

    // OffscreenCanvas for base layer caching (OSM, routes, waypoints - everything except ticks)
    const baseLayerCanvasRef = useRef<OffscreenCanvas | null>(null);
    // Counter to trigger tick layer re-render when base layer changes
    const [baseLayerVersion, setBaseLayerVersion] = useState(0);
    // Store render context for tick drawing
    const renderContextRef = useRef<{
      rect: { width: number; height: number };
      scale: number;
      boundsMinE: number;
      boundsMinN: number;
      offsetX: number;
      offsetY: number;
      toCanvas: (easting: number, northing: number) => [number, number];
      toUTM: (lat: number, lon: number) => UTMCoordinate;
    } | null>(null);

    // Download canvas as PNG image with correct DPI metadata
    const handleDownloadChart = async () => {
    if (!canvasRef.current) return;

    // Calculate the CORRECT DPI based on the actual rendering scale
    // At 1:500,000 scale: 10 NM = 18,520m should appear as 37.04mm on paper
    // At 1:1,000,000 scale: 10 NM = 18,520m should appear as 18.52mm on paper

    const canvas = canvasRef.current;
    const mmPerInch = 25.4;

    // The grid uses 10 NM (18,520m) intervals
    const gridIntervalMeters = 10 * 1852; // 18,520m

    // At the selected print scale, this should appear on paper as:
    const gridIntervalPaperMm = gridIntervalMeters / (printScale / 1000); // mm on paper

    // Get the actual scale used for rendering (pixels per meter)
    const actualScale = actualScaleRef.current;

    // Calculate how many logical pixels the 10NM grid occupies in the canvas
    const gridIntervalLogicalPixels = gridIntervalMeters * actualScale;

    // Account for device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    const gridIntervalPhysicalPixels = gridIntervalLogicalPixels * dpr;

    // Calculate DPI: gridIntervalPhysicalPixels / DPI * 25.4mm/inch = gridIntervalPaperMm
    // Therefore: DPI = gridIntervalPhysicalPixels * 25.4 / gridIntervalPaperMm
    const correctDPI = Math.round((gridIntervalPhysicalPixels * mmPerInch) / gridIntervalPaperMm);

    console.log(`Device Pixel Ratio: ${dpr}`);
    console.log(`Actual rendering scale: ${actualScale.toFixed(6)} px/m`);
    console.log(`Grid interval: 10 NM = ${gridIntervalMeters}m`);
    console.log(`Should be on paper: ${gridIntervalPaperMm.toFixed(2)}mm`);
    console.log(`Grid interval logical px: ${gridIntervalLogicalPixels.toFixed(1)}px`);
    console.log(`Grid interval physical px (with DPR): ${gridIntervalPhysicalPixels.toFixed(1)}px`);
    console.log(`Correct DPI: ${correctDPI}`);

    // Convert canvas to data URL
    const dataUrl = canvas.toDataURL('image/png');

    // Use changedpi to set the correct DPI metadata
    try {
      const { changeDpiDataUrl } = await import('changedpi');
      const dataUrlWithDPI = changeDpiDataUrl(dataUrl, correctDPI);

      // Download
      const a = document.createElement('a');
      a.href = dataUrlWithDPI;
      const scaleName = printScale === 500000 ? 'Sectional' : 'WAC';
      a.download = `local-chart-${scaleName}-${correctDPI}dpi.png`;
      a.click();

      alert(`Chart downloaded!\n\nFile: ${a.download}\nDPI: ${correctDPI}\nScale: 1:${(printScale/1000).toFixed(0)},000\n\n10 NM grid = ${gridIntervalPaperMm.toFixed(1)}mm on paper\n\nWhen printing:\n✓ Print at 100% / Actual Size\n✓ Landscape orientation\n✓ Paper: A4\n\nYour plotter will work perfectly!`);
    } catch (error) {
      console.error('Failed to set DPI:', error);
      // Fallback: download without DPI metadata
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `local-chart-${printScale === 500000 ? 'Sectional' : 'WAC'}.png`;
      a.click();
      alert('Chart downloaded (without DPI metadata). You may need to scale when printing.');
    }
  };

  // Expose download function to parent via ref
  useImperativeHandle(ref, () => ({
    downloadChart: handleDownloadChart,
  }));

  // Setup UTM projection
  const projString = `+proj=utm +zone=${utmZone} ${hemisphere === 'S' ? '+south' : ''} +datum=WGS84 +units=m +no_defs`;
  proj4.defs(`UTM${utmZone}${hemisphere}`, projString);

  // Convert WGS-84 to UTM
  const toUTM = (lat: number, lon: number): UTMCoordinate => {
    const [easting, northing] = proj4('WGS84', `UTM${utmZone}${hemisphere}`, [lon, lat]);
    return { easting, northing };
  };

  // Fetch OSM data on mount (only for UTM mode)
  useEffect(() => {
    if (mapMode !== 'utm') {
      setOsmData(null);
      setLoading(false);
      return;
    }

    const loadOSMData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchOSMData(locations);
        setOsmData(data);
      } catch (err) {
        console.error('Failed to load OSM data:', err);
        setError('Failed to load map data');
      } finally {
        setLoading(false);
      }
    };

    loadOSMData();
  }, [locations, mapMode]);

  // Render BASE LAYER to OffscreenCanvas (OSM, routes, waypoints - everything except ticks)
  // This is the expensive operation that only runs when map data changes
  useEffect(() => {
    if (!canvasRef.current || !osmData || loading) return;

    // Show rendering indicator and give React time to paint it
    setIsRendering(true);

    const timeoutId = setTimeout(() => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;

      // Set canvas size (high DPI) - fixed size for screen display
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      // Create or resize OffscreenCanvas for base layer
      if (!baseLayerCanvasRef.current ||
          baseLayerCanvasRef.current.width !== canvas.width ||
          baseLayerCanvasRef.current.height !== canvas.height) {
        baseLayerCanvasRef.current = new OffscreenCanvas(canvas.width, canvas.height);
      } else {
        // Reset the canvas if reusing (clear transforms)
        baseLayerCanvasRef.current.width = canvas.width;
      }

      const offscreenCtx = baseLayerCanvasRef.current.getContext('2d');
      if (!offscreenCtx) {
        setIsRendering(false);
        return;
      }

      // Scale for high DPI
      offscreenCtx.scale(dpr, dpr);

      // Convert all locations to UTM
      const utmLocations = locations.map(loc => ({
        ...loc,
        utm: toUTM(loc.lat, loc.lon),
      }));

      // Calculate bounds in UTM coordinates with 10NM padding
      const paddingMeters = 10 * 1852; // 10 NM = 18,520 meters
      const eastings = utmLocations.map(l => l.utm.easting);
      const northings = utmLocations.map(l => l.utm.northing);
      const minEasting = Math.min(...eastings) - paddingMeters;
      const maxEasting = Math.max(...eastings) + paddingMeters;
      const minNorthing = Math.min(...northings) - paddingMeters;
      const maxNorthing = Math.max(...northings) + paddingMeters;

      const boundsMinE = minEasting;
      const boundsMaxE = maxEasting;
      const boundsMinN = minNorthing;
      const boundsMaxN = maxNorthing;

      const boundsWidth = boundsMaxE - boundsMinE;
      const boundsHeight = boundsMaxN - boundsMinN;

      // Calculate scale to fit content in the canvas
      const scaleX = rect.width / boundsWidth;
      const scaleY = rect.height / boundsHeight;
      const scale = Math.min(scaleX, scaleY) * 0.95; // 95% to add margin

      // Store the actual scale used for DPI calculation
      actualScaleRef.current = scale;

      // Calculate centered offset
      const contentWidth = boundsWidth * scale;
      const contentHeight = boundsHeight * scale;
      const offsetX = (rect.width - contentWidth) / 2;
      const offsetY = (rect.height - contentHeight) / 2;

      // Transform UTM coordinates to canvas coordinates (centered)
      const toCanvasFunc = (easting: number, northing: number): [number, number] => {
        const x = (easting - boundsMinE) * scale + offsetX;
        const y = rect.height - ((northing - boundsMinN) * scale + offsetY); // Flip Y axis
        return [x, y];
      };

      // Store render context for tick drawing
      renderContextRef.current = {
        rect,
        scale,
        boundsMinE,
        boundsMinN,
        offsetX,
        offsetY,
        toCanvas: toCanvasFunc,
        toUTM,
      };

      // Clear offscreen canvas
      offscreenCtx.fillStyle = CHART_STYLES.background;
      offscreenCtx.fillRect(0, 0, rect.width, rect.height);

      // Draw UTM grid
      drawUTMGrid(offscreenCtx, boundsMinE, boundsMaxE, boundsMinN, boundsMaxN, toCanvasFunc, rect);

      // Draw OSM features (pass waypoint names to avoid duplicates)
      const waypointNames = utmLocations.map(loc =>
        loc.name.split(',')[0].trim().toLowerCase()
      );
      drawOSMFeatures(offscreenCtx, osmData, toUTM, toCanvasFunc, waypointNames);

      // Draw route lines (WITHOUT tick marks - those go in the tick layer)
      if (routeSegments && routeSegments.length > 0) {
        routeSegments.forEach(segment => {
          const fromUTM = toUTM(segment.fromLat, segment.fromLon);
          const toUTMCoord = toUTM(segment.toLat, segment.toLon);
          const [x1, y1] = toCanvasFunc(fromUTM.easting, fromUTM.northing);
          const [x2, y2] = toCanvasFunc(toUTMCoord.easting, toUTMCoord.northing);

          // Draw main route line
          offscreenCtx.strokeStyle = segment.isAlternative ? '#fb923c' : CHART_STYLES.route.line.color;
          offscreenCtx.lineWidth = CHART_STYLES.route.line.width;
          offscreenCtx.beginPath();
          offscreenCtx.moveTo(x1, y1);
          offscreenCtx.lineTo(x2, y2);
          offscreenCtx.stroke();
        });
      } else {
        // Fallback: Draw route line connecting non-flyover waypoints
        const routeWaypoints = utmLocations.filter(loc => !loc.isFlyOver);
        if (routeWaypoints.length >= 2) {
          offscreenCtx.strokeStyle = CHART_STYLES.route.line.color;
          offscreenCtx.lineWidth = CHART_STYLES.route.line.width;
          offscreenCtx.beginPath();
          routeWaypoints.forEach((loc, i) => {
            const [x, y] = toCanvasFunc(loc.utm.easting, loc.utm.northing);
            if (i === 0) {
              offscreenCtx.moveTo(x, y);
            } else {
              offscreenCtx.lineTo(x, y);
            }
          });
          offscreenCtx.stroke();
        }
      }

      // NOTE: Waypoint markers and leg info labels are drawn in the TICK LAYER
      // so they appear on top of tick labels (waypoints are more important)

      // Draw scale bar BASE (without tick legends - those go in tick layer)
      drawScaleBarBase(offscreenCtx, scale, rect, printScale);

      // Draw north indicator
      const centerLat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
      const centerLon = locations.reduce((sum, loc) => sum + loc.lon, 0) / locations.length;
      drawNorthIndicator(offscreenCtx, rect, centerLat, centerLon, utmZone);

      // Base layer is ready - trigger tick layer render
      setBaseLayerVersion(v => v + 1);
      setIsRendering(false);
    }, 10);

    return () => clearTimeout(timeoutId);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [osmData, loading, locations, utmZone, hemisphere, printScale, routeSegments]);

  // Render TICK LAYER - fast operation that runs when tick params change
  // Copies base layer and draws ticks on top
  useEffect(() => {
    if (!canvasRef.current || !baseLayerCanvasRef.current || !renderContextRef.current || loading) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { rect, toCanvas, toUTM } = renderContextRef.current;
    const dpr = window.devicePixelRatio || 1;

    // Copy base layer to visible canvas (very fast)
    ctx.drawImage(baseLayerCanvasRef.current, 0, 0);

    // Scale for drawing ticks
    ctx.save();
    ctx.scale(dpr, dpr);

    // Helper to format time as "Xh Ym" or "Ym"
    const formatTimeLabel = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      if (hours > 0) {
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      }
      return `${mins}m`;
    };

    // Track label positions for collision detection
    const labelBoxes: Array<{ x: number; y: number; width: number; height: number }> = [];

    // Check if a label would collide with existing labels
    const wouldCollide = (x: number, y: number, width: number, height: number): boolean => {
      const padding = 4;
      return labelBoxes.some(box =>
        !(x + width + padding < box.x ||
          x > box.x + box.width + padding ||
          y + height + padding < box.y ||
          y > box.y + box.height + padding)
      );
    };

    // Draw a label with background
    const drawLabel = (
      text: string,
      x: number,
      y: number,
      color: string,
      perpAngle: number
    ): boolean => {
      ctx.font = 'bold 9px sans-serif';
      const textWidth = ctx.measureText(text).width;
      const textHeight = 10;
      const padding = 2;
      const labelWidth = textWidth + padding * 2;
      const labelHeight = textHeight + padding * 2;

      // Try different positions around the tick
      const offsets = [
        { dx: 12, dy: -labelHeight / 2 },  // right
        { dx: -labelWidth - 12, dy: -labelHeight / 2 },  // left
        { dx: -labelWidth / 2, dy: -labelHeight - 10 },  // top
        { dx: -labelWidth / 2, dy: 12 },  // bottom
      ];

      // Rotate offsets based on perpendicular angle for better placement
      const baseOffset = 14;
      const perpOffsets = [
        { dx: Math.cos(perpAngle) * baseOffset - labelWidth / 2, dy: Math.sin(perpAngle) * baseOffset - labelHeight / 2 },
        { dx: -Math.cos(perpAngle) * baseOffset - labelWidth / 2, dy: -Math.sin(perpAngle) * baseOffset - labelHeight / 2 },
      ];

      const allOffsets = [...perpOffsets, ...offsets];

      for (const offset of allOffsets) {
        const labelX = x + offset.dx;
        const labelY = y + offset.dy;

        if (!wouldCollide(labelX, labelY, labelWidth, labelHeight)) {
          // Draw background
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.fillRect(labelX, labelY, labelWidth, labelHeight);

          // Draw text
          ctx.fillStyle = color;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(text, labelX + padding, labelY + padding);

          // Store label position
          labelBoxes.push({ x: labelX, y: labelY, width: labelWidth, height: labelHeight });
          return true;
        }
      }
      return false; // Couldn't place label without collision
    };

    // Draw tick marks on route segments with cumulative tracking
    if (routeSegments && routeSegments.length > 0) {
      let cumulativeDistanceNM = 0;
      let cumulativeTimeMin = 0;

      // Filter non-alternative segments for cumulative calculation
      const mainSegments = routeSegments.filter(s => !s.isAlternative);

      mainSegments.forEach((segment, segmentIndex) => {
        const fromUTM = toUTM(segment.fromLat, segment.fromLon);
        const toUTMCoord = toUTM(segment.toLat, segment.toLon);
        const [x1, y1] = toCanvas(fromUTM.easting, fromUTM.northing);
        const [x2, y2] = toCanvas(toUTMCoord.easting, toUTMCoord.northing);

        const dx = toUTMCoord.easting - fromUTM.easting;
        const dy = toUTMCoord.northing - fromUTM.northing;
        const distanceMeters = Math.sqrt(dx * dx + dy * dy);
        const segmentDistanceNM = distanceMeters / 1852;

        const dxCanvas = x2 - x1;
        const dyCanvas = y2 - y1;
        const lineAngleCanvas = Math.atan2(dyCanvas, dxCanvas);
        const perpAngleCanvas = lineAngleCanvas + Math.PI / 2;

        // Calculate segment time if ground speed available
        const segmentTimeMin = segment.groundSpeed && segment.groundSpeed > 0
          ? (segmentDistanceNM / segment.groundSpeed) * 60
          : 0;

        // Draw distance tick marks
        // Find which ticks fall within this segment based on cumulative distance
        const startDistanceNM = cumulativeDistanceNM;
        const endDistanceNM = cumulativeDistanceNM + segmentDistanceNM;

        // First tick in or after this segment
        const firstTickNum = Math.ceil(startDistanceNM / tickIntervalNM);
        // Last tick before end of segment
        const lastTickNum = Math.floor(endDistanceNM / tickIntervalNM);

        if (lastTickNum >= firstTickNum && firstTickNum > 0) {
          const tickLength = 8;

          ctx.strokeStyle = CHART_STYLES.route.line.color;
          ctx.lineWidth = 2;

          for (let tickNum = firstTickNum; tickNum <= lastTickNum; tickNum++) {
            const tickDistanceNM = tickNum * tickIntervalNM;
            const distanceIntoSegment = tickDistanceNM - startDistanceNM;
            const fraction = distanceIntoSegment / segmentDistanceNM;

            const tickUTM = {
              easting: fromUTM.easting + dx * fraction,
              northing: fromUTM.northing + dy * fraction,
            };
            const [tickX, tickY] = toCanvas(tickUTM.easting, tickUTM.northing);

            // Draw tick mark
            const dx1 = Math.cos(perpAngleCanvas) * tickLength;
            const dy1 = Math.sin(perpAngleCanvas) * tickLength;
            ctx.beginPath();
            ctx.moveTo(tickX - dx1, tickY - dy1);
            ctx.lineTo(tickX + dx1, tickY + dy1);
            ctx.stroke();

            // Draw distance label if enabled
            if (showDistanceLabels) {
              drawLabel(`${tickDistanceNM} NM`, tickX, tickY, '#0ea5e9', perpAngleCanvas);
            }
          }
        }

        // Draw time tick marks (cumulative)
        if (timeTickIntervalMin > 0 && segment.groundSpeed && segment.groundSpeed > 0) {
          const startTimeMin = cumulativeTimeMin;
          const endTimeMin = cumulativeTimeMin + segmentTimeMin;

          const firstTimeTickNum = Math.ceil(startTimeMin / timeTickIntervalMin);
          const lastTimeTickNum = Math.floor(endTimeMin / timeTickIntervalMin);

          if (lastTimeTickNum >= firstTimeTickNum && firstTimeTickNum > 0) {
            const timeTickLength = 8;
            const timeTickAngle = lineAngleCanvas + Math.PI / 4;

            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2;

            for (let tickNum = firstTimeTickNum; tickNum <= lastTimeTickNum; tickNum++) {
              const tickTimeMin = tickNum * timeTickIntervalMin;
              const timeIntoSegment = tickTimeMin - startTimeMin;
              const distanceIntoSegment = (timeIntoSegment / 60) * segment.groundSpeed;
              const fraction = distanceIntoSegment / segmentDistanceNM;

              if (fraction > 1) break;

              const tickUTM = {
                easting: fromUTM.easting + dx * fraction,
                northing: fromUTM.northing + dy * fraction,
              };
              const [tickX, tickY] = toCanvas(tickUTM.easting, tickUTM.northing);

              // Draw tick mark
              const dx1 = Math.cos(timeTickAngle) * timeTickLength;
              const dy1 = Math.sin(timeTickAngle) * timeTickLength;
              ctx.beginPath();
              ctx.moveTo(tickX - dx1, tickY - dy1);
              ctx.lineTo(tickX + dx1, tickY + dy1);
              ctx.stroke();

              // Draw time label if enabled
              if (showTimeLabels) {
                drawLabel(formatTimeLabel(tickTimeMin), tickX, tickY, '#a855f7', timeTickAngle);
              }
            }
          }
        }

        // Update cumulative values for next segment
        cumulativeDistanceNM = endDistanceNM;
        cumulativeTimeMin += segmentTimeMin;

        // Also draw ticks for alternative segments (but without affecting cumulative)
        if (segmentIndex === mainSegments.length - 1) {
          // Draw alternative segment ticks after all main segments
          routeSegments.filter(s => s.isAlternative).forEach(altSegment => {
            const altFromUTM = toUTM(altSegment.fromLat, altSegment.fromLon);
            const altToUTM = toUTM(altSegment.toLat, altSegment.toLon);
            const [ax1, ay1] = toCanvas(altFromUTM.easting, altFromUTM.northing);
            const [ax2, ay2] = toCanvas(altToUTM.easting, altToUTM.northing);

            const adx = altToUTM.easting - altFromUTM.easting;
            const ady = altToUTM.northing - altFromUTM.northing;
            const altDistanceMeters = Math.sqrt(adx * adx + ady * ady);
            const altDistanceNM = altDistanceMeters / 1852;

            const adxCanvas = ax2 - ax1;
            const adyCanvas = ay2 - ay1;
            const altLineAngle = Math.atan2(adyCanvas, adxCanvas);
            const altPerpAngle = altLineAngle + Math.PI / 2;

            // Distance ticks for alternative
            const altNumTicks = Math.floor(altDistanceNM / tickIntervalNM);
            if (altNumTicks > 0) {
              ctx.strokeStyle = '#fb923c';
              ctx.lineWidth = 2;

              for (let i = 1; i <= altNumTicks; i++) {
                const fraction = (i * tickIntervalNM) / altDistanceNM;
                const tickUTM = {
                  easting: altFromUTM.easting + adx * fraction,
                  northing: altFromUTM.northing + ady * fraction,
                };
                const [tickX, tickY] = toCanvas(tickUTM.easting, tickUTM.northing);

                const dx1 = Math.cos(altPerpAngle) * 8;
                const dy1 = Math.sin(altPerpAngle) * 8;
                ctx.beginPath();
                ctx.moveTo(tickX - dx1, tickY - dy1);
                ctx.lineTo(tickX + dx1, tickY + dy1);
                ctx.stroke();
              }
            }

            // Time ticks for alternative
            if (timeTickIntervalMin > 0 && altSegment.groundSpeed && altSegment.groundSpeed > 0) {
              const altLegDuration = (altDistanceNM / altSegment.groundSpeed) * 60;
              const altNumTimeTicks = Math.floor(altLegDuration / timeTickIntervalMin);

              if (altNumTimeTicks > 0) {
                const altTimeAngle = altLineAngle + Math.PI / 4;
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 2;

                for (let i = 1; i <= altNumTimeTicks; i++) {
                  const timeElapsed = i * timeTickIntervalMin;
                  const distanceTraveled = (timeElapsed / 60) * altSegment.groundSpeed;
                  const fraction = distanceTraveled / altDistanceNM;

                  if (fraction > 1) break;

                  const tickUTM = {
                    easting: altFromUTM.easting + adx * fraction,
                    northing: altFromUTM.northing + ady * fraction,
                  };
                  const [tickX, tickY] = toCanvas(tickUTM.easting, tickUTM.northing);

                  const dx1 = Math.cos(altTimeAngle) * 8;
                  const dy1 = Math.sin(altTimeAngle) * 8;
                  ctx.beginPath();
                  ctx.moveTo(tickX - dx1, tickY - dy1);
                  ctx.lineTo(tickX + dx1, tickY + dy1);
                  ctx.stroke();
                }
              }
            }
          });
        }
      });
    }

    // Draw waypoint markers and labels (AFTER ticks so they appear on top)
    const utmLocations = locations.map(loc => ({
      ...loc,
      utm: toUTM(loc.lat, loc.lon),
    }));

    utmLocations.forEach((loc) => {
      const [x, y] = toCanvas(loc.utm.easting, loc.utm.northing);

      // Different style for fly-over waypoints
      if (loc.isFlyOver) {
        ctx.fillStyle = '#a855f7';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const size = CHART_STYLES.route.waypoint.size;
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = CHART_STYLES.route.waypoint.fill;
        ctx.strokeStyle = CHART_STYLES.route.waypoint.stroke;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, CHART_STYLES.route.waypoint.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Label with background and word wrap
      const label = loc.name.split(',')[0];
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const maxCharsPerLine = 12;
      const words = label.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (testLine.length <= maxCharsPerLine) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      });
      if (currentLine) lines.push(currentLine);

      const distanceLine = loc.distance !== undefined ? `${loc.distance.toFixed(1)} NM` : null;
      const formatTime = (minutes?: number): string | null => {
        if (minutes === undefined || minutes === null) return null;
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return hours > 0 ? `${hours} h ${mins} min` : `${mins} min`;
      };
      const timeLine = formatTime(loc.cumulativeTime);

      const lineHeight = 14;
      const infoLineHeight = 12;
      ctx.font = 'bold 12px sans-serif';
      const nameLinesWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
      ctx.font = 'bold 10px sans-serif';
      const distanceWidth = distanceLine ? ctx.measureText(distanceLine).width : 0;
      const timeWidth = timeLine ? ctx.measureText(timeLine).width : 0;
      const maxWidth = Math.max(nameLinesWidth, distanceWidth, timeWidth);
      const infoLines = [distanceLine, timeLine].filter(Boolean).length;
      const totalHeight = lineHeight * lines.length + infoLineHeight * infoLines;
      const padding = 3;
      const labelY = y + 22;

      ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
      ctx.fillRect(
        x - maxWidth / 2 - padding,
        labelY - padding,
        maxWidth + padding * 2,
        totalHeight + padding * 2
      );

      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#1e293b';
      lines.forEach((line, i) => {
        ctx.fillText(line, x, labelY + i * lineHeight);
      });

      let currentInfoY = labelY + lines.length * lineHeight;

      if (distanceLine) {
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#0ea5e9';
        ctx.fillText(distanceLine, x, currentInfoY);
        currentInfoY += infoLineHeight;
      }

      if (timeLine) {
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#a855f7';
        ctx.fillText(timeLine, x, currentInfoY);
      }
    });

    // Draw leg info labels (AFTER ticks so they appear on top)
    if (routeSegments && routeSegments.length > 0) {
      drawLegInfoLabels(ctx, routeSegments, toUTM, toCanvas);
    }

    // Draw tick legends
    drawTickLegends(ctx, rect, tickIntervalNM, timeTickIntervalMin);

    ctx.restore();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickIntervalNM, timeTickIntervalMin, routeSegments, loading, baseLayerVersion, showDistanceLabels, showTimeLabels, locations]);

  // Draw UTM grid with labels
  function drawUTMGrid(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    minE: number,
    maxE: number,
    minN: number,
    maxN: number,
    toCanvas: (e: number, n: number) => [number, number],
    _rect: { width: number; height: number }
  ) {
    // Grid interval (10 NM for major, 1 NM for minor)
    // 1 NM = 1852 meters
    const majorInterval = 10 * 1852; // 10 NM = 18,520 m
    const minorInterval = 1852;      // 1 NM = 1,852 m

    // Minor grid
    ctx.strokeStyle = CHART_STYLES.grid.minor;
    ctx.lineWidth = 0.5;
    for (let e = Math.floor(minE / minorInterval) * minorInterval; e <= maxE; e += minorInterval) {
      const [x1, y1] = toCanvas(e, minN);
      const [x2, y2] = toCanvas(e, maxN);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    for (let n = Math.floor(minN / minorInterval) * minorInterval; n <= maxN; n += minorInterval) {
      const [x1, y1] = toCanvas(minE, n);
      const [x2, y2] = toCanvas(maxE, n);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Major grid with labels
    ctx.strokeStyle = CHART_STYLES.grid.major;
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';

    for (let e = Math.floor(minE / majorInterval) * majorInterval; e <= maxE; e += majorInterval) {
      const [x1, y1] = toCanvas(e, minN);
      const [x2, y2] = toCanvas(e, maxN);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Label (show easting in meters)
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${Math.round(e / 1000)}`, x1, Math.min(y1, y2) + 5);
    }

    for (let n = Math.floor(minN / majorInterval) * majorInterval; n <= maxN; n += majorInterval) {
      const [x1, y1] = toCanvas(minE, n);
      const [x2, y2] = toCanvas(maxE, n);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Label (show northing in meters)
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(n / 1000)}`, Math.min(x1, x2) + 5, y1);
    }
  }

  // Draw OSM features
  function drawOSMFeatures(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    data: OSMData,
    toUTM: (lat: number, lon: number) => UTMCoordinate,
    toCanvas: (e: number, n: number) => [number, number],
    waypointNames: string[] = []
  ) {
    // Group features by type for proper layering
    const byType: Record<string, OSMFeature[]> = {
      water: [],
      wetland: [],
      coastline: [],
      beach: [],
      mud: [],
      salt_pond: [],
      boundary: [],
      railway: [],
      road: [],
      airport: [],
      city: [],
    };

    data.features.forEach(feature => {
      byType[feature.properties.featureType]?.push(feature);
    });

    // Draw in order: water -> wetlands -> coastline -> beach -> mud -> salt_pond -> boundaries -> railways -> roads -> airports -> cities

    // Water bodies (solid blue)
    byType.water.forEach(feature => {
      if (feature.geometry.type === 'Polygon') {
        drawPolygon(ctx, feature.geometry.coordinates[0], toUTM, toCanvas, CHART_STYLES.features.water);
      } else if (feature.geometry.type === 'MultiPolygon') {
        // Draw each polygon in the multipolygon
        feature.geometry.coordinates.forEach((polygon: number[][][]) => {
          drawPolygon(ctx, polygon[0], toUTM, toCanvas, CHART_STYLES.features.water);
        });
      } else if (feature.geometry.type === 'LineString') {
        drawLineString(ctx, feature.geometry.coordinates, toUTM, toCanvas, CHART_STYLES.features.water.stroke, 1.5);
      }
    });

    // Wetlands (bañados - with diagonal lines pattern)
    byType.wetland.forEach(feature => {
      if (feature.geometry.type === 'Polygon') {
        drawPolygonWithPattern(ctx, feature.geometry.coordinates[0], toUTM, toCanvas, CHART_STYLES.features.wetland);
      } else if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach((polygon: number[][][]) => {
          drawPolygonWithPattern(ctx, polygon[0], toUTM, toCanvas, CHART_STYLES.features.wetland);
        });
      }
    });

    // Coastlines (thick blue lines)
    byType.coastline.forEach(feature => {
      if (feature.geometry.type === 'LineString') {
        drawLineString(ctx, feature.geometry.coordinates, toUTM, toCanvas, CHART_STYLES.features.coastline.color, CHART_STYLES.features.coastline.width);
      }
    });

    // Beaches (sand yellow)
    byType.beach.forEach(feature => {
      if (feature.geometry.type === 'Polygon') {
        drawPolygon(ctx, feature.geometry.coordinates[0], toUTM, toCanvas, CHART_STYLES.features.beach);
      } else if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach((polygon: number[][][]) => {
          drawPolygon(ctx, polygon[0], toUTM, toCanvas, CHART_STYLES.features.beach);
        });
      }
    });

    // Mud (gray-brown)
    byType.mud.forEach(feature => {
      if (feature.geometry.type === 'Polygon') {
        drawPolygon(ctx, feature.geometry.coordinates[0], toUTM, toCanvas, CHART_STYLES.features.mud);
      } else if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach((polygon: number[][][]) => {
          drawPolygon(ctx, polygon[0], toUTM, toCanvas, CHART_STYLES.features.mud);
        });
      }
    });

    // Salt ponds/flats (light purple)
    byType.salt_pond.forEach(feature => {
      if (feature.geometry.type === 'Polygon') {
        drawPolygon(ctx, feature.geometry.coordinates[0], toUTM, toCanvas, CHART_STYLES.features.salt_pond);
      } else if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach((polygon: number[][][]) => {
          drawPolygon(ctx, polygon[0], toUTM, toCanvas, CHART_STYLES.features.salt_pond);
        });
      }
    });

    // Boundaries
    byType.boundary.forEach(feature => {
      if (feature.geometry.type === 'LineString') {
        drawLineString(ctx, feature.geometry.coordinates, toUTM, toCanvas, CHART_STYLES.features.boundary.color, CHART_STYLES.features.boundary.width, CHART_STYLES.features.boundary.dash);
      }
    });

    // Railways
    byType.railway.forEach(feature => {
      if (feature.geometry.type === 'LineString') {
        drawLineString(ctx, feature.geometry.coordinates, toUTM, toCanvas, CHART_STYLES.features.railway.color, CHART_STYLES.features.railway.width, CHART_STYLES.features.railway.dash);
      }
    });

    // Roads
    byType.road.forEach(feature => {
      const highway = feature.properties.highway || 'secondary';
      const style = CHART_STYLES.features.road[highway as keyof typeof CHART_STYLES.features.road] || CHART_STYLES.features.road.secondary;
      if (feature.geometry.type === 'LineString') {
        drawLineString(ctx, feature.geometry.coordinates, toUTM, toCanvas, style.color, style.width);
      }
    });

    // Airports
    byType.airport.forEach(feature => {
      if (feature.geometry.type === 'Polygon') {
        drawPolygon(ctx, feature.geometry.coordinates[0], toUTM, toCanvas, CHART_STYLES.features.airport);
      } else if (feature.geometry.type === 'LineString') {
        drawLineString(ctx, feature.geometry.coordinates, toUTM, toCanvas, CHART_STYLES.features.airport.stroke, CHART_STYLES.features.airport.width);
      } else if (feature.geometry.type === 'Point') {
        const [lon, lat] = feature.geometry.coordinates;
        const utm = toUTM(lat, lon);
        const [x, y] = toCanvas(utm.easting, utm.northing);

        // Draw airport symbol (circle)
        ctx.fillStyle = CHART_STYLES.features.airport.fill;
        ctx.strokeStyle = CHART_STYLES.features.airport.stroke;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });

    // Cities - filter by population and always draw labels
    // Filter by population >= 3000, always include cities regardless of population
    const filteredCities = byType.city.filter(feature => {
      const place = feature.properties.place || '';
      const population = parseInt(feature.properties.population) || 0;

      // Always include cities
      if (place === 'city') return true;

      // For towns and villages, require population >= 3000
      return population >= 3000;
    });

    // Sort by importance: cities first, then by population within each category
    const sortedCities = filteredCities.sort((a, b) => {
      const placeA = a.properties.place || '';
      const placeB = b.properties.place || '';
      const popA = parseInt(a.properties.population) || 0;
      const popB = parseInt(b.properties.population) || 0;

      // Priority order: city > town > village
      const priority: Record<string, number> = { city: 0, town: 1, village: 2 };
      const priorityA = priority[placeA] ?? 99;
      const priorityB = priority[placeB] ?? 99;

      // First sort by type (city/town/village)
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Within same type, sort by population (descending)
      return popB - popA;
    });

    // Collect existing city labels and markers for collision detection
    const cityLabels: Array<{ x: number; y: number; width: number; height: number }> = [];
    const cityMarkers: Array<{ x: number; y: number; radius: number }> = [];

    // Collect major road lines for collision detection (motorway and trunk only)
    const majorRoadLines: Array<{ coordinates: number[][] }> = [];
    byType.road.forEach(feature => {
      const highway = feature.properties.highway || 'secondary';
      if ((highway === 'motorway' || highway === 'trunk') && feature.geometry.type === 'LineString') {
        majorRoadLines.push({ coordinates: feature.geometry.coordinates });
      }
    });

    // Draw all cities - try multiple positions but ALWAYS draw
    sortedCities.forEach(feature => {
      if (feature.geometry.type === 'Point') {
        const [lon, lat] = feature.geometry.coordinates;
        const utm = toUTM(lat, lon);
        const [x, y] = toCanvas(utm.easting, utm.northing);

        // Check if this city matches any waypoint name
        const cityName = feature.properties.name?.trim().toLowerCase() || '';
        const isDuplicateWaypoint = waypointNames.some(wpName =>
          cityName === wpName || cityName.includes(wpName) || wpName.includes(cityName)
        );

        // Skip if it's a duplicate waypoint
        if (isDuplicateWaypoint) {
          return;
        }

        // Draw city dot
        ctx.fillStyle = CHART_STYLES.features.city.color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Store marker for collision detection
        cityMarkers.push({ x, y, radius: 8 });

        // Draw city name - try multiple positions, always draw
        if (feature.properties.name) {
          ctx.font = `${CHART_STYLES.features.city.size}px sans-serif`;
          const textWidth = ctx.measureText(feature.properties.name).width;
          const textHeight = CHART_STYLES.features.city.size;

          // Try 8 positions: right, left, top, bottom, and 4 diagonals
          const positions = [
            { x: x + 6, y: y - textHeight / 2 }, // right
            { x: x - textWidth - 6, y: y - textHeight / 2 }, // left
            { x: x - textWidth / 2, y: y - textHeight - 6 }, // top
            { x: x - textWidth / 2, y: y + 6 }, // bottom
            { x: x + 6, y: y - textHeight - 6 }, // top-right
            { x: x - textWidth - 6, y: y - textHeight - 6 }, // top-left
            { x: x + 6, y: y + 6 }, // bottom-right
            { x: x - textWidth - 6, y: y + 6 }, // bottom-left
          ];

          let bestPosition = positions[0]; // Default to right
          let bestScore = Infinity;

          // Score each position (lower is better)
          for (const pos of positions) {
            const labelX = pos.x;
            const labelY = pos.y;
            let score = 0;

            // Check collision with existing city labels
            cityLabels.forEach(existing => {
              const overlaps = !(
                labelX + textWidth < existing.x ||
                labelX > existing.x + existing.width ||
                labelY + textHeight < existing.y ||
                labelY > existing.y + existing.height
              );
              if (overlaps) score += 100; // Heavy penalty for label overlap
            });

            // Check collision with other city markers (excluding current one)
            cityMarkers.forEach(marker => {
              if (marker.x === x && marker.y === y) return; // Skip current marker

              // Rectangle-circle collision
              const closestX = Math.max(labelX, Math.min(marker.x, labelX + textWidth));
              const closestY = Math.max(labelY, Math.min(marker.y, labelY + textHeight));
              const dx = marker.x - closestX;
              const dy = marker.y - closestY;
              const distanceSquared = dx * dx + dy * dy;

              if (distanceSquared < (marker.radius * marker.radius)) {
                score += 50; // Penalty for marker overlap
              }
            });

            // Check collision with major roads (motorway, trunk)
            majorRoadLines.forEach(road => {
              const roadUTM = road.coordinates.map(coord => {
                const utm = toUTM(coord[1], coord[0]);
                return toCanvas(utm.easting, utm.northing);
              });

              // Check if any road segment intersects with label rectangle
              for (let i = 0; i < roadUTM.length - 1; i++) {
                const [x1, y1] = roadUTM[i];
                const [x2, y2] = roadUTM[i + 1];

                // Simple check: does line segment come close to label rectangle?
                const labelCenterX = labelX + textWidth / 2;
                const labelCenterY = labelY + textHeight / 2;

                // Distance from line segment to label center
                const lineLengthSquared = (x2 - x1) ** 2 + (y2 - y1) ** 2;
                if (lineLengthSquared === 0) continue;

                const t = Math.max(0, Math.min(1, ((labelCenterX - x1) * (x2 - x1) + (labelCenterY - y1) * (y2 - y1)) / lineLengthSquared));
                const projX = x1 + t * (x2 - x1);
                const projY = y1 + t * (y2 - y1);
                const dist = Math.sqrt((labelCenterX - projX) ** 2 + (labelCenterY - projY) ** 2);

                if (dist < 15) { // Within 15px of major road
                  score += 30; // Penalty for major road proximity
                }
              }
            });

            if (score < bestScore) {
              bestScore = score;
              bestPosition = pos;
            }
          }

          // Always draw at best position found
          const finalX = bestPosition.x;
          const finalY = bestPosition.y;
          const padding = 2;

          // Draw semi-transparent background (light gray for city labels)
          ctx.fillStyle = 'rgba(241, 245, 249, 0.85)'; // slate-100 with transparency
          ctx.fillRect(
            finalX - padding,
            finalY - padding,
            textWidth + padding * 2,
            textHeight + padding * 2
          );

          // Draw city name text
          ctx.fillStyle = CHART_STYLES.features.city.color;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(feature.properties.name, finalX, finalY + textHeight / 2);

          // Store label bounds for future collision detection
          cityLabels.push({ x: finalX, y: finalY, width: textWidth, height: textHeight });
        }
      }
    });
  }

  function drawLineString(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    coords: number[][],
    toUTM: (lat: number, lon: number) => UTMCoordinate,
    toCanvas: (e: number, n: number) => [number, number],
    color: string,
    width: number,
    dash?: number[]
  ) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dash) {
      ctx.setLineDash(dash);
    } else {
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    coords.forEach(([lon, lat], i) => {
      const utm = toUTM(lat, lon);
      const [x, y] = toCanvas(utm.easting, utm.northing);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawPolygon(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    coords: number[][],
    toUTM: (lat: number, lon: number) => UTMCoordinate,
    toCanvas: (e: number, n: number) => [number, number],
    style: { fill: string; stroke: string; width: number }
  ) {
    ctx.fillStyle = style.fill;
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.width;
    ctx.beginPath();
    coords.forEach(([lon, lat], i) => {
      const utm = toUTM(lat, lon);
      const [x, y] = toCanvas(utm.easting, utm.northing);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawPolygonWithPattern(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    coords: number[][],
    toUTM: (lat: number, lon: number) => UTMCoordinate,
    toCanvas: (e: number, n: number) => [number, number],
    style: { fill: string; stroke: string; width: number; pattern?: boolean }
  ) {
    // First draw the outline path
    ctx.beginPath();
    coords.forEach(([lon, lat], i) => {
      const utm = toUTM(lat, lon);
      const [x, y] = toCanvas(utm.easting, utm.northing);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();

    // Fill with base color (lighter blue)
    ctx.fillStyle = style.fill;
    ctx.fill();

    // Save the clipping path for the pattern
    ctx.save();
    ctx.clip();

    // Calculate bounds for the pattern
    const utmCoords = coords.map(([lon, lat]) => {
      const utm = toUTM(lat, lon);
      return toCanvas(utm.easting, utm.northing);
    });
    const xs = utmCoords.map(([x]) => x);
    const ys = utmCoords.map(([, y]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Draw diagonal lines pattern
    ctx.strokeStyle = '#3b82f6'; // Blue lines
    ctx.lineWidth = 1;
    const spacing = 8; // Space between lines

    // Draw diagonal lines from top-left to bottom-right
    for (let i = minX - (maxY - minY); i < maxX + (maxY - minY); i += spacing) {
      ctx.beginPath();
      ctx.moveTo(i, minY);
      ctx.lineTo(i + (maxY - minY), maxY);
      ctx.stroke();
    }

    ctx.restore();

    // Draw the stroke
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.width;
    ctx.beginPath();
    coords.forEach(([lon, lat], i) => {
      const utm = toUTM(lat, lon);
      const [x, y] = toCanvas(utm.easting, utm.northing);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.stroke();
  }

  // Draw leg information labels at midpoint of each segment
  function drawLegInfoLabels(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    segments: RouteSegment[],
    toUTM: (lat: number, lon: number) => UTMCoordinate,
    toCanvas: (e: number, n: number) => [number, number]
  ) {
    const labels: Array<{ x: number; y: number; lines: string[]; width: number; height: number }> = [];

    // Pre-calculate all waypoint positions (markers) and label bounding boxes for collision detection
    const waypointMarkers = locations.map(loc => {
      const utm = toUTM(loc.lat, loc.lon);
      const [x, y] = toCanvas(utm.easting, utm.northing);
      return { x, y, radius: 20 }; // Marker + some padding
    });

    const waypointLabelBoxes = locations.map(loc => {
      const utm = toUTM(loc.lat, loc.lon);
      const [x, y] = toCanvas(utm.easting, utm.northing);

      // Calculate waypoint label dimensions (same logic as in waypoint drawing)
      const label = loc.name.split(',')[0];
      ctx.font = 'bold 12px sans-serif';
      const maxCharsPerLine = 12;
      const words = label.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (testLine.length <= maxCharsPerLine) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      });
      if (currentLine) lines.push(currentLine);

      const lineHeight = 14;
      const infoLineHeight = 12;
      const nameLinesWidth = Math.max(...lines.map(line => ctx.measureText(line).width));

      ctx.font = 'bold 10px sans-serif';
      const distanceLine = loc.distance !== undefined ? `${loc.distance.toFixed(1)} NM` : null;
      const timeLine = loc.cumulativeTime !== undefined ? formatCumulativeTime(loc.cumulativeTime) : null;
      const distanceWidth = distanceLine ? ctx.measureText(distanceLine).width : 0;
      const timeWidth = timeLine ? ctx.measureText(timeLine).width : 0;
      const maxWidth = Math.max(nameLinesWidth, distanceWidth, timeWidth);
      const infoLines = [distanceLine, timeLine].filter(Boolean).length;
      const totalHeight = lineHeight * lines.length + infoLineHeight * infoLines;
      const padding = 3;
      const labelY = y + 22;

      return {
        x: x - maxWidth / 2 - padding,
        y: labelY - padding,
        width: maxWidth + padding * 2,
        height: totalHeight + padding * 2,
      };
    });

    // Helper function to format time (same as waypoint rendering)
    function formatCumulativeTime(minutes?: number): string | null {
      if (minutes === undefined || minutes === null) return null;
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return hours > 0 ? `${hours} h ${mins} min` : `${mins} min`;
    }

    let legNumber = 1; // Counter for leg numbering
    segments.forEach((segment) => {
      // Skip alternative legs (but don't increment counter)
      if (segment.isAlternative) return;

      // Skip if no data available
      if (!segment.magneticHeading || !segment.distance) {
        legNumber++; // Still increment even if skipped
        return;
      }

      // Calculate midpoint in UTM
      const fromUTM = toUTM(segment.fromLat, segment.fromLon);
      const toUTMCoord = toUTM(segment.toLat, segment.toLon);
      const midUTM = {
        easting: (fromUTM.easting + toUTMCoord.easting) / 2,
        northing: (fromUTM.northing + toUTMCoord.northing) / 2,
      };
      const [midX, midY] = toCanvas(midUTM.easting, midUTM.northing);

      // Build label lines
      const lines: string[] = [];

      // Title: Leg number
      lines.push(`Leg ${legNumber}`);

      // TC (True Course)
      if (segment.trueCourse !== undefined) {
        lines.push(`TC ${Math.round(segment.trueCourse).toString().padStart(3, '0')}°`);
      }

      // MH (Magnetic Heading)
      lines.push(`MH ${Math.round(segment.magneticHeading).toString().padStart(3, '0')}°`);

      // MH (climb) if different
      if (segment.climbMagneticHeading !== undefined &&
          Math.abs(segment.climbMagneticHeading - segment.magneticHeading) > 0.5) {
        lines.push(`MH↑ ${Math.round(segment.climbMagneticHeading).toString().padStart(3, '0')}°`);
      }

      // MH (descent) if different
      if (segment.descentMagneticHeading !== undefined &&
          Math.abs(segment.descentMagneticHeading - segment.magneticHeading) > 0.5) {
        lines.push(`MH↓ ${Math.round(segment.descentMagneticHeading).toString().padStart(3, '0')}°`);
      }

      // Distance
      lines.push(`Dist: ${segment.distance.toFixed(1)} NM`);

      // Fuel remaining
      if (segment.fuelRemaining !== undefined && segment.fuelUnit) {
        lines.push(`Left: ${segment.fuelRemaining.toFixed(1)} ${segment.fuelUnit}`);
      }

      // Measure label dimensions
      ctx.font = 'bold 10px sans-serif';
      const lineHeight = 12;
      const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
      const padding = 4;
      const labelWidth = maxWidth + padding * 2;
      const labelHeight = lines.length * lineHeight + padding * 2;

      // Offset label from line center (try placing it to the side)
      const offsetDistance = 30; // pixels away from line center
      let labelX = midX + offsetDistance;
      let labelY = midY - labelHeight / 2;

      // Simple collision avoidance: check if overlaps with existing labels
      let attempts = 0;
      const maxAttempts = 8;
      const offsets = [
        { x: offsetDistance, y: 0 },           // right
        { x: -offsetDistance, y: 0 },          // left
        { x: 0, y: -offsetDistance },          // top
        { x: 0, y: offsetDistance },           // bottom
        { x: offsetDistance, y: -offsetDistance }, // top-right
        { x: -offsetDistance, y: -offsetDistance }, // top-left
        { x: offsetDistance, y: offsetDistance }, // bottom-right
        { x: -offsetDistance, y: offsetDistance }, // bottom-left
      ];

      while (attempts < maxAttempts) {
        const offset = offsets[attempts];
        labelX = midX + offset.x;
        labelY = midY + offset.y - labelHeight / 2;

        // Check collision with existing labels
        const labelCollision = labels.some(existing => {
          return !(
            labelX + labelWidth < existing.x ||
            labelX > existing.x + existing.width ||
            labelY + labelHeight < existing.y ||
            labelY > existing.y + existing.height
          );
        });

        // Check collision with waypoint labels (using actual bounding boxes)
        const waypointLabelCollision = waypointLabelBoxes.some(wpBox => {
          return !(
            labelX + labelWidth < wpBox.x ||
            labelX > wpBox.x + wpBox.width ||
            labelY + labelHeight < wpBox.y ||
            labelY > wpBox.y + wpBox.height
          );
        });

        // Check collision with waypoint markers (circles/diamonds)
        const waypointMarkerCollision = waypointMarkers.some(marker => {
          // Check if any corner of the label is too close to the marker
          const corners = [
            { x: labelX, y: labelY },
            { x: labelX + labelWidth, y: labelY },
            { x: labelX, y: labelY + labelHeight },
            { x: labelX + labelWidth, y: labelY + labelHeight },
          ];
          return corners.some(corner => {
            const distance = Math.sqrt(
              Math.pow(corner.x - marker.x, 2) + Math.pow(corner.y - marker.y, 2)
            );
            return distance < marker.radius;
          });
        });

        if (!labelCollision && !waypointLabelCollision && !waypointMarkerCollision) break;
        attempts++;
      }

      // Store label position for collision detection
      labels.push({ x: labelX, y: labelY, lines, width: labelWidth, height: labelHeight });

      // Draw label background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.strokeStyle = '#0ea5e9'; // sky-500 border
      ctx.lineWidth = 2;
      ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
      ctx.strokeRect(labelX, labelY, labelWidth, labelHeight);

      // Draw label text
      ctx.fillStyle = '#1e293b'; // slate-800
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      lines.forEach((line, i) => {
        // First line (Leg X) in bold and slightly larger
        if (i === 0) {
          ctx.font = 'bold 11px sans-serif';
        } else {
          ctx.font = 'bold 10px sans-serif';
        }
        ctx.fillText(line, labelX + padding, labelY + padding + i * lineHeight);
      });

      // Increment leg number for next segment
      legNumber++;
    });
  }

  // Draw scale bar BASE (without tick legends)
  function drawScaleBarBase(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, scale: number, rect: { width: number; height: number }, printScale: number) {
    const x = 20;
    const y = rect.height - 40;

    // Scale bar lengths in meters (nautical miles: 1, 5, 10, 20, 50 NM)
    const nmLengths = [1, 5, 10, 20, 50];
    const lengths = nmLengths.map(nm => nm * 1852); // Convert to meters
    const targetPixels = 150; // Target scale bar width
    const lengthIndex = lengths.findIndex(l => l * scale > targetPixels);
    const lengthMeters = lengths[lengthIndex] || lengths[0];
    const lengthNM = nmLengths[lengthIndex] || nmLengths[0];
    const barWidth = lengthMeters * scale;

    // Determine scale name
    const scaleName = printScale === 500000 ? 'Sectional' : 'WAC';

    // Calculate background dimensions
    ctx.font = 'bold 12px sans-serif';
    const scaleText = scaleName;
    const scaleTextWidth = ctx.measureText(scaleText).width;
    const bgPadding = 6;
    const bgWidth = Math.max(barWidth, scaleTextWidth) + bgPadding * 2;
    const bgHeight = 45;

    // Draw semi-transparent gray background
    ctx.fillStyle = 'rgba(248, 250, 252, 0.6)';
    ctx.fillRect(x - bgPadding, y - bgPadding - 5, bgWidth, bgHeight);

    // Draw scale name at top
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(scaleText, x, y - bgPadding);

    // Draw bar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y + 10, barWidth, 4);

    // Draw ticks
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    [0, 0.5, 1].forEach(fraction => {
      const tickX = x + barWidth * fraction;
      ctx.beginPath();
      ctx.moveTo(tickX, y + 10);
      ctx.lineTo(tickX, y + 20);
      ctx.stroke();
    });

    // Draw labels
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('0', x, y + 22);
    ctx.fillText(`${lengthNM} NM`, x + barWidth, y + 22);
  }

  // Draw tick legends (distance and time marks legends)
  function drawTickLegends(ctx: CanvasRenderingContext2D, rect: { width: number; height: number }, tickIntervalNM: number, timeTickIntervalMin: number) {
    const scale = actualScaleRef.current;
    const x = 20;
    const y = rect.height - 40;
    const bgPadding = 6;

    // Calculate scale bar width to position legends
    const nmLengths = [1, 5, 10, 20, 50];
    const lengths = nmLengths.map(nm => nm * 1852);
    const targetPixels = 150;
    const lengthIndex = lengths.findIndex(l => l * scale > targetPixels);
    const lengthMeters = lengths[lengthIndex] || lengths[0];
    const barWidth = lengthMeters * scale;

    ctx.font = 'bold 12px sans-serif';
    const scaleTextWidth = ctx.measureText('WAC').width; // Use longer name for consistent width
    const scaleBgWidth = Math.max(barWidth, scaleTextWidth) + bgPadding * 2;

    // Draw distance reference legend (next to scale bar)
    const legendX = x + scaleBgWidth + 20;
    const legendY = y - bgPadding - 5;

    ctx.font = 'bold 12px sans-serif';
    const refTitle = 'Distance Marks';
    const refText = `⊥ = ${tickIntervalNM} NM`;
    const refTitleWidth = ctx.measureText(refTitle).width;
    const refTextWidth = ctx.measureText(refText).width;
    const legendWidth = Math.max(refTitleWidth, refTextWidth) + bgPadding * 2;
    const legendHeight = 42;

    // Draw legend background
    ctx.fillStyle = 'rgba(248, 250, 252, 0.6)';
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);

    // Draw legend title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(refTitle, legendX + bgPadding, legendY + bgPadding);

    // Draw reference symbol and text
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#0ea5e9';
    ctx.fillText(refText, legendX + bgPadding, legendY + bgPadding + 16);

    // Draw time tick reference (if enabled)
    if (timeTickIntervalMin > 0) {
      const timeLegendX = legendX + legendWidth + 20;
      const timeLegendY = legendY;

      ctx.font = 'bold 12px sans-serif';
      const timeRefTitle = 'Time Marks';
      const timeRefText = `/ = ${timeTickIntervalMin} min`;
      const timeRefTitleWidth = ctx.measureText(timeRefTitle).width;
      const timeRefTextWidth = ctx.measureText(timeRefText).width;
      const timeLegendWidth = Math.max(timeRefTitleWidth, timeRefTextWidth) + bgPadding * 2;
      const timeLegendHeight = 42;

      // Draw time legend background
      ctx.fillStyle = 'rgba(248, 250, 252, 0.6)';
      ctx.fillRect(timeLegendX, timeLegendY, timeLegendWidth, timeLegendHeight);

      // Draw time legend title
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(timeRefTitle, timeLegendX + bgPadding, timeLegendY + bgPadding);

      // Draw time reference symbol and text
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#a855f7';
      ctx.fillText(timeRefText, timeLegendX + bgPadding, timeLegendY + bgPadding + 16);
    }
  }

  /**
   * Calculate grid convergence angle (difference between grid north and true north)
   * Formula: γ = (λ - λ₀) × sin(φ)
   * where λ is longitude, λ₀ is central meridian, φ is latitude
   */
  function calculateGridConvergence(lat: number, lon: number, utmZone: number): number {
    // Central meridian for UTM zone: (zone - 1) * 6 - 180 + 3
    const centralMeridian = (utmZone - 1) * 6 - 180 + 3;
    const latRad = (lat * Math.PI) / 180;
    const deltaLon = lon - centralMeridian;

    // Grid convergence in degrees
    const convergence = deltaLon * Math.sin(latRad);

    return convergence;
  }

  /**
   * Draw north indicator showing grid north, true north, and magnetic north
   */
  function drawNorthIndicator(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    rect: { width: number; height: number },
    centerLat: number,
    centerLon: number,
    utmZone: number
  ) {
    const convergence = calculateGridConvergence(centerLat, centerLon, utmZone);

    // Calculate magnetic declination using WMM 2025-2030
    // Altitude in km (assume 0 for surface)
    const magneticDeclination = magvar(centerLat, centerLon, 0);

    // Position in top-right corner
    const x = rect.width - 100;
    const y = 60;
    const compassSize = 60;

    // Draw background (wider to accommodate three norths)
    ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
    ctx.fillRect(x - 10, y - 10, compassSize + 40, compassSize + 80);

    const centerX = x + compassSize / 2 + 10;
    const centerY = y + compassSize;

    // Draw Grid North (vertical line up - always points up on UTM grid)
    ctx.strokeStyle = '#64748b'; // slate-500 (neutral gray)
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX, y + 15);
    ctx.stroke();

    // Draw Grid North arrow
    ctx.beginPath();
    ctx.moveTo(centerX, y + 15);
    ctx.lineTo(centerX - 4, y + 23);
    ctx.moveTo(centerX, y + 15);
    ctx.lineTo(centerX + 4, y + 23);
    ctx.stroke();

    // Draw Grid North label
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('GN', centerX, y);

    // Draw True North (rotated by convergence angle from Grid North)
    // Positive convergence = true north is clockwise from grid north
    const convergenceRad = (convergence * Math.PI) / 180;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-convergenceRad); // Negative because canvas rotation is clockwise-positive

    // Draw True North line
    ctx.strokeStyle = '#2563eb'; // blue-600
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -compassSize + 15);
    ctx.stroke();

    // Draw True North arrow
    ctx.beginPath();
    ctx.moveTo(0, -compassSize + 15);
    ctx.lineTo(-3, -compassSize + 21);
    ctx.moveTo(0, -compassSize + 15);
    ctx.lineTo(3, -compassSize + 21);
    ctx.stroke();

    ctx.restore();

    // Draw True North label (not rotated)
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Position label offset based on convergence
    const tnLabelOffset = Math.abs(convergence) > 3 ? 18 : 12;
    const tnLabelX = centerX + Math.sin(convergenceRad) * tnLabelOffset;
    const tnLabelY = y - Math.cos(convergenceRad) * 3;
    ctx.fillText('TN', tnLabelX, tnLabelY);

    // Draw Magnetic North (rotated by magnetic declination from True North)
    // Magnetic declination is relative to true north
    // Total rotation from grid north = convergence + magnetic declination
    const totalMagneticRad = ((convergence + magneticDeclination) * Math.PI) / 180;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-totalMagneticRad);

    // Draw Magnetic North line
    ctx.strokeStyle = '#dc2626'; // red-600
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -compassSize + 15);
    ctx.stroke();

    // Draw Magnetic North arrow
    ctx.beginPath();
    ctx.moveTo(0, -compassSize + 15);
    ctx.lineTo(-3, -compassSize + 21);
    ctx.moveTo(0, -compassSize + 15);
    ctx.lineTo(3, -compassSize + 21);
    ctx.stroke();

    ctx.restore();

    // Draw Magnetic North label (not rotated)
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const mnLabelOffset = Math.abs(convergence + magneticDeclination) > 3 ? 18 : 12;
    const mnLabelX = centerX + Math.sin(totalMagneticRad) * mnLabelOffset;
    const mnLabelY = y - Math.cos(totalMagneticRad) * 3;
    ctx.fillText('MN', mnLabelX, mnLabelY);

    // Draw angle values at bottom
    ctx.fillStyle = '#1e293b';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const infoY = y + compassSize + 5;
    const infoX = x;

    // Grid convergence (GN → TN) - keep +/- format (geometric, not magnetic)
    const convergenceText = `GN→TN: ${convergence >= 0 ? '+' : ''}${convergence.toFixed(1)}°`;
    ctx.fillText(convergenceText, infoX, infoY);

    // Magnetic declination (TN → MN) - use E/W format
    const declinationText = `TN→MN: ${formatAngle(magneticDeclination)}`;
    ctx.fillText(declinationText, infoX, infoY + 12);

    // Total (GN → MN) - use E/W format
    const totalMagnetic = convergence + magneticDeclination;
    const totalText = `GN→MN: ${formatAngle(totalMagnetic)}`;
    ctx.fillText(totalText, infoX, infoY + 24);
  }

  // Mercator mode rendering
  if (mapMode === 'mercator') {
    return <MercatorMap locations={locations} />;
  }

  // UTM mode rendering - show loading only when waiting for OSM data
  if (loading) {
    return (
      <div className="w-full h-[600px] rounded-xl bg-slate-800/50 border-2 border-gray-700 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading map data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[600px] rounded-xl bg-slate-800/50 border-2 border-red-500/30 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">{error}</p>
          <p className="text-sm text-gray-400">Please try again</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full h-[600px] rounded-xl border-2 border-gray-700 print:h-[800px] print:border print:border-gray-400"
        style={{ imageRendering: 'crisp-edges' }}
      />

      {/* Rendering overlay */}
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30 rounded-xl pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-sm px-4 py-3 rounded-lg border border-gray-600">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-500"></div>
              <p className="text-sm text-gray-300">Rendering...</p>
            </div>
          </div>
        </div>
      )}

      {/* Info overlay */}
      <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-600 pointer-events-none">
        <p className="text-xs font-mono text-white">
          UTM Zone {utmZone}{hemisphere} • WGS-84
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Grid: 10 NM major, 1 NM minor
        </p>
        <p className="text-xs font-bold text-sky-400 mt-1">
          Scale: 1:{(printScale / 1000).toFixed(0)},000 {printScale === 500000 ? '(Sectional)' : '(WAC)'}
        </p>
      </div>

    </div>
  );
});

// Mercator Map Component (Web Mercator with Leaflet + OSM tiles)
function MercatorMap({ locations }: { locations: LocationData[] }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Safe: Detecting client-side rendering for browser-only Leaflet library
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
  }, []);

  // Calculate bounds for map
  const bounds = useMemo(() => {
    if (locations.length === 0) return undefined;
    const lats = locations.map(l => l.lat);
    const lons = locations.map(l => l.lon);
    return [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)],
    ] as [[number, number], [number, number]];
  }, [locations]);

  // Calculate center
  const center = useMemo(() => {
    if (locations.length === 0) return [0, 0] as [number, number];
    const avgLat = locations.reduce((sum, l) => sum + l.lat, 0) / locations.length;
    const avgLon = locations.reduce((sum, l) => sum + l.lon, 0) / locations.length;
    return [avgLat, avgLon] as [number, number];
  }, [locations]);

  // Route waypoints (skip fly-over)
  const routePoints = useMemo(() => {
    return locations
      .filter(loc => !loc.isFlyOver)
      .map(loc => [loc.lat, loc.lon] as [number, number]);
  }, [locations]);

  if (!isClient) {
    return (
      <div className="w-full h-[600px] rounded-xl bg-slate-800/50 border-2 border-gray-700 flex items-center justify-center">
        <p className="text-gray-400">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px] rounded-xl border-2 border-gray-700 overflow-hidden">
      <MapContainer
        center={center}
        bounds={bounds}
        boundsOptions={{ padding: [50, 50] }}
        className="w-full h-full"
        scrollWheelZoom={true}
        style={{ background: '#f8f9fa' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Route line (skip fly-over waypoints) */}
        {routePoints.length >= 2 && (
          <Polyline
            positions={routePoints}
            pathOptions={{
              color: CHART_STYLES.route.line.color,
              weight: CHART_STYLES.route.line.width,
              opacity: 0.8,
            }}
          />
        )}

        {/* Waypoint markers */}
        {locations.map((loc, index) => (
          <Marker
            key={index}
            position={[loc.lat, loc.lon]}
            icon={createWaypointIcon(loc.isFlyOver || false)}
          >
            <Popup>
              <div className="text-center">
                <div className="font-bold">{loc.name.split(',')[0]}</div>
                {loc.isFlyOver && (
                  <div className="text-xs text-amber-600">Fly-over</div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Info overlay */}
      <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-600 pointer-events-none z-[1000]">
        <p className="text-xs font-mono text-white">
          Web Mercator • WGS-84 • OSM Tiles
        </p>
      </div>
    </div>
  );
}

// Create custom Leaflet icon for waypoints
function createWaypointIcon(isFlyOver: boolean) {
  if (typeof window === 'undefined' || !L) return undefined;

  const color = isFlyOver ? '#f59e0b' : CHART_STYLES.route.waypoint.fill;
  const shape = isFlyOver ? 'diamond' : 'circle';

  const svg = `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      ${shape === 'circle'
        ? `<circle cx="16" cy="16" r="10" fill="${color}" stroke="#ffffff" stroke-width="2"/>`
        : `<path d="M 16 6 L 26 16 L 16 26 L 6 16 Z" fill="${color}" stroke="#ffffff" stroke-width="2"/>`
      }
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}
