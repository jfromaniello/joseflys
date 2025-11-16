# Claude Development Guidelines

## Formatting Functions

**CRITICAL**: Always use formatters from `/lib/formatters.ts`. Never implement inline.

### Available Formatters

- `formatCourse(course)` → "090°", "270°", "005°"
- `formatWCA(wca)` → "5°E", "10°W", "0°"
- `formatDeviation(deviation)` → "5°E", "10°W", "0°"
- `formatWind(dir, speed, compact?)` → "270°/15" or "270° at 15 KT"
- `formatFuel(fuel, unit)` → "25.5 GAL"
- `formatDistance(distance)` → "123.5"
- `formatAngle(angle, decimals?)` → "10.5°E", "8.2°W"

```tsx
// ✅ Correct
import { formatCourse } from "@/lib/formatters";
<p>{formatCourse(results.magneticHeading)}</p>

// ❌ Wrong
<p>{`${String(Math.round(results.magneticHeading)).padStart(3, '0')}°`}</p>
```

---

## Magnetic Angles and Sign Conventions

### WMM Convention (Internal)
- **Positive (+)**: East of true north
- **Negative (-)**: West of true north

### Project Standards
1. **Internal**: Use WMM signs (positive=East, negative=West)
2. **Display**: Use `formatAngle()` for E/W format
3. **Calculations**: Always `trueHeading = magneticHeading - declination`

```tsx
// WMM returns +10 for 10°E, -10 for 10°W
const declination = magvar(lat, lon, 0);
const trueHeading = magneticHeading - declination;
// Example: 090° - (+10°) = 080°

// Display
formatAngle(declination); // "10.0°E"
```

**Common Mistake:**
```tsx
// ❌ Wrong
const direction = angle > 0 ? 'W' : 'E';

// ✅ Correct
const direction = angle > 0 ? 'E' : 'W';
```

## Button Cursor Styling

**CRITICAL**: All interactive elements MUST have `cursor-pointer`.

```tsx
// ✅ Correct
<button onClick={handleClick} className="... cursor-pointer">

// ❌ Wrong - missing cursor-pointer
<button onClick={handleClick} className="...">
```

Note: `<Link>` components auto-include pointer cursor.

## Grid Layout System for Input Components

**Standard Grid**: `grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem] gap-x-4 gap-y-4 lg:items-center`

**Desktop**: 5 columns (Label-Input-Gap-Label-Input)
**Mobile**: 1 column (stacked)

### Patterns

**Two Inputs:**
```tsx
<label>...</label>
<input />
<div className="hidden lg:block"></div>  {/* Gap */}
<label>...</label>
<input />
```

**One Input:**
```tsx
<label>...</label>
<input />
<div className="hidden lg:block lg:col-span-3"></div>  {/* Fill remaining */}
```

**Section Header:**
```tsx
<h3 className="text-sm font-semibold mb-3 uppercase tracking-wide"
    style={{ color: "oklch(0.65 0.15 230)" }}>
  Section Title
</h3>
```

**Label:** `flex items-center text-sm font-medium mb-2 lg:mb-0`
**Unit:** `absolute right-4 top-1/2 -translate-y-1/2`

**Examples:** See `WindInputs.tsx`, `AltitudeInputs.tsx`, `LegPlannerClient.tsx`

---

## Print Styles

**Location**: `/app/globals.css` `@media print` block

**Print Grid**: 2 columns (Label: 10rem, Input: 9.6rem)
**Gap Columns**: Add `print:hidden` to gap columns
**Nested Grids**: Use `print:grid` on input+selector containers
**Unit Padding**: Use `pr-14` for fuel units (GAL, L, lb, kg)

**Section Classes**: `.course-speed-inputs`, `.wind-inputs`, `.corrections-inputs`, `.flight-params-inputs`, `.climb-data`, `.leg-distance-waypoints`, `.fuel-consumption`

**Critical:**
- Gap columns: `<div className="hidden lg:block print:hidden"></div>`
- Nested grids: `<div className="grid ... lg:contents print:grid">`
- Unit labels MUST match selector case (KT not kt)
- Test print with Cmd/Ctrl + P

---

## Adding Parameters to Flight Plan Legs

**CRITICAL**: All 11 steps required to avoid data loss.

### 11-Step Process

1. **Interface** → `lib/flightPlanStorage.ts` - Add to `FlightPlanLeg`
2. **Serialization** → `lib/flightPlanSharing.ts` - Add to array (MUST match positions in serialize/deserialize!)
3. **URL Param** → `app/leg/page.tsx` - Add to searchParams
4. **ClientWrapper** → `app/leg/ClientWrapper.tsx` - Add to props
5. **State & URL Sync** → `app/leg/LegPlannerClient.tsx` - State hook + useEffect + legData
6. **Build Leg URL** → `app/flight-plans/[id]/FlightPlanDetailClient.tsx` - Add to `buildLegUrl()`
7. **Calculations** → `lib/flightPlanCalculations.ts` - If affects calculations
8. **Next Leg** → `lib/nextLegParams.ts` - If carries over
9. **New Leg Button** → `app/components/NewLegButton.tsx` - If carries over
10. **Display** → Flight plan detail/list - If shown
11. **Test** - URL, state, save, load, share, next leg, print, calculations

**URL Keys**: Use 2-4 char lowercase (`th`, `tas`, `wd`, `ff`)

**Critical Mistakes:**
- Array positions MUST match in serialize/deserialize
- Always sync URL in useEffect
- Always include in legData object
- Always add to buildLegUrl()

**Examples**: Study `trueCourse`, `windDir/windSpeed`, `fuelFlow/fuelUnit`, `climbTas/descentTas`

---

## Testing

**Location**: `__tests__/` directory (NOT in `lib/` or `app/`)
**Framework**: Vitest
**Commands**: `npm test`, `npm test:watch`, `npm test -- __tests__/myfile.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "../lib/myModule";

describe("myModule", () => {
  it("should do something correctly", () => {
    expect(myFunction(input)).toBe(expectedValue);
  });
});
```

---

## Geodesic vs Rhumb Line Calculations

### Geodesic (Great Circle) - Shortest Path
**Library**: GeographicLib `Geodesic.WGS84`
**Properties**: Shortest distance, bearing changes continuously, fuel efficient
**Use**: Route planning, orthodromic distance

```typescript
const result = Geodesic.WGS84.Inverse(lat1, lon1, lat2, lon2);
const distanceNM = (result.s12 ?? 0) / 1852;
```

### Rhumb Line (Loxodrome) - Constant Heading
**Library**: Turf.js `@turf/rhumb-distance` + WGS-84 correction
**Properties**: Constant bearing, longer distance, easier to navigate
**Use**: LNAV segments, actual flying

```typescript
const from = point([lon1, lat1]);
const to = point([lon2, lat2]);
const distanceKm = rhumbDistance(from, to);
const scaleFactor = getWGS84ScaleFactor((lat1 + lat2) / 2);
const distanceNM = distanceKm * scaleFactor * 0.539957;
```

### WGS-84 Correction
Turf.js uses spherical Earth (6,371,009m), but GeographicLib uses WGS-84 ellipsoid. Apply `getWGS84ScaleFactor()` to correct Turf's rhumb distances (~1.0037 at mid-latitudes).

### LNAV Segments Pattern
1. Plan route with geodesic (shortest)
2. Place waypoints along great circle
3. Fly between waypoints with rhumb lines (constant heading)
4. Penalty = Total rhumb - Geodesic

**Example**: NY-Tokyo pure rhumb = 6901.8 NM, great circle = 5870.0 NM, penalty = 1031.8 NM (17.6%)
With 35 segments: 5872.7 NM, penalty = 2.7 NM (0.045%)
