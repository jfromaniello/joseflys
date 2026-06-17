---
# joseflys-15et
title: 'Replay: approximate glass-cockpit PFD for plain GPX tracks'
status: completed
type: feature
priority: normal
tags:
    - replay
created_at: 2026-06-17T18:34:13Z
updated_at: 2026-06-17T18:34:13Z
---

## Goal
Make the "nice" glass-cockpit PFD overlay available for plain GPX tracks (no Garmin avionics), both in the live cockpit view and the HUD overlay export, using GPS-derived data (altitude, ground speed, vertical speed, track).

## Findings
- `buildPfdScene` already degrades gracefully: each instrument shows "--" or hides when its data is null. For a GPX track we already derive altitude (tape), ground speed (speed tape, labelled "GS"), vertical speed (VSI), and magnetic track (compass rose); waterline is fixed. Bank arc / EIS engine strip / wind vector / aux block self-hide.
- The only thing blocking it was `hasRichTelemetry(points)` (requires iasKt/tasKt/windSpeedKt), wired into 3 gates: `pfdActive` (live overlay), `ReplayControls` PFD toggle, and `HudExportModal` "Glass cockpit" button.

## Change
- Replaced the avionics gate with `pfdAvailable = points.length >= 2` (any replayable track) in `GpxReplayClient`, feeding all three gates. Removed the now-unused `hasRichTelemetry` import (the util itself stays).
- No faked attitude: roll/pitch stay null for GPX (showing a synthetic horizon would be misleading on a PFD).
- `showPfd` defaults to true, so GPX in cockpit view now shows the glass cockpit by default, with the existing toggle to fall back to the simple HUD. HUD export defaults the overlay to "pfd".

## Verification
- tsc/eslint clean; replayMetrics tests 16/16 (hasRichTelemetry unit tests unchanged).
