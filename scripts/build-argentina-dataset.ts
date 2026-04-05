#!/usr/bin/env npx tsx
/**
 * =============================================================================
 * BUILD ARGENTINA AERODROMES DATASET
 * =============================================================================
 *
 * This script builds a comprehensive dataset of Argentine aerodromes by merging
 * data from multiple authoritative sources:
 *
 * SOURCES:
 * 1. OurAirports (https://ourairports.com/data/)
 *    - Provides: AD (airports), HELIPORT (heliports)
 *    - Format: CSV updated daily
 *    - Coverage: International airports and registered heliports
 *
 * 2. ANAC PDF (Administración Nacional de Aviación Civil)
 *    - Provides: LAD (Lugares Aptos Denunciados), LADH (LAD Helipuertos)
 *    - Format: PDF parsed to JSON
 *    - Source: Official government publication
 *    - URL: https://www.argentina.gob.ar/sites/default/files/listado_de_lugares_aptos_denunciados_ene_21.pdf
 *
 * OUTPUT TYPES:
 * - AD: Aerodrome (registered airport with ICAO/local code)
 * - HELIPORT: Registered heliport
 * - LAD: Lugar Apto Denunciado (registered private/rural airstrip)
 * - LADH: LAD Helipuerto (registered private heliport)
 *
 * USAGE:
 *   npx tsx scripts/build-argentina-dataset.ts
 *
 * PREREQUISITES:
 *   1. Download OurAirports data:
 *      curl -sL "https://davidmegginson.github.io/ourairports-data/airports.csv" | \
 *        grep "\"AR\"" > scripts/data-sources/ourairports-argentina.csv
 *
 *   2. Download and extract ANAC PDF:
 *      curl -sL "https://www.argentina.gob.ar/sites/default/files/listado_de_lugares_aptos_denunciados_ene_21.pdf" \
 *        -o scripts/data-sources/lad-anac-ene21.pdf
 *      pdftotext -layout scripts/data-sources/lad-anac-ene21.pdf \
 *        scripts/data-sources/lad-anac-ene21-layout.txt
 *
 *   3. Run the ANAC parser first:
 *      npx tsx scripts/parse-anac-lad-pdf.ts
 *
 * =============================================================================
 */

import * as fs from "fs";
import * as path from "path";

// =============================================================================
// TYPES
// =============================================================================

type AerodromeType = "AD" | "HELIPORT" | "LAD" | "LADH";

interface Runway {
  heading1: number;
  heading2: number;
  dimensions: string;
  length: number; // meters
  width: number; // meters
}

interface Aerodrome {
  type: AerodromeType;
  code: string | null; // ICAO, local code, or ANAC registro
  name: string;
  lat: number;
  lon: number;
  elevation: number | null; // meters
  province: string | null;
  municipality: string | null;
  surface: string | null; // TIERRA, ASFALTO, etc.
  runways: Runway[];
  region: string | null; // RANE, RACE, RANO, RASU (ANAC regions)
  source: "ourairports" | "anac";
}

interface OurAirportsEntry {
  id: string;
  ident: string;
  type: string;
  name: string;
  latitude_deg: string;
  longitude_deg: string;
  elevation_ft: string;
  iso_region: string;
  municipality: string;
  icao_code: string;
  iata_code: string;
  gps_code: string;
  local_code: string;
}

interface ANACLadEntry {
  numero: number;
  codigo: string;
  tipo: string;
  nombre: string;
  runways: Runway[];
  superficie: string;
  elevacion: number;
  lat: number;
  lon: number;
  ubicacion: string;
  provincia: string | null;
  region: string | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const REGION_TO_PROVINCE: Record<string, string> = {
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

// =============================================================================
// CSV PARSER
// =============================================================================

function parseCSV(content: string): OurAirportsEntry[] {
  const lines = content.trim().split("\n");
  const entries: OurAirportsEntry[] = [];

  for (const line of lines) {
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

    if (fields.length >= 16) {
      entries.push({
        id: fields[0],
        ident: fields[1],
        type: fields[2],
        name: fields[3],
        latitude_deg: fields[4],
        longitude_deg: fields[5],
        elevation_ft: fields[6],
        iso_region: fields[9],
        municipality: fields[10],
        icao_code: fields[12],
        iata_code: fields[13],
        gps_code: fields[14],
        local_code: fields[15],
      });
    }
  }

  return entries;
}

// =============================================================================
// MAIN BUILD FUNCTION
// =============================================================================

async function buildDataset() {
  const scriptsDir = path.dirname(__filename);
  const dataDir = path.join(scriptsDir, "..", "data");

  console.log("=".repeat(70));
  console.log("BUILDING ARGENTINA AERODROMES DATASET");
  console.log("=".repeat(70));

  // ---------------------------------------------------------------------------
  // STEP 1: Load OurAirports data
  // ---------------------------------------------------------------------------
  console.log("\n[1/4] Loading OurAirports data...");

  const ourAirportsPath = path.join(scriptsDir, "data-sources", "ourairports-argentina.csv");
  if (!fs.existsSync(ourAirportsPath)) {
    console.error(`ERROR: OurAirports file not found: ${ourAirportsPath}`);
    console.error("Run: curl -sL 'https://davidmegginson.github.io/ourairports-data/airports.csv' | grep '\"AR\"' > scripts/data-sources/ourairports-argentina.csv");
    process.exit(1);
  }

  const ourAirportsCSV = fs.readFileSync(ourAirportsPath, "utf-8");
  const ourAirportsData = parseCSV(ourAirportsCSV);
  console.log(`  Loaded ${ourAirportsData.length} entries from OurAirports`);

  // ---------------------------------------------------------------------------
  // STEP 2: Load ANAC LAD data
  // ---------------------------------------------------------------------------
  console.log("\n[2/4] Loading ANAC LAD data...");

  const anacPath = path.join(scriptsDir, "data-sources", "lad-anac-parsed.json");
  if (!fs.existsSync(anacPath)) {
    console.error(`ERROR: ANAC LAD file not found: ${anacPath}`);
    console.error("Run: npx tsx scripts/parse-anac-lad-pdf.ts");
    process.exit(1);
  }

  const anacData: ANACLadEntry[] = JSON.parse(fs.readFileSync(anacPath, "utf-8"));
  console.log(`  Loaded ${anacData.length} entries from ANAC PDF`);

  // ---------------------------------------------------------------------------
  // STEP 3: Process and merge data
  // ---------------------------------------------------------------------------
  console.log("\n[3/4] Processing and merging data...");

  const aerodromes: Aerodrome[] = [];
  const stats = {
    ourairports: { ad: 0, heliport: 0, skipped: 0 },
    anac: { lad: 0, ladh: 0 },
  };

  // Process OurAirports entries
  for (const entry of ourAirportsData) {
    // Skip closed airports and balloonports
    if (entry.type === "closed" || entry.type === "balloonport") {
      stats.ourairports.skipped++;
      continue;
    }

    const lat = parseFloat(entry.latitude_deg);
    const lon = parseFloat(entry.longitude_deg);

    // Validate coordinates
    if (isNaN(lat) || isNaN(lon) || lat < -56 || lat > -21 || lon < -74 || lon > -53) {
      stats.ourairports.skipped++;
      continue;
    }

    const elevation = entry.elevation_ft ? Math.round(parseFloat(entry.elevation_ft) * 0.3048) : null;
    const isHeliport = entry.type === "heliport";
    const code = entry.gps_code || entry.local_code || entry.icao_code || null;
    const name = entry.name
      .replace(/ Airport$/i, "")
      .replace(/ Aerodrome$/i, "")
      .replace(/ Heliport$/i, "")
      .replace(/ International$/i, " Intl")
      .trim();

    aerodromes.push({
      type: isHeliport ? "HELIPORT" : "AD",
      code,
      name,
      lat,
      lon,
      elevation,
      province: REGION_TO_PROVINCE[entry.iso_region] || null,
      municipality: entry.municipality || null,
      surface: null,
      runways: [],
      region: null,
      source: "ourairports",
    });

    if (isHeliport) {
      stats.ourairports.heliport++;
    } else {
      stats.ourairports.ad++;
    }
  }

  // Process ANAC LAD entries
  for (const entry of anacData) {
    const isHeliport = entry.tipo === "LADH";

    aerodromes.push({
      type: isHeliport ? "LADH" : "LAD",
      code: entry.codigo,
      name: entry.nombre,
      lat: entry.lat,
      lon: entry.lon,
      elevation: entry.elevacion,
      province: entry.provincia,
      municipality: null,
      surface: entry.superficie,
      runways: entry.runways,
      region: entry.region,
      source: "anac",
    });

    if (isHeliport) {
      stats.anac.ladh++;
    } else {
      stats.anac.lad++;
    }
  }

  // Sort by type, then by name
  aerodromes.sort((a, b) => {
    const typeOrder: Record<AerodromeType, number> = { AD: 0, HELIPORT: 1, LAD: 2, LADH: 3 };
    if (typeOrder[a.type] !== typeOrder[b.type]) {
      return typeOrder[a.type] - typeOrder[b.type];
    }
    return a.name.localeCompare(b.name);
  });

  // ---------------------------------------------------------------------------
  // STEP 4: Write output
  // ---------------------------------------------------------------------------
  console.log("\n[4/4] Writing output files...");

  const output = {
    version: "2.0",
    generatedAt: new Date().toISOString(),
    sources: {
      ourairports: {
        url: "https://ourairports.com/data/",
        description: "Community-maintained global airport database",
        provides: ["AD", "HELIPORT"],
      },
      anac: {
        url: "https://www.argentina.gob.ar/anac",
        file: "listado_de_lugares_aptos_denunciados_ene_21.pdf",
        description: "Official Argentine civil aviation authority",
        provides: ["LAD", "LADH"],
      },
    },
    count: {
      total: aerodromes.length,
      ad: stats.ourairports.ad,
      heliport: stats.ourairports.heliport,
      lad: stats.anac.lad,
      ladh: stats.anac.ladh,
    },
    data: aerodromes,
  };

  // Write full dataset
  const outputPath = path.join(dataDir, "ad-lads", "argentina.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`  Written: ${outputPath}`);

  // Write simplified dataset for map (smaller file)
  const simplified = {
    version: output.version,
    generatedAt: output.generatedAt,
    count: output.count,
    data: aerodromes.map((a) => ({
      type: a.type,
      code: a.code,
      name: a.name,
      lat: a.lat,
      lon: a.lon,
      elevation: a.elevation,
      province: a.province,
    })),
  };

  const simplifiedPath = path.join(dataDir, "ad-lads", "argentina-simplified.json");
  fs.writeFileSync(simplifiedPath, JSON.stringify(simplified));
  console.log(`  Written: ${simplifiedPath} (${Math.round(fs.statSync(simplifiedPath).size / 1024)}KB)`);

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n" + "=".repeat(70));
  console.log("BUILD COMPLETE");
  console.log("=".repeat(70));
  console.log("\nDataset Summary:");
  console.log(`  Total entries: ${output.count.total}`);
  console.log(`  ├─ AD (Airports):        ${output.count.ad}`);
  console.log(`  ├─ HELIPORT:             ${output.count.heliport}`);
  console.log(`  ├─ LAD (Private strips): ${output.count.lad}`);
  console.log(`  └─ LADH (LAD Heliports): ${output.count.ladh}`);
  console.log(`\n  Skipped from OurAirports: ${stats.ourairports.skipped} (closed/invalid)`);

  // Province distribution
  const byProvince = aerodromes.reduce(
    (acc, a) => {
      const p = a.province || "Unknown";
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log("\nTop provinces:");
  Object.entries(byProvince)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([p, c]) => console.log(`  ${p}: ${c}`));
}

// =============================================================================
// RUN
// =============================================================================

buildDataset().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
