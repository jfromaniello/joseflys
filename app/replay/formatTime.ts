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

/** Formats a window length (ms) as "45s", "5 min 30s", or "1 h 12 min". */
export function formatWindow(ms: number): string {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return s > 0 ? `${m} min ${s}s` : `${m} min`;
  return `${s}s`;
}
