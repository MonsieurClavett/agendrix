# Server Action Contracts — 012-notifications

## Repository: `src/lib/repositories/notification.ts`

### `NotificationRow` type

```ts
type NotificationRow = {
  id: string;
  companyId: string;
  recipientUserId: string;
  type: "SHIFT_PUBLISHED" | "TIME_OFF_DECIDED" | "CLAIM_DECIDED";
  payload: NotificationPayload; // discriminated union from src/lib/notifications.ts
  readAt: Date | null;
  createdAt: Date;
};
```

The payload column is read raw from Prisma, then validated through
the discriminated Zod schema. On failure the row is dropped from the
result (graceful degradation), and a console warning is emitted.

### `listLatestForUser(ctx, limit = 10)`

Returns the recipient's `limit` most recent notifications ordered
by `createdAt DESC`. No tenant filter needed — `recipientUserId =
ctx.userId` is the tenant boundary.

### `countUnreadForUser(ctx)`

`db.notification.count({ where: { recipientUserId: ctx.userId, readAt: null } })`.

### `markRead(ctx, notificationId)`

`db.notification.updateMany({ where: { id: notificationId, recipientUserId: ctx.userId, readAt: null }, data: { readAt: new Date() } })`. Returns count > 0 → success, else `NOT_FOUND_OR_ALREADY_READ`.

### `markAllRead(ctx)`

`db.notification.updateMany({ where: { recipientUserId: ctx.userId, readAt: null }, data: { readAt: new Date() } })`.

### `createNotificationsInTx(tx, rows: CreateNotificationInput[])`

Server-internal — accepts the Prisma transaction handle. Inserts via `tx.notification.createMany({ data: rows })`. Returns nothing.

## Trigger-site changes

### `publishDraftsForWeek(ctx, range)`

```ts
return db.$transaction(async (tx) => {
  // 1. Aggregate published-shift counts per employee inside the window.
  const drafts = await tx.shift.findMany({
    where: { /* same filter */, employeeId: { not: null } },
    select: { employeeId: true },
  });
  const counts = new Map<string, number>();
  for (const s of drafts) if (s.employeeId) counts.set(s.employeeId, (counts.get(s.employeeId) ?? 0) + 1);

  // 2. Flip status.
  const result = await tx.shift.updateMany({ /* same as before */ });

  // 3. Emit one notification per employee.
  if (counts.size > 0) {
    await createNotificationsInTx(
      tx,
      [...counts.entries()].map(([employeeId, count]) => ({
        companyId: ctx.companyId,
        recipientUserId: employeeId,
        type: "SHIFT_PUBLISHED",
        payload: {
          type: "SHIFT_PUBLISHED",
          shiftCount: count,
          weekStartISO: toISODate(range.start),
        },
      })),
    );
  }
  return { count: result.count, notifyTo: [...counts.entries()] };
});
```

The caller (`publishWeekAction`) then loops over `notifyTo` and
fires `sendNotificationEmail` for each, wrapped in `try/catch`.

### `decideTimeOff(ctx, requestId, decision)`

Inside the existing transaction, after the `update`:

```ts
await createNotificationsInTx(tx, [{
  companyId: ctx.companyId,
  recipientUserId: existing.employeeId,
  type: "TIME_OFF_DECIDED",
  payload: { type: "TIME_OFF_DECIDED", status: decision, startDate, endDate, timeOffType },
}]);
```

The action returns the recipient + payload so it can fire the email after `await`.

### `assignOpenShift(ctx, shiftId, chosenClaimId)`

Inside the existing transaction, AFTER the claim updates:

```ts
// gather the peer claim employees (rejected) + the winner
const peers = await tx.shiftClaim.findMany({
  where: { shiftId, id: { not: chosenClaimId } },
  select: { employeeId: true },
});
await createNotificationsInTx(tx, [
  { companyId: ctx.companyId, recipientUserId: chosenEmployeeId, type: "CLAIM_DECIDED", payload: { type: "CLAIM_DECIDED", status: "APPROVED", shiftStartISO, shiftEndISO } },
  ...peers.map((p) => ({
    companyId: ctx.companyId,
    recipientUserId: p.employeeId,
    type: "CLAIM_DECIDED",
    payload: { type: "CLAIM_DECIDED", status: "REJECTED", shiftStartISO, shiftEndISO },
  })),
]);
```

Same returns-recipient-list pattern for the action to email post-commit.

## Server Actions

### `markNotificationReadAction`

**Path**: `src/actions/notifications/markRead.ts`

`requireTenantContext()`. Input: `notificationId`. Call `markRead`. Revalidate `/` (root layout, which mounts the bell). Returns `{ success: true }` always (idempotent — marking an already-read or non-existent notification is a no-op from the UI's POV).

### `markAllReadAction`

**Path**: `src/actions/notifications/markAllRead.ts`

`requireTenantContext()`. Call `markAllRead`. Revalidate.

## Notification email API

### `src/lib/email.ts` (extension)

```ts
type SendNotificationEmailInput = {
  to: string;
  type: NotificationType;
  payload: NotificationPayload;
  recipientName: string | null;
};

export async function sendNotificationEmail(
  input: SendNotificationEmailInput,
): Promise<{ delivered: boolean }> {
  const { subject, html } = renderNotificationEmail(input);
  return sendEmail({ to: input.to, subject, html });
}
```

`sendEmail` is the existing Resend wrapper (with the dev fallback)
extracted into a private helper so both `sendInvitationEmail` and
`sendNotificationEmail` can use it.

## Cross-action invariants

- Notifications are written inside the originating mutation's transaction. If the originating mutation rolls back, notifications roll back with it.
- Email sends are awaited but their failures are swallowed with a console warning. The action result is the same whether the email succeeded or not.
- `markRead` / `markAllRead` revalidate the root layout so the bell is up-to-date on the next navigation.
- No public action exists for reading another user's notifications, marking them, or deleting them.
