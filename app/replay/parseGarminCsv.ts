import type { ReplayPoint } from "./types";

const FEET_TO_METERS = 0.3048;

/**
 * Descriptive column headers (the second header row of a Garmin G3X log) mapped
 * to the {@link ReplayPoint} fields we consume. Matching on these unit-bearing
 * names is more robust than the terse third-row aliases (`GndSpd`, `TRK`, …).
 */
const COLUMN_HEADERS = {
  date: "Date (yyyy-mm-dd)",
  localTime: "Time (hh:mm:ss)",
  utcOffset: "UTC Offset (hh:mm)",
  lat: "Latitude (deg)",
  lon: "Longitude (deg)",
  altFt: "GPS Altitude (ft)",
  groundSpeedKt: "GPS Ground Speed (kt)",
  iasKt: "Indicated Airspeed (kt)",
  tasKt: "True Airspeed (kt)",
  vsFpm: "Vertical Speed (ft/min)",
  pitchDeg: "Pitch (deg)",
  rollDeg: "Roll (deg)",
  headingMagDeg: "Magnetic Heading (deg)",
  latAccG: "Lateral Acceleration (G)",
  windDirDeg: "Wind Direction (deg)",
  windSpeedKt: "Wind Speed (kt)",
  oatC: "Outside Air Temp (deg C)",
  aglFt: "Height Above Ground (ft)",
  rpm: "RPM",
  manifoldInHg: "Manifold Press (inch Hg)",
  fuelFlowGph: "Fuel Flow (gal/hour)",
  fuelPressPsi: "Fuel Press (PSI)",
  oilPressPsi: "Oil Press (PSI)",
  oilTempF: "Oil Temp (deg F)",
  coolantTempF: "Coolant Temp (deg F)",
  volts: "Volts",
  amps: "Alt Amps",
} as const;

/** Per-cylinder temperature columns; the replay keeps only the hottest reading. */
const EGT_HEADERS = [1, 2, 3, 4, 5, 6].map((n) => `EGT${n} (deg F)`);
const CHT_HEADERS = [1, 2, 3, 4, 5, 6].map((n) => `CHT${n} (deg F)`);

/**
 * Whether `content` looks like a Garmin G3X data log. These logs lead with an
 * `#airframe_info` line and carry the GPS latitude/longitude headers; checking
 * both avoids misclassifying arbitrary CSVs.
 */
export function isGarminCsv(content: string): boolean {
  const head = content.slice(0, 4000);
  return (
    head.includes("#airframe_info") ||
    (head.includes(COLUMN_HEADERS.lat) && head.includes(COLUMN_HEADERS.lon))
  );
}

/** Aircraft metadata carried on the `#airframe_info` header line. */
export interface GarminAirframeInfo {
  /** Aircraft registration / tail number (`aircraft_ident`), when present. */
  aircraftIdent?: string;
}

/** Factory-default ident Garmin writes when no tail number is configured. */
const PLACEHOLDER_IDENT = "SAMPLE";

/**
 * Extracts aircraft metadata from the `#airframe_info` line of a Garmin G3X
 * log. Returns an empty object when the attribute is missing, blank, or the
 * factory placeholder — e.g. for GPX content or an already-anonymous log.
 */
export function parseGarminAirframeInfo(content: string): GarminAirframeInfo {
  const line = content
    .slice(0, 4000)
    .split(/\r?\n/)
    .find((l) => l.startsWith("#airframe_info"));
  if (!line) return {};
  const ident = /aircraft_ident="([^"]*)"/.exec(line)?.[1].trim();
  if (!ident || ident.toUpperCase() === PLACEHOLDER_IDENT) return {};
  return { aircraftIdent: ident };
}

/** Splits one CSV line on commas, honoring double-quoted fields. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/** Parses a numeric cell, returning `undefined` for blank or non-numeric values. */
function num(cell: string | undefined): number | undefined {
  if (cell === undefined) return undefined;
  const trimmed = cell.trim();
  if (trimmed === "") return undefined;
  const value = Number.parseFloat(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Parses a Garmin G3X CSV flight log into sorted {@link ReplayPoint}s.
 *
 * The log has three header rows: an `#airframe_info` metadata line, a
 * descriptive column header (matched here), and a terse alias row. Rows without
 * valid coordinates or a resolvable timestamp are dropped. Absolute time is
 * built from the local date/time plus the UTC offset column so it is unambiguous
 * across the day boundary. Optional avionics fields (airspeeds, attitude, wind)
 * are carried through when present.
 *
 * @throws If no header row is found or fewer than two usable points remain.
 */
export function parseGarminCsv(content: string): ReplayPoint[] {
  const lines = content.split(/\r?\n/);

  // Locate the descriptive header row (it carries the latitude/longitude names).
  const headerIndex = lines.findIndex(
    (line) => line.includes(COLUMN_HEADERS.lat) && line.includes(COLUMN_HEADERS.lon)
  );
  if (headerIndex === -1) {
    throw new Error("Not a recognized Garmin CSV log (missing column headers).");
  }

  const header = splitCsvLine(lines[headerIndex]).map((h) => h.trim());
  const col = (name: string): number => header.indexOf(name);

  const idx = {
    date: col(COLUMN_HEADERS.date),
    localTime: col(COLUMN_HEADERS.localTime),
    utcOffset: col(COLUMN_HEADERS.utcOffset),
    lat: col(COLUMN_HEADERS.lat),
    lon: col(COLUMN_HEADERS.lon),
    altFt: col(COLUMN_HEADERS.altFt),
    groundSpeedKt: col(COLUMN_HEADERS.groundSpeedKt),
    iasKt: col(COLUMN_HEADERS.iasKt),
    tasKt: col(COLUMN_HEADERS.tasKt),
    vsFpm: col(COLUMN_HEADERS.vsFpm),
    pitchDeg: col(COLUMN_HEADERS.pitchDeg),
    rollDeg: col(COLUMN_HEADERS.rollDeg),
    headingMagDeg: col(COLUMN_HEADERS.headingMagDeg),
    latAccG: col(COLUMN_HEADERS.latAccG),
    windDirDeg: col(COLUMN_HEADERS.windDirDeg),
    windSpeedKt: col(COLUMN_HEADERS.windSpeedKt),
    oatC: col(COLUMN_HEADERS.oatC),
    aglFt: col(COLUMN_HEADERS.aglFt),
    rpm: col(COLUMN_HEADERS.rpm),
    manifoldInHg: col(COLUMN_HEADERS.manifoldInHg),
    fuelFlowGph: col(COLUMN_HEADERS.fuelFlowGph),
    fuelPressPsi: col(COLUMN_HEADERS.fuelPressPsi),
    oilPressPsi: col(COLUMN_HEADERS.oilPressPsi),
    oilTempF: col(COLUMN_HEADERS.oilTempF),
    coolantTempF: col(COLUMN_HEADERS.coolantTempF),
    volts: col(COLUMN_HEADERS.volts),
    amps: col(COLUMN_HEADERS.amps),
  };

  const egtCols = EGT_HEADERS.map(col).filter((i) => i !== -1);
  const chtCols = CHT_HEADERS.map(col).filter((i) => i !== -1);

  /** Hottest reading across per-cylinder columns, or `undefined` when all blank. */
  const maxOf = (row: string[], cols: number[]): number | undefined => {
    let max: number | undefined;
    for (const i of cols) {
      const value = num(row[i]);
      if (value !== undefined && (max === undefined || value > max)) max = value;
    }
    return max;
  };

  if (idx.lat === -1 || idx.lon === -1) {
    throw new Error("Garmin CSV is missing latitude/longitude columns.");
  }

  const at = (row: string[], i: number): string | undefined => (i === -1 ? undefined : row[i]);

  const points: ReplayPoint[] = [];
  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === "") continue;
    const row = splitCsvLine(line);

    const lat = num(at(row, idx.lat));
    const lon = num(at(row, idx.lon));
    if (lat === undefined || lon === undefined) continue;

    const date = at(row, idx.date)?.trim();
    const localTime = at(row, idx.localTime)?.trim();
    const utcOffset = at(row, idx.utcOffset)?.trim();
    if (!date || !localTime || !utcOffset) continue;
    const timeMs = Date.parse(`${date}T${localTime}${utcOffset}`);
    if (!Number.isFinite(timeMs)) continue;

    const altFt = num(at(row, idx.altFt));

    points.push({
      lat,
      lon,
      ele: altFt !== undefined ? altFt * FEET_TO_METERS : 0,
      timeMs,
      groundSpeedKt: num(at(row, idx.groundSpeedKt)),
      iasKt: num(at(row, idx.iasKt)),
      tasKt: num(at(row, idx.tasKt)),
      vsFpm: num(at(row, idx.vsFpm)),
      pitchDeg: num(at(row, idx.pitchDeg)),
      rollDeg: num(at(row, idx.rollDeg)),
      headingMagDeg: num(at(row, idx.headingMagDeg)),
      latAccG: num(at(row, idx.latAccG)),
      windDirDeg: num(at(row, idx.windDirDeg)),
      windSpeedKt: num(at(row, idx.windSpeedKt)),
      oatC: num(at(row, idx.oatC)),
      aglFt: num(at(row, idx.aglFt)),
      rpm: num(at(row, idx.rpm)),
      manifoldInHg: num(at(row, idx.manifoldInHg)),
      fuelFlowGph: num(at(row, idx.fuelFlowGph)),
      fuelPressPsi: num(at(row, idx.fuelPressPsi)),
      oilPressPsi: num(at(row, idx.oilPressPsi)),
      oilTempF: num(at(row, idx.oilTempF)),
      coolantTempF: num(at(row, idx.coolantTempF)),
      volts: num(at(row, idx.volts)),
      amps: num(at(row, idx.amps)),
      egtMaxF: maxOf(row, egtCols),
      chtMaxF: maxOf(row, chtCols),
    });
  }

  points.sort((a, b) => a.timeMs - b.timeMs);

  if (points.length < 2) {
    throw new Error("Garmin CSV must contain at least two valid, timestamped rows.");
  }

  return points;
}
