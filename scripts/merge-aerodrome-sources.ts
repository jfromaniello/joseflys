/**
 * Merge aerodrome data from multiple sources:
 * 1. OurAirports - for heliports and main airports with international codes
 * 2. Existing argentina.json - for LADs (Lugares Aptos Denunciados)
 *
 * Output: New argentina.json with types: AD, LAD, HELIPORT
 */

import * as fs from "fs";
import * as path from "path";

// Types
interface OurAirportsEntry {
  id: string;
  ident: string;
  type: string;
  name: string;
  latitude_deg: string;
  longitude_deg: string;
  elevation_ft: string;
  continent: string;
  iso_country: string;
  iso_region: string;
  municipality: string;
  scheduled_service: string;
  icao_code: string;
  iata_code: string;
  gps_code: string;
  local_code: string;
  home_link: string;
  wikipedia_link: string;
  keywords: string;
}

interface ExistingAerodrome {
  type: "AD" | "LAD";
  code: string | null;
  name: string;
  lat: number;
  lon: number;
  elevation: number | null;
}

interface MergedAerodrome {
  type: "AD" | "LAD" | "HELIPORT";
  code: string | null;
  name: string;
  lat: number;
  lon: number;
  elevation: number | null;
  province: string | null;
  source: "ourairports" | "anac-kml" | "merged";
}

// Parse CSV (simple parser for this format)
function parseCSV(content: string): OurAirportsEntry[] {
  const lines = content.trim().split("\n");
  const entries: OurAirportsEntry[] = [];

  for (const line of lines) {
    // Parse CSV with quoted fields
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current);

    if (fields.length >= 19) {
      entries.push({
        id: fields[0],
        ident: fields[1],
        type: fields[2],
        name: fields[3],
        latitude_deg: fields[4],
        longitude_deg: fields[5],
        elevation_ft: fields[6],
        continent: fields[7],
        iso_country: fields[8],
        iso_region: fields[9],
        municipality: fields[10],
        scheduled_service: fields[11],
        icao_code: fields[12],
        iata_code: fields[13],
        gps_code: fields[14],
        local_code: fields[15],
        home_link: fields[16],
        wikipedia_link: fields[17],
        keywords: fields[18],
      });
    }
  }

  return entries;
}

// Map ISO region to province name
const regionToProvince: Record<string, string> = {
  "AR-A": "Salta",
  "AR-B": "Buenos Aires",
  "AR-C": "CABA",
  "AR-D": "San Luis",
  "AR-E": "Entre Ríos",
  "AR-F": "La Rioja",
  "AR-G": "Santiago del Estero",
  "AR-H": "Chaco",
  "AR-J": "San Juan",
  "AR-K": "Catamarca",
  "AR-L": "La Pampa",
  "AR-M": "Mendoza",
  "AR-N": "Misiones",
  "AR-P": "Formosa",
  "AR-Q": "Neuquén",
  "AR-R": "Río Negro",
  "AR-S": "Santa Fe",
  "AR-T": "Tucumán",
  "AR-U": "Chubut",
  "AR-V": "Tierra del Fuego",
  "AR-W": "Corrientes",
  "AR-X": "Córdoba",
  "AR-Y": "Jujuy",
  "AR-Z": "Santa Cruz",
};

// Calculate distance between two points (Haversine formula)
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Main merge function
async function mergeData() {
  const scriptsDir = path.dirname(__filename);
  const dataDir = path.join(scriptsDir, "..", "data");

  // Load OurAirports data
  const ourAirportsPath = path.join(
    scriptsDir,
    "data-sources",
    "ourairports-argentina.csv"
  );
  const ourAirportsCSV = fs.readFileSync(ourAirportsPath, "utf-8");
  const ourAirportsData = parseCSV(ourAirportsCSV);

  console.log(`Loaded ${ourAirportsData.length} entries from OurAirports`);

  // Load existing argentina.json
  const existingPath = path.join(dataDir, "ad-lads", "argentina.json");
  const existingData = JSON.parse(fs.readFileSync(existingPath, "utf-8")) as {
    data: ExistingAerodrome[];
  };

  console.log(`Loaded ${existingData.data.length} entries from existing data`);

  // Process OurAirports data
  const merged: MergedAerodrome[] = [];
  const usedCoordinates = new Set<string>();

  // Stats
  let heliportsAdded = 0;
  let airportsAdded = 0;
  let closedSkipped = 0;
  let balloonportSkipped = 0;

  for (const entry of ourAirportsData) {
    // Skip closed and balloonports
    if (entry.type === "closed") {
      closedSkipped++;
      continue;
    }
    if (entry.type === "balloonport") {
      balloonportSkipped++;
      continue;
    }

    const lat = parseFloat(entry.latitude_deg);
    const lon = parseFloat(entry.longitude_deg);
    const elevation = entry.elevation_ft
      ? Math.round(parseFloat(entry.elevation_ft))
      : null;

    // Determine type
    let type: "AD" | "HELIPORT";
    if (entry.type === "heliport") {
      type = "HELIPORT";
      heliportsAdded++;
    } else {
      type = "AD";
      airportsAdded++;
    }

    // Get best code
    const code = entry.gps_code || entry.local_code || entry.icao_code || null;

    // Clean up name
    let name = entry.name
      .replace(/ Airport$/i, "")
      .replace(/ Aerodrome$/i, "")
      .replace(/ Heliport$/i, "")
      .replace(/ International$/i, " Intl")
      .trim();

    // Get province from region
    const province = regionToProvince[entry.iso_region] || null;

    merged.push({
      type,
      code,
      name,
      lat,
      lon,
      elevation,
      province,
      source: "ourairports",
    });

    // Track coordinates for deduplication
    usedCoordinates.add(`${lat.toFixed(4)},${lon.toFixed(4)}`);
  }

  console.log(`\nFrom OurAirports:`);
  console.log(`  - ${airportsAdded} airports (AD)`);
  console.log(`  - ${heliportsAdded} heliports`);
  console.log(`  - ${closedSkipped} closed (skipped)`);
  console.log(`  - ${balloonportSkipped} balloonports (skipped)`);

  // Now add LADs from existing data that aren't in OurAirports
  let ladsAdded = 0;
  let ladsDuplicate = 0;

  for (const entry of existingData.data) {
    // Only process LADs from existing data
    if (entry.type !== "LAD") continue;

    // Check if this location already exists (within 1km)
    let isDuplicate = false;
    for (const existing of merged) {
      const distance = haversineDistance(
        entry.lat,
        entry.lon,
        existing.lat,
        existing.lon
      );
      if (distance < 1) {
        // Within 1km = duplicate
        isDuplicate = true;
        break;
      }
    }

    if (isDuplicate) {
      ladsDuplicate++;
      continue;
    }

    merged.push({
      type: "LAD",
      code: entry.code,
      name: entry.name,
      lat: entry.lat,
      lon: entry.lon,
      elevation: entry.elevation,
      province: null, // Will be enriched separately if needed
      source: "anac-kml",
    });

    ladsAdded++;
  }

  console.log(`\nFrom existing KML data:`);
  console.log(`  - ${ladsAdded} LADs added`);
  console.log(`  - ${ladsDuplicate} LADs skipped (duplicates)`);

  // Sort by type, then by name
  merged.sort((a, b) => {
    const typeOrder = { AD: 0, HELIPORT: 1, LAD: 2 };
    if (typeOrder[a.type] !== typeOrder[b.type]) {
      return typeOrder[a.type] - typeOrder[b.type];
    }
    return a.name.localeCompare(b.name);
  });

  // Create output
  const output = {
    version: "2.0",
    sources: ["OurAirports (airports)", "ANAC KML (LADs)"],
    generatedAt: new Date().toISOString(),
    count: {
      total: merged.length,
      ad: merged.filter((m) => m.type === "AD").length,
      heliport: merged.filter((m) => m.type === "HELIPORT").length,
      lad: merged.filter((m) => m.type === "LAD").length,
    },
    data: merged.map((m) => ({
      type: m.type,
      code: m.code,
      name: m.name,
      lat: m.lat,
      lon: m.lon,
      elevation: m.elevation,
      province: m.province,
    })),
  };

  console.log(`\n=== Final Stats ===`);
  console.log(`Total: ${output.count.total}`);
  console.log(`  - AD: ${output.count.ad}`);
  console.log(`  - HELIPORT: ${output.count.heliport}`);
  console.log(`  - LAD: ${output.count.lad}`);

  // Write output
  const outputPath = path.join(dataDir, "ad-lads", "argentina-v2.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nWritten to: ${outputPath}`);
}

mergeData().catch(console.error);
