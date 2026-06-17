---
# joseflys-yic1
title: 'Replay: native ProRes export via local helper (joseflys-overlay-generator)'
status: todo
type: feature
priority: normal
tags:
    - replay
created_at: 2026-06-16T17:23:46Z
updated_at: 2026-06-17T15:15:26Z
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
