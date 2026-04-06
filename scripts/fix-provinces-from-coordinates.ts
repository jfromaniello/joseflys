#!/usr/bin/env npx tsx
/**
 * Fix missing/invalid provinces in argentina.json using OSM province boundaries
 * Uses bounding boxes with smallest-area selection for overlapping regions
 */

import * as fs from "fs";
import * as path from "path";

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
}

interface Province {
  name: string;
  bounds: OsmElement["bounds"];
  area: number; // Bounding box area for tie-breaking
}

async function main() {
  const scriptsDir = path.dirname(__filename);
  const dataDir = path.join(scriptsDir, "..", "data");

  console.log("Loading OSM province boundaries...");
  const osmPath = path.join(dataDir, "osm-cache", "argentina-provinces-raw.json");
  const osmData = JSON.parse(fs.readFileSync(osmPath, "utf-8")) as { elements: OsmElement[] };

  // Build province list with bounding boxes
  const provinces: Province[] = [];

  for (const element of osmData.elements) {
    if (!element.tags?.name || !element.bounds) continue;

    const bounds = element.bounds;
    const area = (bounds.maxlat - bounds.minlat) * (bounds.maxlon - bounds.minlon);

    provinces.push({
      name: element.tags.name,
      bounds,
      area,
    });
  }

  console.log(`Loaded ${provinces.length} provinces`);

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

    // Find all provinces whose bounding box contains this point
    const candidates = provinces.filter(
      (p) =>
        aerodrome.lat >= p.bounds.minlat &&
        aerodrome.lat <= p.bounds.maxlat &&
        aerodrome.lon >= p.bounds.minlon &&
        aerodrome.lon <= p.bounds.maxlon
    );

    if (candidates.length > 0) {
      // If multiple matches, pick the one with smallest bounding box area
      // (more specific region)
      candidates.sort((a, b) => a.area - b.area);
      const bestMatch = candidates[0];

      const oldProvince = aerodrome.province;
      aerodrome.province = bestMatch.name;

      if (isInvalid) {
        console.log(`  Fixed: ${aerodrome.name} - "${oldProvince}" → "${bestMatch.name}"`);
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
