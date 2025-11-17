/**
 * Aircraft Storage and Serialization
 * Handles compact URL encoding and localStorage management for custom aircraft
 */

import { AircraftPerformance, ClimbPerformanceData, DeviationEntry, PRESET_AIRCRAFT } from "./aircraftPerformance";
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

    const compactArray = [
      aircraft.name,  // 0
      aircraft.model, // 1
      opts.includeStandardWeight ? (aircraft.standardWeight ?? null) : null, // 2
      opts.includeMaxWeight ? (aircraft.maxWeight ?? null) : null, // 3
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

        const aircraft: AircraftPerformance = {
          name: decoded[0],
          model: decoded[1],
        };

        // Optional fields
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

    const aircraft: AircraftPerformance = {
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

  const dataString = `${aircraft.standardWeight || ""}|${aircraft.maxWeight || ""}|${climbData}|${devData}`;

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
  return PRESET_AIRCRAFT.some(preset =>
    preset.model === aircraft.model &&
    preset.name === aircraft.name &&
    preset.standardWeight === aircraft.standardWeight &&
    preset.maxWeight === aircraft.maxWeight &&
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
 */
export function loadCustomAircraft(): AircraftPerformance[] {
  if (!isBrowser) return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
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
 */
export function getAircraftByModel(model: string): AircraftPerformance | undefined {
  // Check presets first
  const preset = PRESET_AIRCRAFT.find(ac => ac.model === model);
  if (preset) return preset;

  // Check custom aircraft
  const custom = loadCustomAircraft();
  return custom.find(ac => ac.model === model);
}

/**
 * Load aircraft from URL or localStorage when sharing
 * Smart merge logic:
 * 1. If aircraft exists with same name but no devTable → add devTable from URL
 * 2. If aircraft doesn't exist → create new
 * 3. If exists with devTable → compare hash, create duplicate if different
 */
export function loadAircraftFromUrl(serialized: string | null): AircraftPerformance | null {
  if (!serialized) return null;
  if (!isBrowser) return null;

  const aircraftFromUrl = deserializeAircraft(serialized);
  if (!aircraftFromUrl) return null;

  // If it's a preset, just return it
  if (isPresetAircraft(aircraftFromUrl)) {
    return aircraftFromUrl;
  }

  const stored = loadCustomAircraft();
  const existing = stored.find(ac => ac.name === aircraftFromUrl.name);

  // Case 1: Aircraft exists with same name but no deviation table
  if (existing && aircraftFromUrl.deviationTable && !existing.deviationTable) {
    // Add deviation table to existing aircraft
    const updated = updateAircraft(existing.model, {
      deviationTable: aircraftFromUrl.deviationTable,
    });
    return updated || aircraftFromUrl;
  }

  // Case 2: Aircraft doesn't exist
  if (!existing) {
    return saveAircraft(aircraftFromUrl);
  }

  // Case 3: Aircraft exists with deviation table - compare data
  const existingHash = hashAircraftData(existing);
  const urlHash = hashAircraftData(aircraftFromUrl);

  if (existingHash === urlHash) {
    // Same data, return existing
    return existing;
  } else {
    // Different data, create duplicate with suffix
    return saveAircraft(aircraftFromUrl);
  }
}

/**
 * Update an existing aircraft with new data (e.g., add deviation table to existing aircraft)
 * Merges the new data with existing data
 */
export function updateAircraft(
  model: string,
  updates: Partial<AircraftPerformance>
): AircraftPerformance | null {
  if (!isBrowser) return null;

  const stored = loadCustomAircraft();
  const index = stored.findIndex(ac => ac.model === model);

  if (index === -1) {
    // Aircraft not found
    return null;
  }

  // Merge updates with existing aircraft
  const updatedAircraft = {
    ...stored[index],
    ...updates,
    // Preserve original model and name unless explicitly updated
    model: stored[index].model,
    name: updates.name || stored[index].name,
  };

  // Update in storage
  stored[index] = updatedAircraft;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

  return updatedAircraft;
}
