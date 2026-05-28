# Quickstart — Calendar UX Overhaul

**Feature**: Calendar UX Overhaul
**Date**: 2026-05-28

How to verify Phase 3 end-to-end. Assumes Phases 0–2 are running.

## First-time setup (delta against Phase 2)

1. Switch branch:
   ```powershell
   git checkout 004-calendar-ux
   ```
2. Install the new deps:
   ```powershell
   npm install
   ```
3. Restart the dev server (`npm run dev`).

## Smoke tests

### US1 — Visual grid

1. Sign in as a MANAGER. Open `/schedules` on a desktop browser
   (wide window).
2. **Expected**: A CSS Grid renders with 7 day-column headers
   (lundi → dimanche, with dates) and one row per active employee.
   Existing shifts appear as colored blocks positioned in the right
   cell, sized roughly to their duration (e.g. 8h shift looks ~8×
   larger than 1h shift).
3. Resize the browser window narrower than 768 px (or open on a phone).
4. **Expected**: The page automatically reflows into a vertical
   stacked view, one section per day, without horizontal scrolling.

### US1 — Deactivated employee row

1. As MANAGER, deactivate an employee that has shifts (`/team`).
2. Return to `/schedules`. **Expected**: that employee's row remains
   in the grid with their existing shifts; a "désactivé" badge
   appears next to their name in the row label.

### US2 — Drag-and-drop reassignment

1. As MANAGER on desktop, with at least 2 shifts and 2 employees
   visible, pick up a shift block with the mouse and drag it to a
   different (day, employee) cell.
2. **Expected**: The block instantly visually moves to the new cell
   (optimistic UI). Then a green toast appears: "Shift déplacé."
   Refresh the page — the change persists.

### US2 — Drag-and-drop overlap rejection

1. Create two shifts for the same employee on different days, then
   try to drag one onto a day/time the other already occupies.
2. **Expected**: The block snaps back to its original cell. A red
   toast appears: "Un autre shift de cet employé chevauche déjà
   cette plage horaire."

### US2 — Cancel via Escape

1. Pick up a shift block, drag it half-way to a destination, press
   Escape before releasing.
2. **Expected**: The drag cancels. Shift stays in its original cell.
   No toast.

### US2 — EMPLOYEE cannot drag

1. Sign in as an EMPLOYEE. Open `/schedules` on desktop.
2. **Expected**: Shift blocks render, but pointing at one and dragging
   does nothing. No drag handles registered. Click on a block does
   nothing (or shows a read-only view at most — no edit dialog).

### US3 — Toasts on every mutation

1. As MANAGER, open the create-shift dialog and save a valid shift.
   **Expected**: green toast "Shift créé."
2. Edit that shift via the dialog. **Expected**: green toast
   "Shift mis à jour."
3. Delete it via the confirm dialog. **Expected**: green toast
   "Shift supprimé."
4. Try to create a shift that overlaps another. **Expected**: red
   toast carrying the overlap message.

### US3 — Dark mode

1. Click the sun/moon icon in the header.
2. **Expected**: The whole interface (every page, every component)
   switches to dark theme. The icon swaps to indicate the current
   theme.
3. Navigate to `/dashboard`, `/team`, `/schedules` — confirm dark
   theme applies to all.
4. Reload the page. **Expected**: Still dark. No light-mode flash
   on initial paint.
5. Sign out, sign back in. **Expected**: Still dark in the same
   browser.

### US3 — Empty state

1. Navigate to a far-future week with no shifts.
2. **Expected**: A single centered card with a calendar SVG, the
   text "Aucun shift cette semaine.", and (for MANAGER) an
   "Ajouter un shift" button that opens the create dialog.
3. Sign in as an EMPLOYEE, navigate to a week with no shifts of
   theirs. **Expected**: same card, no action button.

### Accessibility — Keyboard drag

1. As MANAGER on desktop, Tab to a shift block. Press Space to
   pick it up. Use arrow keys to move it to another cell. Press
   Space to drop.
2. **Expected**: Same outcome as mouse drag — green toast on
   success, red toast + rollback on overlap.

### Mobile — Stacked view interactions

1. On a mobile-width viewport, open `/schedules` as MANAGER.
2. **Expected**: Vertical stack with shifts grouped by day; tapping
   "Ajouter un shift" opens the create dialog as before; tapping a
   shift row opens the edit dialog.

## What this feature explicitly does NOT do (Phase 3)

- No drag-to-resize shift duration.
- No undo for drag-and-drop moves.
- No customizable shift colors per employee.
- No realtime multi-user updates.
- No drag on mobile.
- No redesign of `/login`, `/signup`, `/dashboard`, or `/team` beyond
  the automatic dark-mode application.
