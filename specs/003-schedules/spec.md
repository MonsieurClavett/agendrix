# Feature Specification: Weekly Schedules

**Feature Branch**: `003-schedules`

**Created**: 2026-05-28

**Status**: Draft

**Input**: User description: "Phase 2 — horaires. Un MANAGER connecté peut créer un shift (créneau) en sélectionnant un employé actif de son entreprise, une date, une heure de début et une heure de fin (un shift peut traverser minuit), et optionnellement une note courte. Le MANAGER peut éditer et supprimer ses shifts à tout moment, même dans le passé. Le système refuse les chevauchements horaires pour un même employé (deux shifts pour la même personne ne peuvent pas se superposer). Le MANAGER voit une vue 'semaine' qui liste tous les shifts de tous les employés de son entreprise pour la semaine sélectionnée (par défaut la semaine courante), avec navigation semaine précédente / suivante. Un EMPLOYEE connecté voit la même vue 'semaine' mais filtrée sur ses propres shifts uniquement — il ne peut pas créer/éditer/supprimer. Les shifts d'un employé désactivé restent visibles dans l'historique. Tout passe par la couche tenant : aucun utilisateur ne peut voir, créer, éditer ou supprimer un shift d'une autre entreprise."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a shift for an employee (Priority: P1)

A manager needs to staff next Monday's lunch service. They open the weekly-schedules page, click "Add shift", pick the employee from a list of their active team members, set the date to next Monday, set start time 11:00 and end time 15:00, optionally add a note like "Lunch service — front of house", and save. The shift now appears on the week view at the right place.

**Why this priority**: Without creating a shift, every other capability in Phase 2 is meaningless — the week view has nothing to show, the employee-self view is empty. This is the entry point.

**Independent Test**: A signed-in MANAGER opens the schedules page, submits the create-shift form for an active employee on a specific date with valid times, and immediately sees the new shift in the week view for that date.

**Acceptance Scenarios**:

1. **Given** a signed-in MANAGER, **When** they submit the create-shift form with employee Bob, date 2026-06-08 (Monday), start 11:00, end 15:00, note "Lunch service", **Then** the system creates the shift and the week view for the week containing 2026-06-08 now shows that shift on the Monday column for Bob.
2. **Given** a MANAGER, **When** they create a night shift with start 22:00 and end 06:00 (next day) on date 2026-06-08, **Then** the system accepts it as a single shift spanning midnight (ending 2026-06-09 06:00).
3. **Given** an EMPLOYEE Bob already has a shift 11:00–15:00 on 2026-06-08, **When** the MANAGER attempts to create a second shift for Bob 13:00–17:00 on 2026-06-08, **Then** the system rejects the create with a user-facing message about the overlap and creates no record.
4. **Given** a MANAGER, **When** they attempt to create a shift for an employee who belongs to a different company OR who does not exist, **Then** the system rejects the create with a clear "employé introuvable" message — the employee dropdown only ever lists employees of the manager's own company, so this case is mainly a defense-in-depth check.
5. **Given** a MANAGER, **When** they submit a shift with end time strictly equal to start time, OR with empty date/employee/time fields, **Then** the system rejects the submission with a field-level validation message.

---

### User Story 2 - Manager weekly view + edit + delete (Priority: P2)

A manager needs to see the schedule at a glance and fix mistakes. They open the schedules page; by default it shows the current week (Monday → Sunday). They see all shifts of all employees of their company for that week, grouped sensibly. "Previous week" and "Next week" buttons jump the view. They can click a shift to edit any of its fields (date, employee, start, end, note) or to delete it; both actions are confirmed.

**Why this priority**: After P1, the manager needs to inspect what they've scheduled and correct it. P2 because you can ship P1 alone for a one-shot test, but P2 turns it into a usable workflow.

**Independent Test**: With a few shifts already created (across at least two employees and two days within the same week), the MANAGER opens the schedules page and verifies all of those shifts are visible. They click "Next week" → empty week. They click "Previous week" twice → back to a past week. They click an existing shift → edit dialog opens; they change the start time and save → updated shift reflects the new time. They click a different shift → delete dialog → confirm → the shift disappears.

**Acceptance Scenarios**:

1. **Given** a MANAGER whose company has employees Alice and Bob, with shifts on 2026-06-08 (Alice 09:00–17:00) and 2026-06-10 (Bob 13:00–21:00), **When** the MANAGER opens the schedules page for the week containing 2026-06-08, **Then** both shifts are visible in the right day columns under the right employees, and no other shift appears.
2. **Given** the MANAGER is viewing the current week, **When** they click "Semaine suivante", **Then** the view advances by 7 days and the URL reflects the new week so the navigation is shareable / bookmarkable.
3. **Given** an existing shift, **When** the MANAGER edits it and changes the employee assignee from Bob to Alice (both active in the same company), **Then** the shift is now displayed under Alice on the same date.
4. **Given** an existing shift, **When** the MANAGER deletes it (after confirming the modal), **Then** the shift disappears from the view immediately and the underlying record is removed.
5. **Given** a MANAGER tries to edit a shift such that the new times would overlap another shift of the same employee on the same day, **When** they save, **Then** the system rejects the edit with the same overlap message used at create time.

---

### User Story 3 - Employee self-view (Priority: P3)

An employee needs to know when they are working. They open the schedules page; they see the current week's shifts — but only their own. No other employee's shifts, no create / edit / delete affordances.

**Why this priority**: The other half of the product — without it, employees rely on someone else relaying their schedule. P3 because it shares almost all infrastructure with P2 (same week view, same data source) and ships as a thin variant on top.

**Independent Test**: With at least two employees (Alice + Bob) in the same company and shifts created for both, Alice signs in and opens the schedules page. She sees only her own shifts. The "Add shift" / edit / delete buttons are absent.

**Acceptance Scenarios**:

1. **Given** Alice and Bob both have shifts on the same week, **When** Alice (EMPLOYEE) opens the schedules page, **Then** she sees only her own shifts; Bob's shifts are not visible to her under any circumstance.
2. **Given** Alice viewing her own week, **When** she navigates to the previous or next week, **Then** the navigation still works — but she still only sees her own shifts.
3. **Given** Alice as an EMPLOYEE, **When** she inspects the page, **Then** no UI affordance to create, edit, or delete a shift is visible to her; any direct attempt to invoke a shift-mutation action is rejected by the server.
4. **Given** Alice has been deactivated by a MANAGER (Phase 1 feature), **When** her past shifts are viewed by a MANAGER, **Then** her shifts remain visible in the week view (history is preserved), but Alice herself can no longer sign in to view them.

---

### Edge Cases

- **Shift spanning midnight**: a shift with `end < start` is interpreted as ending the next day. The week view shows it on its **start** date.
- **Shift end exactly equal to another shift's start** (back-to-back): allowed — `09:00–13:00` and `13:00–17:00` do NOT overlap.
- **Overlap detection across midnight**: if Bob has 22:00–06:00 on Monday, a Tuesday 04:00–10:00 attempt MUST be detected as overlapping (because the Monday shift extends into Tuesday).
- **Empty week**: the week view renders normally with each day labelled and an "Aucun shift" placeholder.
- **First / last week of nav**: there is no hard bound — the user can navigate arbitrarily far into past or future. (No need to defensively limit; storage is cheap.)
- **Bookmark / shareable URL**: navigating the week changes the URL (e.g., `/schedules?week=2026-W23`), so a manager can paste the URL to a colleague and they land on the same week.
- **Deactivated employee shows on the week view**: their shifts remain shown (history). Their name may carry a small "désactivé" badge so the manager sees that creating new shifts on them is no longer possible.
- **Concurrent creates that would overlap**: at most one MUST succeed. The other receives the same overlap-rejection message.
- **Daylight-saving transition** within a shift: out of scope for Phase 2 — treat all times as the system's local time / a single fixed time zone. (DST handling is a Phase 3+ concern.)

## Requirements *(mandatory)*

### Functional Requirements

**Access control**

- **FR-001**: System MUST provide a schedules page accessible to ALL authenticated users (MANAGER and EMPLOYEE). Unauthenticated access MUST redirect to the login screen, preserving the return URL.
- **FR-002**: Shift creation, editing, and deletion MUST be restricted to MANAGER-role users. EMPLOYEE attempts (UI or programmatic) to invoke these operations MUST be rejected.

**Shift creation**

- **FR-003**: System MUST allow a MANAGER to create a shift by selecting an active employee of the MANAGER's own company, a date, a start time, an end time (which MAY be less than the start time — interpreted as spanning to the next day), and an optional note (free-text, length ≤ 280 characters).
- **FR-004**: System MUST reject creation if the selected employee does not exist OR does not belong to the MANAGER's company. (The picker SHOULD only ever list valid employees; the server check is defense in depth.)
- **FR-005**: System MUST reject creation with a user-facing message if the new shift would overlap any existing shift for the same employee. "Overlap" means the two intervals share any positive-length sub-interval; back-to-back shifts (one ends exactly when the next begins) are NOT considered an overlap.
- **FR-006**: System MUST reject creation if the start time equals the end time (zero-duration shift) or if any required field is missing.
- **FR-007**: System MAY allow creating shifts in the past (no temporal lower bound on the date). This is intentional to support entering historical shifts retroactively.

**Shift editing and deletion**

- **FR-008**: System MUST allow a MANAGER to edit any shift in their company — including changing the assigned employee (to another active employee of the same company), the date, the start, the end, and the note. The same overlap rule (FR-005) applies to the post-edit state.
- **FR-009**: System MUST allow a MANAGER to delete any shift in their company. Deletion is hard (the row is removed). Deletion MUST require an explicit user confirmation in the UI before being performed.

**Weekly view**

- **FR-010**: System MUST display a weekly schedules view that shows, for the selected week, every shift belonging to the requesting user's company (when the requester is a MANAGER) OR every shift assigned to the requesting user themselves (when the requester is an EMPLOYEE).
- **FR-011**: System MUST default the week to the current week (Monday through Sunday in the system's local time) on first load.
- **FR-012**: System MUST provide controls to navigate to the previous and next week. The current week selection MUST be encoded in the URL so it is shareable and bookmarkable.
- **FR-013**: System MUST render each day's slot even when no shift is scheduled (clear empty-state per day).
- **FR-014**: System MUST visibly indicate when a shift belongs to a deactivated employee (so the MANAGER understands why no new shifts can be created on them), without hiding the shift itself.

**Tenant isolation (carry-over)**

- **FR-015**: All shift reads and writes MUST be scoped to the requesting user's `companyId` derived from the verified session. No request originating from one company MUST ever return, modify, or delete a shift belonging to another company under any circumstance.
- **FR-016**: An EMPLOYEE's read queries on the schedules page MUST additionally filter the result set to shifts assigned to that EMPLOYEE — never showing peer shifts.

### Key Entities

- **Shift** (new): represents one scheduled work period for one employee. Carries:
  - the assignee (must be a User of the same Company as the shift);
  - a start datetime and an end datetime (end strictly greater than start; if end ≤ start in clock-time, the shift is interpreted as spanning past midnight);
  - an optional free-text note (≤ 280 characters);
  - the `companyId` it belongs to (denormalised for tenant filtering — equal to the assignee's Company);
  - timestamps (createdAt, updatedAt).
- **Company** (carry-over): no schema change. Owns Shifts via Users.
- **User** (carry-over): no schema change. May be the assignee of zero or more Shifts. A User cannot be deleted while still having Shifts (until later phases introduce cleanup tooling).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A MANAGER can open the schedules page and add a new shift end-to-end (open page → click "Add shift" → fill form → save → see the new shift on the week view) in under 30 seconds, median.
- **SC-002**: 100% of week-view queries scoped by a MANAGER return only shifts of their own company; 100% of week-view queries scoped by an EMPLOYEE return only shifts assigned to them. Zero leaks across the full adversarial test corpus.
- **SC-003**: 100% of EMPLOYEE attempts (UI or programmatic) to invoke shift-creation, edit, or deletion are rejected by the server.
- **SC-004**: 100% of overlap attempts (create or edit) for the same employee are rejected with the documented overlap message — including overlaps that span midnight.
- **SC-005**: The MANAGER can navigate from the current week to the week containing a target date 12 weeks away in 12 or fewer clicks (one click per "Previous week" / "Next week" press). (Validates that the navigation is responsive and the URL state holds correctly.)
- **SC-006**: 99% of week-view page loads complete in under 1.5 seconds with up to 50 shifts in the week (typical MVP scale).
- **SC-007**: Past shifts remain visible in the week view after the assigned employee is deactivated (zero history loss when an employee is offboarded).

## Assumptions

- **Single time zone for Phase 2.** All shift times are interpreted in the system's local time zone (or a single fixed zone configured globally). Per-company time zones, daylight-saving correctness, and traveler-friendly multi-zone display are deferred.
- **Week starts on Monday.** The week-view spans Monday → Sunday. Configurable per-company is deferred.
- **List / day-grouped rendering is acceptable for MVP.** A pixel-perfect time-grid calendar (Google-Calendar-style) is NOT required in Phase 2; a clear list grouped by day per employee is sufficient. A grid view is a future polish concern.
- **No recurring / template shifts in Phase 2.** Every shift is created individually. "Repeat every Monday" is a Phase 3+ concern.
- **No drag-and-drop in Phase 2.** Edits go through the edit dialog.
- **No notifications.** Creating, editing, or deleting a shift does NOT send an email, push, or in-app notification to the affected employee. Notifications come when an email/push channel is added in a later phase.
- **No shift trades / swap requests.** Employees cannot ask peers to cover for them. Phase 3+.
- **No time-off / availability layer.** Phase 2 does not check whether an employee declared themselves unavailable. Phase 3+ (dedicated time-off feature).
- **No time clock (punch in / out).** Phase 2 only represents *planned* shifts.
- **No overtime / payroll calculations.**
- **No multi-location / multi-department concept.** All employees of a company share one flat schedule.
- **Hard delete of shifts is acceptable.** No "trash" / "recently deleted" recovery in Phase 2 — confirmation modal is the safety net.
- **No bulk operations.** Shifts are created/edited/deleted one at a time. Bulk import (CSV) and bulk "publish" are out of scope.
- **A user with active sessions whose Shifts are mutated mid-session sees the update on next page refresh.** Live realtime (websockets/SSE) is out of scope; the user clicks "Next week" or refreshes to pull updated data.

## Dependencies

- **Phase 0** (multi-tenant foundations) MUST be in place: tenant context, session helpers, repository pattern. (Carry-over.)
- **Phase 1** (employee management) MUST be in place: the User entity carries `isActive`; the manager-only role gate exists. Shifts are assignable to active employees (the picker pulls from `listUsersInCompany(ctx)`); past shifts of deactivated employees remain visible.
- A working hosted relational database (carry-over).
- A modern browser supporting cookies for session continuity (carry-over).
