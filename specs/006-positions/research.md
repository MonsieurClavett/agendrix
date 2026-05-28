# Phase 0 — Research & Design Decisions (Phase 5 feature)

**Feature**: Positions
**Date**: 2026-05-28

Spec had zero `NEEDS CLARIFICATION`. Stack carries from Phases 0–4.
This file records the design choices specific to positions.

---

## Decision 1: Position color stored as palette key (not raw hex)

**Decision**: `Position.color` is a `String` column holding a key from
a fixed palette (e.g. `"teal"`, `"coral"`, `"amber"`, etc.). The
rendering layer maps the key to an OKLCH triplet (background, foreground,
accent) defined in `src/lib/positions.ts`.

**Rationale**:
- Centralizes color management: re-skinning the entire app means
  editing one file.
- Guarantees AA contrast: all palette entries are pre-tuned, so the
  manager can't pick "neon-yellow on white".
- Easier dark-mode handling: each palette entry can have light/dark
  variants computed centrally.
- Names are human-readable in the DB ("teal" vs "#0fb")
- No risk of dangling colors — adding/removing a palette entry is a
  code change, never a user concern.

**Alternatives considered**:
- **Raw hex in DB**: more flexible, but every render needs an OKLCH
  conversion for tinting, and contrast must be runtime-checked.
- **Enum at DB level**: would require a Prisma enum + migrations
  whenever the palette changes. Overkill.

---

## Decision 2: Shift.positionId FK with ON DELETE SET NULL

**Decision**: New `positionId String?` column on `Shift`, FK to
`Position(id)`, `onDelete: SetNull`.

**Rationale**:
- Spec FR-005: deleting a position must NOT delete its shifts.
- Postgres-native cascade rules are simpler than application-side
  cleanup, and atomic — no race window where the position is gone
  but its shifts still reference it.

**Alternatives considered**:
- **ON DELETE RESTRICT** (block deletion if any shift uses the
  position): forces the manager to manually re-tag shifts before
  deleting. Worse UX.
- **Application-side null-out + delete**: race-prone unless wrapped
  in a transaction. Same outcome as SetNull but more code.

---

## Decision 3: Case-insensitive uniqueness per company, enforced application-side

**Decision**: At create / rename time, the Server Action lowercases
the trimmed name and searches the company's positions for a match.
The DB itself only has a `UNIQUE (companyId, name)` constraint
(case-sensitive). The functional uniqueness on `lower(name)` lives
in the application code.

**Rationale**:
- Avoids Postgres-specific functional indexes (Prisma support is
  awkward for these).
- Simpler migration. The app check covers the user-visible behavior;
  the DB constraint catches concurrent inserts of the exact same
  casing as a final guard.

**Alternatives considered**:
- **Postgres functional unique index on `lower(name)`**: stronger,
  but Prisma manages it via `previewFeatures` and the migration
  history becomes raw SQL. Defer.
- **Always store lowercase**: loses the user's casing preference.
  Manager wants "Service" not "service" in the UI.

---

## Decision 4: Filter + grouping state is client-only, per page session

**Decision**: `ScheduleView` (a new client wrapper) owns the filter
checkboxes' state and the grouping-mode toggle. State is reset on
page reload, on week navigation, and on sign-out.

**Rationale**:
- Spec FR-019 explicitly defers persistence to a later phase.
- Avoids URL noise (`?positions=a,b,c&groupBy=position`) for an
  MVP that has small data and won't be shared across sessions.
- Easier to refactor later to URL state once we know the actual
  usage patterns.

**Alternatives considered**:
- **URL state**: shareable, bookmarkable, but adds complexity.
- **Cookie state**: shareable across pages within a session but not
  bookmarkable. Worst of both worlds for an MVP.
- **Server-side preference per user**: requires schema + Server Action.
  Overkill.

---

## Decision 5: New `ScheduleView` client wrapper component

**Decision**: Introduce `src/app/(dashboard)/schedules/_components/ScheduleView.tsx`
as a client component that:
- Receives all server data (shifts, employees, positions, range, today, isManager) as props.
- Holds local React state for `selectedPositionIds: Set<string>`,
  `includeNoneFilter: boolean`, and `groupBy: "employee" | "position"`.
- Renders both `FilterPanel` (controlled by lifting callbacks) and
  `ScheduleCalendar` (receives filtered shifts + groupBy props).

**Rationale**:
- Server Component (`schedules/page.tsx`) cannot hold React state.
  We need a client wrapper to coordinate FilterPanel ↔ Calendar
  without prop-drilling through the page.
- Keeps `FilterPanel` and `ScheduleCalendar` reusable and
  individually testable.

**Alternatives considered**:
- **React Context**: works but adds indirection for state shared
  between exactly two siblings.
- **URL state**: see Decision 4.
- **Put filter state inside ScheduleCalendar**: would make
  ScheduleCalendar render FilterPanel as a child, awkward since
  FilterPanel is a sidebar layout element not a child of the
  calendar.

---

## Decision 6: Drop-cell ID encodes the grouping mode

**Decision**: In "Gérer par Employé" mode, the drop cell ID is
`${dateISO}|emp:${employeeId}`. In "Gérer par Position" mode, the
drop cell ID is `${dateISO}|pos:${positionId | "none"}`. The
`onDragEnd` handler parses the prefix (`emp:` or `pos:`) to know
how to interpret the drop.

**Rationale**:
- Self-describing IDs. The drag handler doesn't need to "remember"
  the current grouping mode from React state; the destination cell
  itself tells the handler what mutation to apply.
- Avoids accidental cross-mode bugs (e.g., if the user changed
  grouping mid-drag, the in-flight drop still routes correctly).

**Alternatives considered**:
- **Same ID format, mode read from React state**: brittle if state
  changes mid-drag.

---

## Decision 7: `Sidebar` gets a "Positions" link, MANAGER only

**Decision**: Add a 4th nav item to `SidebarNav` after "Équipe":
`{ href: "/positions", label: "Positions", icon: TagIcon, managerOnly: true }`.

**Rationale**:
- Keeps the position management surface discoverable.
- MANAGER-only matches the role gate on the page itself.

**Alternatives considered**:
- **Embed positions inside the team page** as a tab: works but mixes
  two concepts. Separate page reads cleaner.

---

## Open Questions

None.
