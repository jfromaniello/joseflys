# Claude Development Guidelines

This document contains important patterns and guidelines for maintaining consistency in the joseflys project.

## Formatting Functions

### Always Use Formatters from `/lib/formatters.ts`

**IMPORTANT**: Never reimplement formatting logic inline. Always use the standardized formatters from `/lib/formatters.ts` to ensure consistency across the application.

### Available Formatters

#### `formatCourse(course: number): string`

Formats a course/heading value to a 3-digit string with degree symbol.

```tsx
// ✅ Correct - Using formatCourse
import { formatCourse } from "@/lib/formatters";

<p>{formatCourse(results.magneticHeading)}</p>
// Output: "090°", "270°", "005°"

// ❌ Wrong - Manual formatting
<p>{`${String(Math.round(results.magneticHeading)).padStart(3, '0')}°`}</p>
```

#### `formatWCA(wca: number): string`

Formats Wind Correction Angle with sign and direction (E/W).

```tsx
import { formatWCA } from "@/lib/formatters";

<p>{formatWCA(results.windCorrectionAngle)}</p>
// Output: "5°E", "10°W", "0°"
```

#### `formatDeviation(deviation: number): string`

Formats magnetic variation or compass deviation with sign and direction (E/W).

```tsx
import { formatDeviation } from "@/lib/formatters";

<p>{formatDeviation(leg.md)}</p>
// Output: "5°E", "10°W", "0°"
```

#### `formatWind(direction: number, speed: number, compact: boolean = true): string`

Formats wind information.

```tsx
import { formatWind } from "@/lib/formatters";

// Compact format (default)
<p>{formatWind(270, 15)}</p>
// Output: "270°/15"

// Non-compact format
<p>{formatWind(270, 15, false)}</p>
// Output: "270° at 15 KT"
```

#### `formatFuel(fuel: number, unit: string): string`

Formats fuel quantity with unit.

```tsx
import { formatFuel } from "@/lib/formatters";

<p>{formatFuel(25.5, "GAL")}</p>
// Output: "25.5 GAL"
```

#### `formatDistance(distance: number): string`

Formats distance with one decimal place.

```tsx
import { formatDistance } from "@/lib/formatters";

<p>{formatDistance(123.456)}</p>
// Output: "123.5"
```

### Why Use Formatters?

1. **Consistency**: All values display the same way across the application
2. **Maintainability**: Changes to formatting logic only need to happen in one place
3. **Testing**: Formatters are tested once, not in every component
4. **Readability**: Clear function names make code self-documenting

### Common Mistakes to Avoid

❌ **Wrong**: Manual string padding
```tsx
`${String(Math.round(course)).padStart(3, '0')}°`
```

✅ **Correct**: Use formatCourse
```tsx
formatCourse(course)
```

---

❌ **Wrong**: Manual wind formatting
```tsx
`${windDir}° at ${windSpeed} KT`
```

✅ **Correct**: Use formatWind
```tsx
formatWind(windDir, windSpeed, false)
```

---

❌ **Wrong**: Manual deviation formatting
```tsx
`${Math.abs(deviation)}°${deviation < 0 ? 'E' : 'W'}`
```

✅ **Correct**: Use formatDeviation
```tsx
formatDeviation(deviation)
```

## Button Cursor Styling

### Always Add cursor-pointer to Interactive Elements

**IMPORTANT**: All interactive elements that trigger actions (buttons, clickable divs, etc.) MUST have `cursor-pointer` class to indicate they are clickable.

```tsx
// ✅ Correct - Button with cursor-pointer
<button
  onClick={handleClick}
  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 cursor-pointer"
>
  Click Me
</button>

// ❌ Wrong - Missing cursor-pointer
<button
  onClick={handleClick}
  className="px-4 py-2 bg-blue-600 hover:bg-blue-700"
>
  Click Me
</button>

// ✅ Correct - Interactive div with cursor-pointer
<div
  onClick={handleClick}
  className="p-4 hover:bg-slate-700 cursor-pointer"
>
  Click Me
</div>
```

**When to use:**
- All `<button>` elements
- Clickable `<div>` or `<span>` elements with `onClick` handlers
- Custom interactive components

**Note**: `<Link>` components from Next.js automatically get pointer cursor, so it's optional for them.

## Grid Layout System for Input Components

### Overview
All input components in `/course`, `/leg`, and `/climb` calculators use a consistent grid layout pattern for perfect alignment on desktop and responsive stacking on mobile.

### The Grid Pattern

```tsx
<div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem] gap-x-4 gap-y-4 lg:items-center">
  {/* Content */}
</div>
```

### Column Breakdown

The grid creates **5 columns** on desktop (`lg` breakpoint and above):

1. **Column 1**: Label (10.5rem) - Left label area
2. **Column 2**: Input (12rem) - Left input field
3. **Column 3**: Gap (2rem) - Visual spacing between pairs
4. **Column 4**: Label (10.5rem) - Right label area
5. **Column 5**: Input (12rem) - Right input field

On mobile/tablet (`< lg`): All content stacks vertically (1 column).

### Pattern Structure

#### Two Inputs Per Row

```tsx
<div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem] gap-x-4 gap-y-4 lg:items-center">
  {/* First Input - Left Side */}
  <label className="flex items-center text-sm font-medium mb-2 lg:mb-0">
    Label Text
    <Tooltip content="..." />
  </label>

  <div className="relative">
    <input ... />
    <span className="absolute right-4 top-1/2 -translate-y-1/2">Unit</span>
  </div>

  {/* Gap Column (hidden on mobile, visible on desktop) */}
  <div className="hidden lg:block"></div>

  {/* Second Input - Right Side */}
  <label className="flex items-center text-sm font-medium mb-2 lg:mb-0">
    Label Text
    <Tooltip content="..." />
  </label>

  <div className="relative">
    <input ... />
    <span className="absolute right-4 top-1/2 -translate-y-1/2">Unit</span>
  </div>
</div>
```

#### One Input Only

When you only need one input in a row:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem] gap-x-4 gap-y-4 lg:items-center">
  {/* Single Input */}
  <label className="flex items-center text-sm font-medium mb-2 lg:mb-0">
    Label Text
    <Tooltip content="..." />
  </label>

  <div className="relative">
    <input ... />
    <span className="absolute right-4 top-1/2 -translate-y-1/2">Unit</span>
  </div>

  {/* Fill remaining columns (3 columns: gap + label + input) */}
  <div className="hidden lg:block lg:col-span-3"></div>
</div>
```

#### Multiple Rows in Same Grid

When you have multiple rows (e.g., Row 1: Input A + Input B, Row 2: Input C only):

```tsx
<div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem] gap-x-4 gap-y-4 lg:items-center">
  {/* Row 1 - Two inputs */}
  <label>Input A Label</label>
  <div><input /></div>
  <div className="hidden lg:block"></div>
  <label>Input B Label</label>
  <div><input /></div>

  {/* Row 2 - One input (skip first 3 columns to align on right side) */}
  <div className="hidden lg:block lg:col-span-3"></div>
  <label>Input C Label</label>
  <div><input /></div>
</div>
```

### Section Structure

Each input section follows this pattern:

```tsx
<div className="section-name">
  {/* Section Header */}
  <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide"
      style={{ color: "oklch(0.65 0.15 230)" }}>
    Section Title
  </h3>

  {/* Grid Container */}
  <div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem] gap-x-4 gap-y-4 lg:items-center">
    {/* Input rows following the patterns above */}
  </div>
</div>
```

### Key CSS Classes

- **Grid**: `grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem]`
- **Gap**: `gap-x-4 gap-y-4`
- **Vertical Alignment**: `lg:items-center`
- **Label**: `flex items-center text-sm font-medium mb-2 lg:mb-0`
  - `mb-2` on mobile for spacing below label
  - `lg:mb-0` removes margin on desktop (grid handles spacing)
- **Gap Spacer**: `hidden lg:block`
- **Column Spanning**: `lg:col-span-3` (when skipping 3 columns)

### Examples in Codebase

Reference implementations:
- **WindInputs**: `/app/course/components/WindInputs.tsx`
- **AltitudeInputs**: `/app/climb/components/AltitudeInputs.tsx`
- **CourseInput**: `/app/climb/components/CourseInput.tsx`
- **Leg Planner**: `/app/leg/LegPlannerClient.tsx` (Distance & Waypoints section)
- **Course Calculator**: `/app/course/CourseCalculatorClient.tsx`

### Important Notes

1. **Unit Labels**: Always use `right-4` for positioning unit labels inside inputs
2. **Input Alignment**: Use `text-right` on inputs for right-aligned number entry
3. **Responsive**: Labels appear above inputs on mobile, side-by-side on desktop
4. **Consistency**: Always use `10.5rem_12rem_2rem_10.5rem_12rem` - don't modify these values
5. **Tooltips**: Always include tooltips on labels for user guidance
6. **Section Headers**: Use `text-sm font-semibold mb-3 uppercase tracking-wide` with color `oklch(0.65 0.15 230)`

### Common Mistakes to Avoid

❌ **Wrong**: Using different column widths
```tsx
<div className="grid grid-cols-1 lg:grid-cols-5">
```

✅ **Correct**: Using the standard grid template
```tsx
<div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem]">
```

---

❌ **Wrong**: Forgetting the gap column
```tsx
<label>Left Label</label>
<input />
<label>Right Label</label>  {/* No gap! */}
<input />
```

✅ **Correct**: Including the gap column
```tsx
<label>Left Label</label>
<input />
<div className="hidden lg:block"></div>  {/* Gap column */}
<label>Right Label</label>
<input />
```

---

❌ **Wrong**: Not handling remaining columns
```tsx
<label>Single Input</label>
<input />
{/* Missing: fill remaining columns */}
```

✅ **Correct**: Filling remaining columns
```tsx
<label>Single Input</label>
<input />
<div className="hidden lg:block lg:col-span-3"></div>
```

---

❌ **Wrong**: Keeping mb-2 on desktop
```tsx
<label className="flex items-center text-sm font-medium mb-2">
```

✅ **Correct**: Responsive margin
```tsx
<label className="flex items-center text-sm font-medium mb-2 lg:mb-0">
```

## Component Reusability

When creating input sections that might be reused across calculators:

1. **Extract to Component**: Create a separate component in the appropriate `components/` folder
2. **Follow Grid Pattern**: Use the exact grid structure documented above
3. **Include Section Header**: Each component should include its own `<h3>` header
4. **Self-Contained**: Component should be fully self-contained (no external dependencies on parent structure)
5. **Props Interface**: Define clear TypeScript interface for all props

### Example Component Structure

```tsx
import { Tooltip } from "@/app/components/Tooltip";

interface MyInputsProps {
  value1: string;
  setValue1: (value: string) => void;
  value2: string;
  setValue2: (value: string) => void;
}

export function MyInputs({ value1, setValue1, value2, setValue2 }: MyInputsProps) {
  return (
    <div className="my-inputs">
      <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide"
          style={{ color: "oklch(0.65 0.15 230)" }}>
        Section Title
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem] gap-x-4 gap-y-4 lg:items-center">
        {/* Grid content following patterns above */}
      </div>
    </div>
  );
}
```

## Wind Component

The `WindInputs` component is special and should be reused across all calculators that need wind input:

```tsx
import { WindInputs } from "@/app/course/components/WindInputs";

<WindInputs
  windDir={windDir}
  setWindDir={setWindDir}
  windSpeed={windSpeed}
  setWindSpeed={setWindSpeed}
/>
```

**Features:**
- Auto-formats wind direction to 3 digits (e.g., "90" → "090") on blur
- Validates wind direction ≤ 360°
- Shows validation warnings for incomplete wind data (direction without speed or vice versa)
- Includes "Optional" placeholder text
- Fully responsive with grid system

## When to Use This Grid System

**Use for:**
- Calculator input sections with labeled fields
- Forms with multiple inputs that need desktop alignment
- Any section where inputs should appear side-by-side on desktop

**Don't use for:**
- Result displays (use flex or different grid)
- Simple single-column forms
- Card layouts or content areas

---

## Print Styles

### Overview
All calculator pages have optimized print layouts defined in `/app/globals.css` within the `@media print` block. Print styles ensure clean, readable output with consistent formatting.

### Print Grid Layout

In print mode, all input grids convert to a **2-column layout**:
- **Column 1**: Label (10rem fixed width)
- **Column 2**: Input field (9.6rem fixed width)

This is enforced via CSS in `globals.css`:

```css
@media print {
  .course-speed-inputs > .grid,
  .wind-inputs > .grid,
  .corrections-inputs > .grid,
  .flight-params-inputs > .grid,
  .climb-data > .grid,
  .leg-distance-waypoints > .grid,
  .fuel-consumption > .grid {
    display: grid !important;
    grid-template-columns: 10rem auto !important;
    gap: 0.5rem 1rem !important;
    align-items: center !important;
  }
}
```

### Input Width Standards (Print)

**All inputs must have consistent widths:**

1. **Inputs with absolute positioned units** (°, KT, NM, etc.): `9.6rem` total width
2. **Inputs with selectors** (unit dropdowns): Total `9.6rem` broken down as:
   - Input: `4.6rem`
   - Gap: `0.5rem`
   - Selector: `4.5rem`

### Padding for Absolute Units

Different units require different right padding to prevent overlap:

```css
/* Short units (°) - closer spacing */
.course-speed-inputs .grid > div.relative:first-of-type input {
  padding-right: 1.5rem !important;
}

/* Medium units (KT, NM) - standard spacing */
.relative input {
  padding-right: 2rem !important;
}

/* Long units (GAL, lb, kg) - extra spacing */
.flight-params-inputs .grid > div.relative:last-child input,
.climb-data div.relative input[class*="pr-14"] {
  padding-right: 2.5rem !important;
}
```

**Rule of thumb:** Use `pr-14` for inputs with fuel units (GAL, L, lb, kg) to ensure adequate spacing.

### Gap Column Hiding

Gap columns must be hidden in print using `print:hidden`:

```tsx
<div className="hidden lg:block print:hidden"></div>
```

### Nested Grids (Input + Selector)

Containers with input + selector combinations must use `print:grid` to maintain horizontal layout:

```tsx
<div className="grid grid-cols-[1fr_auto] gap-x-4 lg:contents print:grid">
  <input ... />
  <select ... />
</div>
```

### Section Class Names

All input sections must have consistent class names for CSS targeting:

- `.course-speed-inputs`
- `.wind-inputs`
- `.corrections-inputs`
- `.flight-params-inputs`
- `.climb-data`
- `.leg-distance-waypoints`
- `.fuel-consumption`
- `.range-fuel-inputs`

### Page Breaks

Use page breaks to improve readability:

```css
/* Automatic page break before climb data if it has content */
.climb-data:not(.print\:hidden) {
  page-break-before: always !important;
  break-before: page !important;
}
```

### Hiding Elements in Print

Use `print:hidden` class to hide non-essential UI elements:

```tsx
{/* Description text */}
<p className="text-sm leading-relaxed print:hidden">
  Complete flight leg planning...
</p>

{/* Interactive buttons */}
<button className="print:hidden">Load Example</button>
```

### Unit Label Consistency

**Important:** Unit labels must match their corresponding input selectors in case and format:

```tsx
// ❌ Wrong - inconsistent casing
const speedUnitLabel = speedUnit === 'kt' ? 'kt' : ...

// ✅ Correct - matches selector options
const speedUnitLabel = speedUnit === 'kt' ? 'KT' : ...

// Selector should match:
<option value="kt">KT</option>
```

### Print CSS Location

**All print styles are centralized in `/app/globals.css`** within the `@media print` block. Never add print-specific CSS to component files.

### Testing Print Layouts

When modifying input components:

1. Test desktop layout (lg breakpoint)
2. Test mobile layout (< lg breakpoint)
3. **Test print layout** (Cmd/Ctrl + P)
4. Verify all inputs have consistent widths in print
5. Check that labels align properly
6. Ensure units don't overlap with values

### Common Print Issues to Avoid

❌ **Wrong**: Different input widths
```tsx
// Some inputs 12rem, others 18rem
```

✅ **Correct**: All inputs 9.6rem in print
```css
width: 9.6rem !important;
```

---

❌ **Wrong**: Forgetting `print:hidden` on gap columns
```tsx
<div className="hidden lg:block"></div>
```

✅ **Correct**: Include print:hidden
```tsx
<div className="hidden lg:block print:hidden"></div>
```

---

❌ **Wrong**: Not using `print:grid` for nested grids
```tsx
<div className="grid ... lg:contents">
```

✅ **Correct**: Add print:grid
```tsx
<div className="grid ... lg:contents print:grid">
```

---

❌ **Wrong**: Inconsistent unit labels
```tsx
// Showing 'kt' but selector shows 'KT'
const label = 'kt';
<option value="kt">KT</option>
```

✅ **Correct**: Match selector case
```tsx
const label = 'KT';
<option value="kt">KT</option>
```

---

## Adding Parameters to Flight Plan Legs

### Overview

When adding a new parameter to `FlightPlanLeg`, you must update multiple files to ensure the parameter flows correctly through:
- Interface definition
- Storage and serialization
- URL parameters (leg planner page)
- Flight plan integration
- Display and calculations

**CRITICAL:** Missing any of these steps will break the parameter flow and cause data loss or inconsistencies.

---

### Complete Checklist

When adding a new parameter `myParam` to `FlightPlanLeg`, follow these steps in order:

#### 1. Define the Interface

**File:** `lib/flightPlanStorage.ts`
**Location:** Lines 36-208

Add your property to the `FlightPlanLeg` interface with JSDoc documentation:

```typescript
export interface FlightPlanLeg {
  id: string;
  index: number;
  // ... existing properties ...

  /**
   * Description of myParam
   * @example "example value"
   */
  myParam?: string;
}
```

**Notes:**
- Make it optional (`?`) unless it's required for all legs
- Add JSDoc comments for clarity
- Use appropriate type (string, number, boolean, etc.)

---

#### 2. Update Serialization (for sharing/export)

**File:** `lib/flightPlanSharing.ts`

**⚠️ CRITICAL:** Serialization and deserialization array positions MUST match exactly!

##### 2a. Serialization (Lines 19-50)

Add your parameter to the compacted array in `serializeFlightPlan()`:

```typescript
const compactLegs = legs.map((leg) => [
  leg.id,
  leg.index,
  // ... existing properties ...
  leg.myParam || "",  // Add here at position N
]);
```

Update the comment documenting the array structure to include the new position.

##### 2b. Deserialization (Lines 102-128)

Add your parameter to the destructuring array in `deserializeFlightPlan()` at the **SAME position**:

```typescript
const [
  id,
  index,
  // ... existing properties ...
  myParam,  // Position N (same as serialization!)
] = compactLeg;
```

##### 2c. Reconstruction (Lines 138-164)

Add your parameter to the reconstructed leg object:

```typescript
const leg: FlightPlanLeg = {
  id,
  index,
  // ... existing properties ...
  myParam: myParam || undefined,
};
```

**Important:** Update the comment at lines 91-97 that documents the complete array structure.

---

#### 3. Add URL Parameter to Leg Page

**File:** `app/leg/page.tsx`
**Location:** Lines 6-67

##### 3a. Add to searchParams interface (Lines 6-35)

```typescript
interface SearchParams {
  // ... existing properties ...
  myParamKey?: string;  // Use a short URL key
}
```

##### 3b. Extract from params (Lines 40-67)

```typescript
const myParam = params.myParamKey || "";
```

##### 3c. Pass to ClientWrapper (Lines 70-99)

```typescript
<ClientWrapper
  // ... existing props ...
  initialMyParam={myParam}
/>
```

**URL Key Convention:** Use short abbreviations (2-4 chars) like `th`, `tas`, `wd`, `ff`, `md`, `dist`, etc.

---

#### 4. Update Client Wrapper

**File:** `app/leg/ClientWrapper.tsx`
**Location:** Lines 14-43

Add to the props interface:

```typescript
interface ClientWrapperProps {
  // ... existing properties ...
  initialMyParam: string;
}
```

Then pass it through to `LegPlannerClient` (line 46+).

---

#### 5. Update Leg Planner Client (State & URL Sync)

**File:** `app/leg/LegPlannerClient.tsx`

##### 5a. Add to Props Interface (Lines 45-74)

```typescript
interface LegPlannerClientProps {
  // ... existing properties ...
  initialMyParam: string;
}
```

##### 5b. Add State Hook (Lines 106-132)

```typescript
const [myParam, setMyParam] = useState<string>(initialMyParam);
```

##### 5c. Update URL Sync Effect (Lines 238-300)

Add your parameter to the URL update logic:

```typescript
useEffect(() => {
  // ... existing code ...

  if (myParam) {
    params.set("myParamKey", myParam);
  }

  // ... existing code ...
}, [
  // ... existing dependencies ...
  myParam,  // Add to dependency array
]);
```

##### 5d. Save to Flight Plan (Lines 377-405)

Add to the `legData` object in `handleFlightPlanSelect()`:

```typescript
const legData: Omit<FlightPlanLeg, "id" | "index"> = {
  // ... existing properties ...
  myParam: myParam,
};
```

---

#### 6. Build Leg URL from Flight Plan

**File:** `app/flight-plans/[id]/FlightPlanDetailClient.tsx`
**Location:** Lines 140-176

Add to the `buildLegUrl()` function:

```typescript
function buildLegUrl(leg: FlightPlanLeg): string {
  const params = new URLSearchParams();

  // ... existing parameters ...

  if (leg.myParam) {
    params.set("myParamKey", leg.myParam);
  }

  return `/leg?${params.toString()}`;
}
```

This ensures clicking "Edit" on a leg in the flight plan loads all parameters correctly.

---

#### 7. Update Calculations (if needed)

**File:** `lib/flightPlanCalculations.ts`

If your parameter affects calculations:

##### 7a. Parse in calculateLegResults() (Lines 52-178)

```typescript
export function calculateLegResults(leg: FlightPlanLeg): LegResult {
  // ... existing code ...

  const myParam = leg.myParam ? parseFloat(leg.myParam) : undefined;

  // Use in calculations...
}
```

##### 7b. Update calculateLegWaypoints() (Lines 183-267)

If waypoint calculations need your parameter:

```typescript
export function calculateLegWaypoints(leg: FlightPlanLeg): WaypointInfo[] {
  // Extract and use myParam...
}
```

##### 7c. Update Detection Functions (if applicable)

- `hasDescentData()` (Lines 298-307) - If parameter affects alternative leg detection
- `detectAlternativeLegs()` (Lines 314-339) - If parameter affects grouping logic

---

#### 8. Update Next Leg Parameters (if parameter carries over)

**File:** `lib/nextLegParams.ts`

If your parameter should be carried to the next leg:

##### 8a. Add to Interface (Lines 9-23)

```typescript
export interface NextLegParams {
  // ... existing properties ...
  myParam?: string;
}
```

##### 8b. Include in buildNextLegUrl() (Lines 31-68)

```typescript
export function buildNextLegUrl(params: NextLegParams): string {
  // ... existing code ...

  if (params.myParam) {
    urlParams.set("myParamKey", params.myParam);
  }

  return `/leg?${urlParams.toString()}`;
}
```

##### 8c. Extract in extractNextLegParams() (Lines 77-96)

```typescript
export function extractNextLegParams(leg: FlightPlanLeg): NextLegParams {
  return {
    // ... existing properties ...
    myParam: leg.myParam || "",
  };
}
```

---

#### 9. Update New Leg Button (if parameter carries over)

**File:** `app/components/NewLegButton.tsx`

If your parameter should be available when creating new legs:

##### 9a. Add to Props (Lines 7-36)

```typescript
interface NewLegButtonProps {
  // ... existing properties ...
  myParam?: string;
}
```

##### 9b. Pass to buildNextLegUrl() (Lines 54-72)

```typescript
const handleNewLeg = () => {
  const url = buildNextLegUrl({
    // ... existing params ...
    myParam: myParam,
  });
  router.push(url);
};
```

---

#### 10. Update Display (if parameter needs to be shown)

**File:** `app/flight-plans/[id]/FlightPlanDetailClient.tsx`

Add display logic for your parameter in the leg list:

```tsx
{/* Existing leg display code */}
{leg.myParam && (
  <span className="text-xs text-slate-400">
    My Param: {leg.myParam}
  </span>
)}
```

**Optional:** Also update `app/flight-plans/FlightPlansClient.tsx` (Lines 175-193) if the parameter should appear in the flight plans list view.

---

#### 11. Sync Common Parameters (if applicable)

**File:** `lib/flightPlanStorage.ts`
**Location:** Lines 368-377

If your parameter should sync across all legs when one is updated (like `unit`, `fuelUnit`, `depTime`):

```typescript
function syncCommonParameters(legs: FlightPlanLeg[]): FlightPlanLeg[] {
  const firstLeg = legs[0];
  return legs.map((leg) => ({
    ...leg,
    // ... existing synced properties ...
    myParam: firstLeg.myParam,  // Add here
  }));
}
```

**Note:** Only add here if the parameter should be consistent across ALL legs.

---

### URL Parameter Naming Conventions

Use short, memorable abbreviations for URL keys:

- ✅ Good: `th` (true heading), `tas` (true airspeed), `wd` (wind direction)
- ❌ Bad: `trueHeading`, `true_heading`, `TH`

Keep keys lowercase and 2-4 characters when possible.

---

### Common Mistakes to Avoid

#### ❌ Wrong: Array positions don't match

```typescript
// Serialization
const compactLegs = legs.map((leg) => [
  leg.id,
  leg.myParam,  // Position 1
  leg.index,    // Position 2
]);

// Deserialization
const [id, index, myParam] = compactLeg;  // Wrong order!
```

#### ✅ Correct: Matching positions

```typescript
// Serialization
const compactLegs = legs.map((leg) => [
  leg.id,
  leg.index,
  leg.myParam,  // Position 2
]);

// Deserialization
const [id, index, myParam] = compactLeg;  // Same order!
```

---

#### ❌ Wrong: Forgetting URL sync

```typescript
// State updated but URL not synced
const [myParam, setMyParam] = useState(initialMyParam);
// Missing: URL update in useEffect
```

#### ✅ Correct: Always sync URL

```typescript
useEffect(() => {
  if (myParam) params.set("myParamKey", myParam);
  // ... update URL
}, [myParam]);
```

---

#### ❌ Wrong: Not including in legData

```typescript
const legData: Omit<FlightPlanLeg, "id" | "index"> = {
  trueCourse,
  trueAirspeed,
  // Missing: myParam
};
```

#### ✅ Correct: Include all parameters

```typescript
const legData: Omit<FlightPlanLeg, "id" | "index"> = {
  trueCourse,
  trueAirspeed,
  myParam,  // Include here
};
```

---

#### ❌ Wrong: Not building leg URL correctly

```typescript
// Flight plan detail page
function buildLegUrl(leg: FlightPlanLeg): string {
  return `/leg?th=${leg.trueCourse}`;  // Missing myParam!
}
```

#### ✅ Correct: Include all parameters

```typescript
function buildLegUrl(leg: FlightPlanLeg): string {
  const params = new URLSearchParams();
  if (leg.trueCourse) params.set("th", leg.trueCourse);
  if (leg.myParam) params.set("myParamKey", leg.myParam);
  return `/leg?${params.toString()}`;
}
```

---

### Testing Checklist

After adding a new parameter, test ALL of these scenarios:

1. **Direct URL:** Navigate to `/leg?myParamKey=value` - parameter should load
2. **State Management:** Change value in UI - URL should update
3. **Save to Plan:** Add leg to flight plan - parameter should be saved
4. **Load from Plan:** Click "Edit" on saved leg - parameter should load
5. **Share Plan:** Export and import - parameter should survive serialization
6. **Next Leg:** Create next leg - parameter should carry over (if applicable)
7. **Print View:** Print leg - parameter should display correctly (if shown)
8. **Calculations:** Verify calculations use the parameter correctly (if applicable)

---

### Reference Files for Examples

Study these files to see complete parameter implementations:

- **trueCourse** - Good example of a required parameter
- **windDir/windSpeed** - Good example of optional parameters
- **fuelFlow/fuelUnit** - Good example of parameters that carry over to next leg
- **climbTas/descentTas** - Good example of optional calculation parameters

Search for any of these in the files listed above to see complete implementation patterns.

---

### Summary: 11-Step Process

1. **Define interface** in `lib/flightPlanStorage.ts`
2. **Update serialization** in `lib/flightPlanSharing.ts` (critical: match array positions!)
3. **Add URL parameter** in `app/leg/page.tsx`
4. **Update ClientWrapper** in `app/leg/ClientWrapper.tsx`
5. **Add state & URL sync** in `app/leg/LegPlannerClient.tsx`
6. **Build leg URL** in `app/flight-plans/[id]/FlightPlanDetailClient.tsx`
7. **Update calculations** in `lib/flightPlanCalculations.ts` (if needed)
8. **Update next leg params** in `lib/nextLegParams.ts` (if carries over)
9. **Update NewLegButton** in `app/components/NewLegButton.tsx` (if carries over)
10. **Update display** in flight plan detail/list (if shown)
11. **Test thoroughly** using the checklist above

**Remember:** Every step is required for the parameter to work correctly across all features!

---

## Test File Location

### IMPORTANT: Tests Must Be in `__tests__/` Directory

All test files MUST be placed in the `__tests__/` directory at the root of the project, NOT in arbitrary locations like `lib/` or next to source files.

**Project Structure:**
```
joseflys/
├── __tests__/           ✅ Correct - All tests go here
│   ├── courseCalculations.test.ts
│   ├── waypoints.test.ts
│   ├── aircraftStorage.test.ts
│   ├── distanceCalculations.test.ts
│   └── segmentCalculations.test.ts
├── lib/
│   ├── courseCalculations.ts
│   ├── segmentCalculations.ts
│   └── ❌ NO TEST FILES HERE
└── app/
    └── ❌ NO TEST FILES HERE
```

**Testing Framework:**
- Uses **Vitest** for running tests
- Tests use `describe`, `it`, `expect` from `vitest`
- Run tests with: `npm test`
- Run specific test: `npm test -- __tests__/myfile.test.ts`
- Watch mode: `npm test:watch`

**Example Test Structure:**
```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "../lib/myModule";

describe("myModule", () => {
  describe("myFunction", () => {
    it("should do something correctly", () => {
      const result = myFunction(input);
      expect(result).toBe(expectedValue);
    });

    it("should handle edge cases", () => {
      const result = myFunction(edgeCase);
      expect(result).toBeCloseTo(expectedValue, 2);
    });
  });
});
```

**Console Logging in Tests:**
- Use `console.log()` in tests to show intermediate results
- Vitest captures and displays console output with test results
- Useful for debugging calculations and showing verification data

---

## Geodesic vs Rhumb Line Calculations

### Understanding the Two Navigation Methods

This project uses **both** geodesic (great circle) and rhumb line (loxodrome) calculations for different purposes, particularly in the LNAV segments calculator.

### Geodesic (Great Circle) - Shortest Path

**Purpose:** Calculate the shortest distance between two points on Earth.

**Library:** GeographicLib's `Geodesic.WGS84`

**Usage:**
```typescript
import { Geodesic } from "geographiclib-geodesic";

// Calculate great circle distance and bearings
const result = Geodesic.WGS84.Inverse(lat1, lon1, lat2, lon2);
const distanceMeters = result.s12 ?? 0;
const initialBearing = result.azi1 ?? 0;
const finalBearing = result.azi2 ?? 0;

// Convert to nautical miles
const distanceNM = distanceMeters / 1852;
```

**Properties:**
- **Shortest possible path** on Earth's ellipsoid (WGS-84)
- Bearing **changes continuously** during the flight
- Used by aircraft for long-distance navigation planning
- More fuel efficient than rhumb line for long distances

### Rhumb Line (Loxodrome) - Constant Heading

**Purpose:** Calculate distance along a path of constant bearing.

**Library:** Turf.js `@turf/rhumb-distance` with WGS-84 correction

**Usage:**
```typescript
import rhumbDistance from "@turf/rhumb-distance";
import { point } from "@turf/helpers";

// Calculate rhumb line distance
const from = point([lon1, lat1]);
const to = point([lon2, lat2]);
const distanceKm = rhumbDistance(from, to);

// Apply WGS-84 correction factor for accuracy
const avgLat = (lat1 + lat2) / 2;
const scaleFactor = getWGS84ScaleFactor(avgLat);
const distanceNM = distanceKm * scaleFactor * 0.539957;
```

**Properties:**
- **Constant bearing** throughout the flight (easier to navigate)
- Generally **longer** than great circle (except along meridians/equator)
- Simpler to fly manually (no bearing changes)
- Used by LNAV systems between waypoints

### Why We Use Both

**In LNAV Segments Calculator (`/segments`):**

1. **Plan the route** using **geodesic** (shortest path)
2. **Divide into waypoints** along the great circle
3. **Fly between waypoints** using **rhumb lines** (constant heading)
4. **Calculate penalty** = Total rhumb distance - Great circle distance

```typescript
// 1. Calculate great circle (shortest path)
const inverse = Geodesic.WGS84.Inverse(fromLat, fromLon, toLat, toLon);
const orthodromicDistance = (inverse.s12 ?? 0) / 1852;

// 2. Create geodesic line and place waypoints
const line = Geodesic.WGS84.InverseLine(fromLat, fromLon, toLat, toLon);
const waypoint = line.Position(targetDistance);

// 3. Calculate rhumb distance between waypoints
const segmentDistance = calculateRhumbDistance(
  currentLat, currentLon,
  nextLat, nextLon
);

// 4. Sum all rhumb segments
const totalDistance = sum of all rhumb segments;

// 5. Calculate penalty (always positive!)
const penalty = totalDistance - orthodromicDistance;
```

### WGS-84 Ellipsoid Correction

**Problem:** Turf.js uses a spherical Earth model (radius 6,371,009m), but GeographicLib uses the WGS-84 ellipsoid (varying radius by latitude).

**Solution:** Apply latitude-dependent scale factor to Turf's rhumb distances:

```typescript
function getWGS84ScaleFactor(latitude: number): number {
  // WGS-84 parameters
  const a = 6378137.0; // semi-major axis
  const f = 1 / 298.257223563; // flattening
  const e2 = 2 * f - f * f;

  const phi = (latitude * Math.PI) / 180;
  const sinPhi = Math.sin(phi);
  const denominator = 1 - e2 * sinPhi * sinPhi;

  // Radius of curvature
  const N = a / Math.sqrt(denominator);
  const M = (a * (1 - e2)) / Math.pow(denominator, 1.5);
  const R_wgs84 = Math.sqrt(N * M);

  // Turf's sphere radius
  const R_turf = 6371008.8;

  return R_wgs84 / R_turf; // ~1.0037 at mid-latitudes
}
```

**Why This Matters:**
- At latitude 38° (e.g., NY-Tokyo route), WGS-84 radius is 0.366% larger than sphere
- Without correction, rhumb distances would be systematically too short
- This caused negative penalties (physically impossible!)
- With correction, penalties are correctly positive

### When to Use Each

**Use Geodesic (`Geodesic.WGS84.Inverse`) when:**
- Calculating shortest distance between two points
- Planning optimal routes for fuel efficiency
- Showing "as the crow flies" distance
- Examples: `/distance` calculator, orthodromic distance reference

**Use Rhumb Line (`calculateRhumbDistance`) when:**
- Calculating actual flown distance at constant heading
- Simulating LNAV segment navigation
- Measuring distance along a specific course
- Examples: `/segments` calculator, segment distances

**Use Both when:**
- Comparing routing methods (orthodromic vs loxodromic)
- Calculating LNAV penalties (extra distance from approximation)
- Showing how FMS systems work

### Why Not Use GeographicLib for Rhumb?

GeographicLib has excellent rhumb line support in C++ (`Rhumb`, `RhumbLine`, `RhumbSolve`), but:
- **JavaScript port lacks rhumb**: Only geodesic functions are ported to JS
- **WebAssembly option exists**: `opensphere-asm` package (last updated 1+ years ago)
- **Current solution works well**: Turf.js + WGS-84 correction is accurate and maintained

**Decision:** Keep using Turf.js with WGS-84 correction factor. It's a good approximation (< 0.01% error after correction), well-tested, and actively maintained.

### Key Differences Summary

| Property | Geodesic (Great Circle) | Rhumb Line (Loxodrome) |
|----------|-------------------------|------------------------|
| **Path Type** | Shortest distance | Constant bearing |
| **Bearing** | Changes continuously | Constant |
| **Distance** | Shorter (reference) | Longer (penalty) |
| **Library** | GeographicLib | Turf.js + WGS-84 correction |
| **Earth Model** | WGS-84 ellipsoid | Sphere → corrected to WGS-84 |
| **Use Case** | Route planning | Actual flying |
| **Function** | `Geodesic.WGS84.Inverse()` | `calculateRhumbDistance()` |

### Example: NY to Tokyo

```typescript
const nyLat = 40.7127281, nyLon = -74.0060152;
const tokyoLat = 35.6768601, tokyoLon = 139.7638947;

// Great circle (shortest path)
const gc = Geodesic.WGS84.Inverse(nyLat, nyLon, tokyoLat, tokyoLon);
console.log(`Great Circle: ${(gc.s12 / 1852).toFixed(1)} NM`);
// Output: 5870.0 NM

// Pure rhumb line (constant heading)
const rhumb = calculateRhumbDistance(nyLat, nyLon, tokyoLat, tokyoLon);
console.log(`Rhumb Line: ${rhumb.toFixed(1)} NM`);
// Output: 6901.8 NM

// Penalty for flying constant heading
console.log(`Penalty: ${(rhumb - gc.s12/1852).toFixed(1)} NM`);
// Output: 1031.8 NM (17.6% longer!)
```

**With 35 segments (LNAV approximation):**
- Segmented route: 5872.7 NM
- Great circle: 5870.0 NM
- Penalty: 2.7 NM (0.045% - much better!)

More segments = closer to great circle = lower penalty = better approximation.
