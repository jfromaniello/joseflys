/**
 * Aircraft Storage and Serialization
 * Handles compact URL encoding and localStorage management for custom aircraft
 */

import { AircraftPerformance, ClimbPerformanceData, PRESET_AIRCRAFT } from "./aircraftPerformance";

const STORAGE_KEY = "custom_aircraft";

// Check if we're in the browser
const isBrowser = typeof window !== "undefined";

/**
 * Serialize aircraft to compact URL format
 * Format: name~model~stdWt~maxWt~seg1~seg2~...
 * Each segment: from,to,roc,tas,fuel
 *
 * Example: "C150 Custom~CUSTOM_abc~1500~1600~0,2000,670,70,6~2000,4000,580,68,5.8"
 */
export function serializeAircraft(aircraft: AircraftPerformance): string {
  const segments = aircraft.climbTable
    .map(seg => `${seg.altitudeFrom},${seg.altitudeTo},${seg.rateOfClimb},${seg.climbTAS},${seg.fuelFlow}`)
    .join("~");

  return `${aircraft.name}~${aircraft.model}~${aircraft.standardWeight}~${aircraft.maxWeight}~${segments}`;
}

/**
 * Deserialize aircraft from compact URL format
 */
export function deserializeAircraft(serialized: string): AircraftPerformance | null {
  try {
    const parts = serialized.split("~");
    if (parts.length < 5) return null;

    const name = parts[0];
    const model = parts[1];
    const standardWeight = parseFloat(parts[2]);
    const maxWeight = parseFloat(parts[3]);

    const climbTable: ClimbPerformanceData[] = [];
    for (let i = 4; i < parts.length; i++) {
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

    if (climbTable.length === 0) return null;

    return {
      name,
      model,
      standardWeight,
      maxWeight,
      climbTable,
    };
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
  const dataString = `${aircraft.standardWeight}|${aircraft.maxWeight}|${
    aircraft.climbTable.map(seg =>
      `${seg.altitudeFrom},${seg.altitudeTo},${seg.rateOfClimb},${seg.climbTAS},${seg.fuelFlow}`
    ).join("|")
  }`;

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
 * Check if aircraft matches any preset (to avoid saving presets as custom)
 */
function isPresetAircraft(aircraft: AircraftPerformance): boolean {
  return PRESET_AIRCRAFT.some(preset =>
    preset.model === aircraft.model &&
    preset.name === aircraft.name &&
    preset.standardWeight === aircraft.standardWeight &&
    preset.maxWeight === aircraft.maxWeight &&
    JSON.stringify(preset.climbTable) === JSON.stringify(aircraft.climbTable)
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
        model: `CUSTOM_${Date.now()}`,
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
      model: `CUSTOM_${Date.now()}`, // Generate unique model ID
    };
  } else {
    // No conflict, generate model ID if needed
    if (!aircraft.model || aircraft.model === "CUSTOM") {
      savedAircraft = {
        ...aircraft,
        model: `CUSTOM_${Date.now()}`,
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
 * If aircraft from URL is not in localStorage, save it
 */
export function loadAircraftFromUrl(serialized: string | null): AircraftPerformance | null {
  if (!serialized) return null;

  const aircraft = deserializeAircraft(serialized);
  if (!aircraft) return null;

  // If it's a preset, just return it
  if (isPresetAircraft(aircraft)) {
    return aircraft;
  }

  // Save to localStorage (handles conflicts automatically)
  return saveAircraft(aircraft);
}
