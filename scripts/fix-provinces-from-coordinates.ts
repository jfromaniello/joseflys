#!/usr/bin/env npx tsx
/**
 * Fix missing/invalid provinces in argentina.json using real province geometries
 * Uses GADM GeoJSON with actual province polygons for accurate point-in-polygon
 */

import * as fs from "fs";
import * as path from "path";

// Ray casting algorithm for point-in-polygon
function pointInPolygon(
  lat: number,
  lon: number,
  ring: number[][] // Array of [lon, lat] pairs
): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]; // lon
    const yi = ring[i][1]; // lat
    const xj = ring[j][0];
    const yj = ring[j][1];

    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Check if point is inside a MultiPolygon or Polygon geometry
function pointInGeometry(
  lat: number,
  lon: number,
  geometry: { type: string; coordinates: number[][][][] | number[][][] }
): boolean {
  if (geometry.type === "MultiPolygon") {
    const coords = geometry.coordinates as number[][][][];
    for (const polygon of coords) {
      // First ring is the outer boundary
      if (polygon.length > 0 && pointInPolygon(lat, lon, polygon[0])) {
        // Check if inside any holes
        let inHole = false;
        for (let i = 1; i < polygon.length; i++) {
          if (pointInPolygon(lat, lon, polygon[i])) {
            inHole = true;
            break;
          }
        }
        if (!inHole) return true;
      }
    }
  } else if (geometry.type === "Polygon") {
    const coords = geometry.coordinates as number[][][];
    if (coords.length > 0 && pointInPolygon(lat, lon, coords[0])) {
      let inHole = false;
      for (let i = 1; i < coords.length; i++) {
        if (pointInPolygon(lat, lon, coords[i])) {
          inHole = true;
          break;
        }
      }
      if (!inHole) return true;
    }
  }
  return false;
}

interface GeoJSONFeature {
  type: "Feature";
  properties: {
    NAME_1: string;
    [key: string]: string;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][][] | number[][][];
  };
}

interface GeoJSON {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

// Map GADM names to our standard names
const NAME_MAPPING: Record<string, string> = {
  "BuenosAires": "Buenos Aires",
  "CiudaddeBuenosAires": "CABA",
  "EntreRíos": "Entre Ríos",
  "RíoNegro": "Río Negro",
  "SantaCruz": "Santa Cruz",
  "SantaFe": "Santa Fe",
  "SantiagodeEstero": "Santiago del Estero",
  "SantiagodelEstero": "Santiago del Estero",
  "TierradelFuego": "Tierra del Fuego",
  "SanJuan": "San Juan",
  "SanLuis": "San Luis",
  "LaPampa": "La Pampa",
  "LaRioja": "La Rioja",
};

async function main() {
  const scriptsDir = path.dirname(__filename);
  const dataDir = path.join(scriptsDir, "..", "data");

  console.log("Loading GADM province geometries...");
  const geojsonPath = path.join(dataDir, "osm-cache", "argentina-provinces.geojson");

  if (!fs.existsSync(geojsonPath)) {
    console.error("ERROR: Province GeoJSON not found. Download from GADM:");
    console.error("  curl -sL 'https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_ARG_1.json.zip' -o /tmp/argentina.zip");
    console.error("  unzip /tmp/argentina.zip -d data/osm-cache/");
    console.error("  mv data/osm-cache/gadm41_ARG_1.json data/osm-cache/argentina-provinces.geojson");
    process.exit(1);
  }

  const geojson = JSON.parse(fs.readFileSync(geojsonPath, "utf-8")) as GeoJSON;
  console.log(`Loaded ${geojson.features.length} provinces`);

  // Build province lookup
  const provinces = geojson.features.map((f) => ({
    name: NAME_MAPPING[f.properties.NAME_1] || f.properties.NAME_1,
    geometry: f.geometry,
  }));

  console.log("Provinces:", provinces.map((p) => p.name).join(", "));

  // Load argentina.json
  console.log("\nLoading argentina.json...");
  const argentinaPath = path.join(dataDir, "ad-lads", "argentina.json");
  const argentinaData = JSON.parse(fs.readFileSync(argentinaPath, "utf-8"));

  // Invalid/partial province names from PDF parsing
  const INVALID_PROVINCES = ["LA", "BUENOS", "SAN", "ENTRE", "SANTA", "RIO"];

  let fixed = 0;
  let fixedFromNull = 0;
  let notFound = 0;
  const notFoundList: string[] = [];

  for (const aerodrome of argentinaData.data) {
    const isInvalid = INVALID_PROVINCES.includes(aerodrome.province);
    const isNull = aerodrome.province === null;

    // Skip if province is already valid
    if (!isInvalid && !isNull) continue;

    // Find province using point-in-polygon
    let foundProvince: string | null = null;
    for (const province of provinces) {
      if (pointInGeometry(aerodrome.lat, aerodrome.lon, province.geometry)) {
        foundProvince = province.name;
        break;
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
      notFoundList.push(`${aerodrome.name} (${aerodrome.lat.toFixed(2)}, ${aerodrome.lon.toFixed(2)})`);
    }
  }

  console.log(`\nFixed ${fixed} invalid provinces`);
  console.log(`Filled ${fixedFromNull} null provinces`);
  console.log(`Could not determine province for ${notFound} aerodromes`);

  if (notFoundList.length > 0 && notFoundList.length <= 10) {
    console.log("Not found:", notFoundList.join(", "));
  }

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
    console.log(`\nNote: ${unknownCount} aerodromes still without province`);
  }
}

main().catch(console.error);
