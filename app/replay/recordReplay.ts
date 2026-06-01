import { ArrayBufferTarget, Muxer } from "mp4-muxer";

/** Whether this browser can encode MP4/H.264 in-page via WebCodecs. */
export function isMp4RecordingSupported(): boolean {
  return typeof window !== "undefined" && "VideoEncoder" in window && "VideoFrame" in window;
}

// H.264 codec strings to probe, from most compatible upward. Higher levels are
// needed for larger (retina/fullscreen) canvases.
const CODEC_CANDIDATES = ["avc1.42E028", "avc1.4D0028", "avc1.640028", "avc1.640033"];

async function pickCodec(width: number, height: number, framerate: number): Promise<string | null> {
  for (const codec of CODEC_CANDIDATES) {
    try {
      const { supported } = await VideoEncoder.isConfigSupported({ codec, width, height, framerate });
      if (supported) return codec;
    } catch {
      // try next candidate
    }
  }
  return null;
}

/**
 * Wraps a `VideoEncoder` + mp4-muxer to turn a sequence of canvas frames into an
 * MP4 (H.264) blob. Dimensions are forced even (H.264 requirement).
 */
export class Mp4Recorder {
  readonly width: number;
  readonly height: number;
  private readonly framerate: number;
  private readonly frameDurationMicros: number;
  private encoder!: VideoEncoder;
  private muxer!: Muxer<ArrayBufferTarget>;
  private encodeError: Error | null = null;

  constructor(width: number, height: number, framerate: number) {
    this.width = width - (width % 2);
    this.height = height - (height % 2);
    this.framerate = framerate;
    this.frameDurationMicros = Math.round(1_000_000 / framerate);
  }

  /** Configures the encoder/muxer. Returns false when no usable codec is found. */
  async init(): Promise<boolean> {
    const codec = await pickCodec(this.width, this.height, this.framerate);
    if (!codec) return false;

    this.muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: "avc", width: this.width, height: this.height },
      fastStart: "in-memory",
    });

    this.encoder = new VideoEncoder({
      output: (chunk, meta) => this.muxer.addVideoChunk(chunk, meta),
      error: (err) => {
        this.encodeError = err instanceof Error ? err : new Error(String(err));
      },
    });

    const pixels = this.width * this.height;
    const bitrate = Math.round(Math.min(12_000_000, Math.max(2_500_000, pixels * this.framerate * 0.08)));
    this.encoder.configure({
      codec,
      width: this.width,
      height: this.height,
      framerate: this.framerate,
      bitrate,
      // Real-time capture: avoids B-frame reordering so chunks stay monotonic.
      latencyMode: "realtime",
    });
    return true;
  }

  /**
   * Encodes one frame from a canvas at the given presentation time (microseconds).
   * Applies light backpressure so the encode queue can't run away during capture.
   */
  async addFrame(source: HTMLCanvasElement, timestampMicros: number, keyFrame: boolean): Promise<void> {
    if (this.encodeError) throw this.encodeError;
    const frame = new VideoFrame(source, {
      timestamp: Math.max(0, Math.round(timestampMicros)),
      // mp4-muxer reads EncodedVideoChunk.duration (derived from the frame's
      // duration); without it the duration is null and the muxer throws.
      duration: this.frameDurationMicros,
    });
    try {
      this.encoder.encode(frame, { keyFrame });
    } finally {
      frame.close();
    }
    while (this.encoder.encodeQueueSize > 8) {
      await new Promise((r) => setTimeout(r, 4));
      if (this.encodeError) throw this.encodeError;
    }
  }

  /** Flushes the encoder, finalizes the container, and returns the MP4 blob. */
  async finish(): Promise<Blob> {
    await this.encoder.flush();
    if (this.encodeError) throw this.encodeError;
    this.muxer.finalize();
    const { buffer } = this.muxer.target;
    return new Blob([buffer], { type: "video/mp4" });
  }

  /** Best-effort teardown if recording is aborted before finishing. */
  dispose(): void {
    try {
      if (this.encoder && this.encoder.state !== "closed") this.encoder.close();
    } catch {
      // already closed
    }
  }
}

/** Triggers a browser download for a recorded blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
