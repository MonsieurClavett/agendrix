# Research — 007-availability

Phase 0 of `/speckit-plan`. All decisions below resolve potential
NEEDS CLARIFICATION items embedded in the technical context.

## Decision 1 — Time representation

**Decision**: Store each range as `dayOfWeek` (Int 0–6, Sunday = 0) +
`startMinute` (Int 0–1439) + `endMinute` (Int 1–1440).

**Rationale**:
- The feature is *purely recurring weekly*: no specific date applies.
  Using `Date` would force a fictional anchor day and reintroduce
  timezone bugs.
- Minutes-since-midnight is the simplest representation that supports
  the full range required (including the 24h boundary at 1440).
- Integer arithmetic for overlap is trivial:
  `aStart < bEnd && bStart < aEnd && aDay === bDay`.
- Symmetric to `src/lib/week.ts` which already manipulates local
  minute math without `Date` machinery.

**Alternatives considered**:
- *PostgreSQL `time` columns*: cleaner semantically but Prisma maps
  them awkwardly to JS `Date`-with-1970-epoch values; would add the
  same parsing layer in TS anyway.
- *Two `Date` columns anchored to a synthetic week*: would survive
  formatting but bring fake timezone behavior into JSON serialization.

## Decision 2 — Authorization model

**Decision**: A single helper, `requireTenantContext`, guards all
availability routes. The role-and-target check (`actor can mutate
target?`) lives **inside the repository** rather than the Server
Action. The repository accepts `(ctx, targetEmployeeId, …)` and:

1. Verifies `targetEmployeeId` belongs to `ctx.companyId`. If not →
   throw `EMPLOYEE_NOT_FOUND` (indistinguishable from a different
   tenant's id — no data leak).
2. If `targetEmployeeId !== ctx.userId`, verifies `ctx.role === "MANAGER"`.
   Otherwise → throw `FORBIDDEN`.

**Rationale**:
- The check is invoked from three places (create / update / delete) —
  centralizing it in the repository avoids triplicate checks in
  Server Actions.
- Keeps the Constitution V invariant ("server-authoritative auth")
  pinned to the data-access boundary, in line with Principle I.
- Throwing the same error for cross-tenant id (`EMPLOYEE_NOT_FOUND`)
  prevents enumeration of foreign user ids via timing.

**Alternatives considered**:
- *Two repositories (self vs. any)*: more code for no semantic gain.
- *Server-Action-side checks*: would duplicate the check on every
  action and risk drift; Phase 1–5 chose the same pattern (repository
  enforces tenant + role).

## Decision 3 — Overlap detection

**Decision**: Transactional half-open check inside `createAvailability`
and `updateAvailability`. Query shape:

```ts
const conflict = await tx.availability.findFirst({
  where: {
    companyId: ctx.companyId,
    employeeId: targetEmployeeId,
    dayOfWeek: data.dayOfWeek,
    id: { not: editingId },         // omitted on create
    startMinute: { lt: data.endMinute },
    endMinute: { gt: data.startMinute },
  },
  select: { id: true },
});
if (conflict) throw new Error("OVERLAP");
```

**Rationale**:
- Mirrors the proven Shift overlap pattern from Phase 2.
- Half-open intervals `[start, end)` make adjacency (e.g. 9–12 and
  12–14) explicitly non-conflicting, matching user mental model.
- Inside `$transaction` guarantees no race window between check and
  insert.

**Alternatives considered**:
- *Unique constraint on `(employeeId, dayOfWeek, startMinute, endMinute)`*:
  prevents exact duplicates but not overlapping ranges.
- *PostgreSQL `EXCLUDE USING gist`*: powerful but adds a dependency
  on the `btree_gist` extension; overkill for ≤ 30 rows per employee.

## Decision 4 — Warning computation site

**Decision**: Compute the warning on the client, per render, from the
pre-fetched per-employee availability map.

**Rationale**:
- Drag-and-drop uses `useOptimistic` (Phase 4): the shift's date and
  employee can change between renders without a server round-trip.
  A server-computed warning would lag behind by one network hop.
- Data volume is small (≤ 30 ranges × ≤ 10 employees = 300 rows for
  a week). One extra `findMany` on the page is negligible.
- Pure function `isShiftOffAvailability(shift, ranges) → boolean`
  is trivially testable and trivially memoizable per shift.

**Alternatives considered**:
- *Server-computed on Shift fetch*: would survive a slow client but
  would not survive drag-end optimistic updates.
- *Recompute on the server after each DnD*: extra round-trip per
  drag — defeats the optimistic UX.

## Decision 5 — Dual mount point (`/disponibilites` + Team dialog)

**Decision**: Build `AvailabilityWeekView` as a self-contained client
component that takes `(ranges, targetEmployeeId, canEdit)` as props.
Mount it (a) at `/disponibilites` with the session user's id and
`canEdit = true`, and (b) inside a `Dialog` on `/team` with the
target employee's id and `canEdit = (session.role === "MANAGER")`.

**Rationale**:
- One UI source of truth. Bug fixes propagate everywhere.
- Same Server Actions reused. The action signature already includes
  `targetEmployeeId`, so the dialog branch needs no new endpoint.

**Alternatives considered**:
- *Separate read-only viewer*: would diverge in styling.
- *Nested route `/team/[id]/disponibilites`*: extra navigation cost
  for a UX that should feel like a quick peek.

## Decision 6 — Calendar warning visual

**Decision**: A small triangle warning glyph (`AlertTriangle` from
`lucide-react`, already a transitive dep of shadcn) in the top-right
of the `ShiftBlock`, paired with a 1px amber outline on the card.
Color comes from the existing OKLCH accent palette (no new token).

**Rationale**:
- Discoverable but not alarming — matches the "soft warning"
  semantics of FR-009.
- Reuses an icon library already pulled in by other components.
- AA-contrast amber maps to `oklch(0.7 0.2 60)` on light and
  `oklch(0.8 0.18 70)` on dark, consistent with existing tokens.

**Alternatives considered**:
- *Red border / banner toast*: too alarming; the user wants visibility,
  not interruption.
- *Tooltip-only on hover*: would not satisfy SC-002 (3-second visual
  recognition).

## Open items

None. All decisions are made; the plan proceeds to Phase 1.
