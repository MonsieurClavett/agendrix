# Data Model — 007-availability

Phase 1 of `/speckit-plan`. Describes the `Availability` entity, its
relationships, validation rules, and integration with the existing
schema.

## Entity: `Availability`

A recurring weekly window during which a given employee declares being
able to work.

| Field          | Type          | Notes                                                       |
|----------------|---------------|-------------------------------------------------------------|
| `id`           | `String`      | Primary key, `cuid()`                                       |
| `companyId`    | `String`      | FK → `Company.id`, ON DELETE CASCADE                        |
| `employeeId`   | `String`      | FK → `User.id`, ON DELETE CASCADE                           |
| `dayOfWeek`    | `Int`         | 0 = Sunday … 6 = Saturday                                   |
| `startMinute`  | `Int`         | 0–1439, inclusive (minutes since local 00:00)               |
| `endMinute`    | `Int`         | 1–1440, inclusive; MUST satisfy `endMinute > startMinute`   |
| `createdAt`    | `DateTime`    | `@default(now())`                                           |
| `updatedAt`    | `DateTime`    | `@updatedAt`                                                |

### Prisma schema (target)

```prisma
model Availability {
  id          String   @id @default(cuid())
  companyId   String
  employeeId  String
  dayOfWeek   Int
  startMinute Int
  endMinute   Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company  Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  employee User    @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  @@index([companyId, employeeId, dayOfWeek])
}
```

### Database-level invariants

- `companyId` is the tenant key — every read and write filters on it.
- `(companyId, employeeId, dayOfWeek)` index covers the only query
  shape we issue: "list ranges for this employee on this day" (overlap
  check) and "list all ranges for this employee" (UI render).
- Overlap is **not** enforced by a unique constraint (impossible
  without exclusion constraints / `btree_gist`). It is enforced at
  the application layer inside the same `$transaction` as the insert
  or update (see `research.md` Decision 3).
- `endMinute > startMinute` is enforced at the application layer.
  A `CHECK` constraint MAY be added in a follow-up migration; for
  Phase 6 the Zod validator + Server Action contract is sufficient.

### Required `Company` / `User` schema edits

```prisma
model Company {
  // …existing fields…
  availabilities Availability[]
}

model User {
  // …existing fields…
  availabilities Availability[]
}
```

No data changes to `Shift`, `Position`, or any prior table.

## State transitions

`Availability` is a CRUD entity without lifecycle states. Created,
read, updated, deleted. No archived / soft-deleted state in Phase 6.

## Authorization model

For every mutation (`create`, `update`, `delete`), the repository
function executes the following check before any database write:

1. The target employee MUST belong to the actor's company:
   `target.companyId === ctx.companyId`. Otherwise throw
   `EMPLOYEE_NOT_FOUND` (identical surface area to a non-existent id,
   to prevent cross-tenant id enumeration).
2. If `targetEmployeeId !== ctx.userId`, the actor's role MUST be
   `"MANAGER"`. Otherwise throw `FORBIDDEN`.

For reads:

- `listAvailabilitiesForEmployee(ctx, targetEmployeeId)` enforces the
  same check pair. An EMPLOYEE can only read their own ranges; a
  MANAGER can read any employee's ranges in their company.
- `listAvailabilitiesForCompany(ctx)` is MANAGER-only and is used to
  build the per-employee map consumed by the schedules calendar.

## Derived data

Two pure helpers live in `src/lib/availability.ts` (no database):

- `isShiftInsideAvailability(shift, ranges) → boolean`
  Returns `true` when at least one range with `dayOfWeek` matching the
  shift's local day-of-week has `startMinute <= shiftStartMinute && endMinute >= shiftEndMinute`.
- `formatHHMM(minute) → "HH:MM"`
  Reused from `src/lib/week.ts`.

## Migration

One Prisma migration, name `add_availability`:

```sql
CREATE TABLE "Availability" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startMinute" INTEGER NOT NULL,
  "endMinute" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Availability_companyId_employeeId_dayOfWeek_idx"
  ON "Availability"("companyId", "employeeId", "dayOfWeek");

ALTER TABLE "Availability"
  ADD CONSTRAINT "Availability_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Availability"
  ADD CONSTRAINT "Availability_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
```

No data backfill is required: every employee starts with zero ranges,
which is the spec-defined "non renseigné" state (no calendar warnings
shown for that employee until they add at least one range).
