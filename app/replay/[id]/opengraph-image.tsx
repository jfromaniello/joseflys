import { ImageResponse } from "next/og";
import { fetchSharedReplayGpx } from "@/lib/replayBlob";
import { computeGpxStats, formatTrackDuration, type GpxStats } from "@/lib/gpxStats";
import { formatDistance } from "@/lib/formatters";

export const alt = "Shared flight replay track";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PATH_WIDTH = 560;
const PATH_HEIGHT = 360;
const PATH_PADDING = 36;

/**
 * Projects the track coordinates into an SVG path string using an
 * equirectangular projection (longitude scaled by cos(meanLat)), fitted to the
 * panel while preserving aspect ratio.
 */
function buildTrackPath(points: Array<{ lat: number; lon: number }>): string | null {
  if (points.length < 2) return null;

  const meanLat = (points.reduce((s, p) => s + p.lat, 0) / points.length) * (Math.PI / 180);
  const cosLat = Math.max(0.01, Math.cos(meanLat));

  const projected = points.map((p) => ({ x: p.lon * cosLat, y: -p.lat }));

  const xs = projected.map((p) => p.x);
  const ys = projected.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const spanX = maxX - minX || 1e-6;
  const spanY = maxY - minY || 1e-6;

  const innerW = PATH_WIDTH - PATH_PADDING * 2;
  const innerH = PATH_HEIGHT - PATH_PADDING * 2;
  const scale = Math.min(innerW / spanX, innerH / spanY);

  // Center the scaled track within the panel.
  const offsetX = PATH_PADDING + (innerW - spanX * scale) / 2;
  const offsetY = PATH_PADDING + (innerH - spanY * scale) / 2;

  return projected
    .map((p, i) => {
      const x = offsetX + (p.x - minX) * scale;
      const y = offsetY + (p.y - minY) * scale;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function StatBlock({ label, value, width }: { label: string; value: string; width?: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        ...(width ? { width: `${width}px` } : {}),
      }}
    >
      <div style={{ fontSize: "26px", color: "#7c93b8", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: "52px", color: "white", fontWeight: 700, whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

// Fixed width for the left column so the right column ("Max Altitude" / "Top
// Speed") lines up across both rows regardless of value width.
const LEFT_COL_WIDTH = 200;

function Header() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "16px",
          background: "#1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="38"
          height="38"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#93b4f0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </div>
      <div style={{ fontSize: "30px", fontWeight: 600, color: "#94a3b8" }}>joseflys.com</div>
    </div>
  );
}

function renderImage(stats: GpxStats | null) {
  const trackPath = stats ? buildTrackPath(stats.path) : null;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(to bottom right, #0f172a 0%, #172554 50%, #0f172a 100%)",
          fontFamily: "system-ui, sans-serif",
          padding: "64px",
        }}
      >
        <Header />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "48px" }}>
          {/* Left: title + stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
            <div style={{ fontSize: "64px", fontWeight: 800, color: "white" }}>Flight Replay</div>

            {stats ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                <div style={{ display: "flex", gap: "56px" }}>
                  <StatBlock
                    label="Distance"
                    value={`${formatDistance(stats.distanceNm, 1)} NM`}
                    width={LEFT_COL_WIDTH}
                  />
                  <StatBlock
                    label="Max Altitude"
                    value={`${Math.round(stats.maxAltitudeFt).toLocaleString("en-US")} ft`}
                  />
                </div>
                <div style={{ display: "flex", gap: "56px" }}>
                  <StatBlock
                    label="Duration"
                    value={formatTrackDuration(stats.durationMs)}
                    width={LEFT_COL_WIDTH}
                  />
                  <StatBlock label="Top Speed" value={`${Math.round(stats.maxSpeedKt)} KT`} />
                </div>
              </div>
            ) : (
              <div style={{ fontSize: "34px", color: "#94a3b8", maxWidth: "560px" }}>
                Replay a GPX track in an animated 3D globe.
              </div>
            )}
          </div>

          {/* Right: track polyline panel */}
          {trackPath ? (
            <div
              style={{
                display: "flex",
                width: `${PATH_WIDTH}px`,
                height: `${PATH_HEIGHT}px`,
                borderRadius: "24px",
                background: "rgba(15, 23, 42, 0.55)",
                border: "1px solid rgba(147, 180, 240, 0.25)",
              }}
            >
              <svg width={PATH_WIDTH} height={PATH_HEIGHT} viewBox={`0 0 ${PATH_WIDTH} ${PATH_HEIGHT}`}>
                <path
                  d={trackPath}
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          ) : null}
        </div>

        <div style={{ fontSize: "28px", color: "#64748b" }}>José&apos;s Aviation Tools · 3D GPX Replay</div>
      </div>
    ),
    { ...size }
  );
}

interface OgImageProps {
  params: Promise<{ id: string }>;
}

export default async function Image({ params }: OgImageProps) {
  const { id } = await params;

  let stats: GpxStats | null = null;
  try {
    const gpx = await fetchSharedReplayGpx(id);
    if (gpx) stats = computeGpxStats(gpx);
  } catch (error) {
    console.error(`[/replay/${id}] OG image error:`, error);
  }

  return renderImage(stats);
}
