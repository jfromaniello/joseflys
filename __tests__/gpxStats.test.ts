import { describe, it, expect } from "vitest";
import { computeGpxStats, formatTrackDuration } from "../lib/gpxStats";

function buildGpx(
  points: Array<{ lat: number; lon: number; ele: number; time: string }>
): string {
  const trkpts = points
    .map(
      (p) =>
        `<trkpt lat="${p.lat}" lon="${p.lon}"><ele>${p.ele}</ele><time>${p.time}</time></trkpt>`
    )
    .join("\n");
  return `<?xml version="1.0"?>\n<gpx version="1.1"><trk><trkseg>\n${trkpts}\n</trkseg></trk></gpx>`;
}

describe("computeGpxStats", () => {
  it("returns null for fewer than two valid track points", () => {
    const gpx = buildGpx([
      { lat: -34.6, lon: -58.4, ele: 10, time: "2024-01-01T00:00:00Z" },
    ]);
    expect(computeGpxStats(gpx)).toBeNull();
  });

  it("returns null for empty or non-GPX content", () => {
    expect(computeGpxStats("")).toBeNull();
    expect(computeGpxStats("<html></html>")).toBeNull();
  });

  it("computes distance, max altitude, duration and peak speed", () => {
    // Madrid (~263 NM) toward Barcelona, climbing then descending.
    const gpx = buildGpx([
      { lat: 40.4168, lon: -3.7038, ele: 600, time: "2024-01-01T10:00:00Z" },
      { lat: 40.9, lon: -2.5, ele: 3000, time: "2024-01-01T10:30:00Z" },
      { lat: 41.3874, lon: 2.1686, ele: 50, time: "2024-01-01T11:30:00Z" },
    ]);

    const stats = computeGpxStats(gpx);
    expect(stats).not.toBeNull();
    if (!stats) return;

    expect(stats.pointCount).toBe(3);
    expect(stats.distanceNm).toBeGreaterThan(250);
    expect(stats.distanceNm).toBeLessThan(280);
    // 3000 m ≈ 9842 ft is the peak.
    expect(Math.round(stats.maxAltitudeFt)).toBe(Math.round(3000 * 3.28084));
    expect(stats.durationMs).toBe(90 * 60 * 1000);
    expect(stats.maxSpeedKt).toBeGreaterThan(0);
  });

  it("sorts out-of-order points by timestamp", () => {
    const gpx = buildGpx([
      { lat: 41.3874, lon: 2.1686, ele: 50, time: "2024-01-01T11:00:00Z" },
      { lat: 40.4168, lon: -3.7038, ele: 600, time: "2024-01-01T10:00:00Z" },
    ]);
    const stats = computeGpxStats(gpx);
    expect(stats?.durationMs).toBe(60 * 60 * 1000);
  });

  it("ignores points missing coordinates or timestamps", () => {
    const gpx = `<?xml version="1.0"?><gpx><trk><trkseg>
      <trkpt lat="40.4168" lon="-3.7038"><ele>600</ele><time>2024-01-01T10:00:00Z</time></trkpt>
      <trkpt lat="40.5" lon="-3.6"><ele>700</ele></trkpt>
      <trkpt lat="41.3874" lon="2.1686"><ele>50</ele><time>2024-01-01T11:00:00Z</time></trkpt>
    </trkseg></trk></gpx>`;
    const stats = computeGpxStats(gpx);
    expect(stats?.pointCount).toBe(2);
  });
});

describe("formatTrackDuration", () => {
  it("formats sub-hour durations as minutes", () => {
    expect(formatTrackDuration(23 * 60 * 1000)).toBe("23min");
  });

  it("formats hour+ durations as hours and minutes", () => {
    expect(formatTrackDuration((83 * 60 + 0) * 1000)).toBe("1h 23min");
  });

  it("rounds to the nearest minute", () => {
    expect(formatTrackDuration(89 * 1000)).toBe("1min");
  });
});
