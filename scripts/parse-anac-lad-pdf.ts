/**
 * Parse ANAC LAD PDF extracted text (layout-preserved version)
 * Extracts all available fields: runway dimensions, surface, elevation, region, etc.
 */

import * as fs from "fs";
import * as path from "path";

interface LADEntry {
  numero: number;
  codigo: string;
  tipo: "LAD" | "LADH" | "LADA" | "LADS";
  nombre: string;
  runways: {
    heading1: number;
    heading2: number;
    dimensions: string; // e.g., "700x30"
    length: number; // meters
    width: number; // meters
  }[];
  superficie: string; // TIERRA, ASFALTO, CESPED, etc.
  elevacion: number; // meters
  lat: number;
  lon: number;
  ubicacion: string;
  provincia: string | null;
  region: string | null; // RANE, RACE, RANO, RASU, etc.
}

// Convert DMS format like "283428,00S" to decimal degrees
function parseDMS(dms: string): number {
  // Format: DDMMSS,xxH where H is N/S/E/W
  // Handle both 6-digit (lat) and 7-digit (lon with leading 0) formats
  const match = dms.match(/^0?(\d{2,3})(\d{2})(\d{2}),?\d*([NSEW])$/);
  if (!match) {
    return 0;
  }

  const degrees = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const direction = match[4];

  let decimal = degrees + minutes / 60 + seconds / 3600;

  if (direction === "S" || direction === "W") {
    decimal = -decimal;
  }

  return decimal;
}

// Parse dimensions like "700x30" into length and width
function parseDimensions(dim: string): { length: number; width: number } {
  const match = dim.match(/(\d+)x(\d+)/);
  if (match) {
    return {
      length: parseInt(match[1], 10),
      width: parseInt(match[2], 10),
    };
  }
  return { length: 0, width: 0 };
}

// Extract province from location string
function extractProvincia(ubicacion: string): string | null {
  // Try different patterns
  let match = ubicacion.match(/Provincia\s+de\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+?)(?:\s+RA|$)/i);
  if (match) {
    return normalizeProvince(match[1].trim());
  }

  match = ubicacion.match(/Pcia\.\s+de\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+?)(?:\s+RA|$)/i);
  if (match) {
    return normalizeProvince(match[1].trim());
  }

  // Try to find province at end of string
  match = ubicacion.match(/de\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+)$/i);
  if (match) {
    const candidate = match[1].trim();
    if (isValidProvince(candidate)) {
      return normalizeProvince(candidate);
    }
  }

  return null;
}

function normalizeProvince(p: string): string {
  const mapping: Record<string, string> = {
    "BUENOS AIRES": "Buenos Aires",
    CORDOBA: "Córdoba",
    "SANTA FE": "Santa Fe",
    MENDOZA: "Mendoza",
    TUCUMAN: "Tucumán",
    "ENTRE RIOS": "Entre Ríos",
    SALTA: "Salta",
    MISIONES: "Misiones",
    CHACO: "Chaco",
    CORRIENTES: "Corrientes",
    "SANTIAGO DEL ESTERO": "Santiago del Estero",
    "SAN JUAN": "San Juan",
    JUJUY: "Jujuy",
    "RIO NEGRO": "Río Negro",
    NEUQUEN: "Neuquén",
    FORMOSA: "Formosa",
    CHUBUT: "Chubut",
    "SAN LUIS": "San Luis",
    CATAMARCA: "Catamarca",
    "LA RIOJA": "La Rioja",
    "LA PAMPA": "La Pampa",
    "SANTA CRUZ": "Santa Cruz",
    "TIERRA DEL FUEGO": "Tierra del Fuego",
  };

  const upper = p.toUpperCase();
  return mapping[upper] || p;
}

function isValidProvince(p: string): boolean {
  const provinces = [
    "BUENOS AIRES",
    "CORDOBA",
    "SANTA FE",
    "MENDOZA",
    "TUCUMAN",
    "ENTRE RIOS",
    "SALTA",
    "MISIONES",
    "CHACO",
    "CORRIENTES",
    "SANTIAGO DEL ESTERO",
    "SAN JUAN",
    "JUJUY",
    "RIO NEGRO",
    "NEUQUEN",
    "FORMOSA",
    "CHUBUT",
    "SAN LUIS",
    "CATAMARCA",
    "LA RIOJA",
    "LA PAMPA",
    "SANTA CRUZ",
    "TIERRA DEL FUEGO",
  ];
  return provinces.includes(p.toUpperCase());
}

async function parseLADText() {
  const scriptsDir = path.dirname(__filename);
  const textPath = path.join(scriptsDir, "data-sources", "lad-anac-ene21-layout.txt");
  const content = fs.readFileSync(textPath, "utf-8");

  const lines = content.split("\n");
  const entries: LADEntry[] = [];

  // Main regex for standard LAD entries
  // Pattern: N° CODIGO TIPO NOMBRE DIG1 DIG2 DIMENSIONES SUPERFICIE ELEVACION LATITUD LONGITUD
  const entryRegex =
    /^(\d+)\s+(\d+)\s+(LAD[HAS]?)\s+(.+?)\s{2,}(\d{1,2})\s+(\d{1,2})\s+(\d+x\d+)\s+(\w+)\s+(\d+)\s*mts?\.\s+(\d{6},\d{2}[NS])\s+(\d{7},\d{2}[EW])/;

  // Alternative regex for entries where some fields might be merged
  const altRegex =
    /^(\d+)\s+(\d+)\s+(LAD[HAS]?)\s+(.+?)\s+(\d{1,2})\s+(\d{1,2})\s+(\d+x\d+)\s+(\w+)\s+(\d+)\s*mts?\.\s+(\d{6},\d{2}[NS])\s+(\d{7},\d{2}[EW])/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    let match = line.match(entryRegex) || line.match(altRegex);
    if (!match) continue;

    // Look ahead for ubicacion and region
    let ubicacion = "";
    let region: string | null = null;

    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      const nextLine = lines[j];

      // Check for region code (RA + 2 letters at end of line)
      const regionMatch = nextLine.match(/\s+(RA[NEOSC][EOACU])\s*$/);
      if (regionMatch) {
        region = regionMatch[1];
      }

      // Check for ubicacion info
      if (nextLine.includes("Km.") || nextLine.includes("localidad") || nextLine.includes("Provincia")) {
        ubicacion += " " + nextLine.trim();
      }

      // Stop if we hit the next entry
      if (nextLine.match(/^\d+\s+\d+\s+LAD/)) break;
    }

    ubicacion = ubicacion.replace(/\s+/g, " ").trim();

    const lat = parseDMS(match[10]);
    const lon = parseDMS(match[11]);

    // Validate coordinates are in Argentina
    if (lat === 0 || lon === 0 || lat < -56 || lat > -21 || lon < -74 || lon > -53) {
      continue;
    }

    const dim = parseDimensions(match[7]);
    const heading1 = parseInt(match[5], 10);
    const heading2 = parseInt(match[6], 10);

    entries.push({
      numero: parseInt(match[1], 10),
      codigo: match[2],
      tipo: match[3] as LADEntry["tipo"],
      nombre: match[4].trim(),
      runways: [
        {
          heading1,
          heading2,
          dimensions: match[7],
          length: dim.length,
          width: dim.width,
        },
      ],
      superficie: match[8],
      elevacion: parseInt(match[9], 10),
      lat,
      lon,
      ubicacion,
      provincia: extractProvincia(ubicacion),
      region,
    });
  }

  console.log(`Parsed ${entries.length} LAD entries from ANAC PDF`);

  // Write to JSON
  const outputPath = path.join(scriptsDir, "data-sources", "lad-anac-parsed.json");
  fs.writeFileSync(outputPath, JSON.stringify(entries, null, 2));
  console.log(`Written to: ${outputPath}`);

  // Stats
  const tipos = entries.reduce(
    (acc, e) => {
      acc[e.tipo] = (acc[e.tipo] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  console.log("\nBy type:", tipos);

  // Surface types
  const superficies = entries.reduce(
    (acc, e) => {
      acc[e.superficie] = (acc[e.superficie] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  console.log("\nBy surface:", superficies);

  // Regions
  const regions = entries.reduce(
    (acc, e) => {
      const r = e.region || "Unknown";
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  console.log("\nBy region:", regions);

  // Province distribution
  const provincias = entries.reduce(
    (acc, e) => {
      const p = e.provincia || "Unknown";
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  console.log("\nBy province (top 10):");
  Object.entries(provincias)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([p, c]) => console.log(`  ${p}: ${c}`));

  // Sample entries
  console.log("\nSample entries:");
  entries.slice(0, 3).forEach((e) => {
    console.log(`  ${e.nombre}:`);
    console.log(`    Coords: ${e.lat.toFixed(4)}, ${e.lon.toFixed(4)}`);
    console.log(`    Runway: ${e.runways[0].dimensions} (${e.superficie})`);
    console.log(`    Elev: ${e.elevacion}m | Region: ${e.region} | Prov: ${e.provincia}`);
  });
}

parseLADText().catch(console.error);
