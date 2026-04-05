import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "aerodromes.db");

// Feature types we index from OSM
export const FEATURE_TYPES = [
  "river",
  "lake",
  "coast",
  "highway",
  "mountain",
] as const;

export type FeatureType = (typeof FEATURE_TYPES)[number];

export interface Aerodrome {
  id: number;
  code: string | null;
  name: string;
  type: "AD" | "LAD";
  lat: number;
  lon: number;
  elevation: number | null;
  province: string | null;
}

// Province/region mappings
export const REGION_PROVINCES: Record<string, string[]> = {
  patagonia: ["Neuquén", "Río Negro", "Chubut", "Santa Cruz", "Tierra del Fuego"],
  cuyo: ["Mendoza", "San Juan", "San Luis"],
  noa: ["Jujuy", "Salta", "Tucumán", "Catamarca", "Santiago del Estero"],
  nea: ["Misiones", "Corrientes", "Chaco", "Formosa"],
  pampeana: ["Buenos Aires", "CABA", "Córdoba", "Santa Fe", "La Pampa", "Entre Ríos"],
  litoral: ["Entre Ríos", "Corrientes", "Misiones", "Santa Fe"],
};

export interface NearbyFeature {
  aerodrome_id: number;
  feature_type: FeatureType;
  feature_name: string | null;
  distance_km: number;
}

export interface AerodromeWithFeatures extends Aerodrome {
  nearby: {
    [K in FeatureType]?: { name: string | null; distance_km: number };
  };
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    // Open in readonly mode for Vercel compatibility (read-only filesystem)
    db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  }
  return db;
}

export function initDb(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS aerodromes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('AD', 'LAD')),
      lat REAL NOT NULL,
      lon REAL NOT NULL,
      elevation INTEGER
    );

    CREATE TABLE IF NOT EXISTS nearby_features (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aerodrome_id INTEGER NOT NULL,
      feature_type TEXT NOT NULL,
      feature_name TEXT,
      distance_km REAL NOT NULL,
      FOREIGN KEY (aerodrome_id) REFERENCES aerodromes(id)
    );

    CREATE INDEX IF NOT EXISTS idx_aerodromes_code ON aerodromes(code);
    CREATE INDEX IF NOT EXISTS idx_aerodromes_type ON aerodromes(type);
    CREATE INDEX IF NOT EXISTS idx_features_type_dist ON nearby_features(feature_type, distance_km);
    CREATE INDEX IF NOT EXISTS idx_features_aerodrome ON nearby_features(aerodrome_id);
  `);
}

// Query functions
export function searchByFeature(
  featureType: FeatureType,
  maxDistanceKm: number,
  aerodromeType?: "AD" | "LAD"
): Aerodrome[] {
  const db = getDb();

  let query = `
    SELECT DISTINCT a.* FROM aerodromes a
    JOIN nearby_features nf ON a.id = nf.aerodrome_id
    WHERE nf.feature_type = ? AND nf.distance_km <= ?
  `;

  const params: (string | number)[] = [featureType, maxDistanceKm];

  if (aerodromeType) {
    query += " AND a.type = ?";
    params.push(aerodromeType);
  }

  query += " ORDER BY nf.distance_km ASC";

  return db.prepare(query).all(...params) as Aerodrome[];
}

export function searchByMultipleFeatures(
  criteria: { featureType: FeatureType; maxDistanceKm: number }[],
  aerodromeType?: "AD" | "LAD"
): Aerodrome[] {
  const db = getDb();

  if (criteria.length === 0) return [];

  // Build query with multiple JOINs
  let query = "SELECT DISTINCT a.* FROM aerodromes a";

  criteria.forEach((_, i) => {
    query += ` JOIN nearby_features nf${i} ON a.id = nf${i}.aerodrome_id`;
  });

  query += " WHERE 1=1";

  const params: (string | number)[] = [];

  criteria.forEach((c, i) => {
    query += ` AND nf${i}.feature_type = ? AND nf${i}.distance_km <= ?`;
    params.push(c.featureType, c.maxDistanceKm);
  });

  if (aerodromeType) {
    query += " AND a.type = ?";
    params.push(aerodromeType);
  }

  return db.prepare(query).all(...params) as Aerodrome[];
}

export function getAerodromeWithFeatures(id: number): AerodromeWithFeatures | null {
  const db = getDb();

  const aerodrome = db
    .prepare("SELECT * FROM aerodromes WHERE id = ?")
    .get(id) as Aerodrome | undefined;

  if (!aerodrome) return null;

  const features = db
    .prepare("SELECT * FROM nearby_features WHERE aerodrome_id = ?")
    .all(id) as NearbyFeature[];

  const nearby: AerodromeWithFeatures["nearby"] = {};
  for (const f of features) {
    nearby[f.feature_type] = {
      name: f.feature_name,
      distance_km: f.distance_km,
    };
  }

  return { ...aerodrome, nearby };
}

export function getAllAerodromes(): Aerodrome[] {
  const db = getDb();
  return db.prepare("SELECT * FROM aerodromes").all() as Aerodrome[];
}

export function getStats(): {
  totalAerodromes: number;
  totalAD: number;
  totalLAD: number;
  featuresIndexed: { [K in FeatureType]?: number };
} {
  const db = getDb();

  const total = db
    .prepare("SELECT COUNT(*) as count FROM aerodromes")
    .get() as { count: number };

  const byType = db
    .prepare("SELECT type, COUNT(*) as count FROM aerodromes GROUP BY type")
    .all() as { type: string; count: number }[];

  const features = db
    .prepare(
      "SELECT feature_type, COUNT(DISTINCT aerodrome_id) as count FROM nearby_features GROUP BY feature_type"
    )
    .all() as { feature_type: FeatureType; count: number }[];

  const featuresIndexed: { [K in FeatureType]?: number } = {};
  for (const f of features) {
    featuresIndexed[f.feature_type] = f.count;
  }

  return {
    totalAerodromes: total.count,
    totalAD: byType.find((t) => t.type === "AD")?.count ?? 0,
    totalLAD: byType.find((t) => t.type === "LAD")?.count ?? 0,
    featuresIndexed,
  };
}

// Search by province or region
export function searchByProvince(
  provinceOrRegion: string,
  aerodromeType?: "AD" | "LAD"
): Aerodrome[] {
  const db = getDb();

  // Check if it's a region name
  const regionKey = provinceOrRegion.toLowerCase();
  const provinces = REGION_PROVINCES[regionKey];

  let query: string;
  let params: string[];

  if (provinces) {
    // It's a region - search multiple provinces
    const placeholders = provinces.map(() => "?").join(", ");
    query = `SELECT * FROM aerodromes WHERE province IN (${placeholders})`;
    params = [...provinces];
  } else {
    // It's a single province - fuzzy match
    query = `SELECT * FROM aerodromes WHERE province LIKE ?`;
    params = [`%${provinceOrRegion}%`];
  }

  if (aerodromeType) {
    query += " AND type = ?";
    params.push(aerodromeType);
  }

  return db.prepare(query).all(...params) as Aerodrome[];
}

// Combined search: features + province/region
export function searchCombined(
  criteria: {
    features?: { featureType: FeatureType; maxDistanceKm: number }[];
    provinceOrRegion?: string;
    aerodromeType?: "AD" | "LAD";
  }
): Aerodrome[] {
  const db = getDb();
  const { features, provinceOrRegion, aerodromeType } = criteria;

  // Start building query
  let query = "SELECT DISTINCT a.* FROM aerodromes a";
  const params: (string | number)[] = [];

  // Add feature joins if needed
  if (features && features.length > 0) {
    features.forEach((_, i) => {
      query += ` JOIN nearby_features nf${i} ON a.id = nf${i}.aerodrome_id`;
    });
  }

  query += " WHERE 1=1";

  // Add feature conditions
  if (features && features.length > 0) {
    features.forEach((f, i) => {
      query += ` AND nf${i}.feature_type = ? AND nf${i}.distance_km <= ?`;
      params.push(f.featureType, f.maxDistanceKm);
    });
  }

  // Add province/region condition
  if (provinceOrRegion) {
    const regionKey = provinceOrRegion.toLowerCase();
    const provinces = REGION_PROVINCES[regionKey];

    if (provinces) {
      const placeholders = provinces.map(() => "?").join(", ");
      query += ` AND a.province IN (${placeholders})`;
      params.push(...provinces);
    } else {
      query += " AND a.province LIKE ?";
      params.push(`%${provinceOrRegion}%`);
    }
  }

  // Add type condition
  if (aerodromeType) {
    query += " AND a.type = ?";
    params.push(aerodromeType);
  }

  return db.prepare(query).all(...params) as Aerodrome[];
}
