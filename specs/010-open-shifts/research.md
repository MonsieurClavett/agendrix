# Research — 010-open-shifts

Phase 0 of `/speckit-plan`.

## Decision 1 — Nullable `employeeId` vs. separate `OpenShift` table

**Decision**: Make `Shift.employeeId` nullable. NO separate table.

**Rationale**:
- An open shift IS a shift — same date, time, position, status. The only difference is the absence of an assignee.
- Duplicating the schema as `OpenShift` would duplicate the DnD pipeline, the overlap math, the calendar render, the Phase 6/7/8 markers.
- Nullable FKs are well-supported by Prisma and Postgres.

**Alternatives**:
- *Separate `OpenShift` table*: rejected (duplication).
- *Sentinel "unassigned" user per company*: rejected (foreign concept, would pollute the User table and the auth context).

## Decision 2 — Claim entity separate from request status

**Decision**: New `ShiftClaim` table with `status ClaimStatus { PENDING APPROVED REJECTED }` mirroring Phase 7's `TimeOffStatus`.

**Rationale**:
- Same lifecycle, same audit metadata (`decidedAt`, `decidedByUserId`).
- Decoupled from the `Shift` so a single shift can host many claims and the history survives attribution.
- A `(shiftId, employeeId)` unique key prevents duplicate claims.

**Alternatives**:
- *Boolean array on Shift*: rejected (loses history).
- *Embed claim status on Shift itself*: rejected (one shift, multiple claimants).

## Decision 3 — Attribution transaction shape

**Decision**: `assignOpenShift(ctx, shiftId, chosenClaimId)` runs inside one `$transaction` and:

1. Fetches the shift with FOR UPDATE-equivalent semantics (Prisma's transaction isolation guarantees this for us).
2. Throws `NOT_OPEN` if `shift.employeeId !== null` (someone else won).
3. Fetches the chosen claim and verifies `(shiftId, status: "PENDING", companyId)` → throws `CLAIM_NOT_FOUND`.
4. Runs the existing overlap probe on the chosen claim's `employeeId` for the shift's time window — throws `ASSIGNEE_OVERLAP` if they're already busy.
5. Updates `shift.employeeId` to the claim's `employeeId`.
6. `updateMany` peer claims of the same `shiftId` to `REJECTED` with `decidedAt`/`decidedByUserId` set.
7. Updates the chosen claim itself to `APPROVED` with the same metadata.

**Rationale**:
- Atomic per FR-010 + SC-004.
- Overlap check inside transaction means a parallel `assignOpenShift` (different shift, same employee, same time) cannot interleave.
- The `updateMany` for peers + single `update` for the winner are both indexed.

**Alternatives**:
- *Two separate transactions (assign first, decide claims second)*: window where the shift is assigned but peer claims are still PENDING. Bad.
- *Application-level lock*: re-implements what `$transaction` already gives us.

## Decision 4 — Visibility filter composition

**Decision**: The repository function `listOpenShiftsForCompanyWeek(ctx, range)` adds three filters: `employeeId: null`, `status: "PUBLISHED"`, plus the standard `companyId` and week range. The MANAGER variant `listOpenShiftsForManagerWeek` keeps all statuses (DRAFT included).

**Rationale**:
- Phase 8 visibility composes naturally — same column, same enum.
- EMPLOYEEs literally cannot see DRAFT open shifts via the public page.

**Alternatives**:
- *Filter in the page*: rejected (defeatable via crafted URL — same argument as Phase 8 Decision 3).

## Decision 5 — Calendar row placement

**Decision**: In "Gérer par Employé" mode, prepend a single virtual row "Quarts à combler" at the top of the grid, containing all shifts with `employeeId IS NULL`. The row uses a sentinel id `"__open__"` for the DropCell id.

**Rationale**:
- Discoverable: appears next to the real employees, doesn't get lost in a sidebar.
- Drag-and-drop semantics: dragging a normal shift onto this row would set `employeeId = NULL`, which is exactly the "unassign" action. We do NOT implement this in Phase 9 (YAGNI) — the row stays drop-target-disabled.
- In "Gérer par Position" mode, open shifts already group naturally by position; no separate row needed.

**Alternatives**:
- *Sidebar list*: discoverability cost.
- *Footer row*: works but visually demotes the row.

## Decision 6 — Filter panel badge

**Decision**: The existing `FilterPanel` (Phase 5) has a "Quarts à combler" section that is currently a placeholder. We make it a single read-only line showing the count of PENDING claims across all open shifts of the company for the current week. Clicking it has no behavior in Phase 9 (badge only).

**Rationale**:
- Reuses the existing UI surface — the placeholder was sketched for exactly this.
- Cheap: one `count` query.

**Alternatives**:
- *Make it a filter that hides non-open shifts*: useful but expands the scope beyond P2.

## Open items

None.
