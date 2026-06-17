/**
 * Shared overlay rendering for the HUD exports. Both the in-browser MP4
 * (fill + matte) export and the native ProRes export (frames streamed to
 * `joseflys-overlay-generator`) draw frames through here, so the two paths stay
 * pixel-identical.
 */
import { PFD_LAYOUT_WIDTH, recordOutputSize, type RecordResolution, type ReplayPoint } from "./types";
import {
  computeAltitudeFt,
  computeGroundSpeed,
  computeTrackHeadingDeg,
  computeVerticalSpeedFpm,
  findPointIndexByTime,
  type EngineRanges,
} from "./replayMetrics";
import { drawClockAndWatermark, drawHud, drawTitle } from "./recordHud";
import { buildPfdScene, samplePfdData } from "./pfdScene";
import { drawPfdScene } from "./pfdCanvas";

/** Which overlay to render: the glass-cockpit PFD or the simple telemetry HUD. */
export type HudOverlayKind = "pfd" | "hud";

/** Fixed export aspect ("screen" has no meaning without a live canvas). */
export type OverlayAspect = "16:9" | "9:16";

/** Output pixel size plus the CSS-pixel layout the PFD scene is built at. */
export interface OverlayGeometry {
  width: number;
  height: number;
  cssWidth: number;
  cssHeight: number;
  /** CSS-pixel → output-pixel scale applied when compositing the PFD scene. */
  pfdScale: number;
}

/**
 * Output geometry for a fixed aspect/resolution preset. The PFD scene is laid
 * out at a standard logical width (so framing is identical across machines and
 * resolutions), then scaled onto the output pixels.
 */
export function overlayGeometry(aspect: OverlayAspect, resolution: RecordResolution): OverlayGeometry | null {
  const output = recordOutputSize(aspect, resolution);
  if (!output) return null;
  const cssWidth = PFD_LAYOUT_WIDTH[aspect];
  const pfdScale = output.width / cssWidth;
  return { width: output.width, height: output.height, cssWidth, cssHeight: output.height / pfdScale, pfdScale };
}

/** The exported time window, in frames, derived from the chosen range and FPS. */
export interface OverlayWindow {
  frameIntervalMs: number;
  /** First exported frame's offset from track start (ms). */
  windowStartMs: number;
  windowMs: number;
  totalFrames: number;
}

/**
 * Resolves the exported window from the user's in/out range, clamped into the
 * track and kept at least one frame long. Playback is locked to 1×: frame `i`
 * is the overlay at `windowStartMs + i * frameIntervalMs`.
 */
export function overlayWindow(params: {
  durationMs: number;
  rangeStartMs: number;
  rangeEndMs: number;
  fps: number;
}): OverlayWindow {
  const { durationMs, rangeStartMs, rangeEndMs, fps } = params;
  const frameIntervalMs = 1000 / fps;
  const windowStartMs = Math.max(0, Math.min(rangeStartMs, durationMs));
  const windowEndMs = Math.max(windowStartMs + frameIntervalMs, Math.min(rangeEndMs, durationMs));
  const windowMs = windowEndMs - windowStartMs;
  const totalFrames = Math.max(2, Math.floor(windowMs / frameIntervalMs) + 1);
  return { frameIntervalMs, windowStartMs, windowMs, totalFrames };
}

/** Inputs for drawing one overlay frame at an absolute time. */
export interface DrawOverlayParams {
  overlay: HudOverlayKind;
  /** Absolute UTC time of the frame (ms) — used for the burned-in clock. */
  timeMs: number;
  geometry: OverlayGeometry;
  title: string | null;
  watermark: boolean;
  points: ReplayPoint[];
  engineRanges: EngineRanges;
}

/**
 * Clears the context and draws the overlay (PFD or simple HUD) with the optional
 * title and the UTC clock / watermark, onto a transparent canvas.
 */
export function drawOverlayFrame(ctx: CanvasRenderingContext2D, params: DrawOverlayParams): void {
  const { overlay, timeMs, geometry, title, watermark, points, engineRanges } = params;
  const { width, height, cssWidth, cssHeight, pfdScale } = geometry;

  ctx.clearRect(0, 0, width, height);
  if (overlay === "pfd") {
    drawPfdScene(ctx, buildPfdScene(cssWidth, cssHeight, samplePfdData(points, timeMs), engineRanges), pfdScale);
    if (title) drawTitle(ctx, width, title);
    drawClockAndWatermark(ctx, width, height, timeMs, watermark);
  } else {
    const index = findPointIndexByTime(points, timeMs);
    drawHud(
      ctx,
      width,
      height,
      {
        speedKnots: computeGroundSpeed(points, index).knots,
        altitudeFt: computeAltitudeFt(points, index, timeMs),
        vsFpm: computeVerticalSpeedFpm(points, index, timeMs),
        trackDeg: computeTrackHeadingDeg(points, timeMs),
        timeMs,
      },
      { title, watermark }
    );
  }
}
