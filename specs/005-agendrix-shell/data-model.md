# Phase 1 — Data Model (Phase 4)

**Feature**: Agendrix-Style Shell
**Date**: 2026-05-28

## Database entities

**No changes.** Phase 4 is presentation-layer only.

## Client-side transient state

### Sidebar collapse state

Per-browser-session preference for sidebar visibility on tablet-width
viewports. Three modes are possible:
- `"expanded"` — sidebar shows icons + labels (desktop default, ≥ 1024 px).
- `"collapsed"` — sidebar shows icons only (auto on 768–1023 px).
- `"hidden"` — sidebar not in the DOM; opened on demand via
  hamburger (mobile, < 768 px).

For Phase 4 the mode is derived from viewport width via CSS — no
persistent JavaScript state.

### Toolbar search term

Transient client state in `ScheduleCalendar`. String. Empty by default.
Updated by `ScheduleToolbar`'s search input.

### Optimistic shift state (carry-over from Phase 3)

Unchanged. The `useOptimistic` reducer remains responsible for
drag-and-drop in-flight state.

### Avatar color palette

A constant in `src/lib/avatar.ts` — a frozen array of 8 OKLCH color
pairs `{ bg, fg }`. The `getAvatarColor(name)` function hashes the
name into an index into this array.

```typescript
const AVATAR_PALETTE = [
  { bg: "oklch(0.85 0.10 25)",  fg: "oklch(0.30 0.04 25)" },   // coral
  { bg: "oklch(0.85 0.10 80)",  fg: "oklch(0.30 0.04 80)" },   // amber
  { bg: "oklch(0.85 0.10 140)", fg: "oklch(0.30 0.04 140)" },  // green
  { bg: "oklch(0.85 0.10 200)", fg: "oklch(0.30 0.04 200)" },  // teal
  { bg: "oklch(0.85 0.10 260)", fg: "oklch(0.30 0.04 260)" },  // blue
  { bg: "oklch(0.85 0.10 300)", fg: "oklch(0.30 0.04 300)" },  // purple
  { bg: "oklch(0.85 0.10 340)", fg: "oklch(0.30 0.04 340)" },  // magenta
  { bg: "oklch(0.85 0.10 20)",  fg: "oklch(0.30 0.04 20)" },   // red
] as const;
```

(Final values may be tuned for contrast and dark-mode behavior in
implementation.)

## Invariants

- All Phase 0–3 invariants carry over unchanged.
- The avatar color for a given user name MUST be stable across renders
  (deterministic by name).
- Totals displayed in the grid MUST mathematically equal the sum of
  the underlying shift durations for the displayed week. The grand-total
  cell MUST equal both the sum of the row Totals AND the sum of the
  day Totals (both ways must agree).
