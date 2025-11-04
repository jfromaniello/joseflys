export interface DeviationEntry {
  forHeading: number;
  steerHeading: number;
}

/**
 * Normalize angle to 0-360 range
 */
function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/**
 * Calculate the shortest angular distance between two angles
 * Returns a value between -180 and 180
 */
function angularDistance(from: number, to: number): number {
  const diff = normalizeAngle(to - from);
  return diff > 180 ? diff - 360 : diff;
}

/**
 * Linear interpolation for angles (handles wraparound at 0°/360°)
 */
function interpolateAngle(
  angle1: number,
  angle2: number,
  factor: number
): number {
  const distance = angularDistance(angle1, angle2);
  return normalizeAngle(angle1 + distance * factor);
}

/**
 * Calculate compass course from magnetic course using deviation table
 *
 * @param magneticCourse - The magnetic course to fly (0-360°)
 * @param deviationTable - Array of deviation entries sorted by forHeading
 * @returns The compass course to steer, or null if table is invalid
 *
 * The function uses linear interpolation between deviation table entries.
 * For headings outside the table range, it extrapolates using the nearest entries.
 */
export function calculateCompassCourse(
  magneticCourse: number,
  deviationTable: DeviationEntry[]
): number | null {
  if (!deviationTable || deviationTable.length < 2) {
    return null; // Need at least 2 entries for interpolation
  }

  // Normalize input
  const mc = normalizeAngle(magneticCourse);

  // Sort entries by forHeading to ensure proper interpolation
  const sortedTable = [...deviationTable].sort(
    (a, b) => a.forHeading - b.forHeading
  );

  // Special case: exact match
  const exactMatch = sortedTable.find((entry) => entry.forHeading === mc);
  if (exactMatch) {
    return normalizeAngle(exactMatch.steerHeading);
  }

  // Find the two entries to interpolate between
  let lowerEntry: DeviationEntry | null = null;
  let upperEntry: DeviationEntry | null = null;

  for (let i = 0; i < sortedTable.length; i++) {
    if (sortedTable[i].forHeading <= mc) {
      lowerEntry = sortedTable[i];
    }
    if (sortedTable[i].forHeading > mc && !upperEntry) {
      upperEntry = sortedTable[i];
      break;
    }
  }

  // Handle wraparound at 0°/360°
  if (!lowerEntry && !upperEntry) {
    // Shouldn't happen, but handle gracefully
    return normalizeAngle(sortedTable[0].steerHeading);
  }

  if (!lowerEntry) {
    // mc is below the lowest entry - extrapolate from first two entries
    lowerEntry = sortedTable[sortedTable.length - 1]; // Use last entry (wraparound)
    upperEntry = sortedTable[0];
  } else if (!upperEntry) {
    // mc is above the highest entry - extrapolate from last two entries
    upperEntry = sortedTable[0]; // Use first entry (wraparound)
  }

  // Calculate interpolation factor
  const lowerFor = lowerEntry.forHeading;
  const upperFor = upperEntry.forHeading;

  // Handle wraparound in forHeading range
  let rangeDiff = angularDistance(lowerFor, upperFor);
  if (rangeDiff < 0) {
    rangeDiff += 360;
  }

  let mcDiff = angularDistance(lowerFor, mc);
  if (mcDiff < 0) {
    mcDiff += 360;
  }

  const factor = rangeDiff !== 0 ? mcDiff / rangeDiff : 0;

  // Interpolate the compass heading
  const compassCourse = interpolateAngle(
    lowerEntry.steerHeading,
    upperEntry.steerHeading,
    factor
  );

  return normalizeAngle(compassCourse);
}

/**
 * Calculate deviation (difference between magnetic and compass heading)
 *
 * @param magneticHeading - The magnetic heading (0-360°)
 * @param compassHeading - The compass heading (0-360°)
 * @returns The deviation in degrees (positive = compass reads high, negative = compass reads low)
 */
export function calculateDeviation(
  magneticHeading: number,
  compassHeading: number
): number {
  return angularDistance(magneticHeading, compassHeading);
}
