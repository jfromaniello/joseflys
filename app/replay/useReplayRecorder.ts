"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PFD_LAYOUT_WIDTH,
  recordOutputSize,
  type RecordAspect,
  type RecordResolution,
  type ReplayPoint,
  type SpeedOption,
} from "./types";
import {
  computeAltitudeFt,
  computeGroundSpeed,
  computeTrackHeadingDeg,
  computeVerticalSpeedFpm,
  findPointIndexByTime,
  type EngineRanges,
} from "./replayMetrics";
import { drawHud } from "./recordHud";
import { buildPfdScene, samplePfdData } from "./pfdScene";
import { drawPfdScene } from "./pfdCanvas";
import { Mp4Recorder, downloadBlob, isMp4RecordingSupported } from "./recordReplay";
import type { CaptureControl } from "./GpxReplayGlobe";

const FPS = 30;
const FRAME_INTERVAL_MS = 1000 / FPS;

export type RecordingStatus =
  | "idle"
  | "unsupported"
  | "recording"
  | "encoding"
  | "done"
  | "error";

/**
 * Capture quality:
 * - `fast`: real-time capture (quick, but fast-moving tiles may be blurry).
 * - `sharp`: deterministic frame-by-frame, waiting for tiles to load each frame.
 */
export type RecordQuality = "fast" | "sharp";

/** Options chosen in the record modal before starting. */
export interface RecordOptions {
  speed: SpeedOption;
  /** Whether to composite the telemetry HUD onto the video. */
  showTelemetry: boolean;
  quality: RecordQuality;
  /** Output aspect: fixed 16:9 / 9:16 presets, or "screen" to match the live canvas. */
  aspect: RecordAspect;
  /** Output resolution preset (ignored when `aspect` is "screen"). */
  resolution: RecordResolution;
  /** Window to record, in elapsed ms from the track start. Defaults to the whole flight. */
  rangeStartMs?: number;
  rangeEndMs?: number;
}

interface UseReplayRecorderParams {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  points: ReplayPoint[];
  startMs: number;
  durationMs: number;
  /** Drives the globe by setting the elapsed playback time. */
  setElapsedMs: (value: number) => void;
  /** Pauses the normal playback loop during recording. */
  setIsPlaying: (playing: boolean) => void;
  /** Imperative globe controller for deterministic ("Sharp") capture. */
  captureControlRef: React.RefObject<CaptureControl | null>;
  /** Whether the glass-cockpit PFD overlay is live (cockpit view + avionics + toggle). */
  pfdActive: boolean;
  /** Gauge scales for the PFD's EIS strip, derived from the track. */
  engineRanges: EngineRanges;
}

interface UseReplayRecorderResult {
  supported: boolean;
  status: RecordingStatus;
  /** Progress in [0, 1] while recording. */
  progress: number;
  /** Object URL of the finished MP4 (for preview / re-download). */
  resultUrl: string | null;
  error: string | null;
  startRecording: (options: RecordOptions) => void;
  reset: () => void;
}

/**
 * Records the live globe canvas (with a telemetry HUD composited on top) into an
 * MP4 by playing the whole flight at `speedMultiplier` and capturing frames in
 * real time via WebCodecs. See {@link Mp4Recorder} / {@link drawHud}.
 */
export function useReplayRecorder({
  canvasRef,
  points,
  startMs,
  durationMs,
  setElapsedMs,
  setIsPlaying,
  captureControlRef,
  pfdActive,
  engineRanges,
}: UseReplayRecorderParams): UseReplayRecorderResult {
  const [supported] = useState(isMp4RecordingSupported);
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Latest values read inside the rAF loop without re-subscribing it.
  const latest = useRef({ points, startMs, durationMs, pfdActive, engineRanges });
  useEffect(() => {
    latest.current = { points, startMs, durationMs, pfdActive, engineRanges };
  });

  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<Mp4Recorder | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const abortRef = useRef(false);

  // Whether the globe viewport is currently fixed to the recording size.
  const viewportFixedRef = useRef(false);

  const cleanupLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Restores the responsive globe layout after a fixed-size capture (idempotent).
  const releaseViewport = useCallback(() => {
    if (!viewportFixedRef.current) return;
    viewportFixedRef.current = false;
    void captureControlRef.current?.setRecordingSize(null);
  }, [captureControlRef]);

  useEffect(() => {
    return () => {
      cleanupLoop();
      releaseViewport();
      recorderRef.current?.dispose();
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, [cleanupLoop, releaseViewport]);

  const reset = useCallback(() => {
    abortRef.current = true;
    cleanupLoop();
    releaseViewport();
    recorderRef.current?.dispose();
    recorderRef.current = null;
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
    setResultUrl(null);
    setError(null);
    setProgress(0);
    setStatus("idle");
  }, [cleanupLoop, releaseViewport]);

  const startRecording = useCallback(
    ({ speed: speedMultiplier, showTelemetry, quality, aspect, resolution, rangeStartMs, rangeEndMs }: RecordOptions) => {
      const canvas = canvasRef.current;
      const { durationMs: duration } = latest.current;
      if (!supported || !canvas || duration <= 0 || status === "recording" || status === "encoding") {
        return;
      }

      // Window to record (elapsed ms from track start), clamped to [0, duration].
      const rangeStart = Math.max(0, Math.min(rangeStartMs ?? 0, duration));
      const rangeEnd = Math.max(rangeStart, Math.min(rangeEndMs ?? duration, duration));
      const windowMs = rangeEnd - rangeStart;

      // Fixed presets need the globe controller to pin the viewport size.
      const output = recordOutputSize(aspect, resolution);
      if (output && !captureControlRef.current) {
        setStatus("error");
        setError("3D view isn't ready yet.");
        return;
      }

      abortRef.current = false;
      setIsPlaying(false);
      setError(null);
      setProgress(0);
      setStatus("recording");
      setElapsedMs(rangeStart);

      // Composite target: globe frame + HUD. Fixed presets render at exact
      // output pixels regardless of window size / devicePixelRatio; "screen"
      // keeps the live canvas backing-store size.
      const width = output ? output.width : canvas.width;
      const height = output ? output.height : canvas.height;
      const composite = document.createElement("canvas");
      composite.width = width;
      composite.height = height;
      const ctx = composite.getContext("2d");
      if (!ctx) {
        setStatus("error");
        setError("No 2D canvas context.");
        return;
      }

      // The PFD scene is laid out in CSS pixels, then scaled onto the
      // (device-pixel) backing store when composited. Fixed presets use a
      // standard logical width; "screen" mirrors the live overlay.
      const cssWidth =
        output && aspect !== "screen" ? PFD_LAYOUT_WIDTH[aspect] : canvas.clientWidth || width;
      const pfdScale = width / cssWidth;
      const cssHeight = output ? height / pfdScale : canvas.clientHeight || height;

      // Draws the globe frame + (optionally) the telemetry overlay for a given
      // time: the glass-cockpit PFD when it is live on screen, the simple HUD
      // otherwise.
      const composeFrame = (timeMs: number) => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(canvas, 0, 0, width, height);
        if (!showTelemetry) return;
        const { points: pts, pfdActive: pfd, engineRanges: ranges } = latest.current;
        if (pfd) {
          const scene = buildPfdScene(cssWidth, cssHeight, samplePfdData(pts, timeMs), ranges);
          drawPfdScene(ctx, scene, pfdScale);
          return;
        }
        const index = findPointIndexByTime(pts, timeMs);
        drawHud(ctx, width, height, {
          speedKnots: computeGroundSpeed(pts, index).knots,
          altitudeFt: computeAltitudeFt(pts, index, timeMs),
          vsFpm: computeVerticalSpeedFpm(pts, index, timeMs),
          trackDeg: computeTrackHeadingDeg(pts, timeMs),
          timeMs,
        });
      };

      const finishRecording = async (recorder: Mp4Recorder) => {
        releaseViewport();
        if (abortRef.current) return;
        setStatus("encoding");
        try {
          const blob = await recorder.finish();
          if (abortRef.current) return;
          recorder.dispose();
          recorderRef.current = null;

          const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
          downloadBlob(blob, `joseflys-replay-${stamp}.mp4`);

          const url = URL.createObjectURL(blob);
          resultUrlRef.current = url;
          setResultUrl(url);
          setProgress(1);
          setStatus("done");
        } catch (err) {
          if (abortRef.current) return;
          recorder.dispose();
          recorderRef.current = null;
          setStatus("error");
          setError(err instanceof Error ? err.message : "Encoding failed.");
        }
      };

      void (async () => {
        const recorder = new Mp4Recorder(width, height, FPS);
        recorderRef.current = recorder;

        const ok = await recorder.init();
        if (!ok) {
          recorder.dispose();
          recorderRef.current = null;
          setStatus("error");
          setError("This browser can't encode MP4. Try Chrome or Edge.");
          return;
        }

        // Pin the globe viewport to the chosen output size for the whole capture.
        if (output && captureControlRef.current) {
          viewportFixedRef.current = true;
          await captureControlRef.current.setRecordingSize(output);
          if (abortRef.current) {
            releaseViewport();
            recorder.dispose();
            recorderRef.current = null;
            return;
          }
        }

        const frameDurMicros = Math.round(1_000_000 / FPS);

        if (quality === "sharp") {
          // Deterministic: step time in fixed increments, wait for tiles each frame.
          const control = captureControlRef.current;
          if (!control) {
            releaseViewport();
            recorder.dispose();
            recorderRef.current = null;
            setStatus("error");
            setError("3D view isn't ready yet.");
            return;
          }

          const { startMs: start } = latest.current;
          const clipSeconds = windowMs / 1000 / speedMultiplier;
          const totalFrames = Math.max(2, Math.round(FPS * clipSeconds));

          control.begin();
          let aborted = false;
          try {
            for (let i = 0; i < totalFrames; i += 1) {
              if (abortRef.current) {
                aborted = true;
                break;
              }
              const timeMs = start + rangeStart + (i / (totalFrames - 1)) * windowMs;
              await control.frameAtTime(timeMs);
              if (abortRef.current) {
                aborted = true;
                break;
              }
              composeFrame(timeMs);
              await recorder.addFrame(composite, i * frameDurMicros, i % (FPS * 2) === 0);
              setProgress((i + 1) / totalFrames);
            }
          } catch (err) {
            control.end();
            releaseViewport();
            recorder.dispose();
            recorderRef.current = null;
            if (abortRef.current) return;
            setStatus("error");
            setError(err instanceof Error ? err.message : "Encoding failed.");
            return;
          }
          control.end();
          if (aborted) {
            releaseViewport();
            recorder.dispose();
            recorderRef.current = null;
            return;
          }
          await finishRecording(recorder);
          return;
        }

        // Fast: real-time capture during an automatic playback pass.
        await new Promise((r) => setTimeout(r, 150));

        let startNow: number | null = null;
        let lastCaptureNow = -Infinity;
        let frameIndex = 0;

        const loop = (now: number) => {
          if (startNow === null) startNow = now;
          const { startMs: start } = latest.current;
          const windowElapsed = Math.min(windowMs, (now - startNow) * speedMultiplier);
          setElapsedMs(rangeStart + windowElapsed);

          if (now - lastCaptureNow >= FRAME_INTERVAL_MS) {
            lastCaptureNow = now;
            composeFrame(start + rangeStart + windowElapsed);

            const tMicros = (now - startNow) * 1000;
            recorder.addFrame(composite, tMicros, frameIndex % (FPS * 2) === 0).catch((err) => {
              cleanupLoop();
              releaseViewport();
              if (abortRef.current) return;
              setStatus("error");
              setError(err instanceof Error ? err.message : "Encoding failed.");
            });
            frameIndex += 1;
            setProgress(windowMs > 0 ? windowElapsed / windowMs : 0);
          }

          if (windowElapsed >= windowMs) {
            cleanupLoop();
            void finishRecording(recorder);
            return;
          }
          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      })();
    },
    [canvasRef, supported, status, setElapsedMs, setIsPlaying, cleanupLoop, releaseViewport, captureControlRef]
  );

  return { supported, status, progress, resultUrl, error, startRecording, reset };
}
