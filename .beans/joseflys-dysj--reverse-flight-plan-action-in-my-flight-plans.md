---
# joseflys-dysj
title: Reverse flight plan action in My Flight Plans
status: completed
type: feature
priority: normal
tags:
    - flight-plans
created_at: 2026-06-25T23:20:20Z
updated_at: 2026-06-26T10:43:16Z
---

Add a "Create reverse flight plan" action button to each plan row in the My Flight Plans list page.

Requirements (from user):
- Origin becomes destination and vice versa.
- All legs reversed: reversed leg order, reversed waypoints (checkpoints), swapped from/to, reversed true course.
- No alternate: drop FlightPlan.alternate and drop alternative legs (those detected by detectAlternativeLegs).
- Wind, TAS, fuel flow, magnetic variation kept EXACT (not recomputed/swapped).
- Climb/descent: swap climb<->descent per leg so the new departure climbs and the new arrival descends (DECISION confirmed with user).
- After creation: navigate to /flight-plans/{newId} detail page (DECISION confirmed).

Design:
- New pure helper reverseFlightPlan(plan): FlightPlan in lib/flightPlan (e.g. flightPlanReverse.ts), unit-testable.
- Reverse only non-alternative legs.
- Per reversed leg: swap from/to, reverse checkpoints, th = (th+180)%360, swap climb*<->descent*, keep wind/tas/ff/var/md/plane/unit/fuelUnit. Recompute index, and cumulative fields (prevFuel, elapsedMin, elapsedDist) for the new order. Drop additionalFuel/approachLandingFuel from where they no longer apply / recompute via existing recalc.
- Name: "<name> (reverse)". departure/destination swapped at plan level; alternate cleared.
- Persist new plan via createFlightPlan + addOrUpdateLeg (which recalculates cumulative legs).
- Add button in FlightPlansClient.tsx actions row with cursor-pointer + an appropriate heroicon.
- Tests in __tests__/.


## Implementation (completed)

- New pure helper `lib/flightPlan/flightPlanReverse.ts`:
  - `buildReversedLegData(plan)` — drops alternative legs (detectAlternativeLegs), reverses leg order, swaps from/to, reverses checkpoints, reverses true course (th+180 mod 360), swaps climb<->descent per leg (values preserved, phase reassigned), keeps wind/tas/ff/var/md/fuelUnit/plane/unit exact, regenerates desc as "to.name to from.name", moves destination reserve fuel (additionalFuel + approachLandingFuel) onto the new arrival leg, recomputes cumulative fields (prevFuel/elapsedMin/elapsedDist) for the new order.
  - `createReverseFlightPlan(plan)` — persists via createFlightPlan ("<name> (reverse)", swapped departure/destination derived from reversed legs, no alternate) + addOrUpdateLeg per leg. Returns the new plan or null if no reversible legs.
- Exported from `lib/flightPlan/index.ts`.
- UI: `app/flight-plans/FlightPlansClient.tsx` — added amber ArrowsRightLeftIcon button (cursor-pointer, shown only when plan.legs.length > 0) in the actions row; handler creates the reverse plan and routes to `/flight-plans/{newId}`.
- Tests: `__tests__/flightPlanReverse.test.ts` (10 tests, all passing).

## Verification
- `npx vitest run __tests__/flightPlanReverse.test.ts` → 10 passed.
- `npx tsc --noEmit` → no errors in changed files (remaining errors are pre-existing in other test files + .next generated types).
- eslint on changed files → clean.
