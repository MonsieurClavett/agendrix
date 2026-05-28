# Phase 1 — Data Model (delta against Phase 0/1)

**Feature**: Weekly Schedules
**Date**: 2026-05-28

## Entities

### Company

**Unchanged.** Gains one new back-relation `shifts: Shift[]`.

### User

**Unchanged.** Gains one new back-relation `shifts: Shift[]` (as the
assignee). `companyId` and `isActive` carry over from Phase 0 / 1.

### Shift (new)

Represents one scheduled work period for one employee.

| Field         | Type       | Constraints                                            | Notes                                                                                  |
|---------------|------------|--------------------------------------------------------|----------------------------------------------------------------------------------------|
| `id`          | `string`   | PRIMARY KEY, default `cuid()`                          |                                                                                        |
| `companyId`   | `string`   | NOT NULL, FK → `Company.id`, ON DELETE CASCADE         | Denormalised from `employee.companyId`. Maintained server-side; never from user input. |
| `employeeId`  | `string`   | NOT NULL, FK → `User.id`, ON DELETE RESTRICT           | The assigned user. RESTRICT so a User can't be deleted while shifts exist (Phase 1 never deletes Users anyway). |
| `startsAt`    | `DateTime` | NOT NULL                                               | UTC. For midnight-crossing shifts the application adds 24 h to `endsAt` before persisting. |
| `endsAt`      | `DateTime` | NOT NULL, app-level check `endsAt > startsAt`          | UTC. Always strictly after `startsAt`.                                                 |
| `note`        | `string?`  | nullable; length ≤ 280 when set                        | Free-text label / instruction.                                                         |
| `createdAt`   | `DateTime` | NOT NULL, default `now()`                              |                                                                                        |
| `updatedAt`   | `DateTime` | NOT NULL, auto-updated                                 |                                                                                        |

**Indexes**:
- `(companyId, startsAt)` — drives the MANAGER week-view query (range
  scan within a company).
- `(employeeId, startsAt)` — drives the EMPLOYEE self-view query AND
  the per-employee overlap check.

**Migration**: `<timestamp>_add_shift` creates the table + the two
indexes.

**Validation rules at the application boundary**:
- `employeeId` MUST belong to `ctx.companyId` (verified at create &
  update by joining or by a guarded lookup).
- `startsAt` and `endsAt` are derived from form fields `date`, `start`
  (HH:mm), `end` (HH:mm) by the Server Action. If `end ≤ start` in
  clock-time, the Server Action adds 1 day to the `endsAt` date.
- `endsAt - startsAt ≤ 24 hours` (sanity bound). Longer is rejected
  with a user-facing message (defends against accidental
  date-arithmetic bugs).
- `note` is trimmed and truncated to 280 characters; empty after trim
  → `null`.
- **No overlap** with any other shift of the SAME `employeeId`:
  `EXISTS (SELECT 1 FROM Shift WHERE employeeId = ? AND id != ? AND
   startsAt < newEnd AND endsAt > newStart)` MUST be false.

## Invariants

Enforced by `src/lib/repositories/shift.ts`:

1. **Tenant isolation** (Principle I): every read and write filters on
   `companyId = ctx.companyId`.
2. **Employee belongs to tenant**: at create/update, the target
   employee's `companyId` MUST equal `ctx.companyId` (verified inside
   the same transaction).
3. **No overlap per employee**: half-open-interval overlap check inside
   the same transaction as the insert/update.
4. **Time order**: `endsAt > startsAt`, enforced by the Server Action
   before the DB write.

## Relationship Diagram

```
+-----------+   1   *   +--------+   1   *   +---------+
|  Company  |───────────|  User  |───────────|  Shift  |
+-----------+           +--------+           +---------+
   id                     id                   id
   name                   email                companyId  (FK → Company)  ← denormalised
                          ...                  employeeId (FK → User)
                          isActive             startsAt   (UTC)
                                               endsAt     (UTC)
                                               note?      (≤ 280)
                                               createdAt
                                               updatedAt
```
