---
# joseflys-yic1
title: 'Replay: native ProRes export via local helper (joseflys-overlay-generator)'
status: todo
type: feature
priority: normal
tags:
    - replay
created_at: 2026-06-16T17:23:46Z
updated_at: 2026-06-17T16:23:00Z
---

Hybrid native export: the browser renders the overlay frames (reusing the
existing PFD/HUD canvas code) and streams raw RGBA to a local CLI
(`npx joseflys-overlay-generator`) that pipes them into native ffmpeg, producing
a single transparent ProRes 4444 .mov — fast native encode + true alpha,
without reimplementing the renderer in Node.

CLI lives in its own repo: ~/Projects/oss/joseflys-overlay-generator.

Web side (this repo):
- New "Native (ProRes .mov)" path in the HUD export modal showing the npx command.
- Browser polls the helper's localhost /health, then renders + POSTs frames, then /finish.
- Reuse the same overlay render + time-range window as the MP4 export.
- Loopback HTTP from an HTTPS page is allowed by Chrome (127.0.0.1 is potentially
  trustworthy); document the Chrome requirement.


--------

## Implementation & verification (2026-06-17)

CLI helper repo created at ~/Projects/oss/joseflys-overlay-generator (own git
repo, MIT, plain ESM, Node 18+; smoke + e2e tests green). Protocol: GET /health,
POST /start {w,h,fps,frames}, POST /frame (raw RGBA, ordered awaited POSTs =
ordering + backpressure), POST /finish, POST /abort. Output path & codec come
only from CLI flags (no injection). Prefers system/--ffmpeg/JOSEFLYS_FFMPEG,
falls back to bundled ffmpeg-static. 60s idle-timeout safety.

Web side (this repo):
- `overlayFrame.ts`: extracted shared `drawOverlayFrame` + `overlayGeometry` +
  `overlayWindow`; refactored `useHudExport` to use them (MP4 path unchanged in
  behavior) so MP4 and native render pixel-identically.
- `useNativeOverlayExport.ts`: polls /health, renders each frame to a transparent
  canvas, getImageData → POST /frame (no Content-Type → CORS-simple, no
  per-frame preflight), then /finish. Pauses the Cesium render loop during
  export. Reuses the time-range window.
- `HudExportModal.tsx`: new "Output" selector (MP4 pair | Native ProRes); native
  footer shows the npx command (+copy), live helper status dot, port field, and
  "Export to ProRes"; native progress/done/error views.

Verified:
- CLI smoke (320×240) + e2e (spawns the bin) → finalized ProRes/alpha, exits 0.
- 1080p × 301-frame HTTP replay → ffprobe prores/yuva444p12le, 301 packets, 5.3s.
- Browser end-to-end (dev server): handshake detected the helper ("connected
  v0.1.0"), started a correct 301-frame job, streamed ~100 real 1080p frames
  that ffmpeg encoded (89MB), and the helper's idle-timeout fired cleanly. The
  chrome-devtools automation session dropped near frame 100 so the final UI
  "done" screen wasn't captured by automation — worth one manual confirm run.

Note: Chrome allows loopback HTTP from the HTTPS prod page (127.0.0.1 is
potentially-trustworthy); dev (http://localhost) has no mixed-content concern.


## Overlay motion / render-rate (2026-06-17)

The telemetry is logged at ~1 Hz and linearly interpolated, so rendering every
output frame mostly produces near-identical tweens. Added an "Overlay motion"
control decoupling the render rate from the output (camera-matched) rate:
- smooth  — render every frame (unchanged default).
- medium  — render ~half, duplicate the rest (≈2× faster, still fluid).
- stepped — render 1/s (the log's true cadence), hold each (much faster).

`overlayFrame.ts` `renderFpsFor(motion, fps)`. MP4 path re-renders only when the
content frame advances and feeds duplicate (cheap) frames to the encoders at the
output rate. Native path renders+sends only the unique frames and the helper's
ffmpeg duplicates to the output rate (`-framerate inputFps -i - … -r fps`); this
cuts both render AND transport. The burned-in clock stays correct: stepped's
1 Hz renders land exactly on whole seconds (== the clock's resolution).

Verified: CLI upsample test (30@15fps → 60@30fps duplicated) + main suite (483).


## Encode is the bottleneck → qtrle default (2026-06-17)

Profiled the native export: ffmpeg ProRes 4444 at 1080p encodes ~11 fps (random)
/ ~25 fps (HUD-like) — that's the wall, not transfer or request count. Batching
and gzip wouldn't help (ffmpeg encodes the same frames at the same speed).
QuickTime Animation (qtrle) encodes the same content at ~440-574 fps (~20× faster),
is lossless, alpha-capable and Resolve-native, and RLE keeps the transparent
overlay small.

- Helper: qtrle is the default; /start carries a `codec` chosen per job
  (validated against the known set — key lookup, no arg injection).
- Client: reverted the frame-batching experiment (request count was never the
  bottleneck; batching only added Blob-copy overhead) back to ordered
  frame-per-frame POSTs; removed the temp DEBUG_TIMING/DRY_RUN instrumentation.
- Modal: added a Codec selector (QuickTime RLE default / ProRes 4444) shown in
  native mode, with a note on the speed trade-off.

Remaining levers once encode is cheap: render (~6 min Smooth full-flight) →
Medium/Stepped; and 720p. Tests: helper codec test + main suite green.
