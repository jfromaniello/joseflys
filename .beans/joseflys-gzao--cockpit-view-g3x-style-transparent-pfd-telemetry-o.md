---
# joseflys-gzao
title: 'Cockpit view: G3X-style transparent PFD telemetry overlay for CSV replays'
status: in-progress
type: feature
priority: normal
tags:
    - replay
created_at: 2026-06-10T14:17:16Z
updated_at: 2026-06-10T14:21:10Z
---

## Summary

When a replay is loaded from a Garmin CSV (avionics data available), the cockpit view should show a glass-cockpit-style telemetry overlay inspired by the Garmin G3X PFD — not an exact replica, but the same visual language: transparent instrument tapes and indicators layered over the out-the-window Cesium view.

Today the only HUD is `app/replay/components/TelemetryOverlay.tsx`, a small semi-transparent text box (top-right) with speed/altitude/VS/wind values. That works for the external views, but in cockpit mode it should be replaced (or complemented) by a proper PFD-style overlay.

## Goals

- Make cockpit replay feel like sitting behind a G3X: speed tape, altitude tape, heading indication, attitude cues.
- Everything semi-transparent so the terrain/scenery stays visible behind the instruments.
- Render only when avionics data exists (Garmin CSV); degrade gracefully for plain GPX (fall back to current simple overlay or GPS-derived values where sensible).

## Proposed elements

All values sampled/interpolated at `currentTimeMs` (see Data plumbing below).

1. **Airspeed tape (left edge)**
   - Vertical moving tape with tick marks and labels, current IAS in a center "lens" box.
   - Source: `iasKt` (fallback: `groundSpeedKt` with a "GS" label so we never lie about IAS).
   - Optional later: color bands (white/green/yellow arcs) — needs aircraft config, out of scope for v1.

2. **Altitude tape (right edge)**
   - Vertical moving tape, current altitude in center lens box (feet).
   - Source: GPS altitude (`ele`/`altFt` via existing altitude metric).
   - **VSI**: vertical speed indicator next to the altitude tape (small moving pointer/bar + numeric fpm), source `vsFpm` (fallback: derived VS from `replayMetrics`).

3. **Heading strip (bottom or top center)**
   - Horizontal moving compass tape with cardinal letters and 10° ticks, current heading in a center box.
   - Source: `headingMagDeg` (fallback: GPS track from `replayMetrics`).
   - Format heading values with `formatCourse()` from `lib/formatters.ts` (3-digit, e.g. "087°").

4. **Attitude cues (center)**
   - Since the camera already rolls/pitches with recorded attitude (cb24c82), a full artificial horizon may be redundant/duplicative. v1: a minimal center reference — fixed aircraft symbol (waterline) and optionally a subtle pitch ladder / horizon line.
   - Source: `pitchDeg`/`rollDeg` via `estimateAttitude()` (`app/replay/aircraftAttitude.ts:92`).
   - Decide during implementation whether the pitch ladder helps or clutters; it must be easy to toggle off.

5. **Auxiliary readouts (small, corner or under tapes)**
   - Wind vector (dir/speed) — reuse `formatWind()` from `lib/formatters.ts`.
   - OAT (`oatC`), GS, TAS, AGL (`aglFt`) if present.

## Visual / UX requirements

- **Transparency**: tapes use translucent dark backgrounds (e.g. ~35–50% opacity), white/green text, so scenery remains visible. Tabular numerals for all moving digits.
- Layout anchored to viewport edges, responsive; must not overlap existing playback controls.
- Only rendered when `viewMode === "cockpit"` (see `GpxReplayClient.tsx:~1075` and existing TelemetryOverlay mount at `GpxReplayClient.tsx:472-483`). In cockpit mode the existing TelemetryOverlay box should hide (replaced by this).
- A toggle to turn the PFD overlay on/off (some users will want a clean view); persist preference is nice-to-have.
- Must look correct in video export — overlay is HTML/CSS/SVG above the Cesium canvas, so confirm whether the export pipeline captures DOM or only the WebGL canvas (`preserveDrawingBuffer` at `GpxReplayGlobe.tsx:508`). If export captures canvas only, document the limitation in this bean's follow-up or composite the overlay during capture.
- Smoothness: values update per animation frame; tapes should move smoothly (interpolated samples already smooth via `sampleField()` in `cameraMath.ts:126`). Avoid React re-render-per-frame jank — prefer a rAF-driven imperative update (refs/CSS transforms) or render to a `<canvas>`; do NOT push `currentTimeMs` through React state at 60fps for this component.

## Data plumbing (already available)

- Parsed avionics fields on `ReplayPoint` (`app/replay/types.ts:16-47`): `iasKt`, `tasKt`, `groundSpeedKt`, `vsFpm`, `pitchDeg`, `rollDeg`, `headingMagDeg`, `windDirDeg`, `windSpeedKt`, `oatC`, `aglFt`.
- CSV column mapping: `app/replay/parseGarminCsv.ts:10-28`.
- Interpolated sampling: `sampleTelemetry()` (`app/replay/replayMetrics.ts:175`) + `sampleField()` (`app/replay/cameraMath.ts:126`). May need to extend `sampleTelemetry()` to also return pitch/roll/heading/vs/agl, or add a dedicated `samplePfdData()`.
- Attitude: `estimateAttitude()` (`app/replay/aircraftAttitude.ts:92`) — prefers recorded AHRS, falls back to GPS-derived.
- "Has avionics data" detection: presence of optional fields (e.g. `iasKt`/`pitchDeg` on any point); consider a precomputed `hasAvionics` flag in the client.

## Implementation sketch

- New component `app/replay/components/CockpitPfdOverlay.tsx` (plus small subcomponents: `SpeedTape`, `AltitudeTape`, `HeadingTape`, `Vsi`). SVG or canvas; SVG+CSS transforms is likely simplest for tapes.
- Mounted in `GpxReplayClient.tsx` next to TelemetryOverlay, gated on cockpit mode + hasAvionics + user toggle.
- Drive updates imperatively from the same clock that drives playback (subscribe to elapsed time via ref/callback rather than state) to keep 60fps.
- Use formatters from `lib/formatters.ts` per CLAUDE.md (`formatCourse`, `formatWind`); raw tape digits (rolling numbers) can be custom since no formatter covers them.

## Acceptance criteria

- [ ] Loading a Garmin CSV and switching to cockpit view shows speed tape (left), altitude tape + VSI (right), heading tape, all semi-transparent over the scenery.
- [ ] Values match the recorded data at the current playback time and animate smoothly during playback at 1x and higher speeds.
- [ ] Overlay hidden (or simple fallback) for plain GPX tracks with no avionics fields.
- [ ] Toggle to disable the PFD overlay works.
- [ ] No measurable playback frame-rate regression (no per-frame React re-render storms).
- [ ] Existing simple TelemetryOverlay still works in non-cockpit views.
- [ ] Headings formatted via `formatCourse()`; wind via `formatWind()`.
- [ ] Tests for any new sampling/formatting logic in `__tests__/` (Vitest).

## Out of scope (v1)

- Exact G3X replica, synthetic vision, HSI/CDI, autopilot annunciations.
- Speed tape color arcs (needs per-aircraft V-speeds config).
- Engine/EIS strip (no engine data in current CSV mapping).

## Implementation notes (2026-06-10)

Implemented and verified in-browser with the anonymized G3X fixture:

- `app/replay/components/CockpitPfdOverlay.tsx`: speed tape (left, IAS w/ GS fallback), altitude tape + VSI to its right, bank arc with rotating pointer + digital pitch (top center), compass rose with rotating card, lubber line, heading lens and magenta wind vector (bottom center), yellow waterline symbol, air-data block (bottom-left: GS/TAS/OAT/AGL) and two-column ENGINE block (bottom-right).
- Tape tick math extracted to `app/replay/pfdMath.ts` (unit-tested).
- `sampleMagneticHeadingDeg()` extracted from `recordedHeadingRad()` (circular interpolation + AHRS back-fill); `sampleTelemetry()` extended with recorded `vsFpm`/`aglFt`.
- Engine (EIS) fields parsed from Garmin CSV (`RPM`, `Manifold Press`, `Fuel Flow`, `Fuel Press`, `Oil Press/Temp`, `Coolant Temp`, `Volts`, `Alt Amps`, hottest `EGT1-6`/`CHT1-6`) into `ReplayPoint`, sampled via `sampleEngine()`.
- "Flight instruments" toggle in playback settings (cockpit only), persisted as `gpxReplay.showPfd`; simple `TelemetryOverlay` returns when off or for plain GPX.
- Recenter button hidden in cockpit unless head-tracking is active (it only re-zeros head-tracking offsets there).

Deferred / follow-ups:
- Video export captures only the WebGL canvas (`preserveDrawingBuffer`), so the DOM overlay does not appear in recorded MP4s — compositing the PFD into the capture is a separate task.
- Speed-tape color arcs (needs per-aircraft V-speeds), HSI/CDI, synthetic vision remain out of scope.

## Iteration 2 (2026-06-10, user feedback)

- Wind vector convention clarified: the magenta arrow now *arrives at the center dot from* the rose bearing the wind blows FROM, so its tail sits on the card mark matching the "104°/6" readout.
- Slip/skid indicator: parsed `Lateral Acceleration (G)` (`latAccG`); a yellow brick under the roll pointer slides toward the lateral acceleration (full deflection at 0.2 G), G3X-style.
- Cockpit camera now uses the recorded pitch (`computeCockpitPose` takes `basePitchRad`, falling back to the old fixed -2° for plain GPX) — heading and roll already did.
- Engine readouts replaced with a G3X-style vertical EIS strip on the far left (`EngineStrip.tsx`): round RPM / manifold gauges with green band + needle, bar gauges (fuel flow/pressure, oil, coolant, EGT/CHT) and a bus voltage row. Gauge scales derive from the track's own operating range (`computeEngineRanges`) since logs carry no aircraft limits. Speed tape shifts inward when the strip is present; strip hidden below `md`.
