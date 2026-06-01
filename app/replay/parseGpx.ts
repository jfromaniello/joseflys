import type { ReplayPoint } from "./types";

/**
 * Parses GPX text into sorted {@link ReplayPoint}s using the browser's
 * `DOMParser`. Intended for client-side use only.
 *
 * Track points without valid coordinates or a timestamp are dropped; the result
 * is sorted ascending by time.
 *
 * @throws If the document is not valid XML, or fewer than two usable track
 * points remain after parsing.
 */
export function parseGpxText(content: string): ReplayPoint[] {
  const parser = new DOMParser();
  const xml = parser.parseFromString(content, "application/xml");
  const parseError = xml.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid GPX file format.");
  }

  const trackPoints = Array.from(xml.querySelectorAll("trkpt"));
  if (trackPoints.length < 2) {
    throw new Error("GPX file must contain at least two track points.");
  }

  const parsed = trackPoints
    .map((point): ReplayPoint | null => {
      const latAttr = point.getAttribute("lat");
      const lonAttr = point.getAttribute("lon");
      const eleText = point.querySelector("ele")?.textContent ?? "0";
      const timeText = point.querySelector("time")?.textContent;

      if (!latAttr || !lonAttr || !timeText) return null;

      const lat = Number.parseFloat(latAttr);
      const lon = Number.parseFloat(lonAttr);
      const ele = Number.parseFloat(eleText);
      const timeMs = Date.parse(timeText);

      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(timeMs)) {
        return null;
      }

      return {
        lat,
        lon,
        ele: Number.isFinite(ele) ? ele : 0,
        timeMs,
      };
    })
    .filter((p): p is ReplayPoint => p !== null)
    .sort((a, b) => a.timeMs - b.timeMs);

  if (parsed.length < 2) {
    throw new Error("Track points must include valid coordinates and timestamps.");
  }

  return parsed;
}
