---
# joseflys-6kzf
title: 'Replay: record a time segment with live-seek dual-handle slider'
status: completed
type: feature
priority: normal
tags:
    - replay
created_at: 2026-06-17T18:20:16Z
updated_at: 2026-06-17T18:24:57Z
---

## Goal
In `/replay`, let the Record (MP4) modal export only a **segment** of the flight instead of the whole track, using the same dual-handle In/Out slider already used in the HUD export modal. While dragging either handle, the 3D view behind the modal must seek to that handle's moment so the user can preview what they're selecting — and as a side effect the background playback slider, telemetry, and circuit-phase highlighting all update (they already derive from `currentTimeMs`).

## Findings
- `RecordModal` currently records the whole flight `[0, durationMs]`; `useReplayRecorder.startRecording` hardcodes start→duration in both the `sharp` (frame-by-frame) and `fast` (realtime) loops.
- `HudExportModal` already has the dual-handle bar (two overlaid `range-dual` inputs over a track) with `rangeStartMs`/`rangeEndMs`, a "Full flight" reset and a UTC readout — but it does NOT live-seek the background.
- The globe behind the modal is driven by `currentTimeMs` (from `elapsedMs`) in `GpxReplayClient`. Calling `setElapsedMs(handleTime)` (via existing `handleSliderChange`, which also pauses) seeks the globe AND highlights circuit phases in `CircuitTimeline`/`FlightPhasesTable` automatically.

## Design
1. Extract the dual-handle bar into a shared `TimeRangeBar` component with an optional `onSeek(ms)` callback (fires while dragging with that handle's time).
2. Use it in both `HudExportModal` (no behavior change) and `RecordModal` (with `onSeek`).
3. Add `rangeStartMs`/`rangeEndMs` to `RecordOptions`; record only that window in both loops.
4. `RecordModal` gets `trackStartMs`, `durationMs`, `onSeek` props; wire `onSeek={handleSliderChange}` in `GpxReplayClient`.
5. Lighten the record-modal scrim so the background frame/phases stay visible while selecting.

## Acceptance criteria
- Record modal shows an In/Out slider defaulting to the full flight, with a "Full flight" reset and a UTC/clip-length readout.
- Dragging either handle seeks the 3D view behind the modal and highlights the corresponding circuit phase.
- Starting a recording produces an MP4 of only the selected window, in both Sharp and Fast quality.
- HUD export modal slider keeps working exactly as before.


## Implementation
- New shared `app/replay/components/TimeRangeBar.tsx`: dual-handle In/Out bar with optional `onSeek(ms)` (fires while dragging with that handle's time).
- `HudExportModal` refactored to use `TimeRangeBar` (no behavior change; still no live-seek).
- `RecordModal`: added Time-range section (TimeRangeBar + "Full flight" reset + UTC/clip readout), new props `trackStartMs`/`durationMs`/`onSeek`, passes `rangeStartMs`/`rangeEndMs` in `RecordOptions`. Scrim lightened to `bg-black/40` so the background frame/phases stay visible while selecting.
- `useReplayRecorder`: `RecordOptions` gained optional `rangeStartMs`/`rangeEndMs`; both the `sharp` and `fast` loops now record only `[rangeStart, rangeEnd]` (clamped to the track). Initial `setElapsedMs(rangeStart)`.
- `formatWindow` moved from HudExportModal into `formatTime.ts` (shared).
- `GpxReplayClient` wires `onSeek={handleSliderChange}` (which also pauses) so dragging a handle seeks the globe and, as a side effect, moves the background slider and highlights the matching circuit phase in `CircuitTimeline`/`FlightPhasesTable`.

## Verification
- `tsc --noEmit`: no new errors in touched files (pre-existing test/.next errors unrelated).
- `eslint` on all touched files: clean.
- `npm test __tests__/replayMetrics.test.ts`: 16/16 pass.
