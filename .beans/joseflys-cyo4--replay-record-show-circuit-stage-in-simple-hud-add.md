---
# joseflys-cyo4
title: 'Replay record: show circuit stage in simple HUD + add Altitude wall toggle'
status: completed
type: bug
priority: normal
tags:
    - replay
created_at: 2026-06-17T18:52:19Z
updated_at: 2026-06-17T18:52:19Z
---

Two record-modal gaps reported by the user:

1. The simple HUD burned into a recording didn't show the circuit leg
   (Downwind/Base/Final), even though the live telemetry overlay does.
   - drawHud's HudFrame had no stage field, and the recorder didn't have the
     circuit analysis to compute it.
   - Fix: extract circuitStageLabel(flight, timeMs) in analysis.ts (shared by
     the live currentStage and the recorder), add optional `stage` to HudFrame,
     draw a "STAGE" row when present, and pass `flight` into useReplayRecorder
     so composeFrame labels each frame. overlayFrame stays unchanged (stage is
     optional).

2. The record modal had no way to turn off the altitude wall (only Telemetry
   HUD and Track line toggles).
   - Fix: add an "Altitude wall" toggle wired to showWall/onShowWallChange
     (same state ReplayControls uses), so it affects the recorded 3D view.

Verification: tsc/eslint clean; replayMetrics 16/16.
