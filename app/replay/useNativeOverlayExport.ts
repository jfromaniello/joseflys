"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HudExportFps, RecordResolution, ReplayPoint } from "./types";
import type { EngineRanges } from "./replayMetrics";
import {
  overlayGeometry,
  overlayWindow,
  renderFpsFor,
  type HudOverlayKind,
  type OverlayAspect,
  type OverlayMotion,
} from "./overlayFrame";
import type { OverlayWorkerInit, OverlayWorkerOutbound } from "./overlayExportWorker";
import type { CaptureControl } from "./GpxReplayGlobe";

/** Default port the `joseflys-overlay-generator` helper listens on. */
export const NATIVE_HELPER_PORT = 7842;

/**
 * Output codec for the native export. `qtrle` (QuickTime Animation, RLE) is the
 * default: lossless, alpha-capable, Resolve-native, and ~20× faster to encode
 * than ProRes 4444 on a mostly-transparent overlay (the encode is the
 * bottleneck). `prores4444` is offered for pipelines that require it.
 */
export type NativeCodec = "qtrle" | "prores4444";

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
  /** Output codec the helper should mux to. */
  codec: NativeCodec;
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

// Don't send a Referer to the local helper: it's cross-site (127.0.0.1), so
// the browser would otherwise log a referrer-policy warning on every request,
// and the helper has no use for the page URL anyway.
const NO_REFERRER = { referrerPolicy: "no-referrer" as const };

/** Parallel render+upload lanes. Capped so the helper's reorder buffer and the
 *  number of concurrent connections stay small. */
function laneCount(): number {
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
  return Math.max(1, Math.min(4, cores - 1));
}

/**
 * Drives the native export: a pool of Web Workers each render an interleaved
 * lane of overlay frames on an OffscreenCanvas and stream the raw RGBA to the
 * local `joseflys-overlay-generator` helper (which muxes them with native
 * ffmpeg). Spreading render across cores and uploading on several connections
 * gets past the single-threaded, single-connection ceiling of doing it all on
 * the main thread. The helper reorders frames by `seq`, so the output stays
 * frame-exact.
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
  const workersRef = useRef<Worker[]>([]);
  // Lets cancel() settle the in-flight orchestration promise.
  const rejectRunRef = useRef<((reason: Error) => void) | null>(null);

  const terminateWorkers = useCallback(() => {
    for (const w of workersRef.current) {
      try {
        w.postMessage({ type: "abort" });
        w.terminate();
      } catch {
        // already gone
      }
    }
    workersRef.current = [];
  }, []);

  useEffect(
    () => () => {
      abortRef.current = true;
      terminateWorkers();
    },
    [terminateWorkers]
  );

  const probeHelper = useCallback(async (port: number) => {
    setHelper((h) => (h.status === "online" ? h : { ...h, status: "checking" }));
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${helperBase(port)}/health`, { signal: controller.signal, ...NO_REFERRER });
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
    terminateWorkers();
    setStatus("idle");
    setProgress(0);
    setEtaSeconds(null);
    setOutput(null);
    setBytes(null);
    setError(null);
  }, [terminateWorkers]);

  const cancel = useCallback(() => {
    abortRef.current = true;
    terminateWorkers();
    rejectRunRef.current?.(new Error("aborted"));
  }, [terminateWorkers]);

  const startExport = useCallback(
    (options: NativeExportOptions) => {
      const { overlay, fps, aspect, resolution, title, watermark, rangeStartMs, rangeEndMs, motion, codec, port } =
        options;
      if (latest.current.durationMs <= 0 || status === "exporting") return;

      const geometry = overlayGeometry(aspect, resolution);
      if (!geometry) return;
      const { width, height } = geometry;

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
          const { startMs: start, durationMs: dur, points: pts, engineRanges: ranges } = latest.current;
          // Render unique frames at the motion rate; ffmpeg duplicates them up
          // to the output FPS, so we render/send far fewer for medium/stepped.
          const renderFps = renderFpsFor(motion, fps);
          const { frameIntervalMs, windowStartMs, totalFrames } = overlayWindow({
            durationMs: dur,
            rangeStartMs,
            rangeEndMs,
            fps: renderFps,
          });
          const windowStartAbsMs = start + windowStartMs;

          const startRes = await fetch(`${base}/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ width, height, fps, inputFps: renderFps, frames: totalFrames, codec }),
            ...NO_REFERRER,
          }).then((r) => r.json());
          if (!startRes.ok) throw new Error(startRes.error || "the helper rejected the job");

          const lanes = laneCount();
          const doneByLane = new Array(lanes).fill(0);
          const startedAt = performance.now();

          await new Promise<void>((resolve, reject) => {
            rejectRunRef.current = reject;
            let finished = 0;

            const onMessage = (e: MessageEvent<OverlayWorkerOutbound>) => {
              const msg = e.data;
              if (msg.type === "error") {
                reject(new Error(msg.message));
                return;
              }
              doneByLane[msg.lane] = msg.done;
              const total = doneByLane.reduce((a, b) => a + b, 0);
              const p = total / totalFrames;
              setProgress(Math.min(0.999, p));
              if (p > 0.01) setEtaSeconds((((performance.now() - startedAt) / 1000) * (1 - p)) / p);
              if (msg.type === "done") {
                finished += 1;
                if (finished === lanes) resolve();
              }
            };

            for (let lane = 0; lane < lanes; lane += 1) {
              const worker = new Worker(new URL("./overlayExportWorker.ts", import.meta.url), { type: "module" });
              worker.onmessage = onMessage;
              worker.onerror = (ev) => reject(new Error(ev.message || "worker crashed"));
              const init: OverlayWorkerInit = {
                type: "init",
                base,
                geometry,
                overlay,
                title,
                watermark,
                points: pts,
                engineRanges: ranges,
                windowStartAbsMs,
                frameIntervalMs,
                totalFrames,
                lane,
                laneCount: lanes,
              };
              worker.postMessage(init);
              workersRef.current.push(worker);
            }
          });

          rejectRunRef.current = null;
          terminateWorkers();
          if (abortRef.current) {
            setStatus("idle");
            return;
          }

          const fin = await fetch(`${base}/finish`, { method: "POST", ...NO_REFERRER }).then((r) => r.json());
          if (!fin.ok) throw new Error(fin.error || "the helper failed to finish the file");
          setOutput(fin.output ?? null);
          setBytes(typeof fin.bytes === "number" ? fin.bytes : null);
          setProgress(1);
          setStatus("done");
        } catch (err) {
          rejectRunRef.current = null;
          terminateWorkers();
          if (abortRef.current) {
            setStatus("idle");
            return;
          }
          await fetch(`${base}/abort`, { method: "POST", ...NO_REFERRER }).catch(() => {});
          setStatus("error");
          setError(err instanceof Error ? err.message : "Native export failed.");
        } finally {
          captureControlRef.current?.setRenderPaused(false);
        }
      })();
    },
    [status, captureControlRef, terminateWorkers]
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
