#!/usr/bin/env npx tsx
/**
 * Fix missing/invalid provinces in argentina.json using OSM province boundaries
 * Uses point-in-polygon with actual province polygons for accurate assignment
 */

import * as fs from "fs";
import * as path from "path";

// Ray casting algorithm for point-in-polygon
function pointInPolygon(
  lat: number,
  lon: number,
  polygon: { lat: number; lon: number }[]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const yi = polygon[i].lat;
    const xi = polygon[i].lon;
    const yj = polygon[j].lat;
    const xj = polygon[j].lon;

    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

interface OsmElement {
  type: string;
  id: number;
  bounds: {
    minlat: number;
    maxlat: number;
    minlon: number;
    maxlon: number;
  };
  tags?: {
    name?: string;
    [key: string]: string | undefined;
  };
  members?: {
    type: string;
    role: string;
    geometry?: { lat: number; lon: number }[];
  }[];
}

interface Province {
  name: string;
  bounds: OsmElement["bounds"];
  polygons: { lat: number; lon: number }[][]; // Array of polygon rings
}

async function main() {
  const scriptsDir = path.dirname(__filename);
  const dataDir = path.join(scriptsDir, "..", "data");

  console.log("Loading OSM province boundaries...");
  const osmPath = path.join(dataDir, "osm-cache", "argentina-provinces-raw.json");
  const osmData = JSON.parse(fs.readFileSync(osmPath, "utf-8")) as { elements: OsmElement[] };

  // Build province list with polygons
  const provinces: Province[] = [];

  for (const element of osmData.elements) {
    if (!element.tags?.name || !element.bounds || !element.members) continue;

    // Extract all outer polygon rings from members
    const polygons: { lat: number; lon: number }[][] = [];
    for (const member of element.members) {
      if (member.role === "outer" && member.geometry && member.geometry.length > 3) {
        polygons.push(member.geometry);
      }
    }

    if (polygons.length > 0) {
      provinces.push({
        name: element.tags.name,
        bounds: element.bounds,
        polygons,
      });
    }
  }

  console.log(`Loaded ${provinces.length} provinces with ${provinces.reduce((sum, p) => sum + p.polygons.length, 0)} polygon rings`);

  // Load argentina.json
  console.log("\nLoading argentina.json...");
  const argentinaPath = path.join(dataDir, "ad-lads", "argentina.json");
  const argentinaData = JSON.parse(fs.readFileSync(argentinaPath, "utf-8"));

  // Invalid/partial province names from PDF parsing
  const INVALID_PROVINCES = ["LA", "BUENOS", "SAN", "ENTRE", "SANTA", "RIO"];

  let fixed = 0;
  let fixedFromNull = 0;
  let notFound = 0;

  for (const aerodrome of argentinaData.data) {
    const isInvalid = INVALID_PROVINCES.includes(aerodrome.province);
    const isNull = aerodrome.province === null;

    // Skip if province is already valid
    if (!isInvalid && !isNull) continue;

    // First filter by bounding box for performance
    const candidates = provinces.filter(
      (p) =>
        aerodrome.lat >= p.bounds.minlat &&
        aerodrome.lat <= p.bounds.maxlat &&
        aerodrome.lon >= p.bounds.minlon &&
        aerodrome.lon <= p.bounds.maxlon
    );

    // Try point-in-polygon first
    let foundProvince: string | null = null;
    for (const province of candidates) {
      for (const polygon of province.polygons) {
        if (pointInPolygon(aerodrome.lat, aerodrome.lon, polygon)) {
          foundProvince = province.name;
          break;
        }
      }
      if (foundProvince) break;
    }

    // Fallback: if no polygon match but we have bbox candidates,
    // pick the one where the point is closest to the center
    if (!foundProvince && candidates.length > 0) {
      let bestDist = Infinity;
      for (const province of candidates) {
        const centerLat = (province.bounds.minlat + province.bounds.maxlat) / 2;
        const centerLon = (province.bounds.minlon + province.bounds.maxlon) / 2;
        const dist = Math.sqrt(
          Math.pow(aerodrome.lat - centerLat, 2) + Math.pow(aerodrome.lon - centerLon, 2)
        );
        if (dist < bestDist) {
          bestDist = dist;
          foundProvince = province.name;
        }
      }
    }

    if (foundProvince) {
      const oldProvince = aerodrome.province;
      aerodrome.province = foundProvince;

      if (isInvalid) {
        console.log(`  Fixed: ${aerodrome.name} - "${oldProvince}" → "${foundProvince}"`);
        fixed++;
      } else {
        fixedFromNull++;
      }
    } else {
      notFound++;
    }
  }

  console.log(`\nFixed ${fixed} invalid provinces`);
  console.log(`Filled ${fixedFromNull} null provinces`);
  console.log(`Could not determine province for ${notFound} aerodromes (outside Argentina bounds)`);

  // Save updated data
  fs.writeFileSync(argentinaPath, JSON.stringify(argentinaData, null, 2));
  console.log(`\nSaved to ${argentinaPath}`);

  // Show province distribution
  const byProvince: Record<string, number> = {};
  for (const a of argentinaData.data) {
    const p = a.province || "Unknown";
    byProvince[p] = (byProvince[p] || 0) + 1;
  }

  console.log("\nProvince distribution (top 15):");
  Object.entries(byProvince)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([p, c]) => console.log(`  ${p}: ${c}`));

  const unknownCount = byProvince["Unknown"] || 0;
  if (unknownCount > 0) {
    console.log(`\nNote: ${unknownCount} aerodromes still without province (likely outside Argentina)`);
  }
}

main().catch(console.error);
