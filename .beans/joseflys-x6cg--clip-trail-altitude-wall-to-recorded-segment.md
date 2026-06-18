---
# joseflys-x6cg
title: Clip trail + altitude wall to recorded segment
status: completed
type: bug
priority: normal
tags:
    - replay
created_at: 2026-06-18T12:26:44Z
updated_at: 2026-06-18T12:26:48Z
---

When recording a sub-segment in /replay, the cyan track polyline and the
altitude wall rendered from point 0 of the flight — so the video showed the
whole path flown *before* the segment started, not just the recorded window.

## Fix
- GpxReplayGlobe: `positionAircraftAtTime` now honors a `trailStartTimeMsRef`.
  When set, the base path begins at an interpolated vertex at that time and the
  first whole point strictly after it (`baseStartIndex`), instead of index 0.
  A `trailBaseStartRef` detects lower-bound changes to force an incremental
  rebuild. Refactored head/start altitude into a shared `altAndFloorAt` helper
  so the polyline and wall floors stay in sync.
- CaptureControl gains `setTrailStartTime(timeMs | null)`.
- useReplayRecorder sets the clip to `trackStart + rangeStart` at recording
  start (null when starting at the flight top) and clears it on finish, reset,
  and the sharp/fast error paths. Works for both Sharp and Fast capture.

Live preview (dragging the modal handles) still shows the full trail — only the
recorded output is clipped.

## Acceptance
- Record a segment that starts mid-flight: video trail/wall begin at the segment
  start, grow to the end. Full-flight recording unchanged.
