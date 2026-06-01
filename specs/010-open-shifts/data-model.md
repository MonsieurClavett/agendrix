# Data Model — 010-open-shifts

Phase 1 of `/speckit-plan`. Two schema diffs: nullable `Shift.employeeId`
and the new `ShiftClaim` entity.

## `Shift` (extended)

| Field         | Type      | Notes                                  |
|---------------|-----------|----------------------------------------|
| (existing)    | …         | unchanged                              |
| `employeeId`  | `String?` | NOW NULLABLE. Null = open shift.       |
| `employee`    | `User?`   | Optional relation; same FK behavior.   |

The FK `employeeId → User` keeps `ON DELETE Restrict` for non-null
values. Setting `employeeId = NULL` is the supported "unassign"
operation.

## Enum: `ClaimStatus`

```prisma
enum ClaimStatus {
  PENDING
  APPROVED
  REJECTED
}
```

## Entity: `ShiftClaim`

A request by an EMPLOYEE to be assigned to a given open shift.

| Field             | Type           | Notes                                                  |
|-------------------|----------------|--------------------------------------------------------|
| `id`              | `String`       | `cuid()`                                               |
| `companyId`       | `String`       | FK → `Company` ON DELETE CASCADE                       |
| `shiftId`         | `String`       | FK → `Shift` ON DELETE CASCADE                         |
| `employeeId`      | `String`       | FK → `User` (requester) ON DELETE CASCADE              |
| `status`          | `ClaimStatus`  | default PENDING                                        |
| `decidedAt`       | `DateTime?`    | set when decided                                       |
| `decidedByUserId` | `String?`      | FK → `User` ON DELETE SET NULL                         |
| `createdAt`       | `DateTime`     | `@default(now())`                                      |
| `updatedAt`       | `DateTime`     | `@updatedAt`                                           |

### Prisma schema target (new entities)

```prisma
enum ClaimStatus {
  PENDING
  APPROVED
  REJECTED
}

model ShiftClaim {
  id              String      @id @default(cuid())
  companyId       String
  company         Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  shiftId         String
  shift           Shift       @relation(fields: [shiftId], references: [id], onDelete: Cascade)
  employeeId      String
  employee        User        @relation("ShiftClaimRequester", fields: [employeeId], references: [id], onDelete: Cascade)
  status          ClaimStatus @default(PENDING)
  decidedAt       DateTime?
  decidedByUserId String?
  decidedBy       User?       @relation("ShiftClaimDecider", fields: [decidedByUserId], references: [id], onDelete: SetNull)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@unique([shiftId, employeeId])
  @@index([companyId, status])
  @@index([shiftId])
}
```

### Required `Company` / `User` / `Shift` schema edits

```prisma
model Company {
  // …existing…
  shiftClaims ShiftClaim[]
}

model User {
  // …existing…
  shiftClaims    ShiftClaim[] @relation("ShiftClaimRequester")
  shiftDecisions ShiftClaim[] @relation("ShiftClaimDecider")
}

model Shift {
  // existing fields…
  employeeId String?       // ★ now nullable
  employee   User?         @relation(fields: [employeeId], references: [id], onDelete: Restrict)
  claims     ShiftClaim[]
}
```

### Database-level invariants

- `companyId` is the tenant key everywhere — every read filters on it.
- `(shiftId, employeeId)` UNIQUE on `ShiftClaim` enforces FR-006 at the DB layer (no duplicate claims).
- `(companyId, status)` index serves the filter-panel badge count.
- `(shiftId)` index serves the per-shift requester list inside the MANAGER dialog.
- The attribution mutation runs inside a `$transaction` to satisfy FR-010 / SC-004.

## State transitions

```
                   +-----------+
  createClaim ---> |  PENDING  |
                   +-----+-----+
                         |
                         |  assignOpenShift (chosen)         (peer)
                         |--------------+-------------------------+
                         v              v                         v
                   +-----------+   +-----------+             +-----------+
                   | APPROVED  |   | REJECTED  |             |  PENDING  |  ← unchanged for non-peers (different shift)
                   +-----------+   +-----------+             +-----------+
```

The chosen claim → APPROVED. All sibling claims (same shiftId, still
PENDING) → REJECTED. Claims on OTHER shifts of the same employee are
not touched — the EMPLOYEE may still be pending on multiple open
shifts.

## Authorization model

| Operation                                | EMPLOYEE                | MANAGER (same company) |
|------------------------------------------|-------------------------|------------------------|
| `listOpenShiftsForCompanyWeek` (PUBLISHED) | ✅                     | ✅                     |
| `listOpenShiftsForManagerWeek` (all status) | ❌                  | ✅                     |
| `listClaimsForEmployee(self)`            | ✅                      | ✅ (self via list-mine)|
| `listClaimsForShift(shiftId)`            | ❌                      | ✅                     |
| `countPendingClaimsForCompany`           | ❌                      | ✅                     |
| `createClaim(shiftId)`                   | ✅ if PUBLISHED open    | ✅                     |
| `cancelClaim(claimId)` own PENDING       | ✅                      | ✅                     |
| `cancelClaim(claimId)` other             | ❌                      | ✅                     |
| `assignOpenShift(shiftId, claimId)`      | ❌                      | ✅                     |

## Migration

One Prisma migration `add_open_shifts_and_claims`:

```sql
-- 1. Drop NOT NULL on Shift.employeeId
ALTER TABLE "Shift" ALTER COLUMN "employeeId" DROP NOT NULL;

-- 2. Enum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- 3. Table
CREATE TABLE "ShiftClaim" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "shiftId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
  "decidedAt" TIMESTAMP(3),
  "decidedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShiftClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShiftClaim_shiftId_employeeId_key"
  ON "ShiftClaim"("shiftId", "employeeId");

CREATE INDEX "ShiftClaim_companyId_status_idx"
  ON "ShiftClaim"("companyId", "status");

CREATE INDEX "ShiftClaim_shiftId_idx" ON "ShiftClaim"("shiftId");

ALTER TABLE "ShiftClaim"
  ADD CONSTRAINT "ShiftClaim_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShiftClaim"
  ADD CONSTRAINT "ShiftClaim_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShiftClaim"
  ADD CONSTRAINT "ShiftClaim_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShiftClaim"
  ADD CONSTRAINT "ShiftClaim_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

No data backfill needed.
