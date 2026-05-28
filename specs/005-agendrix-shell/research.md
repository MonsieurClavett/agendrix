# Phase 0 — Research & Design Decisions (Phase 4 feature)

**Feature**: Agendrix-Style Shell
**Date**: 2026-05-28

Spec had zero `NEEDS CLARIFICATION` markers. Library + design choices
recorded below.

---

## Decision 1: Sidebar primitive — hand-roll, do NOT install shadcn Sidebar

**Decision**: Author a custom `<Sidebar>` + `<MobileSidebar>` pair
using existing primitives (CSS Grid, Tailwind responsive classes,
Radix Dialog for the mobile drawer). Do NOT install the official
shadcn Sidebar primitive.

**Rationale**:
- shadcn's Sidebar component is excellent but ships with ~6 sub-components
  (SidebarProvider, SidebarInset, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarTrigger, etc.) — overkill for a 3-item nav
  in an MVP. Hand-rolling stays under 100 LOC and is fully understood.
- Our needs are modest: a fixed left column on desktop, an
  icon-only band on tablet, and a hamburger drawer on mobile. All
  achievable with Tailwind's responsive prefixes + one Radix Dialog
  for the drawer.
- Less indirection → easier to skin (the teal accent) and to debug.

**Alternatives considered**:
- **shadcn Sidebar**: more accessible / featureful out of the box.
  Right call for an enterprise dashboard with 10+ nav items + groups.
  Wrong call for our 3-item MVP — overkill, more deps, more
  abstraction to read.

---

## Decision 2: Mobile drawer — hand-rolled Sheet around `@radix-ui/react-dialog`

**Decision**: Create `src/components/ui/sheet.tsx` exposing
`<Sheet>`, `<SheetTrigger>`, `<SheetContent side="left">`,
`<SheetHeader>`, `<SheetTitle>`, `<SheetClose>`, etc. Internally
wraps Radix Dialog primitives with side-aware animation classes
(slide in from the left).

**Rationale**:
- Radix Dialog is already installed (Phase 1). A Sheet is just a
  Dialog with side-aware positioning + slide animations. No new
  dep needed.
- Matches the shadcn `Sheet` API exactly, so the codebase reads as
  if we used shadcn — easy to swap later if we add the official
  component for richer features.

**Alternatives considered**:
- **shadcn Sheet** (`npx shadcn add sheet`): identical end result.
  Slight DX issue: the CLI hangs in our non-interactive shell
  (documented Phase 0 gotcha in CLAUDE.md). Faster to hand-roll.
- **Vaul (drawer lib)**: heavy for our needs; designed for iOS-style
  bottom sheets.

---

## Decision 3: Tooltip library — `@radix-ui/react-tooltip`

**Decision**: Install `@radix-ui/react-tooltip` and create a thin
shadcn-style wrapper at `src/components/ui/tooltip.tsx`.

**Rationale**:
- The filter panel has many disabled controls that need a hover hint
  ("Bientôt disponible — voir Phase 5"). Tooltips need correct ARIA,
  keyboard focus support, and portal-aware positioning.
- Radix Tooltip is the canonical primitive (~6 KB), accessible by
  default, used by shadcn's own Tooltip component.

**Alternatives considered**:
- **Native `title` attribute**: free but invisible on touch devices,
  no styling, slow appearance. Not acceptable for the visible-design
  goal.
- **Hand-rolled hover-card**: would re-implement portal, positioning,
  ARIA, delays. Not worth it.

---

## Decision 4: Brand accent color — calm teal, OKLCH-based

**Decision**: Shift the `--primary` and adjacent CSS variables from
the current neutral (oklch 0.205 0 0 in light, 0.922 0 0 in dark) to
a calm teal:
- Light theme `--primary`: `oklch(0.62 0.10 195)` (medium-saturation
  teal-blue, readable on white).
- Dark theme `--primary`: `oklch(0.74 0.11 190)` (lighter, more
  luminous teal that pops on dark grey).
- Matching `--primary-foreground`: white in light, near-black in dark.
- `--ring` (focus ring) matches the primary hue with reduced chroma.
- All other tokens (background, card, border, etc.) stay neutral —
  only the primary family changes.

**Rationale**:
- Teal is the dominant brand vibe of the inspiration (Agendrix-ish
  dashboards). Distinct from generic-shadcn neutral while staying
  accessible (sufficient contrast for AA on white and dark grey).
- OKLCH means the values are perceptually uniform across light/dark
  — same chroma reads similarly in both modes.
- Limiting the change to the `--primary` family means we don't have
  to re-test every component; only Buttons, focus rings, and the
  active nav indicator pick up the change.

**Alternatives considered**:
- **Full palette refresh** (warmer greys, custom accent + secondary):
  more visually impactful but a larger surface to verify in dark mode.
  Defer to a dedicated phase if the user wants more brand depth.
- **Multiple accent colors per feature** (e.g., teal for schedules,
  purple for team): premature segmentation; product is too small.

---

## Decision 5: Avatar — initials + deterministic-from-name color, no Radix Avatar

**Decision**: Create `src/components/ui/avatar.tsx` exposing
`<Avatar name={string} size={n} />` that renders a circular div with
two-letter initials on a deterministic background color drawn from a
fixed palette of 8 OKLCH colors. The mapping is `palette[hash(name) % palette.length]`
where `hash` is a small djb2-style string hash.

**Rationale**:
- We have no profile photos in Phase 4. The Radix Avatar primitive
  is designed for the image-with-fallback pattern; without images
  we'd only ever hit the fallback branch.
- A 50-LOC component covers what we need.
- Deterministic colors give the human eye a recognition shortcut
  ("Alice is the green one") without any per-user config.

**Alternatives considered**:
- **shadcn Avatar (`@radix-ui/react-avatar`)**: small (~3 KB) and
  correct for image + fallback. Add later when profile photos land.

---

## Decision 6: Compact-card layout — no time-axis math

**Decision**: The new ShiftBlock renders as a plain Card (rounded
border, padding, two text rows: time-range bold on top, secondary
label below). Cells (`DropCell`) render as flex columns with `gap-1.5`
that vertically stack their shift cards in chronological order. No
top/height computation from start/end times.

**Rationale**:
- The user explicitly requested this style ("Agendrix"). It's what
  the reference product does.
- Removes ~30 lines of date-math from `ShiftBlock` (no more
  `--hour-height` variable, no positioning calcs).
- Multiple shifts in a cell are now obviously stacked, not
  competing for the same Y coordinates.

**Alternatives considered**:
- **Keep the time-axis grid as an opt-in view**: spec scope is
  "Semaine compact" only for Phase 4. A "Jour" view with the axis
  could be Phase 5+.

---

## Decision 7: Totals — client-side derived state via useMemo

**Decision**: Compute per-employee, per-day, and grand-total hours
in the client `ScheduleCalendar` component using `useMemo` over the
(optimistic) `shifts` array. No server-side aggregation.

**Rationale**:
- The shift list is already loaded for rendering; totals are a
  trivial reduce over it.
- Client-side ensures totals update instantly during drag-and-drop
  (the optimistic shift state already drives the grid; totals derive
  from the same source automatically).
- Server-side aggregation would require a new repository function
  + an extra DB query and would NOT update during drag — strictly
  worse for our use case.

**Alternatives considered**:
- **Server-side aggregation**: rejected as above.
- **Memoized selector with reselect**: overkill.

---

## Decision 8: Employee search — client-side filter on the rendered rows

**Decision**: `ScheduleToolbar` exposes a controlled `<input>` whose
value lifts into `ScheduleCalendar` as `searchTerm`. The grid filters
the visible employee rows by `name.toLowerCase().includes(searchTerm.toLowerCase())`.

**Rationale**:
- ≤ 50 employees per company; substring filter on 50 strings is
  free at every keystroke.
- Clearing the input restores all rows immediately.

**Alternatives considered**:
- **URL-encoded search** (`?q=ali`): persists across navigation. Phase
  4 keeps it transient — search is a momentary "where is X" affordance,
  not a saved view.
- **Server-side search**: pointless at this scale.

---

## Decision 9: Filter-panel placeholder — disabled controls + Radix Tooltip

**Decision**: The FilterPanel renders functioning-looking checkboxes
+ segmented control, all with the `disabled` attribute set. Each
disabled control is wrapped in a `<Tooltip>` (Radix) whose content
is "Bientôt disponible". The `<TooltipTrigger asChild>` wraps the
disabled element; Radix handles the focus/hover delay.

**Rationale**:
- Visual presence sells the "real product" feel.
- The `disabled` attribute prevents accidental clicks and dims the
  control naturally.
- Radix Tooltip works on disabled buttons via the `asChild` +
  wrapping `<span>` pattern (a known Radix recipe), keeping the
  hint discoverable.

**Alternatives considered**:
- **Hide the controls entirely until Phase 5**: misses the point —
  the request is explicitly to *show* the layout now.
- **Functional filters that "filter to all"**: confusing UX.

---

## Open Questions

None.
