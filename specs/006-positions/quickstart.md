# Quickstart — Positions

**Feature**: Positions
**Date**: 2026-05-28

How to verify Phase 5 end-to-end. Assumes Phases 0–4 are running.

## First-time setup (delta against Phase 4)

1. Switch branch:
   ```powershell
   git checkout 006-positions
   ```
2. Apply the new migration:
   ```powershell
   npx prisma migrate dev
   ```
3. Restart the dev server.

## Smoke tests

### US1 — Create / rename / recolor / delete positions

1. Sign in as a MANAGER. **Expected**: the sidebar now shows a new
   "Positions" item below "Équipe". Click it.
2. **Expected**: an empty-state card with an "Ajouter une position" button.
3. Click "Ajouter une position". Fill `name = "Service"`, pick a teal
   color, save. **Expected**: a new card in the list with the name
   "Service" and a teal swatch.
4. Add two more: "Cuisine" (amber), "Bar" (blue).
5. Click the edit icon on "Service" → rename to "Salle", change color
   to green, save. **Expected**: row updates immediately.
6. Click delete on "Bar" → confirm. **Expected**: row disappears.

### US1 — Duplicate name rejection

1. Try to create another position called "salle" (lowercase). **Expected**:
   rejected with "Une position avec ce nom existe déjà." No record created.

### US1 — EMPLOYEE cannot access

1. Sign in as an EMPLOYEE. **Expected**: the sidebar does NOT show
   "Positions". Manually navigate to `/positions`. **Expected**: redirected
   to the dashboard with the "vous n'avez pas accès" flash banner.

### US2 — Tag a shift with a position

1. Sign in as MANAGER. Open `/schedules`. Click "Créer" in the toolbar.
2. **Expected**: the create-shift dialog now includes a "Position" select
   with the company's positions plus "Aucune" (default).
3. Pick an employee, date, times, then pick "Salle" as the position. Save.
4. **Expected**: the new shift card has a green colored accent
   (left border or pill) and the secondary line reads "Salle" instead
   of "Quart".

### US2 — Untagged shift behavior

1. Create another shift with position "Aucune". **Expected**: card has no
   colored accent and the secondary line reads "Quart".

### US2 — Edit + change position

1. Click an existing shift card → edit. Change position to "Cuisine".
   Save. **Expected**: card recolors immediately.
2. Change position back to "Aucune". **Expected**: card loses its accent.

### US2 — Drag preserves position in employee mode

1. With "Salle"-tagged shift, drag it to another (day, employee) cell.
   **Expected**: green toast "Shift déplacé." The card remains in
   green with "Salle" as the secondary line. No position change.

### US3 — Filter checkboxes

1. With a mix of shifts tagged Salle, Cuisine, and untagged, open
   `/schedules`. Look at the filter panel.
2. **Expected**: the "Positions" section is now functional, listing
   "Salle", "Cuisine" with their color swatches + a "Sans position"
   checkbox.
3. Tick only "Salle". **Expected**: the grid filters to show only
   Salle-tagged shifts. Cuisine-tagged shifts and untagged shifts
   disappear.
4. Also tick "Sans position". **Expected**: untagged shifts also appear.
5. Untick everything. **Expected**: all shifts visible again.

### US3 — Group by Position

1. Click the "Position" segment in the "Gérer par" toggle.
2. **Expected**: the grid reorganizes — rows become "Salle", "Cuisine",
   "Sans position" (if any untagged shift exists). Each card shows
   the assignee's name (because rows are no longer keyed by employee).
3. The "Total" column sums hours per position. The footer "Total pour
   la succursale" still totals each day across the visible rows.

### US3 — Drag in Position mode reassigns position

1. In "Gérer par Position" mode, drag a card from row "Salle" to
   row "Cuisine" on the same day.
2. **Expected**: green toast "Shift déplacé." The card now sits in
   "Cuisine" with amber accent and "Cuisine" label. The employee
   assignment is unchanged.

### Overlap check still works in Position mode

1. In Position mode, drag a card onto another (position, day) cell where
   the SAME employee already has an overlapping shift.
2. **Expected**: red toast "Un autre shift de cet employé chevauche
   déjà cette plage horaire." Card snaps back.

### Position delete frees shifts

1. With shifts tagged "Salle", go to `/positions` and delete "Salle".
2. **Expected**: position disappears from the list AND from the filter
   panel. Return to `/schedules`. **Expected**: the previously-Salle-tagged
   shifts are still present in the grid, now untagged (no color accent,
   secondary line reads "Quart"). Zero shifts disappeared.

### Cross-tenant adversarial check

1. Sign in as a MANAGER of Company A. Create a position "TestA" via
   the UI. Open DevTools, copy the position id from the page source.
2. Sign out, sign in as a MANAGER of Company B. From DevTools,
   craft a request to `createShiftAction` with `positionId=<TestA's id>`.
3. **Expected**: server rejects with "Position introuvable." No shift
   created.

## What this feature explicitly does NOT do (Phase 5)

- No per-employee position restrictions.
- No default position for new shifts.
- No multi-tag (a shift with several positions).
- No reorder of positions list.
- No persistence of filter / grouping selections across reloads.
- No publish workflow.
