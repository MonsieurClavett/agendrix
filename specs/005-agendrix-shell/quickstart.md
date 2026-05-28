# Quickstart — Agendrix-Style Shell

**Feature**: Agendrix-Style Shell
**Date**: 2026-05-28

How to verify Phase 4 end-to-end. Assumes Phases 0–3 are running.

## First-time setup (delta against Phase 3)

1. Switch branch:
   ```powershell
   git checkout 005-agendrix-shell
   ```
2. Install the new dep:
   ```powershell
   npm install
   ```
3. Restart the dev server.

## Smoke tests

### US1 — Sidebar shell

1. Sign in as a MANAGER on desktop. **Expected**: the page renders
   inside a layout with a fixed left sidebar containing three nav
   items (Accueil / Horaires / Équipe), a theme toggle and a sign-out
   button at the bottom. The Accueil item is highlighted as active.
2. Click "Horaires". **Expected**: navigates to `/schedules`; the
   Horaires item now has the active highlight; the Accueil item is
   no longer active.
3. Click "Équipe". **Expected**: navigates to `/team`; Équipe is
   highlighted active.
4. Sign out via the sidebar's sign-out button. **Expected**: redirect
   to `/login`.

### US1 — EMPLOYEE sidebar

1. Sign in as an EMPLOYEE. **Expected**: the sidebar has only
   "Accueil" and "Horaires" — no "Équipe". (Direct navigation to
   `/team` still redirects per Phase 1's role guard.)

### US1 — Responsive sidebar

1. As a MANAGER, shrink the browser to ~900 px (between 768 and 1023).
   **Expected**: sidebar collapses to icon-only mode; hovering a nav
   icon shows a tooltip with the label.
2. Shrink to < 768 px. **Expected**: the sidebar disappears; a
   hamburger button appears in the header. Click it → sidebar slides
   in from the left as a drawer. Click outside to dismiss.

### US1 — Brand color

1. Compare the "Créer" / "Confirmer" / primary action buttons to the
   pre-Phase-4 neutral. **Expected**: they now use a calm teal accent
   in both light and dark themes. The active nav indicator and focus
   rings also use teal.

### US2 — Schedule toolbar + grid

1. As MANAGER, open `/schedules`. **Expected**: a top toolbar with
   "Créer", search input, "Aujourd'hui", previous-week arrow + date
   range "{from}–{to} {month} {year}" + next-week arrow, and a view
   selector showing "Semaine".
2. The grid below shows one row per employee with:
   - A circular avatar (initials, colored background)
   - The employee's full name
   - A small "Xh" total below the name
3. Each (day, employee) cell shows shifts as compact stacked cards.
   Each card: bold time range on top, "Quart" (or the shift's note)
   below.
4. The far-right "Total" column shows each employee's week total.
5. The bottom row "Total pour la succursale" shows each day's total
   AND the grand week total (rightmost cell).

### US2 — Search filter

1. Type "ali" in the search input. **Expected**: only rows whose
   employee name contains "ali" (case-insensitive) remain visible.
   The toolbar's "Total pour la succursale" row recomputes to
   reflect only the visible rows.
2. Clear the search. **Expected**: all rows reappear.

### US2 — Drag-and-drop still works

1. Drag a compact card from one cell to another. **Expected**: the
   card moves optimistically; on success → green toast "Shift
   déplacé." + persistence; on overlap → red toast + rollback. Same
   behavior as Phase 3.

### US3 — Filter panel placeholder

1. As MANAGER on a viewport ≥ 1024 px, open `/schedules`. **Expected**:
   to the left of the calendar (and to the right of the sidebar) there
   is a panel ~240 px wide with three sections.
2. Hover the "Position" segment in "Gérer par". **Expected**: a
   tooltip "Bientôt disponible" appears. Clicking does nothing.
3. Hover any checkbox in the Filtres/Positions or Affichage sections.
   **Expected**: tooltip with the same hint. The checkbox is dimmed
   and not clickable.
4. Shrink to < 1024 px. **Expected**: the filter panel disappears;
   the calendar gets the full content width.

### Accessibility — keyboard navigation

1. Tab through the sidebar nav items. **Expected**: each receives a
   visible focus ring (teal). Pressing Enter activates the link.
2. Tab into the toolbar search and type to filter. **Expected**:
   filtering works without a mouse.

### Math correctness — totals always match

1. With multiple employees and shifts visible, mentally (or on paper)
   sum a day-column. **Expected**: the day-column "Total pour la
   succursale" cell equals your sum.
2. Sum the per-employee Totals column. **Expected**: it equals the
   grand-total cell at the intersection of the Total column and the
   Total row.

## What this feature explicitly does NOT do (Phase 4)

- No real positions filter (Phase 5+).
- No real "quarts à combler" (Phase 5+).
- No real "Masquer" toggles (Phase 5+).
- No publish workflow (Phase 6+).
- No drag-to-resize, no recurring shifts.
- No profile photos on avatars (initials only).
- No keyboard shortcuts beyond standard Tab/Enter.
