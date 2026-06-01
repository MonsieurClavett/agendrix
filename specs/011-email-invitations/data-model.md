# Data Model — 011-email-invitations

Phase 1 of `/speckit-plan`. One new entity, one new enum.

## Entity: `Invitation`

| Field             | Type                | Notes                                                  |
|-------------------|---------------------|--------------------------------------------------------|
| `id`              | `String`            | `cuid()` primary key                                   |
| `companyId`       | `String`            | FK → `Company` ON DELETE CASCADE                       |
| `email`           | `String`            | normalized lowercase                                   |
| `name`            | `String`            | pre-filled at acceptance, editable                     |
| `role`            | `Role`              | `MANAGER` or `EMPLOYEE` (reused enum)                  |
| `tokenHash`       | `String`            | SHA-256 of the URL token, unique                       |
| `expiresAt`       | `DateTime`          | createdAt + 7d                                         |
| `status`          | `InvitationStatus`  | default PENDING                                        |
| `acceptedAt`      | `DateTime?`         | set when accepted                                      |
| `invitedByUserId` | `String?`           | FK → `User` ON DELETE SET NULL                         |
| `createdAt`       | `DateTime`          | `@default(now())`                                      |
| `updatedAt`       | `DateTime`          | `@updatedAt`                                           |

## Enum: `InvitationStatus`

```prisma
enum InvitationStatus {
  PENDING
  ACCEPTED
}
```

Note: there is intentionally no `EXPIRED` status. Expiration is a
calculated property (compare `expiresAt` to `now()` at read time).
A `PENDING` row with `expiresAt < now()` is "expired" without
needing a background job to mutate state.

## Prisma schema target

```prisma
enum InvitationStatus {
  PENDING
  ACCEPTED
}

model Invitation {
  id              String           @id @default(cuid())
  companyId       String
  company         Company          @relation(fields: [companyId], references: [id], onDelete: Cascade)
  email           String
  name            String
  role            Role
  tokenHash       String           @unique
  expiresAt       DateTime
  status          InvitationStatus @default(PENDING)
  acceptedAt      DateTime?
  invitedByUserId String?
  invitedBy       User?            @relation("Inviter", fields: [invitedByUserId], references: [id], onDelete: SetNull)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@index([companyId, status])
}
```

`Company` and `User` need new back-relations:

```prisma
model Company {
  // …existing…
  invitations Invitation[]
}

model User {
  // …existing…
  sentInvitations Invitation[] @relation("Inviter")
}
```

## Database-level invariants

- `companyId` is the tenant key — every read filters on it (except the `accept` path, which uses `tokenHash` and derives `companyId` from the row).
- `tokenHash` UNIQUE prevents duplicate tokens (collision = a security incident).
- A **partial UNIQUE INDEX** on `(companyId, lower(email))` WHERE `status = 'PENDING'` prevents creating two PENDING invitations for the same email in the same company. ACCEPTED rows are excluded so they don't block a re-invite after a revocation. This index is added manually in the migration SQL (Prisma can't express it).
- The 7-day expiry is computed at INSERT time and stored — read paths don't recompute it.
- All emails in this table are stored lowercase. Application code MUST normalize input before insertion.

## State transitions

```
                  +-----------+
   create  -----> |  PENDING  |
                  +-----+-----+
                        |
                        |
                        v
                  +-----------+
                  | ACCEPTED  |    (terminal — User has been created)
                  +-----------+

   At read time, a PENDING row with expiresAt < now() is treated as expired:
   - listing UI marks it as such
   - the accept Server Action rejects with EXPIRED
   - the MANAGER can revoke but not resend
   - the MANAGER cannot re-invite the same email until the row is revoked
     (partial-unique on PENDING)
```

A `revoke` operation is a hard delete — the row vanishes from the
table. We do not keep an audit trail of revoked invitations in this
phase (YAGNI).

## Authorization model

| Operation                | EMPLOYEE | MANAGER | Public (unauthenticated) |
|--------------------------|----------|---------|--------------------------|
| `createInvitation`       | ❌       | ✅      | ❌                       |
| `listInvitationsForCo`   | ❌       | ✅      | ❌                       |
| `resendInvitation`       | ❌       | ✅      | ❌                       |
| `revokeInvitation`       | ❌       | ✅      | ❌                       |
| `acceptInvitation`       | n/a      | n/a     | ✅ (via token only)       |

All MANAGER operations are tenant-scoped. The accept operation
authenticates via the token itself.

## Migration

One Prisma migration `add_invitations`:

```sql
-- Enum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- Table
CREATE TABLE "Invitation" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "acceptedAt" TIMESTAMP(3),
  "invitedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");
CREATE INDEX "Invitation_companyId_status_idx" ON "Invitation"("companyId", "status");

-- Partial unique: prevent duplicate PENDING per (companyId, email)
CREATE UNIQUE INDEX "Invitation_pending_uniq"
  ON "Invitation"("companyId", "email")
  WHERE "status" = 'PENDING';

-- FKs
ALTER TABLE "Invitation"
  ADD CONSTRAINT "Invitation_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invitation"
  ADD CONSTRAINT "Invitation_invitedByUserId_fkey"
  FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
```

The partial-unique index is the one piece Prisma can't generate; it
gets hand-added after `prisma migrate dev --create-only`. Re-running
`prisma migrate dev` applies the migration.

No data backfill needed.
