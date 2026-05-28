# Feature Specification: Positions

**Feature Branch**: `006-positions`

**Created**: 2026-05-28

**Status**: Draft

**Input**: User description: Introduce a Position entity (name + color, per-company); managers CRUD positions; each shift can carry an optional position; calendar cards display a colored pill; the filter panel's "Positions" section + "Gérer par Position" toggle become functional.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage positions (Priority: P1)

A manager wants to define the roles their team can be scheduled into — for a restaurant: "Bar", "Cuisine", "Service", "Runner". They navigate to a dedicated positions page, see the current list (empty on first visit), and add a position by giving it a short name and picking a color from a palette. They can rename, recolor, and remove positions later. Removing a position does not delete the shifts that were assigned to it — those shifts simply lose their position tag.

**Why this priority**: Every other Phase 5 capability depends on a position existing. Without P1, there is nothing to assign, nothing to filter on, and the filter-panel placeholders stay placeholder.

**Independent Test**: A signed-in MANAGER opens the positions page, creates "Service" with the teal color, sees it appear in the list. Renames it to "Salle". Recolors it. Deletes it. List updates accordingly across all three operations.

**Acceptance Scenarios**:

1. **Given** a signed-in MANAGER with no positions yet, **When** they open the positions page, **Then** they see an empty-state card with an "Ajouter une position" button.
2. **Given** the MANAGER, **When** they create a position with name "Service" and a chosen color, **Then** the position appears in the list with the right name and a colored swatch.
3. **Given** an existing position, **When** the MANAGER renames it, **Then** the new name is reflected immediately on the positions page AND on every shift card already tagged with it.
4. **Given** an existing position assigned to several shifts, **When** the MANAGER deletes it after confirming, **Then** the position disappears from the list and from the filter panel, AND every shift previously assigned to it remains in the database with `positionId = null` (it now reads "Quart" again, with no colored pill).
5. **Given** the MANAGER, **When** they try to create a position with an empty name, **Then** the form is rejected with a field-level message.
6. **Given** an EMPLOYEE, **When** they attempt to reach the positions page, **Then** they are redirected to the dashboard with the same "vous n'avez pas accès" flash message used in Phase 1 for `/team`.

---

### User Story 2 - Tag shifts with positions + colored pills on cards (Priority: P2)

A manager creating or editing a shift now sees a "Position" selector in the form (next to date / time / note), with the company's positions plus an "Aucune" option (default). After saving, the shift card on the calendar displays a colored pill or accent strip in the position's color, and the secondary line of the card reads the position's name instead of the generic "Quart". The drag-and-drop semantics from Phase 3 continue to work — moving a shift between cells keeps its position unchanged.

**Why this priority**: This is the visible payoff of P1 — colored pills on the calendar are the single biggest visual signal that the product is "real". P2 because creating positions (P1) must precede tagging shifts.

**Independent Test**: With at least one position created (P1), a MANAGER creates a shift, picks "Service" in the position selector, saves. The shift card on the calendar shows a teal pill/strip and the text "Service" in place of "Quart". Editing the shift back to "Aucune" removes the pill and restores "Quart".

**Acceptance Scenarios**:

1. **Given** the company has positions {Service (teal), Cuisine (amber)}, **When** the MANAGER creates a new shift and picks "Service", **Then** the shift card on the calendar shows a teal accent (pill or left border) and a secondary line "Service".
2. **Given** an existing shift tagged "Service", **When** the MANAGER edits it and changes the position to "Cuisine", **Then** the card immediately re-colors to amber and the secondary line reads "Cuisine".
3. **Given** an existing shift tagged "Service", **When** the MANAGER edits it and picks "Aucune", **Then** the card loses its colored accent and the secondary line reverts to "Quart".
4. **Given** a shift tagged "Service", **When** the MANAGER drags it to another (day, employee) cell, **Then** the new position assignment of the moved shift is unchanged — the destination card still shows "Service" with the teal accent.
5. **Given** an EMPLOYEE, **When** they look at their own shifts in the schedule view, **Then** they see the same colored pills + position names as the MANAGER, but cannot edit them.

---

### User Story 3 - Filter and group by position (Priority: P3)

A manager working a busy week wants to focus only on Service shifts. They open the filter panel and tick "Service" — the calendar grid hides every shift that does not have Service as its position. They tick "Cuisine" as well — both kinds of shifts now show. They tick "Sans position" — shifts with no position assignment also appear. They click the "Gérer par Position" segment — the grid reorganizes: instead of one row per employee, it shows one row per position, with each shift's employee name visible on the card. This makes "who is on the Bar tonight" a one-glance question.

**Why this priority**: P3 because the filter panel works without it (P2 already colors the cards). Filtering and grouping is the productivity layer that unlocks the manager's actual workflow.

**Independent Test**: With positions {Service, Cuisine} and several shifts of each, the MANAGER ticks "Service" only — calendar shows only Service shifts. Ticks "Sans position" — untagged shifts also appear. Clears all checkboxes — all shifts come back. Clicks "Gérer par Position" — rows become Service / Cuisine / Sans position, with employee name on each card.

**Acceptance Scenarios**:

1. **Given** the company has positions {Service, Cuisine, Bar} and shifts tagged with each, **When** the MANAGER ticks only "Service" in the filter panel, **Then** the grid only shows shifts whose `positionId` matches Service. Cuisine and Bar shifts disappear. Shifts with no position also disappear.
2. **Given** the same setup, **When** the MANAGER additionally ticks "Sans position", **Then** the grid shows Service-tagged shifts AND untagged shifts (positionId is null).
3. **Given** the MANAGER, **When** they clear all checkboxes, **Then** the grid shows every shift again (no filtering).
4. **Given** the MANAGER, **When** they click the "Gérer par Position" segment in the "Gérer par" toggle, **Then** the grid reorganizes: rows are positions (in the order of the positions page), each shift card includes the assignee's name (because rows are no longer keyed by employee). Shifts without a position go to a "Sans position" row at the bottom. The "Total" column sums each position's hours; the footer row "Total pour la succursale" still totals the displayed (post-filter) hours per day and grand-total.
5. **Given** "Gérer par Position" is active, **When** the MANAGER drags a shift card from row "Service" to row "Cuisine", **Then** the shift's position changes from Service to Cuisine (and the same overlap detection / toast feedback applies — overlap check is still per-employee, not per-position).
6. **Given** filters and grouping are both active, **When** the MANAGER unticks all positions, **Then** the grid is empty with the existing Phase 3 empty-state card showing.

---

### Edge Cases

- **Duplicate position name in the same company**: rejected with a clear message ("Une position avec ce nom existe déjà").
- **Position name in a DIFFERENT company can repeat**: yes — names are unique per company, not globally.
- **Concurrent deletes**: at most one succeeds; the loser sees an "introuvable" message.
- **A shift's position is renamed mid-week**: the card label updates on next render. No additional notification.
- **A position is deleted while a MANAGER is viewing the calendar with that position checked in the filter**: on next interaction the filter checkbox disappears and the grid reflows.
- **Color collision** (two positions chosen with the same color): allowed but discouraged via UI grouping; not an error.
- **Filter-panel state after navigation**: filter and grouping selections are NOT persisted across page reloads in Phase 5. They reset to "no filters / Gérer par Employé" on each fresh visit. (Future polish phase may persist via URL or cookie.)
- **EMPLOYEE attempting to invoke a position-mutation Server Action via crafted request**: rejected at the server (carry-over MANAGER-only check).
- **Grouping by position when zero positions exist**: the grid shows only the "Sans position" row containing every shift; the toggle remains usable but degenerate.

## Requirements *(mandatory)*

### Functional Requirements

**Position CRUD (US1)**

- **FR-001**: System MUST provide a dedicated MANAGER-only page (e.g. `/positions`) listing the current company's positions, with the controls to add, rename, recolor, and delete.
- **FR-002**: System MUST allow a MANAGER to create a position with a non-empty name (≤ 40 chars) and a color picked from a fixed palette of at least 8 distinct colors.
- **FR-003**: System MUST reject creation of a position whose name (case-insensitive, trimmed) already exists in the same company, with a clear user-facing message.
- **FR-004**: System MUST allow a MANAGER to rename and recolor any position belonging to their company.
- **FR-005**: System MUST allow a MANAGER to delete any position belonging to their company. Deletion MUST set the `positionId` of any shift that referenced this position to null — shifts MUST NOT be cascade-deleted.
- **FR-006**: Deletion MUST require an explicit confirmation in the UI.

**Tag shifts with positions (US2)**

- **FR-007**: Shifts MUST gain an optional `positionId` field; existing Phase 0–4 shifts default to null (untagged).
- **FR-008**: The create-shift and edit-shift forms MUST include a position selector. The selector MUST list every active position of the current MANAGER's company plus an "Aucune" option (default). Selecting "Aucune" sets `positionId` to null.
- **FR-009**: System MUST verify that any `positionId` supplied by a Server Action belongs to the MANAGER's company. Cross-tenant position assignment MUST be rejected.
- **FR-010**: The schedule view MUST render a colored accent (a left-border or pill) on each shift card whose `positionId` is set, using the position's color. The card's secondary text line MUST display the position's name in place of the generic "Quart" label.
- **FR-011**: Untagged shifts (`positionId = null`) MUST continue to display the secondary line "Quart" with no colored accent (carry-over from Phase 4).
- **FR-012**: The drag-and-drop reassignment MUST NOT change a shift's `positionId` — only its `employeeId` and date change, as in Phase 3.

**Filter and group by position (US3)**

- **FR-013**: The schedule filter panel's "Positions" section MUST list every position of the MANAGER's company as a checkbox, each with its color swatch, plus a "Sans position" checkbox.
- **FR-014**: When zero checkboxes are ticked, the grid MUST show all shifts (no filter applied). When one or more checkboxes are ticked, the grid MUST show only shifts whose `positionId` is in the ticked set (and untagged shifts only if "Sans position" is ticked).
- **FR-015**: The "Gérer par" segmented control in the filter panel MUST become functional with two modes: "Employé" (current default; one row per employee) and "Position" (one row per position, with an extra "Sans position" row at the bottom for untagged shifts).
- **FR-016**: In "Gérer par Position" mode, each shift card MUST display the assignee's name on top of the existing time + position-name lines so the manager can see who is scheduled.
- **FR-017**: In "Gérer par Position" mode, the per-row Total column MUST sum hours per position; the per-day total + grand total MUST continue to sum across what is currently visible (i.e., respect active filters).
- **FR-018**: When a shift is dragged in "Gérer par Position" mode from one position-row to another, its `positionId` MUST update to the destination row (and the same Phase 3 overlap-check + toast pattern applies — overlap remains per-employee, not per-position).
- **FR-019**: Filter and grouping selections MUST live in client state for Phase 5; they do NOT persist across page reloads or week navigation.

**Carry-over invariants from Phases 0–4**

- **FR-020**: All tenant isolation guarantees from Phase 0 MUST hold for positions and for shift-position links.
- **FR-021**: Position CRUD MUST be restricted to MANAGER role.
- **FR-022**: Drag-and-drop, dark mode, toasts, sidebar, totals, and avatar coloring MUST continue to work unchanged.

### Key Entities

- **Position** (new): A scheduling category owned by a Company. Carries a short name (unique per company, case-insensitive), a color identifier (picked from a fixed palette), a `companyId` foreign key, and timestamps. Has many Shifts via an optional reverse relation.
- **Shift** (extended from Phase 2/3): Gains an optional `positionId` foreign key to Position. ON DELETE: set to null (a deleted position does not delete its shifts). Existing rows backfill to null.
- **Company** and **User**: unchanged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A MANAGER can create a new position end-to-end in under 30 seconds (open page → click add → fill name + pick color → save → see it in the list).
- **SC-002**: In adversarial testing, 100% of attempts by an EMPLOYEE to invoke any position-mutation Server Action (or to navigate to `/positions`) are rejected.
- **SC-003**: 100% of cross-tenant attempts (manager from Company A submits a `positionId` belonging to Company B) are rejected.
- **SC-004**: Deleting a position never deletes its shifts. Across the full test corpus, zero shifts disappear or become inaccessible after a position deletion.
- **SC-005**: A MANAGER can identify "who is scheduled on Service Thursday evening" with one click of the filter checkbox (ticking "Service" while viewing the week) and a scan of the Thursday column.
- **SC-006**: Switching between "Gérer par Employé" and "Gérer par Position" preserves the displayed week and active filters with no extra navigation.
- **SC-007**: The shift card's color pill is detectable at a glance (≥ 4 pixels of color on the card edge) and the position name is readable inside the card without truncation for names ≤ 16 characters.

## Assumptions

- **One position per shift** in Phase 5. Multi-tag (a shift that is "Bar + Service") is out of scope.
- **Color palette is fixed** (~8 colors). No custom hex input in Phase 5 — a curated palette gives consistent visual recognition and avoids accessibility footguns.
- **Position names are unique per company, case-insensitive**. "Service" and "service" cannot coexist.
- **No "position permissions"** (which employees can be scheduled on which position) in Phase 5. Any employee can be assigned any position. Restrictions are a Phase 6+ concern.
- **No default position per employee** in Phase 5.
- **Filter and grouping selections are NOT persisted** across page reloads. URL-encoded filter state is a future polish.
- **The positions list is small** (typically < 10 per company). No pagination, no search-within-positions.
- **Existing shifts remain untagged** until a manager edits them. There is no automatic migration to assign default positions.
- **Position deletion is hard delete** (`DELETE FROM Position`). No soft-delete column. Affected shifts have `positionId` set to null in the same operation.

## Dependencies

- **Phases 0–4** MUST be in place. Phase 5 reuses the tenant layer, the role gating, the shift schema, and the Phase 4 filter-panel scaffolding.
- A working hosted relational database (carry-over).
