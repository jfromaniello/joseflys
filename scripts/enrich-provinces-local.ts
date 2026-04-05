/**
 * Enrich aerodromes with province data using local polygon matching
 * Much faster than API calls - processes all 1468 in seconds
 *
 * Run with: npx tsx scripts/enrich-provinces-local.ts
 */

import Database from "better-sqlite3";
import * as turf from "@turf/turf";
import type { Feature, Polygon } from "geojson";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "aerodromes.db");
const PROVINCES_PATH = path.join(process.cwd(), "data", "osm-cache", "argentina-provinces-raw.json");

interface OSMRelation {
  type: string;
  id: number;
  tags?: {
    name?: string;
    "name:es"?: string;
  };
  members?: {
    type: string;
    role: string;
    geometry?: { lat: number; lon: number }[];
  }[];
}

interface Province {
  name: string;
  polygon: ReturnType<typeof turf.polygon> | ReturnType<typeof turf.multiPolygon>;
}

// Normalize province names
function normalizeProvinceName(name: string): string {
  const normalizations: Record<string, string> = {
    "Ciudad Autónoma de Buenos Aires": "CABA",
    "Provincia de Buenos Aires": "Buenos Aires",
    "Provincia de Tierra del Fuego, Antártida e Islas del Atlántico Sur": "Tierra del Fuego",
  };

  return normalizations[name] || name.replace(/^Provincia de /i, "").trim();
}

// Convert OSM relation to Turf polygon
function relationToPolygon(relation: OSMRelation): Province | null {
  const name = relation.tags?.name || relation.tags?.["name:es"];
  if (!name) return null;

  // Get outer rings from members
  const outerRings: [number, number][][] = [];

  for (const member of relation.members || []) {
    if (member.role === "outer" && member.geometry && member.geometry.length > 0) {
      const ring = member.geometry.map((g) => [g.lon, g.lat] as [number, number]);
      // Close the ring if not closed
      if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
        ring.push(ring[0]);
      }
      if (ring.length >= 4) {
        outerRings.push(ring);
      }
    }
  }

  if (outerRings.length === 0) return null;

  try {
    if (outerRings.length === 1) {
      return {
        name: normalizeProvinceName(name),
        polygon: turf.polygon([outerRings[0]]),
      };
    } else {
      // MultiPolygon - each ring is a separate polygon
      return {
        name: normalizeProvinceName(name),
        polygon: turf.multiPolygon(outerRings.map((ring) => [ring])),
      };
    }
  } catch (error) {
    console.error(`Error creating polygon for ${name}:`, error);
    return null;
  }
}

// Find which province contains a point
function findProvince(lat: number, lon: number, provinces: Province[]): string | null {
  const point = turf.point([lon, lat]);

  for (const province of provinces) {
    try {
      // Cast needed because booleanPointInPolygon types don't include MultiPolygon,
      // but it works at runtime
      if (turf.booleanPointInPolygon(point, province.polygon as Feature<Polygon>)) {
        return province.name;
      }
    } catch {
      // Skip invalid polygons
    }
  }

  // If no exact match, find nearest province
  let nearestProvince: string | null = null;
  let nearestDistance = Infinity;

  for (const province of provinces) {
    try {
      // Get centroid of province
      const centroid = turf.centroid(province.polygon);
      const distance = turf.distance(point, centroid);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestProvince = province.name;
      }
    } catch {
      // Skip invalid polygons
    }
  }

  // Use nearest if within reasonable distance (200km - some provinces are large)
  return nearestDistance < 200 ? nearestProvince : null;
}

async function main(): Promise<void> {
  console.log("=== Province Enrichment (Local Polygons) ===\n");

  // Check files exist
  if (!fs.existsSync(DB_PATH)) {
    console.error("Database not found. Run index-aerodromes.ts first.");
    process.exit(1);
  }

  if (!fs.existsSync(PROVINCES_PATH)) {
    console.error("Provinces GeoJSON not found. Download it first.");
    process.exit(1);
  }

  // Load provinces
  console.log("Loading province polygons...");
  const rawData = JSON.parse(fs.readFileSync(PROVINCES_PATH, "utf-8"));
  const provinces: Province[] = [];

  for (const element of rawData.elements) {
    if (element.type === "relation") {
      const province = relationToPolygon(element);
      if (province) {
        provinces.push(province);
        console.log(`  Loaded: ${province.name}`);
      }
    }
  }

  console.log(`\nLoaded ${provinces.length} provinces\n`);

  // Open database
  const db = new Database(DB_PATH);

  // Add province column if it doesn't exist
  const columns = db.prepare("PRAGMA table_info(aerodromes)").all() as { name: string }[];
  const hasProvince = columns.some((c) => c.name === "province");

  if (!hasProvince) {
    console.log("Adding province column...");
    db.exec("ALTER TABLE aerodromes ADD COLUMN province TEXT");
    db.exec("CREATE INDEX IF NOT EXISTS idx_aerodromes_province ON aerodromes(province)");
  }

  // Get all aerodromes
  const aerodromes = db
    .prepare("SELECT id, lat, lon FROM aerodromes")
    .all() as { id: number; lat: number; lon: number }[];

  console.log(`Processing ${aerodromes.length} aerodromes...\n`);

  // Update statement
  const updateStmt = db.prepare("UPDATE aerodromes SET province = ? WHERE id = ?");

  let matched = 0;
  let unmatched = 0;

  const startTime = Date.now();

  for (let i = 0; i < aerodromes.length; i++) {
    const aerodrome = aerodromes[i];
    const province = findProvince(aerodrome.lat, aerodrome.lon, provinces);

    if (province) {
      updateStmt.run(province, aerodrome.id);
      matched++;
    } else {
      unmatched++;
    }

    // Progress every 200
    if ((i + 1) % 200 === 0 || i === aerodromes.length - 1) {
      process.stdout.write(`\rProgress: ${i + 1}/${aerodromes.length}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\nCompleted in ${elapsed}s`);
  console.log(`Matched: ${matched}, Unmatched: ${unmatched}`);

  // Print stats
  printStats(db);

  db.close();
}

function printStats(db: Database.Database): void {
  console.log("\nProvince distribution:");

  const stats = db
    .prepare(`
      SELECT province, COUNT(*) as count
      FROM aerodromes
      WHERE province IS NOT NULL
      GROUP BY province
      ORDER BY count DESC
    `)
    .all() as { province: string; count: number }[];

  for (const row of stats) {
    console.log(`  ${row.province}: ${row.count}`);
  }

  const nullCount = db
    .prepare("SELECT COUNT(*) as count FROM aerodromes WHERE province IS NULL")
    .get() as { count: number };

  if (nullCount.count > 0) {
    console.log(`  (sin provincia): ${nullCount.count}`);
  }
}

main().catch(console.error);
