# Data Model — 013-shift-swaps

Phase 1 of `/speckit-plan`. One new entity, one new enum, and a
4-value extension to `NotificationType`.

## Enum: `SwapStatus`

```prisma
enum SwapStatus {
  PENDING_PEER
  PENDING_MANAGER
  APPROVED
  REJECTED_BY_PEER
  REJECTED_BY_MANAGER
  CANCELED_BY_PROPOSER
}
```

## Extension: `NotificationType`

Add four new values to the existing enum:

```prisma
enum NotificationType {
  SHIFT_PUBLISHED
  TIME_OFF_DECIDED
  CLAIM_DECIDED
  // ★ Phase 13
  SWAP_PROPOSED
  SWAP_ACCEPTED_BY_PEER
  SWAP_REJECTED_BY_PEER
  SWAP_DECIDED_BY_MANAGER
}
```

PostgreSQL handles enum additions in-place via `ALTER TYPE … ADD VALUE`.

## Entity: `ShiftSwap`

| Field                   | Type         | Notes                                            |
|-------------------------|--------------|--------------------------------------------------|
| `id`                    | `String`     | `cuid()`                                         |
| `companyId`             | `String`     | FK → `Company` ON DELETE CASCADE                 |
| `proposerUserId`        | `String`     | FK → `User` ON DELETE CASCADE                    |
| `proposerShiftId`       | `String`     | FK → `Shift` ON DELETE CASCADE                   |
| `targetUserId`          | `String`     | FK → `User` ON DELETE CASCADE                    |
| `targetShiftId`         | `String`     | FK → `Shift` ON DELETE CASCADE                   |
| `proposerMessage`       | `String?`    | ≤ 280 chars                                      |
| `status`                | `SwapStatus` | default `PENDING_PEER`                           |
| `peerDecidedAt`         | `DateTime?`  |                                                  |
| `peerRejectionReason`   | `String?`    | ≤ 280 chars                                      |
| `managerDecidedAt`      | `DateTime?`  |                                                  |
| `managerDecidedByUserId`| `String?`    | FK → `User` ON DELETE SET NULL                   |
| `managerRejectionReason`| `String?`    | ≤ 280 chars                                      |
| `createdAt`             | `DateTime`   | `@default(now())`                                |
| `updatedAt`             | `DateTime`   | `@updatedAt`                                     |

### Prisma schema target

```prisma
enum SwapStatus {
  PENDING_PEER
  PENDING_MANAGER
  APPROVED
  REJECTED_BY_PEER
  REJECTED_BY_MANAGER
  CANCELED_BY_PROPOSER
}

model ShiftSwap {
  id                      String     @id @default(cuid())
  companyId               String
  company                 Company    @relation(fields: [companyId], references: [id], onDelete: Cascade)
  proposerUserId          String
  proposerUser            User       @relation("SwapProposer", fields: [proposerUserId], references: [id], onDelete: Cascade)
  proposerShiftId         String
  proposerShift           Shift      @relation("SwapProposerShift", fields: [proposerShiftId], references: [id], onDelete: Cascade)
  targetUserId            String
  targetUser              User       @relation("SwapTarget", fields: [targetUserId], references: [id], onDelete: Cascade)
  targetShiftId           String
  targetShift             Shift      @relation("SwapTargetShift", fields: [targetShiftId], references: [id], onDelete: Cascade)
  proposerMessage         String?
  status                  SwapStatus @default(PENDING_PEER)
  peerDecidedAt           DateTime?
  peerRejectionReason     String?
  managerDecidedAt        DateTime?
  managerDecidedByUserId  String?
  managerDecidedBy        User?      @relation("SwapManagerDecider", fields: [managerDecidedByUserId], references: [id], onDelete: SetNull)
  managerRejectionReason  String?
  createdAt               DateTime   @default(now())
  updatedAt               DateTime   @updatedAt

  @@index([companyId, status])
  @@index([proposerUserId, status])
  @@index([targetUserId, status])
}
```

### Back-relations

```prisma
model Company {
  // …existing…
  shiftSwaps ShiftSwap[]
}

model User {
  // …existing…
  swapsProposed        ShiftSwap[] @relation("SwapProposer")
  swapsTargeted        ShiftSwap[] @relation("SwapTarget")
  swapsManagerDecided  ShiftSwap[] @relation("SwapManagerDecider")
}

model Shift {
  // …existing…
  swapsAsProposer ShiftSwap[] @relation("SwapProposerShift")
  swapsAsTarget   ShiftSwap[] @relation("SwapTargetShift")
}
```

### Database-level invariants

- `companyId` is the tenant key — every read filters on it.
- The active-engagement uniqueness is enforced by two **partial unique indexes** (hand-edited into the migration SQL, same pattern as Phase 10):

```sql
CREATE UNIQUE INDEX "ShiftSwap_proposerShift_active_uniq"
  ON "ShiftSwap"("proposerShiftId")
  WHERE "status" IN ('PENDING_PEER', 'PENDING_MANAGER');

CREATE UNIQUE INDEX "ShiftSwap_targetShift_active_uniq"
  ON "ShiftSwap"("targetShiftId")
  WHERE "status" IN ('PENDING_PEER', 'PENDING_MANAGER');
```

- `proposerUserId !== targetUserId` enforced at the application layer (a CHECK constraint would also work but Prisma can't declare it).

## State transitions

```
                +-------------+
   create  ---> | PENDING_PEER |
                +------+-------+
                       |
       +---------------+----------------+----------------+
       | peer accept   | peer reject    | proposer cancel|
       v               v                v
+--------------+ +-------------------+ +-------------------+
|PENDING_MGR   | | REJECTED_BY_PEER  | | CANCELED_BY_PROP  |
+-----+--------+ +-------------------+ +-------------------+
      |
      +----------+-------------+-------------+
      | approve  | reject (mgr)| proposer cancel
      v          v             v
+----------+ +-------------------+ +-------------------+
| APPROVED | | REJECTED_BY_MGR   | | CANCELED_BY_PROP  |
+----------+ +-------------------+ +-------------------+
```

- The proposer may cancel from either `PENDING_PEER` or `PENDING_MANAGER`.
- All terminal states are sinks — no transitions out.
- APPROVED additionally permutes the two `Shift.employeeId` columns inside the same transaction.

## Authorization model

| Operation                | proposer   | target     | MANAGER (same co) | Other |
|--------------------------|------------|------------|-------------------|-------|
| `proposeSwap`            | ✅         | n/a        | n/a               | ❌    |
| `peerAccept`             | ❌         | ✅         | ❌                | ❌    |
| `peerReject`             | ❌         | ✅         | ❌                | ❌    |
| `managerDecide`          | ❌         | ❌         | ✅                | ❌    |
| `cancelSwap`             | ✅ if PENDING_*| ❌    | ❌                | ❌    |
| `listMyProposed`         | ✅ (self)  | n/a        | n/a               | ❌    |
| `listIncomingForMe`      | n/a        | ✅ (self)  | n/a               | ❌    |
| `listPendingForManager`  | ❌         | ❌         | ✅                | ❌    |

All checks scoped by `companyId`.

## Migration

One Prisma migration `add_shift_swaps`. Generated via
`prisma migrate dev --create-only`, then hand-edited to:
1. Add the four enum values to `NotificationType` (`ALTER TYPE ... ADD VALUE`).
2. Add the two partial unique indexes shown above.

`prisma migrate dev` to apply.

No data backfill.
