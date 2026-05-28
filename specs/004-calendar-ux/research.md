# Phase 0 — Research & Design Decisions (Phase 3 feature)

**Feature**: Calendar UX Overhaul
**Date**: 2026-05-28

Spec contained zero `NEEDS CLARIFICATION` markers. Three new library
choices to record + several UI-architecture decisions.

---

## Decision 1: Toast library — `sonner`

**Decision**: Use `sonner` (^2.x).

**Rationale**:
- Single component import: `<Toaster />` mounted once at the root
  layout; `toast()` callable from anywhere.
- Built-in success / error / loading / promise variants.
- ~5 KB gzipped, no runtime peer dependencies.
- Accessible by default (aria-live region).
- Maintained by the shadcn/Vercel ecosystem — same vibe as the rest
  of our UI primitives.

**Alternatives considered**:
- **`react-hot-toast`**: equivalent feature set, slightly older,
  similar size. Sonner wins on shadcn-ecosystem alignment.
- **Roll your own**: positioning, queueing, animation, accessibility,
  reduced-motion handling — at least 300 LOC. Not worth it.

---

## Decision 2: Theme library — `next-themes`

**Decision**: Use `next-themes` (^0.4.x) with `attribute="class"`,
`defaultTheme="system"`, `enableSystem`, cookie persistence.

**Rationale**:
- Designed for Next.js App Router — handles SSR + RSC + the FOUC
  problem out of the box via an inline script.
- ~1 KB. No external state, no provider hell.
- `<ThemeProvider>` + `useTheme()` hook is the entire API surface.
- Cookie-based persistence (vs localStorage) means SSR can pre-apply
  the right theme class before hydration.

**Alternatives considered**:
- **Hand-roll**: feasible (read cookie in root layout → set
  `data-theme` on `<html>` → expose a context for the toggle) but
  fiddly to get right for system-theme + cookie-vs-localStorage +
  FOUC suppression. Library wins.
- **Tailwind's `class` strategy + localStorage**: hits FOUC on
  initial paint. Bad UX.

---

## Decision 3: Drag-and-drop library — `@dnd-kit/core`

**Decision**: Use `@dnd-kit/core` (^6.x) with `PointerSensor` +
`KeyboardSensor`. Skip `@dnd-kit/sortable` (we don't need re-ordering
within a list, just cross-cell moves).

**Rationale**:
- Accessibility built in: keyboard sensor (arrow keys to move,
  Space/Enter to pick up/drop, Escape to cancel) is registered by
  default.
- Framework-agnostic core, React adapter is lean (~10 KB).
- Sensor model lets us disable drag on mobile (don't register
  `PointerSensor` below 768 px).
- Active maintenance; widely used in production React apps.

**Alternatives considered**:
- **`react-dnd`**: older, complex API with monitors and item types.
  Higher learning curve, less accessible by default.
- **HTML5 native Drag-and-Drop**: terrible accessibility, no keyboard
  support, no touch support.
- **`react-beautiful-dnd`**: deprecated.
- **Hand-roll using Pointer Events**: 500+ LOC for a partial,
  inaccessible solution. Not worth it.

---

## Decision 4: Grid layout strategy

**Decision**: CSS Grid for the desktop view. One row per employee, one
column per day. Cells are CSS Grid cells. Each shift is rendered as an
absolutely-positioned block within its (day, employee) cell, with
`top` and `height` computed from `startsAt` / `endsAt` against a
fixed 00:00–24:00 time axis on the row.

**Rationale**:
- CSS Grid handles the responsive sizing of columns (equal widths) and
  arbitrary row counts.
- Absolute positioning of shift blocks against a 24-hour axis is the
  Google-Calendar-style standard — proven to work, easy to compute.
- Day-column headers are a separate header row using the same grid.

**Alternatives considered**:
- **Flex / table layout**: harder to position shifts correctly within
  a cell, especially for shifts spanning a portion of the day.
- **A canvas-based renderer**: overkill, accessibility nightmare.

---

## Decision 5: Time axis for the grid

**Decision**: Fixed 00:00–24:00 vertical range. Each row is a fixed
pixel height (~64 px / hour by default, configurable via CSS variable),
giving a total row height of ~24 × 64 = 1536 px on desktop. Page
scrolls vertically if the viewport is shorter.

**Rationale**:
- Simple and predictable: a shift at 09:00 is always 9 × 64 = 576 px
  from the top of its row.
- Captures all real-world shifts (no clipping for night shifts at
  22:00–06:00 if we extend the day-1 cell into the next day's start).
- Reads naturally: longer shifts look longer.

**Alternatives considered**:
- **Auto-fit to "active hours"**: would need to scan all shifts for
  the min/max hours and constrain the axis. Phase 4+ concern.
- **Horizontal time axis (days as rows, hours as columns)**: cognitive
  switch from Google Calendar / Agendrix. No advantage.

---

## Decision 6: Drag-and-drop semantics — date + employee, NOT time

**Decision**: A drag changes the shift's **date** (which day) and
optionally its **assignee** (which row). It does NOT change the
**time-of-day** (start/end stay the same). To change times, click the
block → edit dialog.

**Rationale**:
- Drop targets are entire cells (one per (day, employee)). Letting the
  user drop at an arbitrary Y-coordinate to change start time would
  add a snap-to-minute / snap-to-15-min concern that bloats the
  implementation and lowers usability (accidental moves).
- Click-to-edit (existing) handles time changes cleanly.
- Matches the spec's drag-and-drop scope (FR-008).

**Alternatives considered**:
- **Drag to change time too** (Google Calendar style): a real feature
  win, but adds collision detection within a row's hours and a much
  more involved sensor + ghost-rendering implementation. Deferred to
  a future phase.

---

## Decision 7: Optimistic UI for drag-and-drop

**Decision**: Use React 19's `useOptimistic` to apply the move
client-side immediately on drop. The Server Action commits or rejects
behind the scenes; on rejection we revert and surface an error toast.

**Rationale**:
- Drop should FEEL instant — waiting for a round-trip before the
  block moves looks broken.
- React 19's `useOptimistic` is the standard idiom for this in the App
  Router. Built for exactly this case.
- The server is still the source of truth: after the action settles,
  we re-derive optimistic state from the new authoritative shifts.

**Alternatives considered**:
- **Pessimistic (wait for server before moving)**: slower, looks
  laggy.
- **Hand-rolled local state with manual revert**: re-implements
  `useOptimistic`. No reason to.

---

## Decision 8: Empty state — inline SVG, no external asset

**Decision**: Author a small calendar-themed SVG illustration inline
in `EmptyWeekCard.tsx`. No external CDN, no licence concerns, no
bundle bloat.

**Rationale**:
- Inline SVG inherits `currentColor` so it auto-supports dark mode.
- ~50 lines of JSX. No build-time asset pipeline complication.
- No external dependency means no risk of broken-link or
  copyright drift.

**Alternatives considered**:
- **External illustration libraries** (unDraw, etc.): great quality
  but a hosting + attribution dance.
- **Lucide icon**: too small for an empty-state card hero.

---

## Decision 9: Theme cookie name and shape

**Decision**: Cookie name `agendrix-theme`, value `"light"` or `"dark"`
(or absent → fall back to `prefers-color-scheme`). Path `/`, no
expiry (session) by default; promote to 1-year `Max-Age` so the choice
sticks across browser restarts.

**Rationale**:
- Cookie (not localStorage) so the server can read it during SSR and
  apply the theme class on the initial render → no FOUC.
- 1-year persistence is the industry-standard "remember my choice"
  duration.
- No PII, no auth association — purely a UI preference.

**Alternatives considered**:
- **Per-user DB column**: requires an auth check + a DB write per
  toggle. Heavier for a presentation preference.
- **localStorage**: hits FOUC on SSR. Bad.

---

## Open Questions

None. Stack additions justified; semantics nailed.
