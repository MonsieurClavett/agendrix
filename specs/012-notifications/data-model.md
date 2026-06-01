# Data Model — 012-notifications

## Enum: `NotificationType`

```prisma
enum NotificationType {
  SHIFT_PUBLISHED
  TIME_OFF_DECIDED
  CLAIM_DECIDED
}
```

## Entity: `Notification`

| Field             | Type             | Notes                                       |
|-------------------|------------------|---------------------------------------------|
| `id`              | `String`         | `cuid()`                                    |
| `companyId`       | `String`         | FK → `Company` ON DELETE CASCADE            |
| `recipientUserId` | `String`         | FK → `User` ON DELETE CASCADE               |
| `type`            | `NotificationType` |                                           |
| `payload`         | `Json`           | discriminated union (`src/lib/notifications.ts`) |
| `readAt`          | `DateTime?`      | null = unread                               |
| `createdAt`       | `DateTime`       | `@default(now())`                           |
| `updatedAt`       | `DateTime`       | `@updatedAt`                                |

### Prisma schema target

```prisma
enum NotificationType {
  SHIFT_PUBLISHED
  TIME_OFF_DECIDED
  CLAIM_DECIDED
}

model Notification {
  id              String           @id @default(cuid())
  companyId       String
  company         Company          @relation(fields: [companyId], references: [id], onDelete: Cascade)
  recipientUserId String
  recipient       User             @relation("NotificationRecipient", fields: [recipientUserId], references: [id], onDelete: Cascade)
  type            NotificationType
  payload         Json
  readAt          DateTime?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@index([recipientUserId, createdAt(sort: Desc)])
  @@index([recipientUserId, readAt])
}
```

### Back-relations

```prisma
model Company {
  // …existing…
  notifications Notification[]
}

model User {
  // …existing…
  notifications Notification[] @relation("NotificationRecipient")
}
```

## State transitions

```
        +-------------+
        | unread      |   readAt IS NULL
        +------+------+
               |
               | markRead / markAllRead
               v
        +-------------+
        | read        |   readAt = DateTime
        +-------------+   (terminal — no "unmark" UX in this phase)
```

A notification is created with `readAt = NULL`. The two actions
that move it to "read" are `markNotificationReadAction` (one row)
and `markAllReadAction` (all unread rows for `ctx.userId`).

## Authorization model

| Operation                       | EMPLOYEE/MANAGER (own) | EMPLOYEE/MANAGER (other) |
|---------------------------------|------------------------|--------------------------|
| `listLatestForUser(ctx.userId)` | ✅                     | ❌                       |
| `countUnreadForUser(ctx.userId)`| ✅                     | ❌                       |
| `markRead(notifId)`             | ✅ if `recipientUserId === ctx.userId` | ❌ |
| `markAllRead()`                 | ✅ (scoped to self)    | n/a                      |
| `createNotificationsInTx(...)`  | n/a (server-internal, called from inside trigger-action transactions) | n/a |

Every public operation enforces `recipientUserId = ctx.userId` in
the where clause — the tenant filter is implicit because a User
belongs to one company.

## Migration

One Prisma migration `add_notifications`:

```sql
CREATE TYPE "NotificationType" AS ENUM ('SHIFT_PUBLISHED', 'TIME_OFF_DECIDED', 'CLAIM_DECIDED');

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "payload" JSONB NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_recipientUserId_createdAt_idx"
  ON "Notification"("recipientUserId", "createdAt" DESC);

CREATE INDEX "Notification_recipientUserId_readAt_idx"
  ON "Notification"("recipientUserId", "readAt");

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_recipientUserId_fkey"
  FOREIGN KEY ("recipientUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
```

No data backfill required.
