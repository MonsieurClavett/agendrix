# Data Model — 008-time-off

Phase 1 of `/speckit-plan`. Describes the `TimeOffRequest` entity,
its enums, relationships, validation rules, and integration with the
existing schema.

## Entities

### `TimeOffRequest`

A request for absence over a contiguous range of calendar dates.

| Field             | Type                | Notes                                                          |
|-------------------|---------------------|----------------------------------------------------------------|
| `id`              | `String`            | Primary key, `cuid()`                                          |
| `companyId`       | `String`            | FK → `Company.id`, ON DELETE CASCADE                           |
| `employeeId`      | `String`            | FK → `User.id` (requester), ON DELETE CASCADE                  |
| `startDate`       | `DateTime @db.Date` | Inclusive start of the absence                                 |
| `endDate`         | `DateTime @db.Date` | Inclusive end; MUST satisfy `endDate >= startDate`             |
| `type`            | `TimeOffType`       | PAID \| UNPAID \| SICK                                         |
| `reason`          | `String?`           | Optional; MUST be ≤ 280 chars when present                     |
| `status`          | `TimeOffStatus`     | PENDING \| APPROVED \| REJECTED; default PENDING               |
| `decidedAt`       | `DateTime?`         | Set when status leaves PENDING; cleared on reset (rare)        |
| `decidedByUserId` | `String?`           | FK → `User.id`, ON DELETE SET NULL                             |
| `createdAt`       | `DateTime`          | `@default(now())`                                              |
| `updatedAt`       | `DateTime`          | `@updatedAt`                                                   |

### `TimeOffType`

```prisma
enum TimeOffType {
  PAID
  UNPAID
  SICK
}
```

### `TimeOffStatus`

```prisma
enum TimeOffStatus {
  PENDING
  APPROVED
  REJECTED
}
```

### Prisma schema (target)

```prisma
enum TimeOffType {
  PAID
  UNPAID
  SICK
}

enum TimeOffStatus {
  PENDING
  APPROVED
  REJECTED
}

model TimeOffRequest {
  id              String        @id @default(cuid())
  companyId       String
  employeeId      String
  startDate       DateTime      @db.Date
  endDate         DateTime      @db.Date
  type            TimeOffType
  reason          String?
  status          TimeOffStatus @default(PENDING)
  decidedAt       DateTime?
  decidedByUserId String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  employee  User    @relation("TimeOffRequester", fields: [employeeId], references: [id], onDelete: Cascade)
  decidedBy User?   @relation("TimeOffDecider", fields: [decidedByUserId], references: [id], onDelete: SetNull)

  @@index([companyId, employeeId, startDate])
  @@index([companyId, status])
}
```

### Required `Company` / `User` schema edits

```prisma
model Company {
  // existing fields…
  timeOffRequests TimeOffRequest[]
}

model User {
  // existing fields…
  timeOffRequests TimeOffRequest[] @relation("TimeOffRequester")
  timeOffDecisions TimeOffRequest[] @relation("TimeOffDecider")
}
```

Two named relations are required because `TimeOffRequest` references
`User` twice (requester + decider).

### Database-level invariants

- `companyId` is the tenant key — every read and write filters on it.
- `(companyId, employeeId, startDate)` covers the calendar-overlay
  fetch ("which requests of this company intersect the visible
  week") and the per-employee overlap probe.
- `(companyId, status)` covers the MANAGER "À approuver" tab fetch
  (`status = PENDING`).
- `endDate >= startDate` is enforced at the application layer (Zod
  refinement). A SQL `CHECK` constraint MAY be added later; for
  Phase 7 the action-side guard is sufficient.
- Overlap exclusion between PENDING + APPROVED requests of the same
  employee is enforced inside the same `$transaction` as the
  insert/update.
- `decidedAt` and `decidedByUserId` are set together when status
  becomes APPROVED or REJECTED. They are NEVER set on a row that is
  still PENDING.

## State transitions

```
                +-----------+
                |   ---     |   (initial state on create)
                +-----+-----+
                      |
                      v
                +-----------+   approve   +-----------+
                |  PENDING  +------------>+ APPROVED  |
                +-----+-----+             +-----+-----+
                      |                         |
                      | reject                  | (MANAGER may delete or
                      v                         |  re-decide as needed —
                +-----------+                   |  no formal transition)
                |  REJECTED |                   |
                +-----------+                   v
                                          (no further transition)
```

- An EMPLOYEE can only **delete** their own PENDING (no transition
  to APPROVED or REJECTED — that's MANAGER-only).
- A MANAGER can transition PENDING → APPROVED, PENDING → REJECTED,
  or delete a row at any status.
- Re-decision (APPROVED → REJECTED, or vice-versa) is not exposed
  in the UI for this phase. The simplest path for a MANAGER who
  needs to reverse a decision is to delete the row and let the
  employee submit again. This decision is intentional to keep the
  audit story (`decidedAt`, `decidedByUserId`) write-once and clean.

## Authorization model

| Operation                      | EMPLOYEE                  | MANAGER (same company)    |
|--------------------------------|---------------------------|---------------------------|
| `listForEmployee(self)`        | ✅                        | ✅ (self via list-mine)    |
| `listForEmployee(other)`       | ❌                        | ✅                         |
| `listForCompany`               | ❌                        | ✅                         |
| `create(targetEmployeeId)`     | ✅ iff target = self      | ✅ (any in company)        |
| `decide(requestId, status)`    | ❌                        | ✅                         |
| `delete(requestId)` PENDING own | ✅                       | ✅                         |
| `delete(requestId)` any         | ❌                       | ✅                         |

Cross-tenant access in every row of the table returns the same
"not found" surface to prevent id enumeration.

## Derived data

Two pure helpers live in `src/lib/timeOff.ts` (no database):

- `enumerateDates(startDate, endDate): string[]` — returns inclusive
  ISO-date strings from start to end.
- `buildTimeOffMaps(rows, range): Map<string, { approved: Set<string>; pending: Set<string> }>`
  — clamps each row's range to the visible week and returns the
  per-employee day sets consumed by the calendar.

Plus French label maps:

- `TIME_OFF_TYPE_LABELS: Record<TimeOffType, string>` (Payé / Non
  payé / Maladie).
- `TIME_OFF_STATUS_LABELS: Record<TimeOffStatus, string>` (En
  attente / Approuvée / Refusée).

## Migration

One Prisma migration, name `add_time_off`:

```sql
CREATE TYPE "TimeOffType" AS ENUM ('PAID', 'UNPAID', 'SICK');
CREATE TYPE "TimeOffStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "TimeOffRequest" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "type" "TimeOffType" NOT NULL,
  "reason" TEXT,
  "status" "TimeOffStatus" NOT NULL DEFAULT 'PENDING',
  "decidedAt" TIMESTAMP(3),
  "decidedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimeOffRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TimeOffRequest_companyId_employeeId_startDate_idx"
  ON "TimeOffRequest"("companyId", "employeeId", "startDate");

CREATE INDEX "TimeOffRequest_companyId_status_idx"
  ON "TimeOffRequest"("companyId", "status");

ALTER TABLE "TimeOffRequest"
  ADD CONSTRAINT "TimeOffRequest_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimeOffRequest"
  ADD CONSTRAINT "TimeOffRequest_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimeOffRequest"
  ADD CONSTRAINT "TimeOffRequest_decidedByUserId_fkey"
  FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
```

No data backfill required.
