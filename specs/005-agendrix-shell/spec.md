# Feature Specification: Agendrix-Style Shell

**Feature Branch**: `005-agendrix-shell`

**Created**: 2026-05-28

**Status**: Draft

**Input**: User description: visual refresh to match Agendrix.com look-and-feel — sidebar navigation replacing the top header, schedule toolbar, compact stacked shift cards (replacing the 24h-axis blocks), totals per employee and per day, placeholder filter panel, and a teal brand accent color across the app.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Professional app shell with sidebar navigation (Priority: P1)

A user signs in and immediately sees a polished left-hand sidebar listing the main sections of the app (Accueil, Horaires, Équipe for managers, plus the theme toggle and logout at the bottom). Each item is an icon paired with a label. The currently active section is visually highlighted. On medium screens the sidebar collapses to icon-only mode; on phones it becomes a hamburger-triggered drawer. The header bar above the content area shows the company name and the user's avatar. The whole interface adopts a calmer, brand-aligned color scheme with teal-ish accents instead of the previous flat neutral.

**Why this priority**: This is the foundation everything else hangs off. Without the sidebar shell, the schedule redesign would still feel like a starter template no matter how nice the calendar is.

**Independent Test**: A signed-in user opens any authenticated page (`/dashboard`, `/team`, `/schedules`). They see a left sidebar with three nav items (Accueil, Horaires, Équipe-when-MANAGER), the currently active one is highlighted, the theme toggle and a sign-out control are present. Clicking each nav item navigates to the corresponding page and updates the highlight. On a narrow viewport, the sidebar collapses; on a phone-width viewport, a hamburger button opens it as a drawer.

**Acceptance Scenarios**:

1. **Given** a signed-in MANAGER, **When** they sign in and land on `/dashboard`, **Then** the page renders inside a layout that has a left sidebar with three nav items (Accueil/Horaires/Équipe), with "Accueil" highlighted as active. The header above the content shows the company name and a small avatar/initials menu.
2. **Given** a signed-in MANAGER, **When** they click the "Horaires" nav item, **Then** they navigate to `/schedules` and "Horaires" becomes the highlighted active item; the URL updates accordingly.
3. **Given** a signed-in EMPLOYEE, **When** they look at the sidebar, **Then** the "Équipe" nav item is NOT present (carry-over from Phase 1's role gating) — only "Accueil" and "Horaires".
4. **Given** a user on a viewport between ~768 px and ~1024 px wide, **When** they look at the sidebar, **Then** it is collapsed to icon-only mode (labels hidden, tooltips on hover reveal the label). On a desktop ≥ 1024 px, the sidebar shows icons + labels by default.
5. **Given** a user on a mobile viewport (< 768 px), **When** they look at the page, **Then** the sidebar is hidden; a hamburger button in the header opens it as a slide-in drawer that occupies the left side until dismissed.
6. **Given** any user (light or dark theme), **When** they look at the app, **Then** the color palette uses a consistent teal-ish accent for primary elements (buttons, active nav highlight) instead of the previous flat neutral. Both themes feel cohesive and professional, not "starter shadcn".

---

### User Story 2 - Redesigned schedule view with toolbar, compact cards, and totals (Priority: P2)

A manager opens the schedules page and sees a layout that reads like a real workforce-scheduling tool: a toolbar at the top with a primary "Créer" button, an employee search field, a "Aujourd'hui" jump, week navigation arrows with the displayed date range, and a view selector. Below: a grid where each row is one employee (shown with avatar + name + their total-hours-for-the-week summary) and each column is one of the 7 days. Inside each cell, shifts appear as compact stacked cards — each card shows the time range bold on top and a short label below — rather than positioned blocks on a vertical 24-hour axis. A "Total" column on the far right sums each employee's planned hours; a "Total" row at the bottom sums each day's planned hours AND the week-total. The drag-and-drop from Phase 3 continues to work on these new compact cards.

**Why this priority**: This IS the visual transformation the user is after. The current 24-hour-axis grid looks like a tutorial; the compact-card grid with totals looks like a product. P2 because the sidebar shell (US1) sets the visual context this redesigned page sits inside.

**Independent Test**: A MANAGER opens `/schedules` and sees: (a) a toolbar with all the named controls, (b) employee rows with avatar + name + total-hours summary on the left, (c) compact card stacks in each cell where shifts exist, (d) a Total column on the right with each employee's week total, (e) a Total row at the bottom with daily and weekly totals.

**Acceptance Scenarios**:

1. **Given** a MANAGER, **When** they open `/schedules`, **Then** they see a toolbar with the primary "Créer" button, an employee search input, an "Aujourd'hui" button, prev / next navigation arrows with the displayed date range between them (e.g., "25-31 mai 2026"), and a view selector that currently only contains "Semaine".
2. **Given** a MANAGER's company has employees Alice, Bob, Carol with shifts spread across the week, **When** they look at the grid, **Then** there are 3 employee rows, each showing the employee's avatar (circular with initials on a deterministic-by-name background color), full name, and a small text underneath like "26h" representing their total planned hours for the week.
3. **Given** Alice has shifts on Mon 09:00–17:00 and Wed 13:00–21:00, **When** the MANAGER looks at Alice's row, **Then** the Monday cell contains a compact card "09:00–17:00 / Quart", the Wednesday cell contains a compact card "13:00–21:00 / Quart" (the second line shows the shift's note if set, otherwise the word "Quart"). The cards are stacked vertically inside their cell — multiple cards in one cell appear as a vertical stack — and their height is proportional to content, not to shift duration.
4. **Given** the same employees, **When** the MANAGER looks at the rightmost column header "Total", **Then** each row's Total cell shows that employee's week total in hours (e.g., Alice "16h", Bob "21h30").
5. **Given** the same, **When** the MANAGER looks at the bottom-most row labeled "Total pour la succursale", **Then** each day-column shows the sum of all shifts on that day across all employees, AND the rightmost cell shows the total of the whole week across all employees and all days.
6. **Given** the MANAGER, **When** they type "ali" in the toolbar employee search, **Then** the grid filters to rows whose employee name matches "ali" (client-side, case-insensitive); clearing the input restores all rows.
7. **Given** the MANAGER, **When** they click "Aujourd'hui", **Then** the view jumps to the current week regardless of where they were.
8. **Given** the MANAGER, **When** they drag a compact card from one cell to another, **Then** the same drag-and-drop semantics from Phase 3 apply (date + employee change, time preserved, overlap rejected with toast + rollback).

---

### User Story 3 - Filter panel placeholder (Priority: P3)

A manager looks at `/schedules` and sees a left-aligned filter panel that LOOKS just like the one in real workforce-scheduling products — sections for "Gérer par" (Employé/Position), "Filtres" (Positions list), and "Affichage" (display toggles). For Phase 4, only the layout exists: the controls are visually present but disabled, each with a small "Bientôt" tooltip on hover explaining the feature is coming. The "Gérer par Employé" mode is the only active mode (matches the current behavior).

**Why this priority**: Visually it makes the page feel like a complete product. Functionally it's UI scaffolding for Phase 5+ (when Positions and other filtering land). P3 because the page is fully usable without it; the filter panel is "polish".

**Independent Test**: A MANAGER opens `/schedules` and sees a left filter panel with the three sections (Gérer par / Filtres / Affichage), all controls visibly present, hovering on a disabled control shows a "Bientôt disponible" tooltip. The "Gérer par Employé" segment is selected; "Position" is dimmed. No functional change to the data shown in the grid.

**Acceptance Scenarios**:

1. **Given** a MANAGER on `/schedules` at desktop width, **When** they look left of the calendar, **Then** they see a filter panel (~240 px wide) with three labeled sections: "Gérer par", "Filtres / Positions", "Affichage".
2. **Given** the panel, **When** they hover the "Position" segment in "Gérer par", **Then** a tooltip "Bientôt disponible — voir Phase 5" appears; clicking does nothing.
3. **Given** the "Filtres / Positions" section, **When** they see it, **Then** it shows ≥ 3 placeholder checkboxes (e.g., "Bar", "Cuisine", "Service") in a disabled state with a small caption explaining positions are coming in a later phase.
4. **Given** the "Affichage" section, **When** they look, **Then** it shows ≥ 3 placeholder checkboxes ("Masquer les quarts en arrière-plan", "Masquer les quarts à combler", "Grouper par position") all disabled.
5. **Given** a mobile-width viewport (< 768 px), **When** the MANAGER opens `/schedules`, **Then** the filter panel is hidden (or behind a "Filtres" button if we choose to surface it) — the calendar gets the full viewport width.

---

### Edge Cases

- **Manager switches role to EMPLOYEE mid-session** (theoretical, via Phase 1 promotion): on the next page load the sidebar reflects the new role.
- **EMPLOYEE on /schedules**: the toolbar shows no "Créer" button (carry-over from Phase 3); the filter panel is still visible but every control is disabled (EMPLOYEEs have nothing meaningful to filter yet).
- **Long employee name**: truncates with ellipsis in the row label, full name in tooltip.
- **No shifts in a cell**: cell is empty (no placeholder text — the row's emptiness reads naturally).
- **An employee with zero shifts in the week**: their row still appears in the grid; the "Total" column shows "0h".
- **A week with zero shifts at all**: the empty-state card from Phase 3 takes over (carry-over, unchanged).
- **Mid-card dragging when collapsing the sidebar**: the in-progress drag must not be disturbed by layout reflow. Drag completes normally.
- **Theme switch mid-view**: every component (sidebar, toolbar, cards, totals row) re-themes immediately without flicker (carry-over from Phase 3's dark-mode infrastructure).
- **Avatar colors deterministic by name**: two distinct employees with the same name display the same avatar background — acceptable; the goal is visual recognition at a glance, not uniqueness.

## Requirements *(mandatory)*

### Functional Requirements

**App shell (US1)**

- **FR-001**: Authenticated pages (`/dashboard`, `/team`, `/schedules`) MUST render inside a layout that includes a left sidebar containing nav items.
- **FR-002**: The sidebar MUST list three nav items for MANAGER role (Accueil → `/dashboard`, Horaires → `/schedules`, Équipe → `/team`) and two for EMPLOYEE role (Accueil, Horaires).
- **FR-003**: The currently active nav item (matching the current pathname) MUST be visually distinguished from the others.
- **FR-004**: The theme toggle and a sign-out control MUST be present in the sidebar (typically at the bottom).
- **FR-005**: On viewports ≥ 1024 px, the sidebar MUST be expanded by default showing icons AND labels. On viewports between 768 px and 1024 px, it MUST collapse to icon-only mode with hover tooltips. Below 768 px, it MUST hide behind a hamburger button that opens it as a slide-in drawer.
- **FR-006**: A persistent header bar above the content area MUST display the company name and a small user-avatar element (initials).
- **FR-007**: The application's primary accent color MUST shift from the previous flat neutral to a teal-family color, applied consistently to primary Buttons, active nav indicators, focused inputs, and other primary affordances. Both light and dark themes MUST adopt the same accent.

**Schedule toolbar + grid (US2)**

- **FR-008**: The `/schedules` page MUST display a toolbar at the top containing, in order: a primary "Créer" Button (MANAGER only — hidden for EMPLOYEE), an employee-search Input, an "Aujourd'hui" Button, a previous-week Button, the displayed date range as a label, a next-week Button, and a view selector Select with one option "Semaine".
- **FR-009**: The employee-search Input MUST filter the visible rows on the client side by matching the search text against the employee's name (case-insensitive); clearing the input MUST restore all rows.
- **FR-010**: The "Aujourd'hui" Button MUST navigate to `/schedules` without the `?week=` query parameter (which the page interprets as the current week).
- **FR-011**: The grid body MUST render one row per employee in the current view: the row's left column shows a circular avatar with two-letter initials on a deterministic-by-name background color, the employee's full name, and a small line below the name with the employee's total scheduled hours for the displayed week.
- **FR-012**: Each (day, employee) cell MUST render any shifts assigned to that employee on that day as compact stacked cards inside the cell. Each card MUST show the time range "HH:mm–HH:mm" bold on top and a single secondary line below that displays either the shift's note (if set) or the word "Quart".
- **FR-013**: The grid MUST include a "Total" column at the right-most position; for each employee row, that cell MUST display the total scheduled hours for the displayed week.
- **FR-014**: The grid MUST include a footer row labeled "Total pour la succursale"; for each day-column, that cell MUST display the sum of shift hours on that day across all employees, AND the rightmost (Total) cell MUST display the sum across all days and all employees for the week.
- **FR-015**: All drag-and-drop semantics from Phase 3 MUST continue to apply on these new compact cards: a MANAGER on desktop drags a card to a (day, employee) cell, the system optimistically moves it, calls the same Server Action, surfaces a green toast on success or a red toast + rollback on overlap.
- **FR-016**: Mobile rendering (< 768 px) of the schedule MUST continue to work via the stacked-day view from Phase 3 — the new toolbar still renders (in a compact orientation), but the grid + filter panel concepts collapse to the mobile-friendly layout.

**Filter panel placeholder (US3)**

- **FR-017**: On viewports ≥ 1024 px, `/schedules` MUST render a left-aligned filter panel between the sidebar and the calendar.
- **FR-018**: The panel MUST contain three sections in order: "Gérer par" (a 2-option segmented control: "Employé" active, "Position" disabled), "Filtres / Positions" (a list of ≥ 3 disabled checkboxes labelled with plausible position names), and "Affichage" (a list of ≥ 3 disabled checkboxes for view-modifier toggles).
- **FR-019**: Every disabled control in the filter panel MUST display a tooltip on hover with text like "Bientôt disponible" so users understand the feature is intentionally coming.
- **FR-020**: The filter panel MUST NOT actually filter the data in Phase 4 — it is a visual placeholder. The "Gérer par Employé" segment merely matches the current default behavior (one row per employee).

**Carry-over invariants from Phases 0–3**

- **FR-021**: All tenant isolation guarantees from Phase 0 MUST hold.
- **FR-022**: All role gating from Phases 1–3 MUST hold (only MANAGER may create/edit/delete/drag shifts; EMPLOYEE may not see "Créer" or "Équipe" nav).
- **FR-023**: All overlap-detection guarantees from Phase 2 MUST hold.
- **FR-024**: The dark-mode toggle from Phase 3 MUST continue to work; both light and dark themes must read cleanly with the new layout and accent.
- **FR-025**: All shift mutations MUST continue to surface success / error toasts.

### Key Entities

No new database entities. Phase 4 is presentation-layer only. Two new client-side concepts:

- **Avatar Color Assignment**: a pure-function mapping from a user's name (or id) to a deterministic background color picked from a small palette (~8 colors), so the same employee always has the same avatar color across renders.
- **Toolbar Search Term**: transient client state filtering the row list in the schedule grid view; not persisted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can identify the three main sections of the app within 5 seconds of landing on the dashboard, by scanning the sidebar.
- **SC-002**: A MANAGER opening `/schedules` can read each employee's weekly hour total in under 2 seconds (the Total column is glanceable).
- **SC-003**: A MANAGER searching for an employee by name finds them and reads their week in under 3 seconds.
- **SC-004**: On a mobile viewport (< 768 px), the schedules page is usable without horizontal scrolling — the sidebar is hidden behind a hamburger and the calendar adopts the Phase 3 stacked layout.
- **SC-005**: In adversarial inspection, a user (technical or not) describes the redesigned `/schedules` page as "looks like a real product" rather than "looks like a demo" — a subjective but observable improvement.
- **SC-006**: 100% of drag-and-drop, toast, and theme-switching behaviors from Phase 3 continue to work in the redesigned layout (zero regression on Phase 3 success criteria).
- **SC-007**: The footer "Total pour la succursale" cell values mathematically match the sum of cells above them, for every day-column AND for the week-total cell, in 100% of renders.

## Assumptions

- **No new business entity in Phase 4.** Positions, absences, "quarts à combler", and the publish workflow are explicitly deferred to Phases 5+, as called out in the user-visible "Bientôt disponible" tooltips.
- **The accent color shift is a small palette change applied via CSS variables.** Phase 3's design tokens already abstract colors behind variables; only the `--primary` and adjacent tokens change.
- **Avatar colors come from a deterministic-by-name hash** into a fixed palette of ~8 background colors with paired foregrounds. No per-user color preference, no upload. Profile photos are Phase 6+.
- **The employee search is client-side only.** With ≤ 20–50 employees per company expected for the MVP, fetching all rows and filtering client-side is correct.
- **Totals are computed client-side** from the same shift data already fetched for the grid. The Server Component does not pre-compute or pre-aggregate.
- **The sidebar layout uses a third-party primitive** (a polished, accessible sidebar component from the project's design system). This is implementation choice noted here only because it materially shapes the responsive behaviour.
- **The filter panel is on the LEFT of the calendar but the RIGHT of the sidebar.** This three-pane layout (sidebar | filters | calendar) requires ≥ 1024 px to all fit; below that, the filter panel is hidden.
- **EMPLOYEE sees the same sidebar shell** (minus the Équipe item) and the same `/schedules` page (minus mutation affordances).

## Dependencies

- **Phases 0–3** MUST be in place. Phase 4 reuses every Server Action, every repository function, the entire data model, the auth flow, the toast system, the theme system, and the drag-and-drop wiring. The work in this phase is exclusively in the React component layer and the CSS variables.
- A modern browser supporting CSS Grid, CSS variables, the Pointer Events API, and cookies for session continuity (carry-over).
