---
# joseflys-gnjd
title: 'Replay: flight title + watermark toggle in HUD overlay export'
status: completed
type: feature
priority: normal
tags:
    - replay
created_at: 2026-06-11T16:36:48Z
updated_at: 2026-06-12T19:53:12Z
---

Follow-up to joseflys-725y.

1. Burn a flight title into the exported overlay, top-right:
   - Default: aircraft registration (from CSV) + flight date/time (UTC) + departure aerodrome code.
   - Editable in the HUD export modal.
   - Can be disabled (toggle, default ON).
2. Watermark "joseflys.com" can be disabled (toggle, default ON).

Departure aerodrome = circuit-analysis aerodrome nearest to the first track point (capped at ~5 km).
In simple-HUD mode the telemetry panel shifts down to make room for the title.


--------

## Implementation & verification (2026-06-12)

- `recordHud.ts`: new `drawTitle()` (top-right, right-aligned, auto-shrinks past 60% of frame width); `drawHud()` takes `HudDecorations { title, watermark }`; `drawClockAndWatermark()` gained a `watermark` flag. Simple-HUD telemetry panel shifts down ~34px (scaled) when a title is present.
- `useHudExport.ts`: `HudExportOptions` gained `title: string | null` and `watermark: boolean`; PFD mode draws the title + clock onto the scratch canvas so both fill and matte carry them.
- `HudExportModal.tsx`: "Flight title" toggle (default ON) with editable input prefilled from `defaultTitle`, plus "joseflys.com watermark" toggle (default ON).
- `GpxReplayClient.tsx`: `defaultHudTitle` = ident · start UTC · departure aerodrome code; departure = circuit-analysis aerodrome nearest the first track point within 5 km.

Verified in browser with a real 48-min G3X log: default title "LV X7030 · 2026-06-05 20:46Z · AGR"; frame at +20 min shows the title top-right, clock 21:06:42 exact, watermark bottom-right. Note: Garmin's factory placeholder ident "SAMPLE" is filtered by the parser (pre-existing, intentional), so the test fixture shows date-only titles.
