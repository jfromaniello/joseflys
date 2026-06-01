"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReplayPoint, SpeedOption } from "./types";
import {
  computeAltitudeFt,
  computeGroundSpeed,
  computeVerticalSpeedFpm,
  findPointIndexByTime,
} from "./replayMetrics";
import { drawHud } from "./recordHud";
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
}: UseReplayRecorderParams): UseReplayRecorderResult {
  const [supported] = useState(isMp4RecordingSupported);
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Latest values read inside the rAF loop without re-subscribing it.
  const latest = useRef({ points, startMs, durationMs });
  useEffect(() => {
    latest.current = { points, startMs, durationMs };
  });

  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<Mp4Recorder | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const abortRef = useRef(false);

  const cleanupLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupLoop();
      recorderRef.current?.dispose();
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, [cleanupLoop]);

  const reset = useCallback(() => {
    abortRef.current = true;
    cleanupLoop();
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
  }, [cleanupLoop]);

  const startRecording = useCallback(
    ({ speed: speedMultiplier, showTelemetry, quality }: RecordOptions) => {
      const canvas = canvasRef.current;
      const { durationMs: duration } = latest.current;
      if (!supported || !canvas || duration <= 0 || status === "recording" || status === "encoding") {
        return;
      }

      abortRef.current = false;
      setIsPlaying(false);
      setError(null);
      setProgress(0);
      setStatus("recording");
      setElapsedMs(0);

      // Composite target: globe frame + HUD, sized to the canvas backing store.
      const width = canvas.width;
      const height = canvas.height;
      const composite = document.createElement("canvas");
      composite.width = width;
      composite.height = height;
      const ctx = composite.getContext("2d");
      if (!ctx) {
        setStatus("error");
        setError("No 2D canvas context.");
        return;
      }

      // Draws the globe frame + (optionally) the telemetry HUD for a given time.
      const composeFrame = (timeMs: number) => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(canvas, 0, 0, width, height);
        if (!showTelemetry) return;
        const { points: pts } = latest.current;
        const index = findPointIndexByTime(pts, timeMs);
        drawHud(ctx, width, height, {
          speedKnots: computeGroundSpeed(pts, index).knots,
          altitudeFt: computeAltitudeFt(pts, index, timeMs),
          vsFpm: computeVerticalSpeedFpm(pts, index, timeMs),
          timeMs,
        });
      };

      const finishRecording = async (recorder: Mp4Recorder) => {
        setStatus("encoding");
        try {
          const blob = await recorder.finish();
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

        const frameDurMicros = Math.round(1_000_000 / FPS);

        if (quality === "sharp") {
          // Deterministic: step time in fixed increments, wait for tiles each frame.
          const control = captureControlRef.current;
          if (!control) {
            recorder.dispose();
            recorderRef.current = null;
            setStatus("error");
            setError("3D view isn't ready yet.");
            return;
          }

          const { startMs: start, durationMs: dur } = latest.current;
          const clipSeconds = dur / 1000 / speedMultiplier;
          const totalFrames = Math.max(2, Math.round(FPS * clipSeconds));

          control.begin();
          try {
            for (let i = 0; i < totalFrames; i += 1) {
              if (abortRef.current) return;
              const timeMs = start + (i / (totalFrames - 1)) * dur;
              await control.frameAtTime(timeMs);
              if (abortRef.current) return;
              composeFrame(timeMs);
              await recorder.addFrame(composite, i * frameDurMicros, i % (FPS * 2) === 0);
              setProgress((i + 1) / totalFrames);
            }
          } catch (err) {
            control.end();
            recorder.dispose();
            recorderRef.current = null;
            setStatus("error");
            setError(err instanceof Error ? err.message : "Encoding failed.");
            return;
          }
          control.end();
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
          const { startMs: start, durationMs: dur } = latest.current;
          const elapsed = Math.min(dur, (now - startNow) * speedMultiplier);
          setElapsedMs(elapsed);

          if (now - lastCaptureNow >= FRAME_INTERVAL_MS) {
            lastCaptureNow = now;
            composeFrame(start + elapsed);

            const tMicros = (now - startNow) * 1000;
            recorder.addFrame(composite, tMicros, frameIndex % (FPS * 2) === 0).catch((err) => {
              cleanupLoop();
              setStatus("error");
              setError(err instanceof Error ? err.message : "Encoding failed.");
            });
            frameIndex += 1;
            setProgress(dur > 0 ? elapsed / dur : 0);
          }

          if (elapsed >= dur) {
            cleanupLoop();
            void finishRecording(recorder);
            return;
          }
          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      })();
    },
    [canvasRef, supported, status, setElapsedMs, setIsPlaying, cleanupLoop, captureControlRef]
  );

  return { supported, status, progress, resultUrl, error, startRecording, reset };
}
