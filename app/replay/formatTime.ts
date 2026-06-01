/**
 * Formats a UTC timestamp (ms) as "HH:MM:SS". Returns a placeholder for
 * non-positive/invalid values.
 */
export function formatUtc(valueMs: number): string {
  if (!Number.isFinite(valueMs) || valueMs <= 0) return "--:--:--";
  return new Date(valueMs).toISOString().slice(11, 19);
}

/**
 * Formats a UTC timestamp (ms) as "HH:MM" (used on small screens). Returns a
 * placeholder for non-positive/invalid values.
 */
export function formatUtcShort(valueMs: number): string {
  if (!Number.isFinite(valueMs) || valueMs <= 0) return "--:--";
  return new Date(valueMs).toISOString().slice(11, 16);
}
