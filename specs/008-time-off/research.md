# Research — 008-time-off

Phase 0 of `/speckit-plan`. Resolves the technical-context unknowns
implicit in the spec.

## Decision 1 — Date representation

**Decision**: Store `startDate` and `endDate` as Prisma `DateTime
@db.Date` (PostgreSQL `DATE` column). Treat both as inclusive bounds
in the local calendar.

**Rationale**:
- The spec only operates on whole calendar days (FR-001, assumption
  "granularité journée entière"). A `DATE` column matches the domain
  exactly and prevents the "off-by-one due to timezone" class of
  bugs that bite `TIMESTAMP` columns.
- Prisma reads `DATE` columns as JS `Date` at local midnight UTC,
  which renders correctly with our local-only formatter
  (`toISODate(d)` already used by Phase 4+).
- The inclusive-end convention matches how users think about
  vacations ("from Monday to Friday" = 5 days, not 4).

**Alternatives considered**:
- *Two `TIMESTAMP` columns*: forces a fictional hour and a timezone
  decision for every read.
- *Single `daterange` with `@db.TsRange`*: PostgreSQL exclusion
  constraints become possible, but Prisma support is awkward and
  the half-open semantics break the "inclusive-Friday" mental model.

## Decision 2 — Status as Prisma enum (vs string)

**Decision**: Define `TimeOffStatus { PENDING APPROVED REJECTED }`
and `TimeOffType { PAID UNPAID SICK }` as Prisma enums.

**Rationale**:
- Both sets are fixed by the spec (assumption "trois types fixes").
- Enums give compile-time `switch` exhaustiveness and a stable
  underlying PostgreSQL `ENUM` type.
- Zero migration friction for the MVP; adding a fourth type in a
  future phase is a one-line schema change.

**Alternatives considered**:
- *Free-form `String`*: would let the form accept anything and shift
  validation onto Zod alone. Loses DB-level integrity for no upside.
- *Lookup table*: warranted only if entries gain extra fields
  (e.g. `accrual_rate`, `requires_approval`). Premature.

## Decision 3 — Authorization model

**Decision**: Single helper `requireTenantContext` guards all
`/conges` routes. The role-and-target check lives inside the
repository (Phase 6 pattern). The repository function for each
mutation:

1. Resolves the target row's owner (the existing row for
   update/decide/delete, the form's `targetEmployeeId` for create).
2. Asserts `target.companyId === ctx.companyId` (throws
   `EMPLOYEE_NOT_FOUND` / `NOT_FOUND` to avoid cross-tenant
   enumeration).
3. Asserts the actor is allowed: for create+delete-own-PENDING, the
   target must equal `ctx.userId` OR `ctx.role === "MANAGER"`. For
   decide (APPROVE/REJECT), `ctx.role === "MANAGER"` is the only
   acceptable answer.

**Rationale**:
- Compresses three checks (tenant, role, target) into one site per
  mutation.
- Matches the Phase 6 (`Availability`) shape so the codebase remains
  a recognizable pattern, not a per-feature reinvention.

**Alternatives considered**:
- *Separate Server-Action-level checks*: would duplicate the role
  branch on three actions and risk drift.

## Decision 4 — Overlap detection scope

**Decision**: Reject a new (or updated) request when its range
overlaps any other `PENDING` or `APPROVED` request of the same
employee. Allow overlap with `REJECTED` requests.

**Rationale**:
- A `REJECTED` request is inert by definition (FR-002 mentions only
  PENDING / APPROVED). Letting a new request reuse that range is
  the expected behavior ("I asked, they said no, I'll ask again
  later with different dates").
- Half-open math: `existing.startDate <= new.endDate AND
  existing.endDate >= new.startDate` (inclusive on both sides since
  the dates are inclusive).
- Executes inside the transaction with the insert/update to remove
  the race window.

**Alternatives considered**:
- *Block on REJECTED too*: surprising and limits the employee's
  ability to negotiate.
- *Allow overlap with PENDING*: would let an employee stack many
  identical PENDING requests, junking the MANAGER's queue.

## Decision 5 — Calendar overlay shape

**Decision**: The schedules page fetches all `PENDING + APPROVED`
requests whose range intersects the visible week, then groups them
into `Map<string, { approved: Set<string>; pending: Set<string> }>`
keyed by employee id, where each `Set` contains ISO date strings
`"YYYY-MM-DD"` of the relevant days. The calendar cell-level
predicate is `approved.has(toISODate(day))`.

**Rationale**:
- Membership in a `Set<string>` is `O(1)` per lookup.
- The Set explicitly enumerates the days; clamping a multi-week
  request to the visible week happens once at construction time, not
  per render.
- Two Sets keep `APPROVED` and `PENDING` overlays orthogonal and
  preserve render-time disambiguation (one is tinted darker than
  the other).

**Alternatives considered**:
- *Pass `TimeOffRequest[]` and scan per cell*: O(requests × cells)
  per render. Trivial for current sizes but worse asymptotically and
  more code at the call site.
- *Server-precomputed cell map*: same logic but blocks the
  `useOptimistic` shift moves (which don't change the time-off
  state, but we'd still need to thread it through somehow).

## Decision 6 — Two warnings on the same shift card

**Decision**: `ShiftBlock` accepts two new pieces of state: the
existing `availabilities` prop from Phase 6 (already there) and a
new boolean `isOnApprovedTimeOff`. Both badges render independently
in the top-right corner. The amber ring already used by the
off-availability case stays as is; the absence marker is a small
`Plane` (or `CalendarOff`) icon next to (or behind) the
`AlertTriangle`.

**Rationale**:
- FR-013 explicitly requires composition, not replacement.
- Tooltips on each icon disambiguate the cause.
- Visual cost is one tiny icon — the card already has space for it.

**Alternatives considered**:
- *One generic "warning" badge*: would hide which rule fired and
  reduce trust.
- *Tooltip-only*: would not satisfy SC-003 ("identify in under 3
  seconds").

## Open items

None. All decisions resolved.
