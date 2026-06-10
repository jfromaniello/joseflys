---
# joseflys-l12t
title: 'Replay recording: user-selectable aspect ratio (16:9 / 9:16) and standard output resolutions'
status: completed
type: feature
priority: normal
tags:
    - replay
created_at: 2026-06-10T16:08:47Z
updated_at: 2026-06-10T17:05:29Z
---

## Problem

The recorded MP4's resolution and aspect ratio are whatever the live globe canvas happens to be. In `useReplayRecorder.ts` the composite target is sized from `canvas.width/height` — the Cesium WebGL canvas backing store, which is container CSS size × `devicePixelRatio`. So the output depends on the user's window size, fullscreen state, and display DPI:

- Two users recording the same flight get different resolutions/aspect ratios.
- A retina laptop produces a huge, oddly-sized video (e.g. 2940×1592); a small window produces a tiny one.
- No way to produce a vertical video for social media without resizing the browser window.

## Goal

Let the user pick the output format in the record modal (`RecordModal.tsx`):

- **Aspect ratio**: 16:9 (landscape) or 9:16 (vertical/social).
- **Resolution**: standard presets per aspect, e.g. 1920×1080 / 1280×720 for 16:9, and 1080×1920 / 720×1280 for 9:16.
- Optionally keep a "Match screen" option that preserves today's behavior.

The encoder side already adapts: `Mp4Recorder` forces even dimensions and scales bitrate from pixel count, and `pickCodec()` probes H.264 levels per size — those should work as-is for the presets.

## Implementation notes

- `RecordModal.tsx`: add aspect/resolution selectors; extend `RecordOptions` with the chosen output size.
- `useReplayRecorder.ts`: size the composite canvas to the chosen output instead of `canvas.width/height`.
- **Framing decision (key design question)**: the live globe renders at the screen's aspect. If the chosen aspect differs, either
  1. center-crop / scale the captured frame (simple, but the on-screen framing won't match the output, bad for 9:16), or
  2. resize the Cesium viewer container to the target aspect/size for the duration of the capture (`viewer.resize()` exists; `CaptureControl.begin()/end()` in `GpxReplayGlobe.tsx` is the natural place), so the camera genuinely frames the scene at the output aspect. Option 2 gives correct framing and true output resolution; needs restore-on-end and works for both "fast" and "sharp" paths.
- PFD/HUD overlay: the PFD scene is laid out in CSS pixels with a `pfdScale` derived from the live canvas; it must instead be laid out against the chosen output dimensions so gauges are sized correctly in the video (especially for 9:16).
- The result preview in the modal and `shareReplay.ts` should be checked for assumptions about the video's aspect.

## Acceptance criteria

- Record modal offers 16:9 and 9:16 with standard resolution presets; selection persists (see `useReplayPreferences.ts`).
- Output MP4 has exactly the selected dimensions regardless of window size, fullscreen, or devicePixelRatio.
- PFD overlay and telemetry HUD render correctly proportioned at every preset, in both Fast and Sharp quality modes.
- 9:16 output frames the aircraft sensibly (not a stretched or off-center crop of the landscape view).


---

## Implementation notes (done)

- `types.ts`: `RecordAspect` ("16:9" / "9:16" / "screen"), `RecordResolution` ("1080p" / "720p"), guards, and `recordOutputSize()`.
- `GpxReplayGlobe.tsx`: `CaptureControl.setRecordingSize(size | null)` — letterboxes the container to the target aspect (centered, `inset:0; margin:auto`) and sets `viewer.resolutionScale` so the WebGL backing store hits the exact output pixels regardless of devicePixelRatio; restores styles + scale on release.
- `useReplayRecorder.ts`: composite canvas sized from the preset; PFD laid out at a fixed logical width (1280 for 16:9, 420 for 9:16) so framing is identical on every machine; viewport released on every terminal path (finish, error, abort, reset, unmount).
- `useReplayPreferences.ts`: `usePersistedRecordAspect` / `usePersistedRecordResolution` (localStorage).
- `RecordModal.tsx`: Format section (aspect + resolution segmented controls with output-size hint); result preview constrained for vertical videos.

Verified in Chrome against the G3X sample track: 9:16 720p → exact 720×1280 MP4 with HUD; 16:9 1080p sharp + cockpit PFD → exact 1920×1080 with the full PFD framed correctly; live viewport restored after each recording; preferences persist across modal reopens; no console errors.
