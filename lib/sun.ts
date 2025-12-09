import SunCalc from "suncalc";

export interface SunTimes {
  // Civil twilight - the relevant boundary for VFR
  civilDawn: Date; // Morning civil twilight starts (sun 6° below horizon)
  sunrise: Date;
  sunset: Date;
  civilDusk: Date; // Evening civil twilight ends (sun 6° below horizon)

  // Additional times for reference
  nauticalDawn: Date; // Sun 12° below horizon
  nauticalDusk: Date;
  solarNoon: Date;
}

export type DaylightPhase =
  | "night" // Before civil dawn or after civil dusk
  | "civil-twilight" // Between civil dawn/sunrise or sunset/civil dusk
  | "day"; // Between sunrise and sunset

export interface SunPosition {
  times: SunTimes;
  phase: DaylightPhase;
  isVfrLegal: boolean; // True if within civil twilight bounds
  nextTransition: {
    type: "sunrise" | "sunset" | "civil-dawn" | "civil-dusk";
    time: Date;
    label: string;
  } | null;
}

/**
 * Calculate sun times for a given location and date
 */
export function getSunTimes(
  lat: number,
  lon: number,
  date: Date = new Date()
): SunTimes {
  const times = SunCalc.getTimes(date, lat, lon);

  return {
    civilDawn: times.dawn,
    sunrise: times.sunrise,
    sunset: times.sunset,
    civilDusk: times.dusk,
    nauticalDawn: times.nauticalDawn,
    nauticalDusk: times.nauticalDusk,
    solarNoon: times.solarNoon,
  };
}

/**
 * Determine the current daylight phase
 */
export function getDaylightPhase(times: SunTimes, now: Date = new Date()): DaylightPhase {
  const time = now.getTime();

  if (time < times.civilDawn.getTime() || time > times.civilDusk.getTime()) {
    return "night";
  }

  if (time < times.sunrise.getTime() || time > times.sunset.getTime()) {
    return "civil-twilight";
  }

  return "day";
}

/**
 * Check if VFR flight is legal based on civil twilight
 * VFR is typically allowed from civil dawn to civil dusk
 */
export function isVfrLegal(times: SunTimes, now: Date = new Date()): boolean {
  const time = now.getTime();
  return time >= times.civilDawn.getTime() && time <= times.civilDusk.getTime();
}

/**
 * Get the next sun transition (for countdown/display)
 */
export function getNextTransition(
  times: SunTimes,
  now: Date = new Date()
): SunPosition["nextTransition"] {
  const time = now.getTime();

  const transitions = [
    { type: "civil-dawn" as const, time: times.civilDawn, label: "Civil dawn" },
    { type: "sunrise" as const, time: times.sunrise, label: "Sunrise" },
    { type: "sunset" as const, time: times.sunset, label: "Sunset" },
    { type: "civil-dusk" as const, time: times.civilDusk, label: "Civil dusk" },
  ];

  for (const t of transitions) {
    if (t.time.getTime() > time) {
      return t;
    }
  }

  // All transitions passed, get tomorrow's civil dawn
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  // We'd need to recalculate for tomorrow, but for now return null
  return null;
}

/**
 * Get complete sun position info for a location
 */
export function getSunPosition(
  lat: number,
  lon: number,
  date: Date = new Date()
): SunPosition {
  const times = getSunTimes(lat, lon, date);
  const phase = getDaylightPhase(times, date);
  const vfrLegal = isVfrLegal(times, date);
  const nextTransition = getNextTransition(times, date);

  return {
    times,
    phase,
    isVfrLegal: vfrLegal,
    nextTransition,
  };
}

/**
 * Format time for display (local time)
 */
export function formatSunTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get time until next transition in human-readable format
 */
export function getTimeUntil(targetDate: Date, now: Date = new Date()): string {
  const diff = targetDate.getTime() - now.getTime();

  if (diff < 0) return "passed";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
