/**
 * Convert raw Overpass JSON to cached format
 * Run with: npx tsx scripts/convert-osm-cache.ts
 */

import fs from "fs";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), "data", "osm-cache");

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  geometry?: { lat: number; lon: number }[];
  tags?: Record<string, string>;
}

interface CachedFeature {
  id: number;
  name: string | null;
  coords: [number, number][] | [number, number];
  isPoint: boolean;
}

const FEATURES = ["mountain", "coast", "river", "lake", "highway"];

function convertToCachedFeatures(elements: OverpassElement[]): CachedFeature[] {
  return elements
    .map((el): CachedFeature | null => {
      const name = el.tags?.name || el.tags?.["name:es"] || null;

      if (el.geometry && el.geometry.length > 0) {
        return {
          id: el.id,
          name,
          coords: el.geometry.map((g) => [g.lon, g.lat] as [number, number]),
          isPoint: false,
        };
      } else if (el.lat !== undefined && el.lon !== undefined) {
        return {
          id: el.id,
          name,
          coords: [el.lon, el.lat],
          isPoint: true,
        };
      }
      return null;
    })
    .filter((f): f is CachedFeature => f !== null);
}

for (const feature of FEATURES) {
  const rawPath = path.join(CACHE_DIR, `${feature}_raw.json`);
  const cachePath = path.join(CACHE_DIR, `${feature}.json`);

  if (!fs.existsSync(rawPath)) {
    console.log(`Skipping ${feature}: raw file not found`);
    continue;
  }

  console.log(`Converting ${feature}...`);
  const raw = JSON.parse(fs.readFileSync(rawPath, "utf-8"));
  const cached = convertToCachedFeatures(raw.elements);
  fs.writeFileSync(cachePath, JSON.stringify(cached));
  console.log(`  ${cached.length} features saved to ${cachePath}`);
}

console.log("\nDone!");
