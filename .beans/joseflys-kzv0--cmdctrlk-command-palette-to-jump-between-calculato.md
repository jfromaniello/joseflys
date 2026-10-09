---
# joseflys-kzv0
title: Cmd/Ctrl+K command palette to jump between calculators
status: completed
type: feature
priority: normal
tags:
    - navigation
created_at: 2026-10-09T00:12:24Z
updated_at: 2026-10-09T00:14:07Z
---

Desktop quick switcher: Cmd+K (mac) / Ctrl+K opens a searchable palette of all calculators/pages; type to filter, arrows + Enter to go.

Design:
- `app/components/CommandPalette.tsx` (Headless UI Dialog + Combobox), mounted from Navbar so it exists on every page that has the navbar; reuses the Navbar page lists (same names/icons/sections).
- Matching: case/accent-insensitive on name + per-page keywords (English and Spanish, e.g. "viento", "cruzado" → Wind Components), word-prefix and substring ranking.
- Navbar shows a small "⌘K"/"Ctrl K" button on desktop that also opens it.

Acceptance:
- Cmd/Ctrl+K toggles, Esc closes, typing filters, ↑/↓ + Enter navigates, click navigates.
- Works from any page with the navbar; current page marked.


## Implementation notes
- `app/components/CommandPalette.tsx`: Headless UI Dialog + custom combobox list (ARIA combobox/listbox), global Cmd/Ctrl+K toggle, ↑/↓/Enter, Esc, click; ranked matching (name prefix > word prefix > substring > keywords), accent-insensitive, every term must match; per-page EN/ES keywords.
- Navbar passes its existing page lists as sections (+ Home), renders the palette, and shows a "⌘K" / "Ctrl K" search button on desktop (Mac detection via useSyncExternalStore).

## Verification
- Browser: Cmd+K on /isa, typed "cruz" → Wind Components, Enter navigates; Ctrl+K opens full list with current page marked; arrows move selection; Esc and second Cmd+K close. Lint + tests (526) pass.
