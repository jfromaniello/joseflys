"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PFD_LAYOUT_WIDTH,
  recordOutputSize,
  type HudExportFps,
  type RecordResolution,
  type ReplayPoint,
} from "./types";
import {
  computeAltitudeFt,
  computeGroundSpeed,
  computeTrackHeadingDeg,
  computeVerticalSpeedFpm,
  findPointIndexByTime,
  type EngineRanges,
} from "./replayMetrics";
import { drawClockAndWatermark, drawHud } from "./recordHud";
import { buildPfdScene, samplePfdData } from "./pfdScene";
import { drawPfdScene } from "./pfdCanvas";
import { Mp4Recorder, downloadBlob, isMp4RecordingSupported } from "./recordReplay";

export type HudExportStatus = "idle" | "exporting" | "encoding" | "done" | "error";

/** Which overlay to render: the glass-cockpit PFD or the simple telemetry HUD. */
export type HudOverlayKind = "pfd" | "hud";

/** Options chosen in the HUD export modal before starting. */
export interface HudExportOptions {
  overlay: HudOverlayKind;
  /** Output frame rate — should match the camera footage being composited. */
  fps: HudExportFps;
  /** Fixed output aspect ("screen" makes no sense without a live canvas). */
  aspect: "16:9" | "9:16";
  resolution: RecordResolution;
}

interface UseHudExportParams {
  points: ReplayPoint[];
  startMs: number;
  durationMs: number;
  /** Gauge scales for the PFD's EIS strip, derived from the track. */
  engineRanges: EngineRanges;
}

interface UseHudExportResult {
  supported: boolean;
  status: HudExportStatus;
  /** Progress in [0, 1] while exporting. */
  progress: number;
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
}: UseHudExportParams): UseHudExportResult {
  const [supported] = useState(isMp4RecordingSupported);
  const [status, setStatus] = useState<HudExportStatus>("idle");
  const [progress, setProgress] = useState(0);
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
    setStatus("idle");
  }, [disposeRecorders, revokeUrls]);

  const startExport = useCallback(
    ({ overlay, fps, aspect, resolution }: HudExportOptions) => {
      const { durationMs: duration } = latest.current;
      if (!supported || duration <= 0 || status === "exporting" || status === "encoding") {
        return;
      }

      const output = recordOutputSize(aspect, resolution);
      if (!output) return; // unreachable: aspect excludes "screen"
      const { width, height } = output;

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

      // The PFD scene is laid out in CSS pixels at a standard logical width
      // (same framing as fixed-preset video recordings), then scaled onto the
      // output pixels.
      const cssWidth = PFD_LAYOUT_WIDTH[aspect];
      const pfdScale = width / cssWidth;
      const cssHeight = height / pfdScale;

      // Draws the overlay for a given absolute time onto the transparent
      // scratch canvas, then derives the fill and matte frames from it.
      const composeFrame = (timeMs: number) => {
        const { points: pts, engineRanges: ranges } = latest.current;

        scratchCtx.clearRect(0, 0, width, height);
        if (overlay === "pfd") {
          drawPfdScene(scratchCtx, buildPfdScene(cssWidth, cssHeight, samplePfdData(pts, timeMs), ranges), pfdScale);
          drawClockAndWatermark(scratchCtx, width, height, timeMs);
        } else {
          const index = findPointIndexByTime(pts, timeMs);
          drawHud(scratchCtx, width, height, {
            speedKnots: computeGroundSpeed(pts, index).knots,
            altitudeFt: computeAltitudeFt(pts, index, timeMs),
            vsFpm: computeVerticalSpeedFpm(pts, index, timeMs),
            trackDeg: computeTrackHeadingDeg(pts, timeMs),
            timeMs,
          });
        }

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
      setFillUrl(null);
      setMatteUrl(null);
      setStatus("exporting");

      void (async () => {
        const fillRecorder = new Mp4Recorder(width, height, fps);
        const matteRecorder = new Mp4Recorder(width, height, fps);
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
        // i / fps seconds of flight time, so N minutes of track produce N
        // minutes of video that line up with the camera's clock.
        const frameIntervalMs = 1000 / fps;
        const frameDurMicros = Math.round(1_000_000 / fps);
        const { startMs: start, durationMs: dur } = latest.current;
        const totalFrames = Math.max(2, Math.floor(dur / frameIntervalMs) + 1);

        try {
          for (let i = 0; i < totalFrames; i += 1) {
            if (abortRef.current) return;
            composeFrame(start + i * frameIntervalMs);
            const keyFrame = i % (fps * 2) === 0;
            await fillRecorder.addFrame(fill, i * frameDurMicros, keyFrame);
            await matteRecorder.addFrame(matte, i * frameDurMicros, keyFrame);
            // Yield periodically so progress paints and the page stays alive.
            if (i % 32 === 0) {
              setProgress(i / totalFrames);
              await new Promise((r) => setTimeout(r, 0));
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
      })();
    },
    [supported, status, disposeRecorders]
  );

  return { supported, status, progress, fillUrl, matteUrl, fillName, matteName, error, startExport, reset };
}
