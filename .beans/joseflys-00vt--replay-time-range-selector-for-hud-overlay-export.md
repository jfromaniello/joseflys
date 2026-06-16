---
# joseflys-00vt
title: 'Replay: time-range selector for HUD overlay export'
status: completed
type: feature
priority: normal
tags:
    - replay
created_at: 2026-06-16T11:07:03Z
updated_at: 2026-06-16T11:14:52Z
---

Follow-up to joseflys-725y / joseflys-gnjd.

Let the user export only a sub-range of the flight in the HUD overlay export
(fill+matte), instead of always the whole track. This is the highest-impact
speed lever: real footage to composite rarely spans the whole flight, and
export time is proportional to the exported window.

Requirements:
- In/out range (start + end) chosen in the HUD export modal, default = full flight.
- Burned-in UTC clock must stay correct for the chosen window (sync reference).
- Output duration = exactly the selected window at the chosen FPS.
- Show selected window duration + absolute UTC start/end in the modal.


--------

## Implementation & verification (2026-06-16)

- `useHudExport.ts`: `HudExportOptions` gained `rangeStartMs`/`rangeEndMs` (elapsed ms from track start). The loop clamps the window into the track (min one frame), sets `totalFrames` from the window, composes at `windowStartAbsMs + i*frameIntervalMs` (absolute UTC, so the burned-in clock stays correct), and emits encoder timestamps from 0 (clip starts at 0, runs the window length). Full range reproduces the prior whole-flight behavior exactly.
- `HudExportModal.tsx`: new "Time range" section — visual band over the full flight + In/Out range sliders (1s step, ≥1s window, no crossover), readout "{fromUTC} – {toUTC} UTC · {window} clip", and a "Full flight" reset. New props `trackStartMs`, `durationMs`.
- `GpxReplayClient.tsx`: passes `trackStartMs`/`durationMs` from the timeline.

Verified in browser with the 20s sample fixture, In=5s/Out=15s: output clip = 10.033s / 301 frames @ 30fps (exactly the window), and frame 0's burned-in clock reads 20:02:26 = track start 20:02:21 + 5s window offset. Title + watermark still rendered. tsc/eslint clean on touched files, 483 tests pass.
