# Phase 0 — Research & Design Decisions (Phase 2 feature)

**Feature**: Weekly Schedules
**Date**: 2026-05-28

The spec contained zero `NEEDS CLARIFICATION` markers. The stack carries
over from Phases 0 + 1. Only the additions specific to scheduling are
recorded below.

---

## Decision 1: Time representation — `DateTime` vs `date + minute-of-day`

**Decision**: Store `startsAt: DateTime` and `endsAt: DateTime` (UTC) on
the `Shift` row, both stored as full timestamps. `endsAt > startsAt`
always holds at the database level; if the user enters an end clock-time
that is ≤ start clock-time, the Server Action interprets that as a
midnight-crossing shift and adds 24 h to `endsAt` before persisting.

**Rationale**:
- Native datetime range queries are trivially indexable.
- The standard half-open-interval overlap check
  `WHERE startsAt < newEnd AND endsAt > newStart` works uniformly for
  shifts that span midnight (no special-casing in the query).
- The week-view query is one straightforward range scan.

**Alternatives considered**:
- **`date Date` + `startMinute Int` + `endMinute Int` (minutes from
  start-of-day)**: visually elegant, but midnight-crossing shifts need
  `if (endMinute <= startMinute) ...` branches everywhere — in
  overlap detection, in display, in cross-day search. Wins for a strict
  9-to-5 product; loses for a 24/7 product where night shifts are normal.
- **`PERIOD` or `tsrange` (Postgres type)**: would let the DB enforce
  non-overlap via an exclusion constraint. Powerful, but Prisma's
  support for tsrange is limited (custom SQL needed). Defer to a phase
  where the workload demands it.

---

## Decision 2: Denormalise `companyId` onto `Shift`

**Decision**: `Shift` carries a `companyId` column FK'd to `Company`, in
addition to its `employeeId` FK. The two are kept in lock-step: every
write computes `companyId` from the assignee's `companyId` server-side
(never from input).

**Rationale**:
- Every tenant-scoped read (`WHERE companyId = ?`) is a single-table
  scan with an index hit — no JOIN to `User` needed.
- Principle I says the tenant filter MUST be central and visible at
  every call site. Having `companyId` directly on `Shift` makes the
  `where: { companyId: ctx.companyId }` clause appear at every
  read/write — no clever join logic to misread.
- Cost: a tiny risk of drift if `Shift.companyId` ever diverges from
  `Shift.employee.companyId`. Mitigated by (a) only the repository layer
  writing `companyId`, and (b) `User.companyId` being immutable in
  Phase 1 (assignees don't change company).

**Alternatives considered**:
- **No denormalisation; always JOIN to `User`**: pure but slower and
  more verbose. Reviewers would have to remember "if you don't JOIN, you
  leak". A direct `where` clause is easier to enforce.

---

## Decision 3: Week math — pure helper vs `date-fns`

**Decision**: Write `src/lib/week.ts` with three small pure functions:
`mondayOfWeek(d: Date)`, `addDays(d: Date, n: number)`, and
`toISODate(d: Date)` (YYYY-MM-DD). Total ~30 lines of TS, fully typed.

**Rationale**:
- Adding `date-fns` is ~70 KB to the bundle for three operations we can
  write in 30 lines.
- Pure functions are trivial to verify by inspection (and to test if
  we ever add tests).
- Principle III: don't pull in a dep when the use case is this narrow.

**Alternatives considered**:
- **`date-fns`**: best-in-class. Win when the project does a lot of
  date math (formatting, parsing, locale-aware display, timezone
  conversions). MVP doesn't do any of those.
- **`Temporal` API**: nicer than `Date`, but not yet broadly available
  without polyfill.

---

## Decision 4: Week selection in URL, not in session/client state

**Decision**: The displayed week is a single URL query parameter
`?week=YYYY-MM-DD` (the Monday). The page is a Server Component that
reads `searchParams.week`. Navigation buttons are `<Link>`s to the
adjacent Monday.

**Rationale**:
- Bookmarkable (SC-005-adjacent UX). A manager can paste "look at
  week of June 8" and it works.
- Server Component reads it directly — no client state hydration, no
  flicker between "last week" and "current week" on initial load.
- Trivial to validate server-side (parse + check it's a Monday; fall
  back to current Monday on bad input).

**Alternatives considered**:
- **Client-side state with `useState`**: simpler to write, but means
  the displayed week resets on every navigation, can't be shared, and
  requires hydration.
- **Cookies / DB**: persists "your last viewed week" — way too much
  for an MVP. URL state covers 95% of value.

---

## Decision 5: Overlap detection in the same transaction as the write

**Decision**: `createShift` and `updateShift` run a `db.$transaction`
containing (a) the overlap check (`SELECT 1 FROM Shift WHERE employeeId
= ? AND id != ? AND startsAt < ? AND endsAt > ? LIMIT 1`) and (b) the
insert / update. If the SELECT returns a row, the transaction throws
`OVERLAP` and the caller maps it to a friendly message.

**Rationale**:
- Prevents the classic check-then-act race where two concurrent
  creates both pass the pre-check and both commit.
- Principle I — the invariant lives at the data layer, not at the
  Server Action layer.

**Alternatives considered**:
- **Postgres exclusion constraint** (`EXCLUDE USING gist (employeeId
  WITH =, tsrange(startsAt, endsAt) WITH &&)`): the strongest possible
  enforcement, runs without explicit application code. Out of MVP
  scope because Prisma doesn't manage exclusion constraints natively
  (needs raw SQL migration). Add when the workload demands it.
- **Application-level pre-check, no transaction**: trivially racy.
  Rejected.

---

## Decision 6: Hard delete (no soft delete) of shifts

**Decision**: `deleteShift` issues an actual `DELETE` of the row. The
client-side delete affordance opens a confirm dialog before submission.

**Rationale**:
- Spec explicitly accepts hard delete for shifts (a confirmation modal
  is the safety net).
- Soft-delete on shifts means every read query has to remember to
  filter out deleted ones — easy to miss, no MVP-relevant value
  (auditing shift edits is a Phase 3+ concern).

**Alternatives considered**:
- **Soft delete via `isDeleted` flag**: adds reasoning overhead with
  no current consumer. YAGNI.

---

## Decision 7: Past shifts of deactivated employees stay visible

**Decision**: `listShiftsForCompanyWeek` and `listShiftsForUserWeek`
do NOT filter the assignee's `isActive` status. They return every shift
in the date range belonging to the requesting tenant scope, full stop.
The week view renders a small "désactivé" badge next to the assignee's
name when their `isActive` is `false`.

**Rationale**:
- Spec FR-014 + SC-007: "Past shifts remain visible after the assigned
  employee is deactivated — zero history loss."
- The create-shift employee picker DOES filter to `isActive = true` —
  so new shifts cannot be assigned to a deactivated employee. The two
  filters serve different intents (reading history vs. creating new).

**Alternatives considered**:
- **Hide deactivated-employee shifts from the view**: would lose
  history (violates SC-007). Rejected.

---

## Open Questions

None. The spec was complete and the stack carries over.
