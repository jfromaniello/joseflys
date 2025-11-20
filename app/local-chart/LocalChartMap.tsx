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

interface LocationData {
  name: string;
  lat: number;
  lon: number;
  isFlyOver?: boolean; // If true, shown on map but skipped in route line
}

type MapMode = 'utm' | 'mercator';

interface LocalChartMapProps {
  locations: LocationData[];
  utmZone: number;
  hemisphere: 'N' | 'S';
  mapMode: MapMode;
  printScale?: number; // e.g., 50000 for 1:50,000
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
      motorway: { color: '#ef4444', width: 3 },
      trunk: { color: '#f97316', width: 2.5 },
      primary: { color: '#eab308', width: 2 },
      secondary: { color: '#facc15', width: 1.5 },
    },
    water: { fill: '#93c5fd', stroke: '#3b82f6', width: 1 },
    wetland: { fill: '#bfdbfe', stroke: '#3b82f6', width: 1, pattern: true }, // Lighter blue with pattern
    coastline: { color: '#0284c7', width: 2 }, // Dark blue for coastlines
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
    utmZone,
    hemisphere,
    mapMode,
    printScale = 100000, // Default 1:100,000
  }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [osmData, setOsmData] = useState<OSMData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const actualScaleRef = useRef<number>(1); // Store the actual scale used for rendering

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

  // Render chart on canvas
  useEffect(() => {
    if (!canvasRef.current || !osmData || loading) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (high DPI) - fixed size for screen display
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

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
    // The scale should make the content fit the canvas, regardless of printScale
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
    const toCanvas = (easting: number, northing: number): [number, number] => {
      const x = (easting - boundsMinE) * scale + offsetX;
      const y = rect.height - ((northing - boundsMinN) * scale + offsetY); // Flip Y axis
      return [x, y];
    };

    // Clear canvas
    ctx.fillStyle = CHART_STYLES.background;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw UTM grid
    drawUTMGrid(ctx, boundsMinE, boundsMaxE, boundsMinN, boundsMaxN, toCanvas, rect);

    // Draw OSM features (pass waypoint names to avoid duplicates)
    const waypointNames = utmLocations.map(loc =>
      loc.name.split(',')[0].trim().toLowerCase()
    );
    drawOSMFeatures(ctx, osmData, toUTM, toCanvas, waypointNames);

    // Draw route line (skip fly-over waypoints)
    const routeWaypoints = utmLocations.filter(loc => !loc.isFlyOver);
    if (routeWaypoints.length >= 2) {
      ctx.strokeStyle = CHART_STYLES.route.line.color;
      ctx.lineWidth = CHART_STYLES.route.line.width;
      ctx.beginPath();
      routeWaypoints.forEach((loc, i) => {
        const [x, y] = toCanvas(loc.utm.easting, loc.utm.northing);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }

    // Draw waypoint markers (AFTER OSM features so they appear on top)
    utmLocations.forEach((loc) => {
      const [x, y] = toCanvas(loc.utm.easting, loc.utm.northing);

      // Different style for fly-over waypoints
      if (loc.isFlyOver) {
        // Fly-over: Diamond shape with purple color (para que no se mezcle con carreteras)
        ctx.fillStyle = '#a855f7'; // purple-500
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const size = CHART_STYLES.route.waypoint.size;
        ctx.moveTo(x, y - size); // top
        ctx.lineTo(x + size, y); // right
        ctx.lineTo(x, y + size); // bottom
        ctx.lineTo(x - size, y); // left
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // Regular waypoint: Circle
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

      // Word wrap at ~12 characters
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

      // Measure text to create background box
      const lineHeight = 14; // Approximate height for 12px font
      const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
      const totalHeight = lineHeight * lines.length;
      const padding = 3;
      const labelY = y + 18;

      // Draw semi-transparent background
      ctx.fillStyle = 'rgba(248, 250, 252, 0.85)'; // slate-50 with opacity
      ctx.fillRect(
        x - maxWidth / 2 - padding,
        labelY - padding,
        maxWidth + padding * 2,
        totalHeight + padding * 2
      );

      // Draw text (centered, multiple lines)
      ctx.fillStyle = '#1e293b';
      lines.forEach((line, i) => {
        ctx.fillText(line, x, labelY + i * lineHeight);
      });
    });

    // Draw scale bar
    drawScaleBar(ctx, scale, rect, printScale);

    // Calculate center of map in geographic coordinates for grid convergence
    const centerLat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
    const centerLon = locations.reduce((sum, loc) => sum + loc.lon, 0) / locations.length;

    // Draw north indicator
    drawNorthIndicator(ctx, rect, centerLat, centerLon, utmZone);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [osmData, loading, locations, utmZone, hemisphere, printScale]);

  // Draw UTM grid with labels
  function drawUTMGrid(
    ctx: CanvasRenderingContext2D,
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
    ctx: CanvasRenderingContext2D,
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

    // Cities
    byType.city.forEach(feature => {
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

        // Draw city name
        if (feature.properties.name) {
          ctx.fillStyle = CHART_STYLES.features.city.color;
          ctx.font = `${CHART_STYLES.features.city.size}px sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(feature.properties.name, x + 6, y);
        }
      }
    });
  }

  function drawLineString(
    ctx: CanvasRenderingContext2D,
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
    ctx: CanvasRenderingContext2D,
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
    ctx: CanvasRenderingContext2D,
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

  function drawScaleBar(ctx: CanvasRenderingContext2D, scale: number, rect: { width: number; height: number }, printScale: number) {
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
    ctx.fillStyle = 'rgba(248, 250, 252, 0.85)'; // slate-50 with opacity
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
    ctx: CanvasRenderingContext2D,
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

  // UTM mode rendering
  if (loading) {
    return (
      <div className="w-full h-[600px] rounded-xl bg-slate-800/50 border-2 border-gray-700 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading map data from OpenStreetMap...</p>
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
async function createWaypointIcon(isFlyOver: boolean) {
  if (typeof window === 'undefined') return undefined;

  const L = await import('leaflet');

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
