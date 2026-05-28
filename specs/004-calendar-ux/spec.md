# Feature Specification: Calendar UX Overhaul

**Feature Branch**: `004-calendar-ux`

**Created**: 2026-05-28

**Status**: Draft

**Input**: User description: "Phase 3 — refonte UI/UX du calendrier d'horaires. Remplacer la vue liste actuelle de /schedules par une vraie vue grille calendrier : 7 colonnes (lundi → dimanche), une ligne par employé en vue MANAGER. Les shifts sont des blocs visuels positionnés et dimensionnés selon leurs heures. Un MANAGER peut glisser-déposer un shift d'une cellule à une autre pour changer sa date et/ou son employé. Overlap rejeté avec toast d'erreur + rollback visuel. Click sur un shift = dialogue d'édition existant. Toasts (vert succès, rouge erreur) pour create/update/delete. Dark mode toggle dans le header, persisté par cookie. États vides avec illustration + CTA. Mobile (< 768px) bascule en vue verticale empilée par jour. Couche tenant et MANAGER-only intacts."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visual calendar grid view (Priority: P1)

A manager arrives at the schedules page and immediately understands the entire week at a glance. Instead of a vertical list of "Monday: shift A, shift B / Tuesday: shift C…", they see a true grid: 7 columns (one per day Mon–Sun) along the top, one row per employee on the left side. Each shift is a colored block positioned in the right cell, with its vertical height proportional to its duration. Empty cells are visibly empty, dense days are visibly dense. On a phone, the grid is impractical so the same page falls back to a clean vertical "day-by-day" stack with the same information.

**Why this priority**: This is THE visual transformation that makes the product feel like a scheduling tool instead of a database admin page. The current list view is functional but does not let you read "who's working when" at a glance — which is the core job of a schedule. Every other Phase 3 polish depends on this surface existing.

**Independent Test**: A signed-in MANAGER with at least one company employee and several shifts across different days opens `/schedules`. On a desktop browser (≥ 768 px wide), they see a 7-column grid with the employees as rows; the shifts they previously created appear as positioned blocks in the right (day, employee) cells. On a phone-sized viewport (< 768 px), the same data shows up as a clean vertical day-by-day list.

**Acceptance Scenarios**:

1. **Given** a MANAGER on a desktop browser with employees {Alice, Bob} and shifts {Alice Mon 09:00–17:00, Bob Tue 13:00–21:00}, **When** they open `/schedules` for the current week, **Then** the page renders a grid with day-column headers Mon..Sun, a row for Alice and a row for Bob, Alice's shift as a block in the (Mon, Alice) cell sized to 8 hours, and Bob's shift as a block in the (Tue, Bob) cell sized to 8 hours.
2. **Given** a MANAGER, **When** they shrink the browser window to less than ~768 px width (or open on a phone), **Then** the page automatically switches to a stacked vertical view: 7 day-sections in order, each listing its shifts; no horizontal scrolling needed.
3. **Given** a MANAGER, **When** they navigate to the next or previous week, **Then** the calendar grid (or mobile stack) re-renders with the new week's data and the day-column headers update to the correct dates.
4. **Given** a MANAGER viewing the desktop grid, **When** a shift spans midnight (e.g., 22:00 → 06:00 next day), **Then** it MAY visually clip at the bottom of its start-day cell, but the displayed label MUST clearly indicate the end time and the "+1 day" suffix so the spanning is obvious.
5. **Given** an EMPLOYEE on a desktop, **When** they open `/schedules`, **Then** they see a single-row simplified version (only their own row) — the grid columns Mon..Sun remain, but the rows reduce to just them. (Drag-and-drop is not available; see US2.)

---

### User Story 2 - Drag-and-drop shift reassignment (Priority: P2)

A manager looks at the grid and decides Bob should cover Alice's Tuesday shift instead of Wednesday's. They grab the shift block with the mouse, drag it from the (Tuesday, Alice) cell to the (Wednesday, Bob) cell, and release. The shift updates: new date, new assignee. If the drop would create an overlap with another shift Bob already has on Wednesday, the move is rejected (the shift snaps back to its original spot) and a red toast surfaces the reason.

**Why this priority**: This is the killer scheduling UX. Click-to-edit (already in Phase 2) is fine but slow. Drag-and-drop turns shift juggling into a single gesture. P2 because the grid (US1) is the prerequisite — without the grid, there is nothing to drag.

**Independent Test**: With the grid view in place and at least two shifts visible, a MANAGER drags one shift block from its current cell to another cell. On release, the shift's date and/or assignee update to match the destination cell, and the change is persisted (visible after a refresh). A drag that would create an overlap is rejected with a visible toast and the shift returns to its origin cell.

**Acceptance Scenarios**:

1. **Given** a MANAGER viewing the grid with Alice's shift on Monday 09:00–17:00, **When** they drag that shift block to Wednesday's column under Bob's row and release, **Then** the shift is now on Wednesday assigned to Bob, with the same 09:00–17:00 time window. The change persists across page reloads.
2. **Given** a MANAGER, **When** a drag-and-drop would create a shift that overlaps an existing shift of the destination employee, **Then** the system rejects the move, displays a red toast with the message "Un autre shift de cet employé chevauche déjà cette plage horaire.", and the dragged shift visually returns to its original cell.
3. **Given** a MANAGER mid-drag, **When** they release the shift OUTSIDE any valid cell (e.g., on the header or outside the grid), **Then** the shift returns to its original cell without any backend call.
4. **Given** a MANAGER who started a drag, **When** they press Escape mid-drag, **Then** the drag is cancelled and the shift remains in its original cell.
5. **Given** an EMPLOYEE on the schedules page, **When** they attempt to drag any shift block, **Then** nothing happens — drag handles are not registered for their role.
6. **Given** a MANAGER on a mobile-width viewport (< 768 px) where drag-and-drop is impractical, **When** they view the stacked day-by-day list, **Then** shifts are not draggable; click-to-edit remains available as the only edit affordance on small screens.

---

### User Story 3 - Polish: toasts, dark mode, empty states (Priority: P3)

The product gains modern interaction polish. Every shift mutation (create, edit, delete, drag-move) confirms success with a green toast in the corner or surfaces failure with a red toast. The header carries a sun/moon icon that flips the entire interface between light and dark mode — and the choice persists between sessions. Weeks with no shifts no longer show seven flat "Aucun shift" lines; they show a single centered card with a friendly illustration and a clear next-action button ("Ajouter un shift" for managers, "Aucun shift cette semaine" for employees).

**Why this priority**: Each piece is small but they collectively make the product feel finished. P3 because they ride on top of the grid (US1) and the data flow (US2) — none of them changes capability, they all change perceived quality.

**Independent Test**: After completing a shift create, edit, delete, or drag — a toast appears confirming the outcome (green) or stating the error (red). Clicking the sun/moon icon in the header switches the whole UI between light and dark; refreshing the page preserves the choice; signing out and back in preserves it. Navigating to a week with no shifts shows the empty-state card with the illustration, not seven empty day boxes.

**Acceptance Scenarios**:

1. **Given** a MANAGER creates a shift successfully, **When** the create action returns, **Then** a green toast appears in the top-right of the screen (or appropriate location) with text like "Shift créé." and dismisses automatically after ~4 seconds.
2. **Given** any shift mutation fails (overlap, not-found, etc.), **When** the action returns, **Then** a red toast appears with the error message and remains until dismissed by the user (or auto-dismisses after a longer delay).
3. **Given** a user on the dashboard, **When** they click the sun icon in the header (currently in light mode), **Then** the entire interface switches to dark mode and the icon swaps to a moon. Refreshing the page and signing out/in preserves the dark choice.
4. **Given** a MANAGER on a week with no shifts in their company, **When** they open `/schedules` for that week, **Then** they see a single centered card (not seven empty day boxes) containing an illustration, the text "Aucun shift cette semaine.", and an "Ajouter un shift" button.
5. **Given** an EMPLOYEE on a week with no shifts assigned to them, **When** they open `/schedules` for that week, **Then** they see the same empty-state card but with text appropriate to their role ("Aucun shift cette semaine.") and no action button.

---

### Edge Cases

- **Drag to a cell where the destination is a deactivated employee** (only possible when viewing the existing assignment of a previously active employee): rejected with a toast "Cet employé est désactivé."
- **Drag during which the user navigates to another week** (theoretically possible via keyboard): drag is cancelled cleanly, no orphan state.
- **Two managers drag the same shift simultaneously**: at most one update commits; the other surfaces the standard overlap-or-not-found error via toast.
- **Dark mode flash on initial load (FOUC)**: the user MUST NOT see a flash of the wrong theme on page navigation. (Implementation responsibility: read the cookie server-side and apply the class before the body renders.)
- **Toast queue overflow**: if the user triggers many mutations in quick succession, no more than ~5 toasts stack at once; older ones either dismiss or scroll.
- **Empty-state CTA for an EMPLOYEE**: no "Add shift" CTA — they cannot create. The card text adapts.
- **Mobile orientation change**: if the user rotates from portrait to landscape and crosses the 768-px breakpoint, the view switches between stack and grid without losing the selected week.
- **A shift whose start time falls outside the displayed hours band on the grid** (e.g., a 03:00 shift on a grid that starts visualisation at 06:00): the grid SHOULD render an early-hours indicator OR extend its time axis to cover 00:00–24:00. Either is acceptable for Phase 3.

## Requirements *(mandatory)*

### Functional Requirements

**Visual grid (US1)**

- **FR-001**: On viewports ≥ 768 px wide, the `/schedules` page MUST render a two-dimensional grid: columns represent the 7 days of the selected week (Mon → Sun), rows represent the visible employees (all employees of the company for a MANAGER, only the requester for an EMPLOYEE).
- **FR-002**: Each shift MUST appear as a visual block placed in the cell corresponding to its (start-day, assignee) coordinates. The block's vertical height MUST be proportional to the shift's duration so a 2-hour shift looks visibly smaller than an 8-hour shift.
- **FR-003**: Each shift block MUST display at minimum: the start–end time, and (when the available block height allows) the optional note. Long notes truncate with ellipsis.
- **FR-004**: Shifts of deactivated employees MUST still appear in the grid (history is preserved), with a visible "désactivé" indicator next to the employee's name in the row label.
- **FR-005**: On viewports < 768 px wide, the same data MUST render as a vertical stacked list (one section per day) with no horizontal scrolling required.
- **FR-006**: Week-navigation controls (previous / current / next) MUST remain present and functional in both grid and stacked views.

**Drag-and-drop (US2)**

- **FR-007**: On viewports ≥ 768 px, MANAGER users MUST be able to grab a shift block with the pointer and drag it to another cell in the grid.
- **FR-008**: On drop into a valid destination cell, the system MUST persist the shift's new date and (if changed) its new assignee, keeping the start time and duration unchanged.
- **FR-009**: If the drop would create an overlap with another existing shift of the destination employee, the system MUST reject the move, return the shift visually to its origin cell, and surface a red error toast with the existing overlap message.
- **FR-010**: If the user releases the drag outside any valid cell, OR presses Escape mid-drag, the shift MUST return to its origin cell with no backend call performed.
- **FR-011**: EMPLOYEE users MUST NOT have any drag handle wired on their view. Programmatic attempts to invoke the drag-driven Server Action with crafted form data MUST be rejected by the server (carry-over of the MANAGER-only check from Phase 2).
- **FR-012**: On viewports < 768 px, drag-and-drop MUST NOT be enabled (impractical with touch in a dense grid). Click-to-edit remains the sole edit affordance on small screens.

**Toasts (US3)**

- **FR-013**: Successful shift create, edit, delete, and drag-move actions MUST trigger a green success toast with concise confirmation text.
- **FR-014**: Failed shift mutations MUST trigger a red error toast carrying the user-facing error message (same wording as Phase 2: "Un autre shift de cet employé chevauche déjà cette plage horaire.", "Shift introuvable.", "Employé introuvable.", etc.).
- **FR-015**: Success toasts MUST auto-dismiss after a short delay (~3–5 seconds). Error toasts MAY remain until dismissed by the user or auto-dismiss after a longer delay; they MUST be visually distinct from success toasts.

**Dark mode (US3)**

- **FR-016**: A theme-toggle control (sun/moon icon) MUST appear in the application header on every authenticated page, accessible to MANAGER and EMPLOYEE alike.
- **FR-017**: Toggling the control MUST switch the entire interface (all pages, all components) between a light theme and a dark theme. The choice MUST persist between page navigations and between sessions for the same browser.
- **FR-018**: On a fresh page load, the chosen theme MUST be applied before the user sees any content — no visible "flash of unstyled content" or wrong-theme flash.

**Empty states (US3)**

- **FR-019**: Weeks with zero shifts MUST render a single centered empty-state card containing an illustration, descriptive text, and a primary action button when an action is available (MANAGER → "Ajouter un shift"; EMPLOYEE → no button, just text).
- **FR-020**: Empty-state rendering MUST NOT silently replace the week-navigation controls; users MUST still be able to move to other weeks from the empty state.

**Carry-over invariants from Phases 0–2**

- **FR-021**: All tenant isolation guarantees from Phase 0 MUST hold: no view, drag-and-drop action, or shift mutation may expose or modify data belonging to another company.
- **FR-022**: All role gating from Phases 1–2 MUST hold: only MANAGER may create / edit / delete / drag shifts; EMPLOYEE views are read-only.
- **FR-023**: All overlap-detection guarantees from Phase 2 MUST hold for drag-and-drop reassignments as well as form-driven edits.

### Key Entities

No new database entities. This phase is presentation-layer only — it extends how existing `Shift`, `User`, and `Company` data is rendered and interacted with. A small client-side **Theme Preference** state is introduced, persisted in a cookie keyed per browser (not per user). It carries one of two values: `"light"` or `"dark"` (default falls back to the OS-level preference if no cookie is set).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A MANAGER can read "who is working on a given day" by scanning a single column of the grid in under 3 seconds, without scrolling — for any week with up to 20 employees and 50 shifts.
- **SC-002**: A MANAGER can reassign a shift to another employee on another day using a single drag-and-drop gesture in under 5 seconds end-to-end (initial grab → drop → toast confirmation).
- **SC-003**: Drag-and-drop moves that would create overlaps are rejected 100% of the time and the dragged block visually returns to its origin in under 500 ms.
- **SC-004**: 100% of shift mutations (create, edit, delete, drag-move) surface either a success or an error toast — no silent successes, no silent failures.
- **SC-005**: Theme preference (light/dark) is preserved across at least: (a) page navigation within the same session, (b) full page reload, (c) sign-out + sign-in in the same browser.
- **SC-006**: On a fresh page load with a dark theme selected, zero light-theme flash is visible (no detectable FOUC).
- **SC-007**: On a mobile-width viewport (375 × 667 px reference, iPhone SE-ish), every page of the app remains usable without horizontal scrolling for primary content — the schedules page in particular renders the stacked daily view cleanly.
- **SC-008**: Empty weeks render a single centered call-to-action card; managers click that CTA and land directly in the create-shift dialog (1 click).

## Assumptions

- **Visualisation hours band**: the desktop grid renders a fixed time axis from 00:00 to 24:00 by default. A future phase may add a "zoom to active hours" toggle. Phase 3 does not.
- **No timezone selector**: shifts are displayed in the runtime's local time, consistent with Phase 2.
- **Drag-and-drop is desktop-only**: explicitly disabled below the 768 px breakpoint. A touch-friendly drag interaction is a future phase.
- **No drag-to-resize**: the drag gesture changes (date, employee) but never the duration. Resizing is done via the existing edit dialog.
- **No undo for drag-and-drop**: once the move is committed (toast shown), the user must drag back manually to revert. A general undo is a future polish phase.
- **Theme preference is per-browser, not per-user**: storing it in a cookie keeps the implementation simple (no DB column, no auth gate). The choice carries across sessions on the same device but not across devices.
- **The illustration for the empty state is a small inline SVG** authored as part of this phase (no external asset). It carries no licence concerns.
- **Toast library**: a single small toast library (one new dependency) is acceptable to avoid hand-rolling positioning, queueing, and animations. The library MUST be a well-maintained, dependency-light primitive.
- **Drag-and-drop library**: similarly, a single drag-and-drop library is acceptable to avoid implementing pointer/keyboard/touch interactions from scratch. The library MUST be a well-known, accessible primitive.
- **Optimistic UI for drag-and-drop**: on drop, the shift visually moves immediately; the server call confirms or rolls back. The user does NOT see a loading spinner blocking the move.
- **No animations beyond essentials**: subtle hover and drag feedback only. No celebratory confetti or theatrical transitions — keeps the product calm.
- **Accessibility baseline**: drag-and-drop MUST also be operable via keyboard (industry-standard expectation for accessible drag libraries). Toasts MUST be announced to screen readers as live regions.

## Dependencies

- **Phase 2** (Weekly Schedules) MUST be in place: `Shift` entity, repository layer, Server Actions for create/update/delete, week parsing in URL. Phase 3 reuses every one of these — the only new server-side touchpoint is that `updateShiftAction` is now invoked by drag-and-drop as well as by the edit dialog.
- **Phases 0 + 1** carry over (auth, tenant isolation, employee management).
- A working hosted relational database (carry-over).
- A modern browser supporting cookies, CSS Grid, Pointer Events API, and DOM `prefers-color-scheme` media query.
