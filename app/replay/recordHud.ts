import { formatVerticalSpeed } from "@/lib/formatters";
import { formatUtc } from "./formatTime";

/** Per-frame telemetry values drawn over the recorded video. */
export interface HudFrame {
  speedKnots: number | null;
  altitudeFt: number | null;
  vsFpm: number | null;
  /** Absolute UTC timestamp of the frame (ms). */
  timeMs: number;
  /** Playback progress in [0, 1] for the bottom bar. */
  progress: number;
}

function field(value: string | null, unit: string): string {
  return value !== null ? `${value} ${unit}` : "--";
}

/**
 * Draws the telemetry HUD (speed / altitude / vertical speed panel, a progress
 * bar with the UTC clock, and a branding watermark) onto a 2D context that
 * already holds the globe frame. Sizes scale with canvas width so output looks
 * consistent across resolutions.
 */
export function drawHud(ctx: CanvasRenderingContext2D, width: number, height: number, frame: HudFrame): void {
  const scale = width / 1280;
  const pad = Math.round(20 * scale);
  const font = (px: number, weight = 600) => `${weight} ${Math.round(px * scale)}px system-ui, sans-serif`;

  ctx.save();
  ctx.textBaseline = "top";

  // --- Telemetry panel (top-right) ---
  const rows: [string, string][] = [
    ["SPEED", field(frame.speedKnots !== null ? frame.speedKnots.toFixed(0) : null, "KT")],
    ["ALTITUDE", field(frame.altitudeFt !== null ? Math.round(frame.altitudeFt).toLocaleString("en-US") : null, "ft")],
    ["V/S", formatVerticalSpeed(frame.vsFpm)],
  ];
  const panelW = Math.round(190 * scale);
  const rowH = Math.round(46 * scale);
  const panelH = rows.length * rowH + pad;
  const panelX = width - panelW - pad;
  const panelY = pad;

  roundRect(ctx, panelX, panelY, panelW, panelH, Math.round(12 * scale));
  ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
  ctx.fill();

  rows.forEach(([label, value], i) => {
    const y = panelY + pad / 2 + i * rowH;
    ctx.fillStyle = "#7c93b8";
    ctx.font = font(13, 600);
    ctx.fillText(label, panelX + pad, y);
    ctx.fillStyle = "#ffffff";
    ctx.font = font(22, 700);
    ctx.fillText(value, panelX + pad, y + Math.round(16 * scale));
  });

  // --- Progress bar + clock (bottom) ---
  const barH = Math.round(6 * scale);
  const barY = height - pad - barH;
  const barX = pad;
  const barW = width - pad * 2;

  roundRect(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fillStyle = "rgba(148, 163, 184, 0.35)";
  ctx.fill();

  const filled = Math.max(0, Math.min(1, frame.progress)) * barW;
  if (filled > 0) {
    roundRect(ctx, barX, barY, filled, barH, barH / 2);
    ctx.fillStyle = "#22d3ee";
    ctx.fill();
  }

  ctx.font = font(15, 600);
  ctx.fillStyle = "#e2e8f0";
  const clock = formatUtc(frame.timeMs);
  ctx.fillText(clock, barX, barY - Math.round(24 * scale));

  // --- Watermark (bottom-right, above the bar) ---
  ctx.font = font(15, 700);
  ctx.fillStyle = "rgba(226, 232, 240, 0.85)";
  ctx.textAlign = "right";
  ctx.fillText("joseflys.com", width - pad, barY - Math.round(24 * scale));
  ctx.textAlign = "left";

  ctx.restore();
}

/** Builds a rounded-rectangle path (does not fill/stroke). */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
