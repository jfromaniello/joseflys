"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HudExportFps, RecordResolution, ReplayPoint } from "./types";
import type { EngineRanges } from "./replayMetrics";
import {
  drawOverlayFrame,
  overlayGeometry,
  overlayWindow,
  renderFpsFor,
  type HudOverlayKind,
  type OverlayAspect,
  type OverlayMotion,
} from "./overlayFrame";
import { yieldToEventLoop } from "./recordReplay";
import type { CaptureControl } from "./GpxReplayGlobe";

/** Default port the `joseflys-overlay-generator` helper listens on. */
export const NATIVE_HELPER_PORT = 7842;

export type NativeExportStatus = "idle" | "exporting" | "done" | "error";

/** Liveness of the local helper, polled while the native tab is open. */
export interface HelperState {
  status: "unknown" | "checking" | "online" | "offline";
  busy: boolean;
  version: string | null;
}

/** Options for a native export — overlay settings plus the helper port. */
export interface NativeExportOptions {
  overlay: HudOverlayKind;
  fps: HudExportFps;
  aspect: OverlayAspect;
  resolution: RecordResolution;
  title: string | null;
  watermark: boolean;
  rangeStartMs: number;
  rangeEndMs: number;
  /** How many distinct frames to render vs. duplicate to the output rate. */
  motion: OverlayMotion;
  port: number;
}

interface UseNativeOverlayExportParams {
  points: ReplayPoint[];
  startMs: number;
  durationMs: number;
  engineRanges: EngineRanges;
  /** Globe controller — its render loop is paused while exporting. */
  captureControlRef: React.RefObject<CaptureControl | null>;
}

export interface UseNativeOverlayExportResult {
  status: NativeExportStatus;
  progress: number;
  etaSeconds: number | null;
  helper: HelperState;
  /** Output path / size reported by the helper once finished. */
  output: string | null;
  bytes: number | null;
  error: string | null;
  /** Probes the helper's /health once (used by the modal's polling). */
  probeHelper: (port: number) => Promise<void>;
  startExport: (options: NativeExportOptions) => void;
  cancel: () => void;
  reset: () => void;
}

const helperBase = (port: number) => `http://127.0.0.1:${port}`;

/**
 * Drives the native ProRes export: renders the overlay frame-by-frame in the
 * browser and streams the raw RGBA to the local `joseflys-overlay-generator`
 * helper, which pipes them into ffmpeg. The browser owns the pixels and timing;
 * the helper owns the (fast, alpha-capable) native encode.
 *
 * Frames are sent as ordered, awaited POSTs — that gives both ordering and
 * backpressure (the helper only responds once ffmpeg has accepted the bytes),
 * and, by omitting a Content-Type, keeps each POST a CORS "simple request" so
 * there's no per-frame preflight.
 */
export function useNativeOverlayExport({
  points,
  startMs,
  durationMs,
  engineRanges,
  captureControlRef,
}: UseNativeOverlayExportParams): UseNativeOverlayExportResult {
  const [status, setStatus] = useState<NativeExportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [helper, setHelper] = useState<HelperState>({ status: "unknown", busy: false, version: null });
  const [output, setOutput] = useState<string | null>(null);
  const [bytes, setBytes] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const latest = useRef({ points, startMs, durationMs, engineRanges });
  useEffect(() => {
    latest.current = { points, startMs, durationMs, engineRanges };
  });

  const abortRef = useRef(false);

  useEffect(() => () => {
    abortRef.current = true;
  }, []);

  const probeHelper = useCallback(async (port: number) => {
    setHelper((h) => (h.status === "online" ? h : { ...h, status: "checking" }));
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${helperBase(port)}/health`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error("bad status");
      const info = await res.json();
      setHelper({ status: "online", busy: Boolean(info.busy), version: info.version ?? null });
    } catch {
      setHelper({ status: "offline", busy: false, version: null });
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current = true;
    setStatus("idle");
    setProgress(0);
    setEtaSeconds(null);
    setOutput(null);
    setBytes(null);
    setError(null);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current = true;
  }, []);

  const startExport = useCallback(
    (options: NativeExportOptions) => {
      const { overlay, fps, aspect, resolution, title, watermark, rangeStartMs, rangeEndMs, motion, port } =
        options;
      const { durationMs: dur } = latest.current;
      if (dur <= 0 || status === "exporting") return;

      const geometry = overlayGeometry(aspect, resolution);
      if (!geometry) return;
      const { width, height } = geometry;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        setStatus("error");
        setError("No 2D canvas context.");
        return;
      }

      abortRef.current = false;
      setError(null);
      setProgress(0);
      setEtaSeconds(null);
      setOutput(null);
      setBytes(null);
      setStatus("exporting");

      const base = helperBase(port);

      void (async () => {
        captureControlRef.current?.setRenderPaused(true);
        try {
          const { startMs: start } = latest.current;
          // Render unique frames at the motion rate; ffmpeg duplicates them up
          // to the output FPS (-framerate inputFps -i - … -r fps), so we render
          // and send far fewer frames for medium/stepped.
          const renderFps = renderFpsFor(motion, fps);
          const { frameIntervalMs, windowStartMs, totalFrames } = overlayWindow({
            durationMs: latest.current.durationMs,
            rangeStartMs,
            rangeEndMs,
            fps: renderFps,
          });
          const windowStartAbsMs = start + windowStartMs;

          const startRes = await fetch(`${base}/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ width, height, fps, inputFps: renderFps, frames: totalFrames }),
          }).then((r) => r.json());
          if (!startRes.ok) throw new Error(startRes.error || "the helper rejected the job");

          const startedAt = performance.now();
          for (let i = 0; i < totalFrames; i += 1) {
            if (abortRef.current) {
              await fetch(`${base}/abort`, { method: "POST" }).catch(() => {});
              setStatus("idle");
              return;
            }
            drawOverlayFrame(ctx, {
              overlay,
              timeMs: windowStartAbsMs + i * frameIntervalMs,
              geometry,
              title,
              watermark,
              points: latest.current.points,
              engineRanges: latest.current.engineRanges,
            });
            const pixels = ctx.getImageData(0, 0, width, height).data;
            // No Content-Type → CORS "simple request" → no per-frame preflight.
            const res = await fetch(`${base}/frame`, { method: "POST", body: pixels });
            if (!res.ok) {
              const detail = await res.json().catch(() => ({}));
              throw new Error(detail.error || `frame ${i} rejected (${res.status})`);
            }
            if (i % 16 === 0) {
              const p = i / totalFrames;
              setProgress(p);
              if (p > 0.01) setEtaSeconds((((performance.now() - startedAt) / 1000) * (1 - p)) / p);
              await yieldToEventLoop();
            }
          }

          const fin = await fetch(`${base}/finish`, { method: "POST" }).then((r) => r.json());
          if (!fin.ok) throw new Error(fin.error || "the helper failed to finish the file");
          setOutput(fin.output ?? null);
          setBytes(typeof fin.bytes === "number" ? fin.bytes : null);
          setProgress(1);
          setStatus("done");
        } catch (err) {
          if (abortRef.current) {
            setStatus("idle");
            return;
          }
          await fetch(`${base}/abort`, { method: "POST" }).catch(() => {});
          setStatus("error");
          setError(err instanceof Error ? err.message : "Native export failed.");
        } finally {
          captureControlRef.current?.setRenderPaused(false);
        }
      })();
    },
    [status, captureControlRef]
  );

  return {
    status,
    progress,
    etaSeconds,
    helper,
    output,
    bytes,
    error,
    probeHelper,
    startExport,
    cancel,
    reset,
  };
}
