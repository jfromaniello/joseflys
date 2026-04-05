/**
 * Script to index aerodromes with nearby OSM features
 *
 * Strategy:
 * 1. Download ALL features for Argentina (one query per feature type)
 * 2. Cache features locally as JSON
 * 3. Calculate distances locally using Turf.js
 *
 * Run with: npx tsx scripts/index-aerodromes.ts
 */

import Database from "better-sqlite3";
import * as turf from "@turf/turf";
import path from "path";
import fs from "fs";

// Types
interface AerodromeInput {
  type: "AD" | "LAD";
  code: string | null;
  name: string;
  lat: number;
  lon: number;
  elevation: number | null;
}

interface AerodromeData {
  count: { total: number; ad: number; lad: number };
  data: AerodromeInput[];
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  geometry?: { lat: number; lon: number }[];
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

interface CachedFeature {
  id: number;
  name: string | null;
  coords: [number, number][] | [number, number]; // [lon, lat] or array of coords
  isPoint: boolean;
}

// Configuration
const MAX_DISTANCE_KM = 20; // Only store features within this distance
// Try different Overpass mirrors
const OVERPASS_URLS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];
let currentOverpassIndex = 0;

const DB_PATH = path.join(process.cwd(), "data", "aerodromes.db");
const DATA_PATH = path.join(process.cwd(), "data", "ad-lads", "argentina.json");
const CACHE_DIR = path.join(process.cwd(), "data", "osm-cache");

// Argentina bounding box (approximate)
const ARGENTINA_BBOX = {
  south: -55.5,
  west: -73.5,
  north: -21.5,
  east: -53.5,
};

// OSM feature queries - download ALL of Argentina
const FEATURE_QUERIES: Record<string, string> = {
  river: `
    [out:json][timeout:300];
    (
      way["waterway"="river"](${ARGENTINA_BBOX.south},${ARGENTINA_BBOX.west},${ARGENTINA_BBOX.north},${ARGENTINA_BBOX.east});
    );
    out geom;
  `,
  lake: `
    [out:json][timeout:300];
    (
      way["natural"="water"]["water"~"lake|reservoir|lagoon"](${ARGENTINA_BBOX.south},${ARGENTINA_BBOX.west},${ARGENTINA_BBOX.north},${ARGENTINA_BBOX.east});
      relation["natural"="water"]["water"~"lake|reservoir|lagoon"](${ARGENTINA_BBOX.south},${ARGENTINA_BBOX.west},${ARGENTINA_BBOX.north},${ARGENTINA_BBOX.east});
    );
    out geom;
  `,
  coast: `
    [out:json][timeout:300];
    (
      way["natural"="coastline"](${ARGENTINA_BBOX.south},${ARGENTINA_BBOX.west},${ARGENTINA_BBOX.north},${ARGENTINA_BBOX.east});
    );
    out geom;
  `,
  highway: `
    [out:json][timeout:300];
    (
      way["highway"~"primary|secondary|trunk|motorway"](${ARGENTINA_BBOX.south},${ARGENTINA_BBOX.west},${ARGENTINA_BBOX.north},${ARGENTINA_BBOX.east});
    );
    out geom;
  `,
  mountain: `
    [out:json][timeout:300];
    (
      node["natural"="peak"](${ARGENTINA_BBOX.south},${ARGENTINA_BBOX.west},${ARGENTINA_BBOX.north},${ARGENTINA_BBOX.east});
      node["natural"="volcano"](${ARGENTINA_BBOX.south},${ARGENTINA_BBOX.west},${ARGENTINA_BBOX.north},${ARGENTINA_BBOX.east});
    );
    out;
  `,
};

// Initialize database
function initDb(db: Database.Database): void {
  console.log("Initializing database schema...");

  db.exec(`
    DROP TABLE IF EXISTS nearby_features;
    DROP TABLE IF EXISTS aerodromes;

    CREATE TABLE aerodromes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('AD', 'LAD')),
      lat REAL NOT NULL,
      lon REAL NOT NULL,
      elevation INTEGER
    );

    CREATE TABLE nearby_features (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aerodrome_id INTEGER NOT NULL,
      feature_type TEXT NOT NULL,
      feature_name TEXT,
      distance_km REAL NOT NULL,
      FOREIGN KEY (aerodrome_id) REFERENCES aerodromes(id)
    );

    CREATE INDEX idx_aerodromes_code ON aerodromes(code);
    CREATE INDEX idx_aerodromes_type ON aerodromes(type);
    CREATE INDEX idx_features_type_dist ON nearby_features(feature_type, distance_km);
    CREATE INDEX idx_features_aerodrome ON nearby_features(aerodrome_id);
  `);
}

// Load aerodromes from JSON
function loadAerodromes(): AerodromeInput[] {
  console.log("Loading aerodromes from JSON...");
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  const data: AerodromeData = JSON.parse(raw);
  console.log(`Loaded ${data.data.length} aerodromes`);
  return data.data;
}

// Insert aerodromes into DB
function insertAerodromes(
  db: Database.Database,
  aerodromes: AerodromeInput[]
): Map<string, number> {
  console.log("Inserting aerodromes into database...");

  const insert = db.prepare(`
    INSERT INTO aerodromes (code, name, type, lat, lon, elevation)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const idMap = new Map<string, number>();

  const insertMany = db.transaction((items: AerodromeInput[]) => {
    for (const a of items) {
      const result = insert.run(a.code, a.name, a.type, a.lat, a.lon, a.elevation);
      const key = `${a.lat},${a.lon}`;
      idMap.set(key, result.lastInsertRowid as number);
    }
  });

  insertMany(aerodromes);
  console.log(`Inserted ${aerodromes.length} aerodromes`);
  return idMap;
}

// Query Overpass API with retry and mirror fallback
async function queryOverpass(query: string): Promise<OverpassResponse> {
  const maxRetries = OVERPASS_URLS.length * 2;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const url = OVERPASS_URLS[currentOverpassIndex];
    try {
      console.log(`  Querying ${new URL(url).hostname} (attempt ${attempt}/${maxRetries})...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429 || response.status === 504 || response.status === 503) {
        console.log(`  Server busy (${response.status}), trying next mirror...`);
        currentOverpassIndex = (currentOverpassIndex + 1) % OVERPASS_URLS.length;
        await sleep(5000);
        continue;
      }

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.log(`  Error: ${error instanceof Error ? error.message : 'Unknown'}, trying next mirror...`);
      currentOverpassIndex = (currentOverpassIndex + 1) % OVERPASS_URLS.length;
      if (attempt < maxRetries) {
        await sleep(5000);
      }
    }
  }
  throw new Error("All Overpass mirrors failed");
}

// Convert Overpass elements to cached features
function convertToCachedFeatures(elements: OverpassElement[]): CachedFeature[] {
  return elements
    .map((el): CachedFeature | null => {
      const name = el.tags?.name || el.tags?.["name:es"] || null;

      if (el.geometry && el.geometry.length > 0) {
        // Way with geometry
        return {
          id: el.id,
          name,
          coords: el.geometry.map((g) => [g.lon, g.lat] as [number, number]),
          isPoint: false,
        };
      } else if (el.lat !== undefined && el.lon !== undefined) {
        // Node
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

// Download and cache features
async function downloadFeatures(featureType: string): Promise<CachedFeature[]> {
  const cachePath = path.join(CACHE_DIR, `${featureType}.json`);

  // Check cache first
  if (fs.existsSync(cachePath)) {
    console.log(`  Loading ${featureType} from cache...`);
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
    console.log(`  Loaded ${cached.length} ${featureType} features from cache`);
    return cached;
  }

  // Download from Overpass
  console.log(`  Downloading ${featureType} from Overpass...`);
  const query = FEATURE_QUERIES[featureType];
  const response = await queryOverpass(query);

  const features = convertToCachedFeatures(response.elements);
  console.log(`  Downloaded ${features.length} ${featureType} features`);

  // Cache to disk
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(features));
  console.log(`  Cached to ${cachePath}`);

  return features;
}

// Calculate distance from aerodrome to feature
function calculateDistance(
  aerodrome: { lat: number; lon: number },
  feature: CachedFeature
): number {
  const point = turf.point([aerodrome.lon, aerodrome.lat]);

  if (feature.isPoint) {
    const coords = feature.coords as [number, number];
    const targetPoint = turf.point(coords);
    return turf.distance(point, targetPoint, { units: "kilometers" });
  } else {
    const coords = feature.coords as [number, number][];
    if (coords.length < 2) {
      // Single point, treat as point
      const targetPoint = turf.point(coords[0]);
      return turf.distance(point, targetPoint, { units: "kilometers" });
    }
    const line = turf.lineString(coords);
    return turf.pointToLineDistance(point, line, { units: "kilometers" });
  }
}

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Process all features for all aerodromes
async function indexFeatures(
  db: Database.Database,
  idMap: Map<string, number>,
  aerodromes: AerodromeInput[]
): Promise<void> {
  console.log("\n=== Indexing Features ===\n");

  const insertFeature = db.prepare(`
    INSERT INTO nearby_features (aerodrome_id, feature_type, feature_name, distance_km)
    VALUES (?, ?, ?, ?)
  `);

  for (const featureType of Object.keys(FEATURE_QUERIES)) {
    console.log(`\nProcessing: ${featureType}`);

    // Download/load features
    const features = await downloadFeatures(featureType);

    if (features.length === 0) {
      console.log(`  No features found, skipping`);
      continue;
    }

    // Process each aerodrome
    let insertCount = 0;
    const batchInsert = db.transaction(
      (items: { aerodromeId: number; name: string | null; distance: number }[]) => {
        for (const item of items) {
          insertFeature.run(item.aerodromeId, featureType, item.name, item.distance);
        }
      }
    );

    const toInsert: { aerodromeId: number; name: string | null; distance: number }[] = [];

    console.log(`  Calculating distances for ${aerodromes.length} aerodromes...`);
    const startTime = Date.now();

    for (let i = 0; i < aerodromes.length; i++) {
      const aerodrome = aerodromes[i];
      const aerodromeId = idMap.get(`${aerodrome.lat},${aerodrome.lon}`)!;

      // Find closest feature
      let closestDistance = Infinity;
      let closestName: string | null = null;

      for (const feature of features) {
        // Quick bounding box check to skip distant features
        const featureCoords = feature.isPoint
          ? [feature.coords as [number, number]]
          : (feature.coords as [number, number][]);

        const featureLon = featureCoords[0][0];
        const featureLat = featureCoords[0][1];

        // Rough distance check (1 degree ≈ 111km)
        const roughDist = Math.sqrt(
          Math.pow((aerodrome.lon - featureLon) * 111 * Math.cos((aerodrome.lat * Math.PI) / 180), 2) +
            Math.pow((aerodrome.lat - featureLat) * 111, 2)
        );

        if (roughDist > MAX_DISTANCE_KM * 2) continue;

        const distance = calculateDistance(aerodrome, feature);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestName = feature.name;
        }
      }

      if (closestDistance <= MAX_DISTANCE_KM) {
        toInsert.push({
          aerodromeId,
          name: closestName,
          distance: Math.round(closestDistance * 100) / 100,
        });
        insertCount++;
      }

      // Progress update
      if ((i + 1) % 200 === 0 || i === aerodromes.length - 1) {
        process.stdout.write(`\r  Progress: ${i + 1}/${aerodromes.length} aerodromes`);
      }
    }

    console.log(); // newline after progress

    // Batch insert
    if (toInsert.length > 0) {
      batchInsert(toInsert);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  Found ${insertCount} aerodromes near ${featureType} (${elapsed}s)`);

    // Small delay between feature types
    await sleep(1000);
  }
}

// Print final stats
function printStats(db: Database.Database): void {
  console.log("\n=== Final Statistics ===");

  const totalAerodromes = db
    .prepare("SELECT COUNT(*) as count FROM aerodromes")
    .get() as { count: number };

  const byType = db
    .prepare("SELECT type, COUNT(*) as count FROM aerodromes GROUP BY type")
    .all() as { type: string; count: number }[];

  const features = db
    .prepare(
      "SELECT feature_type, COUNT(*) as count FROM nearby_features GROUP BY feature_type"
    )
    .all() as { feature_type: string; count: number }[];

  console.log(`\nTotal aerodromes: ${totalAerodromes.count}`);
  for (const t of byType) {
    console.log(`  ${t.type}: ${t.count}`);
  }

  console.log("\nAerodromes with nearby features (within 20km):");
  for (const f of features) {
    const pct = ((f.count / totalAerodromes.count) * 100).toFixed(1);
    console.log(`  ${f.feature_type}: ${f.count} (${pct}%)`);
  }
}

// Main
async function main(): Promise<void> {
  console.log("=== Aerodrome Feature Indexer ===\n");

  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Initialize database
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  try {
    initDb(db);

    // Load and insert aerodromes
    const aerodromes = loadAerodromes();
    const idMap = insertAerodromes(db, aerodromes);

    // Index features from OSM
    await indexFeatures(db, idMap, aerodromes);

    // Print stats
    printStats(db);

    console.log("\nDone! Database saved to:", DB_PATH);
  } finally {
    db.close();
  }
}

main().catch(console.error);
