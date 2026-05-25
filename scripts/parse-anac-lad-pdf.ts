/**
 * Parse ANAC LAD PDF extracted text (layout-preserved version).
 *
 * Input format (Feb-2026 PDF):
 *   #  TIPO  N°REG  DENOMINACIÓN  RUMBO  DIMENSIONES  SUPERFICIE  ELEVACIÓN  LATITUD  LONGITUD  UBICACIÓN  REGIONAL
 *
 * Notes vs. previous (Jan-2021) layout:
 *   - TIPO column now precedes the registration number.
 *   - Runway headings joined as "10/28" (or "-" for heliports).
 *   - Dimensions written "1000m. x 30m.".
 *   - Elevations can be decimal: "54,5 mts.".
 *   - Region codes are now "DRCE / DRNE / DRNO / DRSU".
 *   - UBICACIÓN frequently wraps onto one or two adjacent lines, visually
 *     centered around the anchor row. DENOMINACIÓN can wrap too (rare).
 *   - Secondary-runway rows reuse a previous registro and use "-" as #;
 *     they carry placeholder coords ("000,00S" / "0000,00W") and are skipped.
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
    dimensions: string;
    length: number;
    width: number;
  }[];
  superficie: string;
  elevacion: number;
  lat: number;
  lon: number;
  ubicacion: string;
  provincia: string | null;
  region: string | null;
}

function parseDMS(dms: string): number {
  const match = dms.match(/^0?(\d{2,3})(\d{2})(\d{2})(?:,\d+)?([NSEW])$/);
  if (!match) return 0;
  const degrees = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const dir = match[4];
  let decimal = degrees + minutes / 60 + seconds / 3600;
  if (dir === "S" || dir === "W") decimal = -decimal;
  return decimal;
}

function parseDimensions(dim: string): { length: number; width: number } {
  const match = dim.match(/(\d+)\s*m?\.?\s*x\s*(\d+)\s*m?\.?/i);
  if (match) {
    return { length: parseInt(match[1], 10), width: parseInt(match[2], 10) };
  }
  return { length: 0, width: 0 };
}

const PROVINCE_MAP: Record<string, string> = {
  "BUENOS AIRES": "Buenos Aires",
  CORDOBA: "Córdoba",
  "CÓRDOBA": "Córdoba",
  "SANTA FE": "Santa Fe",
  MENDOZA: "Mendoza",
  TUCUMAN: "Tucumán",
  "TUCUMÁN": "Tucumán",
  "ENTRE RIOS": "Entre Ríos",
  "ENTRE RÍOS": "Entre Ríos",
  SALTA: "Salta",
  MISIONES: "Misiones",
  CHACO: "Chaco",
  CORRIENTES: "Corrientes",
  "SANTIAGO DEL ESTERO": "Santiago del Estero",
  "SAN JUAN": "San Juan",
  JUJUY: "Jujuy",
  "RIO NEGRO": "Río Negro",
  "RÍO NEGRO": "Río Negro",
  NEUQUEN: "Neuquén",
  "NEUQUÉN": "Neuquén",
  FORMOSA: "Formosa",
  CHUBUT: "Chubut",
  "SAN LUIS": "San Luis",
  CATAMARCA: "Catamarca",
  "LA RIOJA": "La Rioja",
  "LA PAMPA": "La Pampa",
  "SANTA CRUZ": "Santa Cruz",
  "TIERRA DEL FUEGO": "Tierra del Fuego",
};

function normalizeProvince(p: string): string {
  return PROVINCE_MAP[p.toUpperCase().trim()] || p;
}

function extractProvincia(ubicacion: string): string | null {
  let match = ubicacion.match(/Provincia\s+de\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s\.]+?)\s*\.?\s*$/);
  if (match) {
    const candidate = match[1].trim().replace(/\s+/g, " ").replace(/\.$/, "").trim();
    return normalizeProvince(candidate);
  }
  match = ubicacion.match(/Pcia\.\s+de\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s\.]+?)\s*\.?\s*$/);
  if (match) {
    const candidate = match[1].trim().replace(/\s+/g, " ").replace(/\.$/, "").trim();
    return normalizeProvince(candidate);
  }
  return null;
}

// Anchor = the row that carries all structured columns. Positional groups
// (1=num, 2=tipo, 3=codigo, 4=name, 5=rumbo, 6=dim, 7=surface, 8=elev,
// 9=lat, 10=lon, 11=rest). Named groups would require ES2018+ in tsconfig.
const ANCHOR_REGEX =
  /^\s*(\d+|-)\s+(LADH|LADA|LADS|LAD)\s+(\d+)\s+(.+?)\s{2,}(\d{1,2}\/\d{1,2}|-)\s+(\d+\s*m?\.?\s*x\s*\d+\s*m?\.?)\s+([A-ZÁÉÍÓÚÑ]+)\s+([\d,]+)\s*mts?\.\s+(\d{3,6}(?:,\d+)?[NS])\s+(\d{3,7}(?:,\d+)?[EW])(.*)$/;

const REGION_REGEX = /(?:^|\s+)(DR(?:CE|NE|NO|SU))\s*$/;

const SKIP_WRAP_LINE_REGEX = /LISTADO|Fecha|DENOMINACI|UBICACI|REGIONAL/;

interface AnchorGroups {
  num: string;
  tipo: string;
  codigo: string;
  name: string;
  rumbo: string;
  dim: string;
  surface: string;
  elev: string;
  lat: string;
  lon: string;
  rest: string;
}

interface Anchor {
  index: number;
  groups: AnchorGroups;
  rumboCol: number; // column where rumbo starts on the anchor line
  ubicacionCol: number; // column right after lon ends
}

function parseLADText() {
  const scriptsDir = path.dirname(__filename);
  const textPath = path.join(scriptsDir, "data-sources", "lad-anac-feb26-layout.txt");
  const content = fs.readFileSync(textPath, "utf-8");

  // The PDF contains occasional typos like "1000X30m. x 30m." (entry 637,
  // codigo 2889). Normalize the obvious pattern so the anchor regex matches.
  const cleaned = content.replace(/(\d+)X\d+m\.\s+x\s+(\d+)m\./g, "$1m. x $2m.");
  const lines = cleaned.split("\n");

  // Pass 1: locate every anchor row.
  const anchors: Anchor[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = ANCHOR_REGEX.exec(lines[i]);
    if (!m) continue;
    const groups: AnchorGroups = {
      num: m[1],
      tipo: m[2],
      codigo: m[3],
      name: m[4],
      rumbo: m[5],
      dim: m[6],
      surface: m[7],
      elev: m[8],
      lat: m[9],
      lon: m[10],
      rest: m[11] ?? "",
    };
    const codigoStart = lines[i].indexOf(groups.codigo);
    const rumboCol = lines[i].indexOf(groups.rumbo, codigoStart + groups.codigo.length);
    const latStart = lines[i].indexOf(groups.lat);
    const lonStart = lines[i].indexOf(groups.lon, latStart + groups.lat.length);
    const ubicacionCol = lonStart + groups.lon.length;
    anchors.push({ index: i, groups, rumboCol, ubicacionCol });
  }

  // Pass 2: assign each wrap line to exactly one anchor. We need to do this
  // in a single pass so each line lands in one place. Tie-break rules:
  //   - Line ending with "." → wrap-below of previous anchor (it completes
  //     the previous sentence).
  //   - Otherwise → wrap-above of next anchor (it opens a new sentence).
  //
  // This matches the actual visual convention in the PDF: ubicación text is
  // centered around its anchor row, with sentence-completers below and
  // sentence-openers above.
  const firstAnchorIdx = anchors[0]?.index ?? Infinity;
  const lastAnchorIdx = anchors[anchors.length - 1]?.index ?? -1;

  // Per anchor: name wrap fragments (rendered as a left column above the
  // anchor) and ubicación above/below fragments (right column).
  const nameWraps = new Map<number, string[]>();
  const ubicAbove = new Map<number, string[]>();
  const ubicBelow = new Map<number, string[]>();

  for (let i = 0; i < lines.length; i++) {
    if (i < firstAnchorIdx || i > lastAnchorIdx) continue; // skip header/footer
    const line = lines[i];
    if (!line.trim()) continue;
    if (SKIP_WRAP_LINE_REGEX.test(line)) continue;
    if (anchors.some((a) => a.index === i)) continue;

    const prevAnchor = [...anchors].reverse().find((a) => a.index < i);
    const nextAnchor = anchors.find((a) => a.index > i);
    if (!prevAnchor && !nextAnchor) continue;

    let target: Anchor;
    let position: "above" | "below";
    if (!prevAnchor) {
      target = nextAnchor!;
      position = "above";
    } else if (!nextAnchor) {
      target = prevAnchor;
      position = "below";
    } else {
      const distPrev = i - prevAnchor.index;
      const distNext = nextAnchor.index - i;
      if (distPrev < distNext) {
        target = prevAnchor;
        position = "below";
      } else if (distNext < distPrev) {
        target = nextAnchor;
        position = "above";
      } else {
        // Tie: use content. A line ending in "." completes the previous
        // sentence; anything else opens the next one.
        const trimmedRight = line.replace(REGION_REGEX, "").trim();
        if (/\.\s*$/.test(trimmedRight)) {
          target = prevAnchor;
          position = "below";
        } else {
          target = nextAnchor;
          position = "above";
        }
      }
    }

    // Split: anything left of the anchor's rumbo column is a name-wrap
    // fragment; anything from the lon column onward is the ubicación wrap.
    const leftPart = line.slice(0, target.rumboCol).trim();
    const rightPart = line.slice(target.ubicacionCol).replace(REGION_REGEX, "").trim();

    if (leftPart) {
      const arr = nameWraps.get(target.index) ?? [];
      if (position === "above") arr.unshift(leftPart);
      else arr.push(leftPart);
      nameWraps.set(target.index, arr);
    }
    if (rightPart) {
      const bucket = position === "above" ? ubicAbove : ubicBelow;
      const arr = bucket.get(target.index) ?? [];
      arr.push(rightPart);
      bucket.set(target.index, arr);
    }
  }

  // Pass 3: build entries.
  const entries: LADEntry[] = [];
  for (const anchor of anchors) {
    const g = anchor.groups;
    const lat = parseDMS(g.lat);
    const lon = parseDMS(g.lon);
    // Secondary-runway rows (numero "-") may have placeholder coords. Keep
    // them anyway so we can merge them into the primary; the merge step
    // below will discard them.
    const isSecondary = g.num === "-";
    if (!isSecondary) {
      if (lat === 0 || lon === 0) continue;
      if (lat < -56 || lat > -21 || lon < -74 || lon > -53) continue;
    }

    let region: string | null = null;
    const restRaw = g.rest ?? "";
    const regionMatch = restRaw.match(REGION_REGEX);
    let ubicacionOnAnchor: string;
    if (regionMatch) {
      region = regionMatch[1];
      ubicacionOnAnchor = restRaw.slice(0, regionMatch.index!).trim();
    } else {
      ubicacionOnAnchor = restRaw.trim();
    }

    const nameAbove = (nameWraps.get(anchor.index) ?? []).join(" ");
    const baseName = g.name.trim().replace(/\s+/g, " ");
    const nombre = [nameAbove, baseName].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

    const above = (ubicAbove.get(anchor.index) ?? []).join(" ");
    const below = (ubicBelow.get(anchor.index) ?? []).join(" ");
    const ubicacion = [above, ubicacionOnAnchor, below]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    const dim = parseDimensions(g.dim);
    let heading1 = 0;
    let heading2 = 0;
    if (g.rumbo !== "-") {
      const parts = g.rumbo.split("/");
      heading1 = parseInt(parts[0], 10);
      heading2 = parseInt(parts[1], 10);
    }

    entries.push({
      numero: parseInt(g.num, 10) || 0,
      codigo: g.codigo,
      tipo: g.tipo as LADEntry["tipo"],
      nombre,
      runways: [
        {
          heading1,
          heading2,
          dimensions: g.dim.replace(/\s+/g, ""),
          length: dim.length,
          width: dim.width,
        },
      ],
      superficie: g.surface,
      elevacion: Math.round(parseFloat(g.elev.replace(",", "."))),
      lat,
      lon,
      ubicacion,
      provincia: extractProvincia(ubicacion),
      region,
    });
  }

  // Merge secondary runways into their primary entry (matched by codigo).
  const finalEntries: LADEntry[] = [];
  let mergedCount = 0;
  let orphanCount = 0;
  for (const e of entries) {
    const isSecondary = e.numero === 0 && /\(secundaria\)/i.test(e.nombre);
    if (!isSecondary) {
      finalEntries.push(e);
      continue;
    }
    const primary = finalEntries.find((p) => p.codigo === e.codigo);
    if (primary) {
      primary.runways.push(...e.runways);
      mergedCount++;
    } else {
      orphanCount++;
    }
  }

  console.log(
    `Parsed ${finalEntries.length} LAD entries from ANAC PDF ` +
      `(merged ${mergedCount} secondary runways, ${orphanCount} orphans dropped)`
  );

  const outputPath = path.join(scriptsDir, "data-sources", "lad-anac-parsed.json");
  fs.writeFileSync(outputPath, JSON.stringify(finalEntries, null, 2));
  console.log(`Written to: ${outputPath}`);

  const tipos = finalEntries.reduce<Record<string, number>>((acc, e) => {
    acc[e.tipo] = (acc[e.tipo] || 0) + 1;
    return acc;
  }, {});
  console.log("\nBy type:", tipos);

  const superficies = finalEntries.reduce<Record<string, number>>((acc, e) => {
    acc[e.superficie] = (acc[e.superficie] || 0) + 1;
    return acc;
  }, {});
  console.log("\nBy surface:", superficies);

  const regions = finalEntries.reduce<Record<string, number>>((acc, e) => {
    const r = e.region || "Unknown";
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});
  console.log("\nBy region:", regions);

  const provincias = finalEntries.reduce<Record<string, number>>((acc, e) => {
    const p = e.provincia || "Unknown";
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});
  console.log("\nBy province (top 10):");
  Object.entries(provincias)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([p, c]) => console.log(`  ${p}: ${c}`));

  const multiRunway = finalEntries.filter((e) => e.runways.length > 1);
  console.log(`\nEntries with >1 runway: ${multiRunway.length}`);

  console.log("\nSample entries:");
  finalEntries.slice(0, 6).forEach((e) => {
    console.log(`  ${e.nombre}:`);
    console.log(`    Coords: ${e.lat.toFixed(4)}, ${e.lon.toFixed(4)}`);
    console.log(`    Runway: ${e.runways[0].dimensions} (${e.superficie})`);
    console.log(`    Elev: ${e.elevacion}m | Region: ${e.region} | Prov: ${e.provincia}`);
    console.log(`    Ubicacion: ${e.ubicacion}`);
  });
}

parseLADText();
