/**
 * Enrich aerodromes with province data using Nominatim reverse geocoding
 *
 * Run with: npx tsx scripts/enrich-provinces.ts
 *
 * Note: Nominatim has rate limits (1 req/sec for free usage)
 * This script caches results to avoid re-fetching
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "aerodromes.db");
const CACHE_PATH = path.join(process.cwd(), "data", "osm-cache", "provinces-cache.json");
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "JoseFlys/1.0 (aerodrome province enricher)";
const RATE_LIMIT_MS = 1100; // Slightly over 1 second to be safe

interface ProvinceCache {
  [key: string]: string | null; // "lat,lon" -> province name
}

interface NominatimResponse {
  address?: {
    state?: string;
    province?: string;
    region?: string;
  };
}

// Load cache
function loadCache(): ProvinceCache {
  if (fs.existsSync(CACHE_PATH)) {
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
  }
  return {};
}

// Save cache
function saveCache(cache: ProvinceCache): void {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Reverse geocode to get province
async function getProvince(lat: number, lon: number): Promise<string | null> {
  try {
    const url = `${NOMINATIM_URL}?lat=${lat}&lon=${lon}&format=json&zoom=5`;

    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!response.ok) {
      console.error(`  Nominatim error: ${response.status}`);
      return null;
    }

    const data: NominatimResponse = await response.json();

    // Try different fields for province
    const province = data.address?.state || data.address?.province || data.address?.region;

    return province || null;
  } catch (error) {
    console.error(`  Error fetching province:`, error);
    return null;
  }
}

// Normalize province names
function normalizeProvince(province: string | null): string | null {
  if (!province) return null;

  // Map common variations to standard names
  const normalizations: Record<string, string> = {
    "Ciudad Autónoma de Buenos Aires": "CABA",
    "Ciudad de Buenos Aires": "CABA",
    "Provincia de Buenos Aires": "Buenos Aires",
    "Provincia de Córdoba": "Córdoba",
    "Provincia de Santa Fe": "Santa Fe",
    "Provincia de Mendoza": "Mendoza",
    // Add more as needed
  };

  // Remove "Provincia de " prefix
  let normalized = province.replace(/^Provincia de /i, "").trim();

  // Apply specific normalizations
  if (normalizations[province]) {
    normalized = normalizations[province];
  }

  return normalized;
}

async function main(): Promise<void> {
  console.log("=== Province Enrichment Script ===\n");

  // Check if DB exists
  if (!fs.existsSync(DB_PATH)) {
    console.error("Database not found. Run index-aerodromes.ts first.");
    process.exit(1);
  }

  const db = new Database(DB_PATH);

  // Add province column if it doesn't exist
  const columns = db.prepare("PRAGMA table_info(aerodromes)").all() as { name: string }[];
  const hasProvince = columns.some((c) => c.name === "province");

  if (!hasProvince) {
    console.log("Adding province column to aerodromes table...");
    db.exec("ALTER TABLE aerodromes ADD COLUMN province TEXT");
    db.exec("CREATE INDEX IF NOT EXISTS idx_aerodromes_province ON aerodromes(province)");
  }

  // Load cache
  const cache = loadCache();
  console.log(`Loaded ${Object.keys(cache).length} cached provinces\n`);

  // Get all aerodromes without province
  const aerodromes = db
    .prepare("SELECT id, lat, lon FROM aerodromes WHERE province IS NULL")
    .all() as { id: number; lat: number; lon: number }[];

  console.log(`Found ${aerodromes.length} aerodromes without province\n`);

  if (aerodromes.length === 0) {
    console.log("All aerodromes already have province data.");
    printStats(db);
    db.close();
    return;
  }

  // Estimate time
  const uncachedCount = aerodromes.filter((a) => !cache[`${a.lat},${a.lon}`]).length;
  const estimatedMinutes = Math.ceil((uncachedCount * RATE_LIMIT_MS) / 60000);
  console.log(`Uncached: ${uncachedCount} (estimated ${estimatedMinutes} minutes)\n`);

  // Update statement
  const updateStmt = db.prepare("UPDATE aerodromes SET province = ? WHERE id = ?");

  let processed = 0;
  let fromCache = 0;
  let fetched = 0;
  let errors = 0;

  for (const aerodrome of aerodromes) {
    const cacheKey = `${aerodrome.lat},${aerodrome.lon}`;
    let province: string | null;

    // Check cache first
    if (cacheKey in cache) {
      province = cache[cacheKey];
      fromCache++;
    } else {
      // Fetch from Nominatim
      province = await getProvince(aerodrome.lat, aerodrome.lon);
      province = normalizeProvince(province);

      // Cache result (even if null)
      cache[cacheKey] = province;
      fetched++;

      if (!province) {
        errors++;
      }

      // Rate limit
      await sleep(RATE_LIMIT_MS);
    }

    // Update DB
    if (province) {
      updateStmt.run(province, aerodrome.id);
    }

    processed++;

    // Progress
    if (processed % 50 === 0 || processed === aerodromes.length) {
      const pct = ((processed / aerodromes.length) * 100).toFixed(1);
      console.log(`Progress: ${processed}/${aerodromes.length} (${pct}%) - Cache: ${fromCache}, Fetched: ${fetched}, Errors: ${errors}`);

      // Save cache periodically
      saveCache(cache);
    }
  }

  // Final cache save
  saveCache(cache);

  console.log("\n=== Complete ===");
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
