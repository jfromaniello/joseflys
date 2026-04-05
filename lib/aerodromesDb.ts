import aerodromesData from "@/data/aerodromes.json";
import nearbyFeaturesData from "@/data/nearby_features.json";

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
  id: number;
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

// Type the imported data
const aerodromes = aerodromesData as Aerodrome[];
const nearbyFeatures = nearbyFeaturesData as NearbyFeature[];

// Build index for faster lookups
const featuresByAerodrome = new Map<number, NearbyFeature[]>();
for (const feature of nearbyFeatures) {
  const existing = featuresByAerodrome.get(feature.aerodrome_id) || [];
  existing.push(feature);
  featuresByAerodrome.set(feature.aerodrome_id, existing);
}

// Query functions
export function searchByFeature(
  featureType: FeatureType,
  maxDistanceKm: number,
  aerodromeType?: "AD" | "LAD"
): Aerodrome[] {
  const matchingAerodromeIds = new Set<number>();

  for (const feature of nearbyFeatures) {
    if (feature.feature_type === featureType && feature.distance_km <= maxDistanceKm) {
      matchingAerodromeIds.add(feature.aerodrome_id);
    }
  }

  return aerodromes.filter(a =>
    matchingAerodromeIds.has(a.id) &&
    (!aerodromeType || a.type === aerodromeType)
  );
}

export function searchByMultipleFeatures(
  criteria: { featureType: FeatureType; maxDistanceKm: number }[],
  aerodromeType?: "AD" | "LAD"
): Aerodrome[] {
  if (criteria.length === 0) return [];

  // Find aerodromes that match ALL criteria
  const matchingSets = criteria.map(c => {
    const ids = new Set<number>();
    for (const feature of nearbyFeatures) {
      if (feature.feature_type === c.featureType && feature.distance_km <= c.maxDistanceKm) {
        ids.add(feature.aerodrome_id);
      }
    }
    return ids;
  });

  // Intersect all sets
  const intersection = matchingSets.reduce((acc, set) => {
    return new Set([...acc].filter(id => set.has(id)));
  });

  return aerodromes.filter(a =>
    intersection.has(a.id) &&
    (!aerodromeType || a.type === aerodromeType)
  );
}

export function getAerodromeWithFeatures(id: number): AerodromeWithFeatures | null {
  const aerodrome = aerodromes.find(a => a.id === id);
  if (!aerodrome) return null;

  const features = featuresByAerodrome.get(id) || [];
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
  return aerodromes;
}

export function getStats(): {
  totalAerodromes: number;
  totalAD: number;
  totalLAD: number;
  featuresIndexed: { [K in FeatureType]?: number };
} {
  const totalAD = aerodromes.filter(a => a.type === "AD").length;
  const totalLAD = aerodromes.filter(a => a.type === "LAD").length;

  const featuresIndexed: { [K in FeatureType]?: number } = {};
  const countedAerodromes = new Map<FeatureType, Set<number>>();

  for (const f of nearbyFeatures) {
    if (!countedAerodromes.has(f.feature_type)) {
      countedAerodromes.set(f.feature_type, new Set());
    }
    countedAerodromes.get(f.feature_type)!.add(f.aerodrome_id);
  }

  for (const [type, ids] of countedAerodromes) {
    featuresIndexed[type] = ids.size;
  }

  return {
    totalAerodromes: aerodromes.length,
    totalAD,
    totalLAD,
    featuresIndexed,
  };
}

// Search by province or region
export function searchByProvince(
  provinceOrRegion: string,
  aerodromeType?: "AD" | "LAD"
): Aerodrome[] {
  const regionKey = provinceOrRegion.toLowerCase();
  const provinces = REGION_PROVINCES[regionKey];

  let filtered: Aerodrome[];

  if (provinces) {
    // It's a region - search multiple provinces
    filtered = aerodromes.filter(a =>
      a.province && provinces.includes(a.province)
    );
  } else {
    // It's a single province - fuzzy match
    const searchLower = provinceOrRegion.toLowerCase();
    filtered = aerodromes.filter(a =>
      a.province && a.province.toLowerCase().includes(searchLower)
    );
  }

  if (aerodromeType) {
    filtered = filtered.filter(a => a.type === aerodromeType);
  }

  return filtered;
}

// Combined search: features + province/region
export function searchCombined(
  criteria: {
    features?: { featureType: FeatureType; maxDistanceKm: number }[];
    provinceOrRegion?: string;
    aerodromeType?: "AD" | "LAD";
  }
): Aerodrome[] {
  const { features, provinceOrRegion, aerodromeType } = criteria;

  let results = [...aerodromes];

  // Filter by features if provided
  if (features && features.length > 0) {
    const matchingSets = features.map(f => {
      const ids = new Set<number>();
      for (const nf of nearbyFeatures) {
        if (nf.feature_type === f.featureType && nf.distance_km <= f.maxDistanceKm) {
          ids.add(nf.aerodrome_id);
        }
      }
      return ids;
    });

    // Intersect all sets
    const intersection = matchingSets.reduce((acc, set) => {
      return new Set([...acc].filter(id => set.has(id)));
    });

    results = results.filter(a => intersection.has(a.id));
  }

  // Filter by province/region if provided
  if (provinceOrRegion) {
    const regionKey = provinceOrRegion.toLowerCase();
    const provinces = REGION_PROVINCES[regionKey];

    if (provinces) {
      results = results.filter(a => a.province && provinces.includes(a.province));
    } else {
      const searchLower = provinceOrRegion.toLowerCase();
      results = results.filter(a =>
        a.province && a.province.toLowerCase().includes(searchLower)
      );
    }
  }

  // Filter by type if provided
  if (aerodromeType) {
    results = results.filter(a => a.type === aerodromeType);
  }

  return results;
}

// Legacy functions for compatibility
export function getDb(): null {
  return null;
}

export function initDb(): void {
  // No-op - data is loaded from JSON
}
