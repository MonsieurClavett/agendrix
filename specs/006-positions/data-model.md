# Phase 1 — Data Model (Phase 5)

**Feature**: Positions
**Date**: 2026-05-28

## Database entities

### Position (new)

| Field        | Type       | Constraints                                  | Notes                                                                                |
|--------------|------------|----------------------------------------------|--------------------------------------------------------------------------------------|
| `id`         | `string`   | PRIMARY KEY, default `cuid()`                |                                                                                      |
| `companyId`  | `string`   | NOT NULL, FK → `Company.id`, CASCADE         | Position belongs to one company.                                                     |
| `name`       | `string`   | NOT NULL, length 1..40                       | Display name. Case-insensitive uniqueness enforced application-side per company.     |
| `color`      | `string`   | NOT NULL                                     | Palette key (e.g. `"teal"`, `"coral"`). Maps to OKLCH triplet in `src/lib/positions.ts`. |
| `createdAt`  | `DateTime` | NOT NULL, default `now()`                    |                                                                                      |
| `updatedAt`  | `DateTime` | NOT NULL, auto-updated                       |                                                                                      |

**Indexes**:
- `@@unique([companyId, name])` — DB-level case-sensitive uniqueness as a
  final concurrent-insert guard; case-insensitive uniqueness enforced
  before the insert by the Server Action.
- `@@index([companyId])` — fast lookup of a company's positions.

**Back-relations**:
- `shifts: Shift[]` — every shift that references this position.
- (`company: Company @relation(...)`) — implicit.

### Shift (extended from Phase 2/3)

One new nullable column:

| Field         | Type       | Constraints                                              | Notes                                                                                         |
|---------------|------------|----------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| `positionId`  | `string?`  | nullable, FK → `Position(id)`, **ON DELETE: SET NULL**  | A shift may have one position or none. Deleting the position sets this back to null per FR-005. |

(All other Shift fields unchanged from Phase 2.)

**Back-relation** added to Shift:
- `position: Position? @relation(...)`.

### Migration

`<timestamp>_add_positions`:
1. `CREATE TABLE "Position" (...)` with the columns above + indexes.
2. `ALTER TABLE "Shift" ADD COLUMN "positionId" TEXT;` (nullable).
3. `ALTER TABLE "Shift" ADD CONSTRAINT ... FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;`
4. `CREATE INDEX "Shift_positionId_idx" ON "Shift"("positionId");` (used by per-position filtering on the schedule page).

Backfill: existing shifts get `positionId = null` automatically (no DML
needed).

## Invariants

1. **Tenant isolation**: every read or write to `Position` and every
   `positionId` assignment on `Shift` MUST verify
   `position.companyId === ctx.companyId`.
2. **Hard delete of position never deletes shifts**: enforced by
   `ON DELETE: SetNull` at the FK level.
3. **`positionId`-bearing shifts**: when present, `position.companyId`
   MUST equal `shift.companyId`. The Server Action's transactional
   `findFirst({ where: { id, companyId } })` guards this invariant.

## Client-side transient state

`ScheduleView` holds:
- `selectedPositionIds: Set<string>` — which positions are currently
  filtered IN.
- `includeNoneFilter: boolean` — whether "Sans position" is also ticked.
- `groupBy: "employee" | "position"` — current grouping mode.

All three reset on page load / week navigation. No persistence in
Phase 5.
