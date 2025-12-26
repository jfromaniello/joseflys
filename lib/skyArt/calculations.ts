/**
 * Sky Art Calculations - Convert SVG paths to geographic coordinates
 * for "GPS art" flight planning
 */

/**
 * A point in 2D space (SVG coordinates, normalized, or geographic)
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * A geographic coordinate
 */
export interface GeoPoint {
  lat: number;
  lon: number;
}

/**
 * A path consisting of multiple strokes (pen lifts between strokes)
 */
export interface SkyArtPath {
  /** Multiple strokes, each stroke is a continuous line */
  strokes: GeoPoint[][];
  /** Total distance in nautical miles */
  totalDistanceNM: number;
  /** Bounding box in geographic coordinates */
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  /** Center point */
  center: GeoPoint;
  /** Width in nautical miles */
  widthNM: number;
  /** Height in nautical miles */
  heightNM: number;
}

/**
 * SVG path command types we support
 */
type PathCommand =
  | { type: "M"; x: number; y: number } // Move to
  | { type: "L"; x: number; y: number } // Line to
  | { type: "H"; x: number } // Horizontal line
  | { type: "V"; y: number } // Vertical line
  | { type: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number } // Cubic bezier
  | { type: "S"; x2: number; y2: number; x: number; y: number } // Smooth cubic
  | { type: "Q"; x1: number; y1: number; x: number; y: number } // Quadratic bezier
  | { type: "T"; x: number; y: number } // Smooth quadratic
  | { type: "A"; rx: number; ry: number; rotation: number; largeArc: boolean; sweep: boolean; x: number; y: number } // Arc
  | { type: "Z" }; // Close path

/**
 * Parse an SVG path string into commands
 * Supports both absolute and relative commands
 */
export function parseSvgPath(d: string): PathCommand[] {
  const commands: PathCommand[] = [];
  
  // Regex to match path commands and their parameters
  // This handles the SVG path syntax with commands followed by numbers
  const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  let lastControlX = 0;
  let lastControlY = 0;
  let lastCommand = "";
  
  let match;
  while ((match = regex.exec(d)) !== null) {
    const command = match[1];
    const paramsStr = match[2].trim();
    
    // Parse numbers from the parameter string
    const params = paramsStr
      .replace(/,/g, " ")
      .replace(/-/g, " -")
      .split(/\s+/)
      .filter(s => s.length > 0)
      .map(Number);
    
    const isRelative = command === command.toLowerCase();
    const cmd = command.toUpperCase();
    
    // Helper to convert relative to absolute
    const abs = (val: number, base: number) => isRelative ? base + val : val;
    
    switch (cmd) {
      case "M": {
        // Move to - can have multiple coordinate pairs (implicit L after first)
        for (let i = 0; i < params.length; i += 2) {
          const x = abs(params[i], currentX);
          const y = abs(params[i + 1], currentY);
          if (i === 0) {
            commands.push({ type: "M", x, y });
            startX = x;
            startY = y;
          } else {
            commands.push({ type: "L", x, y });
          }
          currentX = x;
          currentY = y;
        }
        break;
      }
      
      case "L": {
        for (let i = 0; i < params.length; i += 2) {
          const x = abs(params[i], currentX);
          const y = abs(params[i + 1], currentY);
          commands.push({ type: "L", x, y });
          currentX = x;
          currentY = y;
        }
        break;
      }
      
      case "H": {
        for (const param of params) {
          const x = abs(param, currentX);
          commands.push({ type: "L", x, y: currentY });
          currentX = x;
        }
        break;
      }
      
      case "V": {
        for (const param of params) {
          const y = abs(param, currentY);
          commands.push({ type: "L", x: currentX, y });
          currentY = y;
        }
        break;
      }
      
      case "C": {
        for (let i = 0; i < params.length; i += 6) {
          const x1 = abs(params[i], currentX);
          const y1 = abs(params[i + 1], currentY);
          const x2 = abs(params[i + 2], currentX);
          const y2 = abs(params[i + 3], currentY);
          const x = abs(params[i + 4], currentX);
          const y = abs(params[i + 5], currentY);
          commands.push({ type: "C", x1, y1, x2, y2, x, y });
          lastControlX = x2;
          lastControlY = y2;
          currentX = x;
          currentY = y;
        }
        break;
      }
      
      case "S": {
        for (let i = 0; i < params.length; i += 4) {
          // Reflect last control point
          let x1 = currentX;
          let y1 = currentY;
          if (lastCommand === "C" || lastCommand === "S") {
            x1 = 2 * currentX - lastControlX;
            y1 = 2 * currentY - lastControlY;
          }
          const x2 = abs(params[i], currentX);
          const y2 = abs(params[i + 1], currentY);
          const x = abs(params[i + 2], currentX);
          const y = abs(params[i + 3], currentY);
          commands.push({ type: "C", x1, y1, x2, y2, x, y });
          lastControlX = x2;
          lastControlY = y2;
          currentX = x;
          currentY = y;
        }
        break;
      }
      
      case "Q": {
        for (let i = 0; i < params.length; i += 4) {
          const x1 = abs(params[i], currentX);
          const y1 = abs(params[i + 1], currentY);
          const x = abs(params[i + 2], currentX);
          const y = abs(params[i + 3], currentY);
          commands.push({ type: "Q", x1, y1, x, y });
          lastControlX = x1;
          lastControlY = y1;
          currentX = x;
          currentY = y;
        }
        break;
      }
      
      case "T": {
        for (let i = 0; i < params.length; i += 2) {
          // Reflect last control point
          let x1 = currentX;
          let y1 = currentY;
          if (lastCommand === "Q" || lastCommand === "T") {
            x1 = 2 * currentX - lastControlX;
            y1 = 2 * currentY - lastControlY;
          }
          const x = abs(params[i], currentX);
          const y = abs(params[i + 1], currentY);
          commands.push({ type: "Q", x1, y1, x, y });
          lastControlX = x1;
          lastControlY = y1;
          currentX = x;
          currentY = y;
        }
        break;
      }
      
      case "A": {
        for (let i = 0; i < params.length; i += 7) {
          const rx = Math.abs(params[i]);
          const ry = Math.abs(params[i + 1]);
          const rotation = params[i + 2];
          const largeArc = params[i + 3] !== 0;
          const sweep = params[i + 4] !== 0;
          const x = abs(params[i + 5], currentX);
          const y = abs(params[i + 6], currentY);
          commands.push({ type: "A", rx, ry, rotation, largeArc, sweep, x, y });
          currentX = x;
          currentY = y;
        }
        break;
      }
      
      case "Z": {
        commands.push({ type: "Z" });
        currentX = startX;
        currentY = startY;
        break;
      }
    }
    
    lastCommand = cmd;
  }
  
  return commands;
}

/**
 * Sample points along a cubic bezier curve
 */
function sampleCubicBezier(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  numSamples: number
): Point[] {
  const points: Point[] = [];
  for (let i = 1; i <= numSamples; i++) {
    const t = i / numSamples;
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    
    points.push({
      x: mt3 * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x3,
      y: mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3,
    });
  }
  return points;
}

/**
 * Sample points along a quadratic bezier curve
 */
function sampleQuadraticBezier(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  numSamples: number
): Point[] {
  const points: Point[] = [];
  for (let i = 1; i <= numSamples; i++) {
    const t = i / numSamples;
    const mt = 1 - t;
    
    points.push({
      x: mt * mt * x0 + 2 * mt * t * x1 + t * t * x2,
      y: mt * mt * y0 + 2 * mt * t * y1 + t * t * y2,
    });
  }
  return points;
}

/**
 * Sample points along an elliptical arc
 * Uses the SVG arc parametrization algorithm
 */
function sampleArc(
  x0: number, y0: number,
  rx: number, ry: number,
  rotation: number,
  largeArc: boolean,
  sweep: boolean,
  x1: number, y1: number,
  numSamples: number
): Point[] {
  // Handle degenerate cases
  if (rx === 0 || ry === 0) {
    return [{ x: x1, y: y1 }];
  }
  
  const phi = (rotation * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  
  // Step 1: Compute (x1', y1')
  const dx = (x0 - x1) / 2;
  const dy = (y0 - y1) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;
  
  // Correct radii if necessary
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const sqrtLambda = Math.sqrt(lambda);
    rx *= sqrtLambda;
    ry *= sqrtLambda;
  }
  
  // Step 2: Compute (cx', cy')
  const rx2 = rx * rx;
  const ry2 = ry * ry;
  const x1p2 = x1p * x1p;
  const y1p2 = y1p * y1p;
  
  let sq = Math.max(0, (rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2) / (rx2 * y1p2 + ry2 * x1p2));
  sq = Math.sqrt(sq);
  if (largeArc === sweep) sq = -sq;
  
  const cxp = sq * (rx * y1p) / ry;
  const cyp = sq * (-(ry * x1p) / rx);
  
  // Step 3: Compute (cx, cy)
  const cx = cosPhi * cxp - sinPhi * cyp + (x0 + x1) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y0 + y1) / 2;
  
  // Step 4: Compute theta1 and dtheta
  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx;
  const vy = (-y1p - cyp) / ry;
  
  const n = Math.sqrt(ux * ux + uy * uy);
  let theta1 = Math.acos(Math.max(-1, Math.min(1, ux / n)));
  if (uy < 0) theta1 = -theta1;
  
  const dot = ux * vx + uy * vy;
  const len = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy));
  let dtheta = Math.acos(Math.max(-1, Math.min(1, dot / len)));
  if (ux * vy - uy * vx < 0) dtheta = -dtheta;
  
  if (sweep && dtheta < 0) dtheta += 2 * Math.PI;
  if (!sweep && dtheta > 0) dtheta -= 2 * Math.PI;
  
  // Sample points
  const points: Point[] = [];
  for (let i = 1; i <= numSamples; i++) {
    const t = i / numSamples;
    const theta = theta1 + t * dtheta;
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);
    
    points.push({
      x: cosPhi * rx * cosTheta - sinPhi * ry * sinTheta + cx,
      y: sinPhi * rx * cosTheta + cosPhi * ry * sinTheta + cy,
    });
  }
  
  return points;
}

/**
 * Convert SVG path commands to arrays of points (strokes)
 * Returns multiple strokes for paths with M commands or Z (close path)
 */
export function commandsToPoints(commands: PathCommand[], samplesPerCurve: number = 20): Point[][] {
  const strokes: Point[][] = [];
  let currentStroke: Point[] = [];
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  
  for (const cmd of commands) {
    switch (cmd.type) {
      case "M":
        // Start a new stroke
        if (currentStroke.length > 0) {
          strokes.push(currentStroke);
        }
        currentStroke = [{ x: cmd.x, y: cmd.y }];
        currentX = cmd.x;
        currentY = cmd.y;
        startX = cmd.x;
        startY = cmd.y;
        break;
        
      case "L":
        currentStroke.push({ x: cmd.x, y: cmd.y });
        currentX = cmd.x;
        currentY = cmd.y;
        break;
        
      case "C": {
        const bezierPoints = sampleCubicBezier(
          currentX, currentY,
          cmd.x1, cmd.y1,
          cmd.x2, cmd.y2,
          cmd.x, cmd.y,
          samplesPerCurve
        );
        currentStroke.push(...bezierPoints);
        currentX = cmd.x;
        currentY = cmd.y;
        break;
      }
        
      case "Q": {
        const quadPoints = sampleQuadraticBezier(
          currentX, currentY,
          cmd.x1, cmd.y1,
          cmd.x, cmd.y,
          samplesPerCurve
        );
        currentStroke.push(...quadPoints);
        currentX = cmd.x;
        currentY = cmd.y;
        break;
      }
        
      case "A": {
        const arcPoints = sampleArc(
          currentX, currentY,
          cmd.rx, cmd.ry,
          cmd.rotation,
          cmd.largeArc,
          cmd.sweep,
          cmd.x, cmd.y,
          samplesPerCurve
        );
        currentStroke.push(...arcPoints);
        currentX = cmd.x;
        currentY = cmd.y;
        break;
      }
        
      case "Z":
        // Close path - line back to start
        if (currentX !== startX || currentY !== startY) {
          currentStroke.push({ x: startX, y: startY });
        }
        currentX = startX;
        currentY = startY;
        break;
    }
  }
  
  // Don't forget the last stroke
  if (currentStroke.length > 0) {
    strokes.push(currentStroke);
  }
  
  return strokes;
}

/**
 * Normalize points to fit in a [0, 1] x [0, 1] box
 * Maintains aspect ratio
 */
export function normalizePoints(strokes: Point[][]): { strokes: Point[][]; aspectRatio: number } {
  // Find bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (const stroke of strokes) {
    for (const p of stroke) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  }
  
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const aspectRatio = width / height;
  
  // Normalize to [0, 1] maintaining aspect ratio
  const scale = Math.max(width, height);
  
  const normalizedStrokes = strokes.map(stroke =>
    stroke.map(p => ({
      x: (p.x - minX) / scale,
      y: (p.y - minY) / scale,
    }))
  );
  
  return { strokes: normalizedStrokes, aspectRatio };
}

/**
 * Convert normalized points to geographic coordinates
 * Uses Web Mercator projection for accurate local scaling
 * 
 * @param strokes - Normalized strokes (0-1 range)
 * @param centerLat - Center latitude
 * @param centerLon - Center longitude
 * @param widthNM - Desired width in nautical miles
 * @param rotationDeg - Rotation in degrees (clockwise, 0 = north up)
 */
export function projectToGeographic(
  strokes: Point[][],
  centerLat: number,
  centerLon: number,
  widthNM: number,
  rotationDeg: number = 0
): GeoPoint[][] {
  // Nautical miles per degree at the equator
  const NM_PER_DEG_LAT = 60;
  
  // Longitude degrees per NM varies with latitude (Web Mercator correction)
  const cosLat = Math.cos((centerLat * Math.PI) / 180);
  const NM_PER_DEG_LON = NM_PER_DEG_LAT * cosLat;
  
  // Convert rotation to radians
  const rotationRad = (rotationDeg * Math.PI) / 180;
  const cosRot = Math.cos(rotationRad);
  const sinRot = Math.sin(rotationRad);
  
  // Find the extent of the normalized points
  let maxExtent = 0;
  for (const stroke of strokes) {
    for (const p of stroke) {
      maxExtent = Math.max(maxExtent, p.x, p.y);
    }
  }
  
  // Scale factor: we want the widthNM to cover the extent
  const scaleFactor = widthNM / (maxExtent || 1);
  
  return strokes.map(stroke =>
    stroke.map(p => {
      // Center the points around (0, 0)
      const cx = p.x - maxExtent / 2;
      const cy = p.y - maxExtent / 2;
      
      // Apply rotation (clockwise, with north = positive Y in SVG becoming north on map)
      // SVG Y increases downward, so we flip it
      const rotX = cx * cosRot - (-cy) * sinRot;
      const rotY = cx * sinRot + (-cy) * cosRot;
      
      // Scale to nautical miles
      const nmX = rotX * scaleFactor;
      const nmY = rotY * scaleFactor;
      
      // Convert to geographic coordinates
      return {
        lat: centerLat + nmY / NM_PER_DEG_LAT,
        lon: centerLon + nmX / NM_PER_DEG_LON,
      };
    })
  );
}

/**
 * Calculate the total distance of a path in nautical miles
 */
export function calculateTotalDistance(strokes: GeoPoint[][]): number {
  const NM_PER_DEG_LAT = 60;
  let total = 0;
  
  for (const stroke of strokes) {
    for (let i = 1; i < stroke.length; i++) {
      const prev = stroke[i - 1];
      const curr = stroke[i];
      
      const dLat = curr.lat - prev.lat;
      const dLon = curr.lon - prev.lon;
      
      // Approximate distance using Pythagorean theorem with latitude correction
      const avgLat = (prev.lat + curr.lat) / 2;
      const cosLat = Math.cos((avgLat * Math.PI) / 180);
      
      const dLatNM = dLat * NM_PER_DEG_LAT;
      const dLonNM = dLon * NM_PER_DEG_LAT * cosLat;
      
      total += Math.sqrt(dLatNM * dLatNM + dLonNM * dLonNM);
    }
  }
  
  return total;
}

/**
 * Main function: Convert SVG path to geographic coordinates
 */
export function svgPathToGeoPath(
  svgPath: string,
  centerLat: number,
  centerLon: number,
  widthNM: number,
  rotationDeg: number = 0
): SkyArtPath {
  // Parse SVG path
  const commands = parseSvgPath(svgPath);
  
  // Convert to points
  const rawStrokes = commandsToPoints(commands);
  
  // Normalize
  const { strokes: normalizedStrokes } = normalizePoints(rawStrokes);
  
  // Project to geographic coordinates
  const geoStrokes = projectToGeographic(
    normalizedStrokes,
    centerLat,
    centerLon,
    widthNM,
    rotationDeg
  );
  
  // Calculate bounds
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;
  
  for (const stroke of geoStrokes) {
    for (const p of stroke) {
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
      minLon = Math.min(minLon, p.lon);
      maxLon = Math.max(maxLon, p.lon);
    }
  }
  
  // Calculate dimensions
  const NM_PER_DEG_LAT = 60;
  const centerLatRad = (centerLat * Math.PI) / 180;
  const cosLat = Math.cos(centerLatRad);
  
  const heightNM = (maxLat - minLat) * NM_PER_DEG_LAT;
  const actualWidthNM = (maxLon - minLon) * NM_PER_DEG_LAT * cosLat;
  
  return {
    strokes: geoStrokes,
    totalDistanceNM: calculateTotalDistance(geoStrokes),
    bounds: { minLat, maxLat, minLon, maxLon },
    center: { lat: centerLat, lon: centerLon },
    widthNM: actualWidthNM,
    heightNM,
  };
}

/**
 * Generate GPX content from a sky art path
 */
export function generateSkyArtGPX(
  path: SkyArtPath,
  templateName: string,
  locationName?: string
): string {
  const timestamp = new Date().toISOString();
  const name = locationName 
    ? `Sky Art: ${templateName} at ${locationName}`
    : `Sky Art: ${templateName}`;
  
  // Flatten all strokes into a single route with waypoints
  let waypointIndex = 0;
  const routePoints: string[] = [];
  
  for (let strokeIdx = 0; strokeIdx < path.strokes.length; strokeIdx++) {
    const stroke = path.strokes[strokeIdx];
    for (let pointIdx = 0; pointIdx < stroke.length; pointIdx++) {
      const point = stroke[pointIdx];
      waypointIndex++;
      
      let pointName: string;
      if (strokeIdx === 0 && pointIdx === 0) {
        pointName = "START";
      } else if (strokeIdx === path.strokes.length - 1 && pointIdx === stroke.length - 1) {
        pointName = "END";
      } else if (pointIdx === 0) {
        pointName = `STROKE${strokeIdx + 1}`;
      } else {
        pointName = `WPT${String(waypointIndex).padStart(3, "0")}`;
      }
      
      routePoints.push(
        `    <rtept lat="${point.lat.toFixed(6)}" lon="${point.lon.toFixed(6)}">` +
        `<name>${pointName}</name></rtept>`
      );
    }
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="joseflys.com/sky-art" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${name}</name>
    <desc>Sky Art flight path - ${path.totalDistanceNM.toFixed(1)} NM total</desc>
    <time>${timestamp}</time>
  </metadata>
  <rte>
    <name>${name}</name>
${routePoints.join("\n")}
  </rte>
</gpx>`;
}
