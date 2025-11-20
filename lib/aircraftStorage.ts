/**
 * Aircraft Storage and Serialization
 * Handles compact URL encoding and localStorage management for custom aircraft
 */

import {
  AircraftPerformance,
  ResolvedAircraftPerformance,
  ClimbPerformanceData,
  DeviationEntry,
  PRESET_AIRCRAFT,
  migrateAircraftToNewFormat,
} from "./aircraft";
import { encode, decode } from "cbor-x";

const STORAGE_KEY = "custom_aircraft";

// Check if we're in the browser
const isBrowser = typeof window !== "undefined";

export interface SerializeOptions {
  /** Include standard weight in serialization (default: false) */
  includeStandardWeight?: boolean;
  /** Include max weight in serialization (default: false) */
  includeMaxWeight?: boolean;
  /** Include climb table in serialization (default: false) */
  includeClimbTable?: boolean;
  /** Include deviation table in serialization (default: false) */
  includeDeviationTable?: boolean;
}

/**
 * Serialize aircraft to compact URL format using CBOR with position-based arrays
 *
 * Format: [name, model, sw, mw, ct_array, dt_array]
 * - Index 0: name (string)
 * - Index 1: model (string)
 * - Index 2: standardWeight (number | null)
 * - Index 3: maxWeight (number | null)
 * - Index 4: climb table array - each entry: [from, to, roc, tas, fuelFlow]
 * - Index 5: deviation table array - each entry: [forHeading, steerHeading]
 *
 * CBOR binary is then base64url encoded for URL safety
 *
 * @param aircraft - Aircraft to serialize
 * @param options - Optional fields to include/exclude (null means "don't change existing data")
 */
export function serializeAircraft(aircraft: AircraftPerformance, options?: SerializeOptions): string {
  try {
    const opts = {
      includeStandardWeight: false,
      includeMaxWeight: false,
      includeClimbTable: false,
      includeDeviationTable: false,
      ...options,
    };

    // Support both old and new format for backward compatibility
    const standardWeight = aircraft.weights?.standardWeight ?? (aircraft as any).standardWeight ?? null;
    const maxWeight = aircraft.weights?.maxGrossWeight ?? (aircraft as any).maxWeight ?? null;

    const compactArray = [
      aircraft.name,  // 0
      aircraft.model, // 1
      opts.includeStandardWeight ? standardWeight : null, // 2
      opts.includeMaxWeight ? maxWeight : null, // 3
      opts.includeClimbTable
        ? (aircraft.climbTable?.map(seg => [
            seg.altitudeFrom,
            seg.altitudeTo,
            seg.rateOfClimb,
            seg.climbTAS,
            seg.fuelFlow
          ]) ?? [])
        : [], // 4
      opts.includeDeviationTable
        ? (aircraft.deviationTable?.map(dev => [
            dev.forHeading,
            dev.steerHeading
          ]) ?? [])
        : [] // 5
    ];

    // Encode to CBOR binary
    const cborBinary = encode(compactArray);

    // Convert to base64url (URL-safe)
    const base64 = isBrowser
      ? btoa(String.fromCharCode(...new Uint8Array(cborBinary)))
      : cborBinary.toString('base64');

    // Make URL-safe: + → -, / → _, remove =
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } catch (error) {
    console.error("Failed to serialize aircraft:", error);
    return "";
  }
}

/**
 * Deserialize aircraft from compact URL format
 * Supports CBOR arrays (current), and legacy tilde-separated formats for backward compatibility
 */
export function deserializeAircraft(serialized: string): AircraftPerformance | null {
  try {
    // Try CBOR arrays format first (current format)
    if (!serialized.includes("~")) {
      try {
        // Restore base64url to base64: - → +, _ → /
        let base64 = serialized.replace(/-/g, '+').replace(/_/g, '/');

        // Add padding if needed
        while (base64.length % 4) {
          base64 += '=';
        }

        // Decode base64 to binary
        let binaryData: Uint8Array;
        if (isBrowser) {
          const binaryString = atob(base64);
          binaryData = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            binaryData[i] = binaryString.charCodeAt(i);
          }
        } else {
          binaryData = new Uint8Array(Buffer.from(base64, 'base64'));
        }

        // Decode CBOR
        const decoded = decode(binaryData);

        // Validate structure
        if (!Array.isArray(decoded) || decoded.length < 6) {
          throw new Error("Invalid CBOR structure");
        }

        // Use 'as any' to support backward compatibility with old serialized format
        const aircraft: any = {
          name: decoded[0],
          model: decoded[1],
        };

        // Optional fields (old format for backward compatibility)
        if (decoded[2] !== null) aircraft.standardWeight = decoded[2];
        if (decoded[3] !== null) aircraft.maxWeight = decoded[3];

        // Climb table
        if (Array.isArray(decoded[4]) && decoded[4].length > 0) {
          aircraft.climbTable = decoded[4].map((seg: number[]) => ({
            altitudeFrom: seg[0],
            altitudeTo: seg[1],
            rateOfClimb: seg[2],
            climbTAS: seg[3],
            fuelFlow: seg[4],
          }));
        }

        // Deviation table
        if (Array.isArray(decoded[5]) && decoded[5].length > 0) {
          aircraft.deviationTable = decoded[5].map((dev: number[]) => ({
            forHeading: dev[0],
            steerHeading: dev[1],
          }));
        }

        if (!aircraft.name || !aircraft.model) return null;

        return aircraft;
      } catch (err) {
        // Not CBOR format, fall through to legacy format
      }
    }

    // Legacy format (tilde-separated)
    const parts = serialized.split("~");
    if (parts.length < 4) return null;

    const name = parts[0];
    const model = parts[1];
    const standardWeight = parts[2] ? parseFloat(parts[2]) : undefined;
    const maxWeight = parts[3] ? parseFloat(parts[3]) : undefined;

    // Use 'as any' to support backward compatibility with old serialized format
    const aircraft: any = {
      name,
      model,
      standardWeight,
      maxWeight,
    };

    // Find CLIMB marker
    const climbIndex = parts.indexOf("CLIMB");
    if (climbIndex !== -1) {
      const climbTable: ClimbPerformanceData[] = [];

      // Find end of climb data (DEV marker or end of array)
      const devIndex = parts.indexOf("DEV");
      const endIndex = devIndex !== -1 ? devIndex : parts.length;

      for (let i = climbIndex + 1; i < endIndex; i++) {
        const segmentParts = parts[i].split(",").map(n => parseFloat(n));
        if (segmentParts.length !== 5) continue;

        climbTable.push({
          altitudeFrom: segmentParts[0],
          altitudeTo: segmentParts[1],
          rateOfClimb: segmentParts[2],
          climbTAS: segmentParts[3],
          fuelFlow: segmentParts[4],
        });
      }

      if (climbTable.length > 0) {
        aircraft.climbTable = climbTable;
      }
    }

    // Find DEV marker
    const devIndex = parts.indexOf("DEV");
    if (devIndex !== -1) {
      const deviationTable: DeviationEntry[] = [];

      for (let i = devIndex + 1; i < parts.length; i++) {
        const devParts = parts[i].split(",").map(n => parseFloat(n));
        if (devParts.length !== 2) continue;

        deviationTable.push({
          forHeading: devParts[0],
          steerHeading: devParts[1],
        });
      }

      if (deviationTable.length > 0) {
        aircraft.deviationTable = deviationTable;
      }
    }

    // At least name and model are required
    if (!name || !model) return null;

    return aircraft;
  } catch (error) {
    console.error("Failed to deserialize aircraft:", error);
    return null;
  }
}

/**
 * Generate a hash for aircraft data (excluding name)
 * Used to detect if two aircraft with same name have same data
 */
function hashAircraftData(aircraft: AircraftPerformance): string {
  const climbData = aircraft.climbTable?.map(seg =>
    `${seg.altitudeFrom},${seg.altitudeTo},${seg.rateOfClimb},${seg.climbTAS},${seg.fuelFlow}`
  ).join("|") || "";

  const devData = aircraft.deviationTable?.map(dev =>
    `${dev.forHeading},${dev.steerHeading}`
  ).join("|") || "";

  // Support both old and new format
  const standardWeight = aircraft.weights?.standardWeight ?? (aircraft as any).standardWeight ?? "";
  const maxWeight = aircraft.weights?.maxGrossWeight ?? (aircraft as any).maxWeight ?? "";
  const dataString = `${standardWeight}|${maxWeight}|${climbData}|${devData}`;

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Generate a short unique ID (6 characters, alphanumeric)
 */
function generateShortId(): string {
  const timestamp = Date.now();
  const random = Math.random();
  const combined = `${timestamp}${random}`;

  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  // Convert to base36 and take first 6 chars (no prefix)
  return Math.abs(hash).toString(36).substring(0, 6);
}

/**
 * Check if aircraft matches any preset (to avoid saving presets as custom)
 */
function isPresetAircraft(aircraft: AircraftPerformance): boolean {
  // Support both old and new format
  const aircraftStandardWeight = aircraft.weights?.standardWeight ?? (aircraft as any).standardWeight;
  const aircraftMaxWeight = aircraft.weights?.maxGrossWeight ?? (aircraft as any).maxWeight;

  return PRESET_AIRCRAFT.some(preset =>
    preset.model === aircraft.model &&
    preset.name === aircraft.name &&
    preset.weights?.standardWeight === aircraftStandardWeight &&
    preset.weights?.maxGrossWeight === aircraftMaxWeight &&
    JSON.stringify(preset.climbTable) === JSON.stringify(aircraft.climbTable) &&
    JSON.stringify(preset.deviationTable) === JSON.stringify(aircraft.deviationTable)
  );
}

/**
 * Save aircraft to localStorage
 * Returns the saved aircraft (may have modified name if conflict)
 */
export function saveAircraft(aircraft: AircraftPerformance): AircraftPerformance {
  // Don't save preset aircraft
  if (isPresetAircraft(aircraft)) {
    return aircraft;
  }

  if (!isBrowser) {
    // Can't save on server-side, just return aircraft with model ID
    if (!aircraft.model || aircraft.model === "CUSTOM") {
      return {
        ...aircraft,
        model: generateShortId(),
      };
    }
    return aircraft;
  }

  const stored = loadCustomAircraft();
  const aircraftHash = hashAircraftData(aircraft);

  // Check for exact match (same name and same data)
  const exactMatch = stored.find(ac =>
    ac.name === aircraft.name && hashAircraftData(ac) === aircraftHash
  );

  if (exactMatch) {
    // Already exists, no need to save again
    return exactMatch;
  }

  // Check for name conflict with different data
  const nameConflict = stored.find(ac => ac.name === aircraft.name);
  let savedAircraft = aircraft;

  if (nameConflict) {
    // Find next available suffix
    let suffix = 2;
    let newName = `${aircraft.name} (${suffix})`;

    while (stored.some(ac => ac.name === newName)) {
      suffix++;
      newName = `${aircraft.name} (${suffix})`;
    }

    savedAircraft = {
      ...aircraft,
      name: newName,
      model: generateShortId(), // Generate short unique model ID
    };
  } else {
    // No conflict, generate model ID if needed
    if (!aircraft.model || aircraft.model === "CUSTOM") {
      savedAircraft = {
        ...aircraft,
        model: generateShortId(),
      };
    }
  }

  // Add to storage
  stored.push(savedAircraft);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

  return savedAircraft;
}

/**
 * Load all custom aircraft from localStorage
 * Automatically migrates old format to new format
 */
export function loadCustomAircraft(): AircraftPerformance[] {
  if (!isBrowser) return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    // Migrate old format aircraft to new format
    const migrated = parsed.map(migrateAircraftToNewFormat);

    // If any aircraft were migrated, save the updated data back to localStorage
    if (migrated.some((ac, i) => ac !== parsed[i])) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    }

    return migrated;
  } catch (error) {
    console.error("Failed to load custom aircraft:", error);
    return [];
  }
}

/**
 * Delete custom aircraft by model ID
 */
export function deleteCustomAircraft(model: string): void {
  if (!isBrowser) return;

  const stored = loadCustomAircraft();
  const filtered = stored.filter(ac => ac.model !== model);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Get aircraft by model (checks both presets and custom)
 * Always returns fully resolved aircraft (inheritance applied)
 */
export function getAircraftByModel(model: string): ResolvedAircraftPerformance | undefined {
  // Check presets first
  const preset = PRESET_AIRCRAFT.find(ac => ac.model === model);
  if (preset) return preset as ResolvedAircraftPerformance; // Presets are always complete

  // Check custom aircraft
  const custom = loadCustomAircraft();
  const aircraft = custom.find(ac => ac.model === model);

  // Resolve inheritance before returning
  return aircraft ? resolveAircraft(aircraft) : undefined;
}

/**
 * Get raw aircraft by model WITHOUT resolving inheritance
 * Used by the editor to maintain inheritance relationships
 * Returns the aircraft as stored, with optional fields if inheriting
 */
export function getRawAircraftByModel(model: string): AircraftPerformance | undefined {
  // Check presets first
  const preset = PRESET_AIRCRAFT.find(ac => ac.model === model);
  if (preset) return preset; // Presets are complete but return as-is

  // Check custom aircraft - return raw without resolving
  const custom = loadCustomAircraft();
  return custom.find(ac => ac.model === model);
}

/**
 * Load aircraft from URL or localStorage when sharing
 * Smart merge logic:
 * 1. If aircraft exists with same name but no devTable → add devTable from URL
 * 2. If aircraft doesn't exist → create new
 * 3. If exists with devTable → compare hash, create duplicate if different
 * Always returns fully resolved aircraft
 */
export function loadAircraftFromUrl(serialized: string | null): ResolvedAircraftPerformance | null {
  if (!serialized) return null;
  if (!isBrowser) return null;

  const aircraftFromUrl = deserializeAircraft(serialized);
  if (!aircraftFromUrl) return null;

  // If it's a preset, just return it (already complete)
  if (isPresetAircraft(aircraftFromUrl)) {
    return aircraftFromUrl as ResolvedAircraftPerformance;
  }

  const stored = loadCustomAircraft();
  const existing = stored.find(ac => ac.name === aircraftFromUrl.name);

  // Case 1: Aircraft exists with same name but no deviation table
  if (existing && aircraftFromUrl.deviationTable && !existing.deviationTable) {
    // Add deviation table to existing aircraft
    const updated = updateAircraft(existing.model, {
      deviationTable: aircraftFromUrl.deviationTable,
    });
    return updated ? resolveAircraft(updated) : resolveAircraft(aircraftFromUrl);
  }

  // Case 2: Aircraft doesn't exist
  if (!existing) {
    const saved = saveAircraft(aircraftFromUrl);
    return resolveAircraft(saved);
  }

  // Case 3: Aircraft exists with deviation table - compare data
  const existingHash = hashAircraftData(existing);
  const urlHash = hashAircraftData(aircraftFromUrl);

  if (existingHash === urlHash) {
    // Same data, return existing (resolved)
    return resolveAircraft(existing);
  } else {
    // Different data, create duplicate with suffix
    const saved = saveAircraft(aircraftFromUrl);
    return resolveAircraft(saved);
  }
}

/**
 * Update an existing aircraft with new data
 * @param model - Model ID of aircraft to update
 * @param updates - New aircraft data
 * @param replace - If true, replaces aircraft completely. If false, merges with existing (default: false)
 */
export function updateAircraft(
  model: string,
  updates: Partial<AircraftPerformance>,
  replace: boolean = false
): AircraftPerformance | null {
  if (!isBrowser) return null;

  const stored = loadCustomAircraft();
  const index = stored.findIndex(ac => ac.model === model);

  if (index === -1) {
    // Aircraft not found
    return null;
  }

  let updatedAircraft: AircraftPerformance;

  if (replace) {
    // Complete replacement - use updates as-is (model/name preserved from original)
    updatedAircraft = {
      ...updates,
      model: stored[index].model,
      name: updates.name || stored[index].name,
    } as AircraftPerformance;
  } else {
    // Merge mode - preserve existing fields not in updates
    updatedAircraft = {
      ...stored[index],
      ...updates,
      model: stored[index].model,
      name: updates.name || stored[index].name,
    };
  }

  // Update in storage
  stored[index] = updatedAircraft;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

  return updatedAircraft;
}

/**
 * Resolve aircraft inheritance by merging with preset
 * If aircraft has `inherit` property, merge with preset aircraft
 * Returns fully resolved aircraft with all required properties
 */
export function resolveAircraft(aircraft: AircraftPerformance): ResolvedAircraftPerformance {
  // No inheritance, assume complete and cast
  if (!aircraft.inherit) {
    return aircraft as ResolvedAircraftPerformance;
  }

  // Find parent preset
  const parent = PRESET_AIRCRAFT.find(ac => ac.model === aircraft.inherit);
  if (!parent) {
    console.warn(`Inherited aircraft "${aircraft.inherit}" not found, using aircraft as-is`);
    return aircraft as ResolvedAircraftPerformance;
  }

  // Deep merge: parent properties overridden by aircraft properties
  // For objects (weights, engine, limits), merge keys
  // For arrays (tables), use child if defined, else parent
  const resolved: ResolvedAircraftPerformance = {
    // Basic fields - child overrides parent
    name: aircraft.name,
    model: aircraft.model,

    // Merge weights object (parent is a preset so weights is always defined)
    weights: {
      emptyWeight: aircraft.weights?.emptyWeight ?? parent.weights!.emptyWeight,
      standardWeight: aircraft.weights?.standardWeight ?? parent.weights!.standardWeight,
      maxGrossWeight: aircraft.weights?.maxGrossWeight ?? parent.weights!.maxGrossWeight,
    },

    // Merge engine object (parent is a preset so engine is always defined)
    engine: {
      type: aircraft.engine?.type ?? parent.engine!.type,
      maxRPM: aircraft.engine?.maxRPM ?? parent.engine!.maxRPM,
      ratedHP: aircraft.engine?.ratedHP ?? parent.engine!.ratedHP,
      specificFuelConsumption: aircraft.engine?.specificFuelConsumption ?? parent.engine!.specificFuelConsumption,
      usableFuelGallons: aircraft.engine?.usableFuelGallons ?? parent.engine!.usableFuelGallons,
    },

    // Merge limits object (parent is a preset so limits is always defined)
    limits: {
      vne: aircraft.limits?.vne ?? parent.limits!.vne,
      vno: aircraft.limits?.vno ?? parent.limits!.vno,
      va: aircraft.limits?.va ?? parent.limits!.va,
      vfe: aircraft.limits?.vfe ?? parent.limits!.vfe,
      vs: aircraft.limits?.vs ?? parent.limits!.vs,
      vs0: aircraft.limits?.vs0 ?? parent.limits!.vs0,
      maxCrosswind: aircraft.limits?.maxCrosswind ?? parent.limits!.maxCrosswind,
      clMaxClean: aircraft.limits?.clMaxClean ?? parent.limits!.clMaxClean,
      clMaxTakeoff: aircraft.limits?.clMaxTakeoff ?? parent.limits!.clMaxTakeoff,
      clMaxLanding: aircraft.limits?.clMaxLanding ?? parent.limits!.clMaxLanding,
    },

    // Tables - use child if exists, else parent (parent is a preset so required tables are always defined)
    climbTable: aircraft.climbTable ?? parent.climbTable!,
    cruiseTable: aircraft.cruiseTable ?? parent.cruiseTable!,
    takeoffTable: aircraft.takeoffTable ?? parent.takeoffTable,
    landingTable: aircraft.landingTable ?? parent.landingTable,
    deviationTable: aircraft.deviationTable ?? parent.deviationTable,

    // Optional fields
    serviceCeiling: aircraft.serviceCeiling ?? parent.serviceCeiling,
  };

  return resolved;
}

/**
 * Fork (duplicate) an aircraft with a new unique ID
 * Uses inheritance pattern - stores only overrides, not full data
 * Automatically saves the forked aircraft to localStorage
 */
export function forkAircraft(aircraft: AircraftPerformance): AircraftPerformance {
  // Resolve inheritance first to get full aircraft
  const resolved = resolveAircraft(aircraft);

  // Find unique name with (Copy) suffix
  const stored = loadCustomAircraft();
  let baseName = resolved.name;
  let suffix = 1;
  let newName = `${baseName} (Copy)`;

  while (stored.some(ac => ac.name === newName)) {
    suffix++;
    newName = `${baseName} (Copy ${suffix})`;
  }

  // Check if original aircraft is a preset
  const isPreset = PRESET_AIRCRAFT.some(p => p.model === resolved.model);

  // Create minimal fork with inheritance
  const forked: Partial<AircraftPerformance> = {
    name: newName,
    model: `CUSTOM_${generateShortId()}`,
  };

  // If forking from a preset, just set inherit
  if (isPreset) {
    forked.inherit = resolved.model;
  } else if (aircraft.inherit) {
    // If forking from a custom that already inherits, keep the same parent
    forked.inherit = aircraft.inherit;
    // Copy over all custom overrides from the source
    // This creates a "sibling" fork with same parent
    if (aircraft.weights) forked.weights = JSON.parse(JSON.stringify(aircraft.weights));
    if (aircraft.engine) forked.engine = JSON.parse(JSON.stringify(aircraft.engine));
    if (aircraft.limits) forked.limits = JSON.parse(JSON.stringify(aircraft.limits));
    if (aircraft.climbTable) forked.climbTable = JSON.parse(JSON.stringify(aircraft.climbTable));
    if (aircraft.cruiseTable) forked.cruiseTable = JSON.parse(JSON.stringify(aircraft.cruiseTable));
    if (aircraft.takeoffTable) forked.takeoffTable = JSON.parse(JSON.stringify(aircraft.takeoffTable));
    if (aircraft.landingTable) forked.landingTable = JSON.parse(JSON.stringify(aircraft.landingTable));
    if (aircraft.deviationTable) forked.deviationTable = JSON.parse(JSON.stringify(aircraft.deviationTable));
    if (aircraft.serviceCeiling !== undefined) forked.serviceCeiling = aircraft.serviceCeiling;
  } else {
    // Forking from a fully custom aircraft (no inheritance)
    // Copy everything except name and model
    Object.assign(forked, JSON.parse(JSON.stringify(resolved)));
    forked.name = newName;
    forked.model = `CUSTOM_${generateShortId()}`;
  }

  // Save and return (saveAircraft expects AircraftPerformance, but we're using inheritance)
  return saveAircraft(forked as AircraftPerformance);
}

/**
 * Export aircraft to JSON string (for download/sharing)
 * Includes all aircraft data in human-readable format
 */
export function exportAircraftToJSON(aircraft: AircraftPerformance): string {
  return JSON.stringify(aircraft, null, 2);
}

/**
 * Import aircraft from JSON string
 * Validates and saves to localStorage
 * Returns the saved aircraft or null if invalid
 */
export function importAircraftFromJSON(jsonString: string): AircraftPerformance | null {
  try {
    const aircraft = JSON.parse(jsonString) as AircraftPerformance;

    // Basic validation - check required fields
    if (!aircraft.name || !aircraft.model) {
      throw new Error("Invalid aircraft data - missing name or model");
    }

    // If not inheriting, check required fields
    if (!aircraft.inherit) {
      if (!aircraft.weights || !aircraft.climbTable || !aircraft.cruiseTable ||
          !aircraft.engine || !aircraft.limits) {
        throw new Error("Invalid aircraft data - missing required fields (or set inherit property)");
      }
    } else {
      // Validate that the inherited preset exists
      const parent = PRESET_AIRCRAFT.find(ac => ac.model === aircraft.inherit);
      if (!parent) {
        throw new Error(`Invalid inherit value: "${aircraft.inherit}" not found in presets`);
      }
    }

    // Migrate if needed (in case it's an old format)
    const migrated = migrateAircraftToNewFormat(aircraft);

    // Save and return
    return saveAircraft(migrated);
  } catch (error) {
    console.error("Failed to import aircraft from JSON:", error);
    return null;
  }
}
