---
# joseflys-725y
title: 'Replay: HUD-only transparent export (fill + matte) for compositing over real footage'
status: todo
type: feature
priority: normal
tags:
    - replay
created_at: 2026-06-11T15:38:16Z
updated_at: 2026-06-11T15:40:28Z
---

## Goal

Export the telemetry overlay (glass-cockpit PFD or simple HUD) WITHOUT the 3D map, with transparency, so users can composite it over real flight footage in DaVinci Resolve / Premiere / AE.

## Key constraint (verified empirically 2026-06-11)

Browser encoders cannot produce alpha video: `VideoEncoder.isConfigSupported({alpha: "keep"})` returns `supported: false` for VP8, VP9, AV1 and HEVC in Chrome. True transparent WebM/MOV is off the table in-browser.

**Solution: standard fill + matte pair** — two frame-synchronized H.264 MP4s:
- `*-fill.mp4`: HUD/PFD rendered over pure black.
- `*-matte.mp4`: white-on-black alpha silhouette (draw same scene, then `globalCompositeOperation: "source-in"` white fill — GPU, no pixel loops), flattened over black.

DaVinci combines them natively (external matte in Color page, or Channel Booleans in Fusion).

## Why this is fast

No Cesium at all: no globe canvas, no camera, no tile waiting. Each frame is `buildPfdScene()` + `drawPfdScene()` (or `drawHud()`) on a 2D canvas from track data alone. The loop is fully offline — decoupled from wall clock and rAF — limited only by encoder throughput (~200–500 fps hw H.264 at 1080p). A 1-hour flight at 30 fps (~108k frames) ≈ 5–10 min export instead of 60 min real-time.

## Design decisions

- **Playback speed locked to 1x**: the overlay must be 1:1 with CSV timestamps to sync with real footage.
- **Selectable FPS** (24 / 25 / 30 / 60) to match the user's camera, instead of the fixed 30.
- **Burn the UTC clock** into the overlay (drawHud already has it; add to PFD scene if absent) as the sync reference against real footage.
- Reuse the aspect/resolution presets from joseflys-l12t (16:9 / 9:16, 1080p / 720p).
- Reuse `Mp4Recorder` as-is, two instances fed the same frame timestamps; existing backpressure loop applies.
- UI: new option in RecordModal (e.g. mode "3D video" vs "HUD overlay only") — HUD mode hides camera/quality/speed controls, shows FPS; downloads two files (suffix `-fill` / `-matte`) and explains the matte workflow in a hint.
- Works even before/without the 3D viewer being ready (pure data render).

## Future ideas (out of scope)

- PNG sequence export (true RGBA, lossless) for short clips.
- Time-range selection to export only a segment of the flight.
- Probe `alpha: "keep"` at runtime and emit real alpha WebM if browsers ever support it.

## Acceptance criteria

- Exported pair is frame-exact synchronized; compositing fill+matte in Resolve reproduces the on-screen overlay incl. translucent panels.
- N minutes of track time → exactly N minutes of video at the chosen FPS.
- Export runs several× faster than real time and shows progress.
- Output dimensions follow the chosen preset exactly.


---

## ProRes 4444 research (2026-06-11)

User confirmed ProRes 4444 .mov + alpha is the ideal Resolve format. Findings:

- **ffmpeg.wasm CAN encode it** (`prores_ks -profile:v 4444 -pix_fmt yuva444p10le -alpha_bits 16`), but: ~330 Mbps ≈ 2.4 GB/min at 1080p30; MEMFS (RAM) caps output at ~2–4 GB → only 1–2 min clips; single-threaded without COOP/COEP headers; past alpha-glitch bug (ffmpegwasm#693) fixed in newer FFmpeg builds — pin & test in Resolve.
- **Cheaper single-file alpha .mov in browser**: QuickTime Animation (`qtrle`) or PNG-codec MOV via ffmpeg.wasm — alpha-capable, Resolve-native, RLE compresses flat mostly-transparent HUD frames far better than ProRes, trivial CPU. Best in-browser option for a self-contained alpha file (multi-minute clips feasible).
- **Mediabunny**: muxes .mov and transparent WebM but encodes via WebCodecs → no alpha, no ProRes; Resolve doesn't read WebM. Not applicable.
- **Recommended hybrid**: ship fill+matte (fast, unlimited duration); show in the UI the local one-liner for users who want a single ProRes file at native speed:
  `ffmpeg -i hud-fill.mp4 -i hud-matte.mp4 -filter_complex alphamerge -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le -alpha_bits 16 hud.mov`
- Phase 2 (optional): in-browser `qtrle` .mov export for short clips via ffmpeg.wasm (lazy-loaded), gated by a time-range selector.
