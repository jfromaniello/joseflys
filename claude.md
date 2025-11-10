# Claude Development Guidelines

This document contains important patterns and guidelines for maintaining consistency in the joseflys project.

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
