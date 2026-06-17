"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type HudExportFps, type RecordResolution, type ReplayPoint } from "./types";
import type { EngineRanges } from "./replayMetrics";
import { drawOverlayFrame, overlayGeometry, overlayWindow, type HudOverlayKind } from "./overlayFrame";
import { Mp4Recorder, downloadBlob, isMp4RecordingSupported, yieldToEventLoop } from "./recordReplay";
import type { CaptureControl } from "./GpxReplayGlobe";

export type HudExportStatus = "idle" | "exporting" | "encoding" | "done" | "error";

export type { HudOverlayKind };

/** Options chosen in the HUD export modal before starting. */
export interface HudExportOptions {
  overlay: HudOverlayKind;
  /** Output frame rate — should match the camera footage being composited. */
  fps: HudExportFps;
  /** Fixed output aspect ("screen" makes no sense without a live canvas). */
  aspect: "16:9" | "9:16";
  resolution: RecordResolution;
  /** Flight title burned in at the top-right; null when disabled. */
  title: string | null;
  /** Whether to burn in the branding watermark. */
  watermark: boolean;
  /** Start of the exported window, in elapsed ms from the track start. */
  rangeStartMs: number;
  /** End of the exported window, in elapsed ms from the track start. */
  rangeEndMs: number;
}

interface UseHudExportParams {
  points: ReplayPoint[];
  startMs: number;
  durationMs: number;
  /** Gauge scales for the PFD's EIS strip, derived from the track. */
  engineRanges: EngineRanges;
  /** Globe controller — its render loop is paused while exporting (it would
   * otherwise compete with the encoders for the main thread and the GPU). */
  captureControlRef: React.RefObject<CaptureControl | null>;
}

interface UseHudExportResult {
  supported: boolean;
  status: HudExportStatus;
  /** Progress in [0, 1] while exporting. */
  progress: number;
  /** Estimated seconds remaining, once enough progress exists to extrapolate. */
  etaSeconds: number | null;
  /** Object URLs of the finished pair (for re-download). */
  fillUrl: string | null;
  matteUrl: string | null;
  /** Download filenames for the finished pair. */
  fillName: string | null;
  matteName: string | null;
  error: string | null;
  startExport: (options: HudExportOptions) => void;
  reset: () => void;
}

/**
 * Exports the telemetry overlay alone (no 3D map) as a frame-synchronized
 * fill + matte MP4 pair for compositing over real footage in an NLE.
 *
 * Browser encoders can't produce alpha video, so transparency ships as the
 * standard pair: `*-fill.mp4` is the overlay rendered over black, `*-matte.mp4`
 * is its alpha channel as a white-on-black silhouette. Playback is locked to 1×
 * so the burned-in UTC clock stays 1:1 with the track's timestamps.
 *
 * The render loop is fully offline — each frame is drawn from track data on 2D
 * canvases, decoupled from the wall clock and the 3D viewer — so it runs as
 * fast as the encoders allow.
 */
export function useHudExport({
  points,
  startMs,
  durationMs,
  engineRanges,
  captureControlRef,
}: UseHudExportParams): UseHudExportResult {
  const [supported] = useState(isMp4RecordingSupported);
  const [status, setStatus] = useState<HudExportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [fillUrl, setFillUrl] = useState<string | null>(null);
  const [matteUrl, setMatteUrl] = useState<string | null>(null);
  const [fillName, setFillName] = useState<string | null>(null);
  const [matteName, setMatteName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Latest values read inside the export loop without re-creating it.
  const latest = useRef({ points, startMs, durationMs, engineRanges });
  useEffect(() => {
    latest.current = { points, startMs, durationMs, engineRanges };
  });

  const recordersRef = useRef<Mp4Recorder[]>([]);
  const urlsRef = useRef<string[]>([]);
  const abortRef = useRef(false);

  const disposeRecorders = useCallback(() => {
    for (const recorder of recordersRef.current) recorder.dispose();
    recordersRef.current = [];
  }, []);

  const revokeUrls = useCallback(() => {
    for (const url of urlsRef.current) URL.revokeObjectURL(url);
    urlsRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current = true;
      disposeRecorders();
      revokeUrls();
    };
  }, [disposeRecorders, revokeUrls]);

  const reset = useCallback(() => {
    abortRef.current = true;
    disposeRecorders();
    revokeUrls();
    setFillUrl(null);
    setMatteUrl(null);
    setFillName(null);
    setMatteName(null);
    setError(null);
    setProgress(0);
    setEtaSeconds(null);
    setStatus("idle");
  }, [disposeRecorders, revokeUrls]);

  const startExport = useCallback(
    ({ overlay, fps, aspect, resolution, title, watermark, rangeStartMs, rangeEndMs }: HudExportOptions) => {
      const { durationMs: duration } = latest.current;
      if (!supported || duration <= 0 || status === "exporting" || status === "encoding") {
        return;
      }

      const geometry = overlayGeometry(aspect, resolution);
      if (!geometry) return; // unreachable: aspect excludes "screen"
      const { width, height } = geometry;

      // Three canvases per frame: the overlay drawn on transparency, then
      // flattened two ways. `scratch` keeps real alpha; `fill` composites it
      // over black; `matte` turns that alpha into a white-on-black silhouette
      // (GPU compositing, no pixel loops).
      const scratch = document.createElement("canvas");
      scratch.width = width;
      scratch.height = height;
      const fill = document.createElement("canvas");
      fill.width = width;
      fill.height = height;
      const matte = document.createElement("canvas");
      matte.width = width;
      matte.height = height;
      const scratchCtx = scratch.getContext("2d");
      const fillCtx = fill.getContext("2d", { alpha: false });
      const matteCtx = matte.getContext("2d");
      if (!scratchCtx || !fillCtx || !matteCtx) {
        setStatus("error");
        setError("No 2D canvas context.");
        return;
      }

      // Draws the overlay for a given absolute time onto the transparent
      // scratch canvas, then derives the fill and matte frames from it.
      const composeFrame = (timeMs: number) => {
        const { points: pts, engineRanges: ranges } = latest.current;
        drawOverlayFrame(scratchCtx, {
          overlay,
          timeMs,
          geometry,
          title,
          watermark,
          points: pts,
          engineRanges: ranges,
        });

        // Fill: overlay over pure black.
        fillCtx.fillStyle = "#000000";
        fillCtx.fillRect(0, 0, width, height);
        fillCtx.drawImage(scratch, 0, 0);

        // Matte: keep the overlay's alpha, paint it white, flatten over black —
        // semi-transparent pixels become proportional grays.
        matteCtx.clearRect(0, 0, width, height);
        matteCtx.drawImage(scratch, 0, 0);
        matteCtx.globalCompositeOperation = "source-in";
        matteCtx.fillStyle = "#ffffff";
        matteCtx.fillRect(0, 0, width, height);
        matteCtx.globalCompositeOperation = "destination-over";
        matteCtx.fillStyle = "#000000";
        matteCtx.fillRect(0, 0, width, height);
        matteCtx.globalCompositeOperation = "source-over";
      };

      abortRef.current = false;
      setError(null);
      setProgress(0);
      setEtaSeconds(null);
      setFillUrl(null);
      setMatteUrl(null);
      setStatus("exporting");

      void (async () => {
        // The 3D view isn't part of this export, but its render loop would
        // steal most of the main thread and the GPU from the encoders.
        captureControlRef.current?.setRenderPaused(true);
        try {
          await runExport();
        } finally {
          captureControlRef.current?.setRenderPaused(false);
        }
      })();

      async function runExport() {
        // Software encoders: hardware ones pace themselves near real time,
        // which is exactly wrong for an offline export racing the encoder.
        const encoderOptions = { hardwareAcceleration: "prefer-software" as const };
        const fillRecorder = new Mp4Recorder(width, height, fps, encoderOptions);
        const matteRecorder = new Mp4Recorder(width, height, fps, encoderOptions);
        recordersRef.current = [fillRecorder, matteRecorder];

        const fail = (message: string) => {
          disposeRecorders();
          if (abortRef.current) return;
          setStatus("error");
          setError(message);
        };

        const [fillOk, matteOk] = await Promise.all([fillRecorder.init(), matteRecorder.init()]);
        if (!fillOk || !matteOk) {
          fail("This browser can't encode MP4. Try Chrome or Edge.");
          return;
        }

        // Playback is locked to 1×: frame i is the overlay at exactly
        // i / fps seconds of flight time, so the exported window produces a
        // clip of the same length that lines up with the camera's clock.
        const { startMs: start, durationMs: dur } = latest.current;
        const { frameIntervalMs, windowStartMs, totalFrames } = overlayWindow({
          durationMs: dur,
          rangeStartMs,
          rangeEndMs,
          fps,
        });
        const frameDurMicros = Math.round(1_000_000 / fps);
        // Absolute time of the first exported frame (for the burned-in UTC clock).
        const windowStartAbsMs = start + windowStartMs;

        const exportStartedAt = performance.now();
        try {
          for (let i = 0; i < totalFrames; i += 1) {
            if (abortRef.current) return;
            composeFrame(windowStartAbsMs + i * frameIntervalMs);
            const keyFrame = i % (fps * 2) === 0;
            // Both encoders run on their own internal threads — feed them in
            // parallel so neither sits idle while the other applies backpressure.
            await Promise.all([
              fillRecorder.addFrame(fill, i * frameDurMicros, keyFrame),
              matteRecorder.addFrame(matte, i * frameDurMicros, keyFrame),
            ]);
            // Yield periodically so progress paints and the page stays alive.
            // MessageChannel, not setTimeout: background tabs throttle timers
            // to once per second, which would crawl the whole export.
            if (i % 32 === 0) {
              const p = i / totalFrames;
              setProgress(p);
              if (p > 0.01) {
                const elapsedS = (performance.now() - exportStartedAt) / 1000;
                setEtaSeconds((elapsedS * (1 - p)) / p);
              }
              await yieldToEventLoop();
            }
          }
        } catch (err) {
          fail(err instanceof Error ? err.message : "Encoding failed.");
          return;
        }

        if (abortRef.current) return;
        setStatus("encoding");
        try {
          const fillBlob = await fillRecorder.finish();
          const matteBlob = await matteRecorder.finish();
          if (abortRef.current) return;
          disposeRecorders();

          const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
          const nextFillName = `joseflys-hud-${stamp}-fill.mp4`;
          const nextMatteName = `joseflys-hud-${stamp}-matte.mp4`;
          downloadBlob(fillBlob, nextFillName);
          // Spaced out so browsers treat them as two downloads instead of
          // swallowing the second; some still gate it behind a "download
          // multiple files" permission, hence the re-download links in the UI.
          await new Promise((r) => setTimeout(r, 500));
          downloadBlob(matteBlob, nextMatteName);

          const nextFillUrl = URL.createObjectURL(fillBlob);
          const nextMatteUrl = URL.createObjectURL(matteBlob);
          urlsRef.current = [nextFillUrl, nextMatteUrl];
          setFillUrl(nextFillUrl);
          setMatteUrl(nextMatteUrl);
          setFillName(nextFillName);
          setMatteName(nextMatteName);
          setProgress(1);
          setStatus("done");
        } catch (err) {
          fail(err instanceof Error ? err.message : "Encoding failed.");
        }
      }
    },
    [supported, status, disposeRecorders, captureControlRef]
  );

  return {
    supported,
    status,
    progress,
    etaSeconds,
    fillUrl,
    matteUrl,
    fillName,
    matteName,
    error,
    startExport,
    reset,
  };
}
