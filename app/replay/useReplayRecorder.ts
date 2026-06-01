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

const FPS = 30;
const FRAME_INTERVAL_MS = 1000 / FPS;

export type RecordingStatus =
  | "idle"
  | "unsupported"
  | "recording"
  | "encoding"
  | "done"
  | "error";

/** Options chosen in the record modal before starting. */
export interface RecordOptions {
  speed: SpeedOption;
  /** Whether to composite the telemetry HUD onto the video. */
  showTelemetry: boolean;
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
    ({ speed: speedMultiplier, showTelemetry }: RecordOptions) => {
      const canvas = canvasRef.current;
      const { durationMs: duration } = latest.current;
      if (!supported || !canvas || duration <= 0 || status === "recording" || status === "encoding") {
        return;
      }

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

        // Brief warm-up so the first frame has rendered before capture starts.
        await new Promise((r) => setTimeout(r, 150));

        let startNow: number | null = null;
        let lastCaptureNow = -Infinity;
        let frameIndex = 0;

        const loop = (now: number) => {
          if (startNow === null) startNow = now;
          const { points: pts, startMs: start, durationMs: dur } = latest.current;
          const elapsed = Math.min(dur, (now - startNow) * speedMultiplier);
          setElapsedMs(elapsed);

          if (now - lastCaptureNow >= FRAME_INTERVAL_MS) {
            lastCaptureNow = now;

            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(canvas, 0, 0, width, height);
            if (showTelemetry) {
              const timeMs = start + elapsed;
              const index = findPointIndexByTime(pts, timeMs);
              drawHud(ctx, width, height, {
                speedKnots: computeGroundSpeed(pts, index).knots,
                altitudeFt: computeAltitudeFt(pts, index, timeMs),
                vsFpm: computeVerticalSpeedFpm(pts, index, timeMs),
                timeMs,
              });
            }

            const tMicros = (now - startNow) * 1000;
            recorder
              .addFrame(composite, tMicros, frameIndex % (FPS * 2) === 0)
              .catch((err) => {
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

      const finishRecording = async (recorder: Mp4Recorder) => {
        setStatus("encoding");
        try {
          const blob = await recorder.finish();
          recorder.dispose();
          recorderRef.current = null;

          const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
          const filename = `joseflys-replay-${stamp}.mp4`;
          downloadBlob(blob, filename);

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
    },
    [canvasRef, supported, status, setElapsedMs, setIsPlaying, cleanupLoop]
  );

  return { supported, status, progress, resultUrl, error, startRecording, reset };
}
