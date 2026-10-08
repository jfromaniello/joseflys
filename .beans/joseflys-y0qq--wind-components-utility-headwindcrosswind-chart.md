---
# joseflys-y0qq
title: Wind Components utility (headwind/crosswind chart, heading or runway)
status: completed
type: feature
priority: normal
tags:
    - utilities
created_at: 2026-10-08T23:34:10Z
updated_at: 2026-10-08T23:53:52Z
---

New utility page `/wind-components` to solve headwind/crosswind problems (e.g. exam: "wind 085° at 30 kt, landing runway 11 → components?").

Design:
- Two input modes: Runway + wind (runway "11"/"29L" or heading "110", wind dir, wind speed) and Angle + speed (angle between wind and runway, as in the classic chart example).
- Math reuses `calculateWindComponents` from lib/runwayUtils.ts; new lib/windComponents.ts adds runway parsing and a result helper (headwind/tailwind, crosswind side L/R, relative angle).
- Crosswind component chart (like the FAA/ANAC chart): radial angle lines every 10°, wind speed arcs every 10 kt, plotted point with dashed projections to both axes. Extends to a half-circle for tailwind. Rendered as SVG so arcs stay circular at any width.
- URL sync + share, manual calculation explanation (sin/cos + clock rule of thumb).
- Registered in Navbar utilities, home page, sitemap, robots.

Acceptance:
- Runway 11, wind 085/30 → headwind ≈ 27 kt, crosswind ≈ 13 kt from the left.
- 30° / 40 kt → headwind ≈ 35, crosswind 20 (chart example).
- Tests in __tests__/windComponents.test.ts.


## Implementation notes
- `lib/windComponents.ts`: `parseRunwayHeading`, `getRunwayWindComponents`, `getAngleWindComponents` (reuse `calculateWindComponents`).
- `app/wind-components/`: page + client + SVG `WindComponentsChart` (quarter circle; half circle with tailwind axis when angle > 90°).
- URL params: `m=a` (angle mode), `rwy`, `wd`, `ws`, `ang`, `explain`.
- Registered in Navbar (Utilities), PageLayout, home page, sitemap, robots.

## Verification
- 9 new tests pass; full suite 527/527; lint + tsc clean.
- Browser-checked: RWY 11, 085/30 → HW 27.2, XW 12.7 from the left (exam answer c). Angle mode 130°/25 kt → tailwind chart layout, desktop and 390px mobile.


## Follow-up: generic reference (heading, not only runway)
- Reference is now a Heading (in-flight use) with an HDG/RWY toggle inside the input; RWY parses designators 01-36 (11 → 110°). Toggling converts the value.
- Modes renamed: "Heading + Wind" and "Relative Angle" (wind angle off the nose).
- Lib API: `parseRunwayDesignator`, `getHeadingWindComponents`, `getRelativeWindComponents`.
- URL: `hdg` or `rwy`, `wd`, `ws`, `m=a` + `ang`.
- Labels/notes generalized (runway-specific tailwind hint only in RWY mode; note covers winds aloft = true).


## Follow-up: interactive chart
- Chart takes `onChange({ headwind, crosswind })`. Drag the wind point (or click anywhere) to move it freely; drag the headwind/tailwind marker or the crosswind marker to change one component and keep the other.
- Pointer events + `setPointerCapture`, `touch-action: none` so it works on touch; chart range frozen during a drag so the scale doesn't jump; wind clamped to the outer arc; live value labels while dragging.
- Client converts back to whole kt / degrees: relative mode sets the angle; heading mode sets the wind direction = heading ± angle, keeping the side the wind came from (remembered when crossing 0°/180°).
- Verified in browser with synthetic pointer drags: point → 28 kt @ 45° (wd 065 on RWY 11), crosswind marker keeps headwind, headwind marker dragged into tailwind (wd 335, 135°), click-to-place.

- Fix: dragging the crosswind marker made the headwind marker drift (and vice versa). Cause: the client rounded speed/angle to whole numbers, and each move re-read the already-drifted component as the "fixed" one, accumulating error. Now the fixed component is captured at drag start, and drag results round to 0.1 kt / 0.1°. Verified: 60 back-and-forth moves of the crosswind marker keep the headwind within 27.1-27.2 kt.
