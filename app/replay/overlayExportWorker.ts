/// <reference lib="webworker" />

/**
 * Web Worker for the native overlay export. Each worker renders an interleaved
 * "lane" of frames (lane, lane+laneCount, …) on an OffscreenCanvas and POSTs
 * each to the local helper tagged with its global `seq`, off the main thread
 * and on its own connection. The helper reorders by `seq`. Running several of
 * these in parallel breaks the single-connection upload ceiling and spreads
 * the render across cores.
 *
 * The overlay render chain (drawOverlayFrame and friends) is pure Canvas2D +
 * math with no DOM, so it runs unchanged here against an OffscreenCanvas.
 */
import { drawOverlayFrame, type OverlayGeometry, type HudOverlayKind } from "./overlayFrame";
import type { ReplayPoint } from "./types";
import type { EngineRanges } from "./replayMetrics";

export interface OverlayWorkerInit {
  type: "init";
  base: string;
  geometry: OverlayGeometry;
  overlay: HudOverlayKind;
  title: string | null;
  watermark: boolean;
  points: ReplayPoint[];
  engineRanges: EngineRanges;
  windowStartAbsMs: number;
  frameIntervalMs: number;
  totalFrames: number;
  lane: number;
  laneCount: number;
}

export type OverlayWorkerInbound = OverlayWorkerInit | { type: "abort" };

export type OverlayWorkerOutbound =
  | { type: "progress"; lane: number; done: number }
  | { type: "done"; lane: number; done: number }
  | { type: "error"; lane: number; message: string };

const ctx = self as unknown as {
  postMessage: (msg: OverlayWorkerOutbound) => void;
  onmessage: ((e: MessageEvent<OverlayWorkerInbound>) => void) | null;
};

let aborted = false;

ctx.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === "abort") {
    aborted = true;
    return;
  }
  if (msg.type === "init") void run(msg);
};

async function run(m: OverlayWorkerInit): Promise<void> {
  try {
    const canvas = new OffscreenCanvas(m.geometry.width, m.geometry.height);
    // OffscreenCanvas's 2D context is API-compatible with the render chain's
    // expected CanvasRenderingContext2D (same drawing mixins).
    const c2d = canvas.getContext("2d", {
      willReadFrequently: true,
    }) as unknown as CanvasRenderingContext2D | null;
    if (!c2d) {
      ctx.postMessage({ type: "error", lane: m.lane, message: "no OffscreenCanvas 2D context" });
      return;
    }

    let done = 0;
    for (let i = m.lane; i < m.totalFrames; i += m.laneCount) {
      if (aborted) return;
      drawOverlayFrame(c2d, {
        overlay: m.overlay,
        timeMs: m.windowStartAbsMs + i * m.frameIntervalMs,
        geometry: m.geometry,
        title: m.title,
        watermark: m.watermark,
        points: m.points,
        engineRanges: m.engineRanges,
      });
      const pixels = c2d.getImageData(0, 0, m.geometry.width, m.geometry.height).data;
      // No Content-Type → CORS "simple request" → no per-frame preflight.
      const res = await fetch(`${m.base}/frame?seq=${i}`, {
        method: "POST",
        body: pixels,
        referrerPolicy: "no-referrer",
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        ctx.postMessage({ type: "error", lane: m.lane, message: detail.error || `frame ${i} rejected (${res.status})` });
        return;
      }
      done += 1;
      if (done % 8 === 0) ctx.postMessage({ type: "progress", lane: m.lane, done });
    }
    ctx.postMessage({ type: "done", lane: m.lane, done });
  } catch (err) {
    ctx.postMessage({ type: "error", lane: m.lane, message: err instanceof Error ? err.message : String(err) });
  }
}
