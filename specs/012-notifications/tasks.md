---
description: "Task list for the Notifications feature (Phase 11)"
---

# Tasks: Notifications

**Input**: Design documents from `/specs/012-notifications/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md. Phases 0–10 MUST be in place.

**Tests**: Manual browser smoke.

## Format

`- [ ] TXXX [P?] [USX?] Description with file path`

---

## Phase 1: Setup

- [X] T001 No new npm dep — Phase 10 already installed Resend.

---

## Phase 2: Foundational

### Database

- [X] T002 Update `prisma/schema.prisma`:
  - Add `enum NotificationType { SHIFT_PUBLISHED TIME_OFF_DECIDED CLAIM_DECIDED }`.
  - Add `Notification` model with named relation `recipient User @relation("NotificationRecipient", …)`, `payload Json`, `readAt DateTime?`, `@@index([recipientUserId, createdAt(sort: Desc)])`, `@@index([recipientUserId, readAt])`.
  - Add back-relations: `notifications Notification[]` on `Company`, `notifications Notification[] @relation("NotificationRecipient")` on `User`.
- [X] T003 Run `npx prisma migrate dev --name add_notifications`. Verify SQL creates the enum, the table, both indexes, and the two FKs (CASCADE on company and recipient).

### Helpers + payload schemas

- [X] T004 [P] Create `src/lib/notifications.ts`:
  - Three Zod schemas: `SHIFT_PUBLISHED_PAYLOAD`, `TIME_OFF_DECIDED_PAYLOAD`, `CLAIM_DECIDED_PAYLOAD`.
  - `NotificationPayloadSchema` — discriminated union on `type`.
  - `type NotificationPayload = z.infer<typeof NotificationPayloadSchema>`.
  - `renderNotificationLabel(payload): string` — French label per type, uses the typed payload.
  - `renderNotificationHref(payload): string | undefined` — `/schedules?week=…` for SHIFT_PUBLISHED, `/conges` for TIME_OFF_DECIDED, `/schedules?week=…` for CLAIM_DECIDED.
  - `renderNotificationIcon(type): React.ComponentType` — returns a lucide icon component (BellIcon / SunIcon / UserPlus / …).
- [X] T005 [P] Extend `src/lib/email.ts`:
  - Extract the existing Resend send logic into a private `sendEmail({ to, subject, html })` helper that returns `{ delivered: boolean }`.
  - `sendInvitationEmail` is rewritten to call `sendEmail`.
  - Add `sendNotificationEmail({ to, type, payload, recipientName })`: switches on `type` to render French subject + HTML body, then calls `sendEmail`. Returns `{ delivered: boolean }`.

### Repository: Notification

- [X] T006 [P] Create `src/lib/repositories/notification.ts`:
  - `NotificationRow` type.
  - `listLatestForUser(ctx, limit = 10)` — orders by `createdAt desc`, filters `recipientUserId = ctx.userId`. Returns rows with raw payload; the caller can re-parse if needed.
  - `countUnreadForUser(ctx)` — `db.notification.count({ where: { recipientUserId: ctx.userId, readAt: null } })`.
  - `markRead(ctx, notificationId)` — `updateMany` where `id` + `recipientUserId = ctx.userId` + `readAt: null`, set `readAt = now`. Returns void.
  - `markAllRead(ctx)` — `updateMany` where `recipientUserId = ctx.userId` and `readAt: null`, set `readAt = now`. Returns `{ count }`.
  - `createNotificationsInTx(tx, rows)` — accepts `Prisma.TransactionClient`, runs `tx.notification.createMany({ data: rows })`. The caller pre-validates payloads with the Zod schema.

### Server Actions for marking

- [X] T007 [P] Create `src/actions/notifications/markRead.ts`. `requireTenantContext()`. Zod `notificationId`. Call `markRead`. `revalidatePath("/")`. Return `{ success: true }`.
- [X] T008 [P] Create `src/actions/notifications/markAllRead.ts`. `requireTenantContext()`. Call `markAllRead`. `revalidatePath("/")`. Return `{ success: true, count }`.

### App-shell mount

- [X] T009 Edit `src/components/shell/AppShell.tsx`: render a `<NotificationsBell />` component (Server Component) in the header to the left of the avatar.

**Checkpoint**: schema migrated, helpers ready, marking actions exist, bell mount placeholder.

---

## Phase 3: User Story 1 - Notifications de publication (Priority: P1) 🎯 MVP

**Goal**: Publishing shifts emits one notification per affected employee + sends an email.

### Repository change

- [X] T010 [US1] Edit `src/lib/repositories/shift.ts` — `publishDraftsForWeek`:
  - Wrap the existing `updateMany` in a `$transaction`.
  - Inside the transaction: (a) `findMany` of the DRAFT shifts in the window with `employeeId: { not: null }` to get the list, (b) `groupBy` to count per employee, (c) the `updateMany` flips to PUBLISHED, (d) call `createNotificationsInTx(tx, rows)` for each unique employee with the right payload.
  - Return `{ count, notifyTo: Array<{ employeeId, count, employee: { email, name } }> }` so the action can dispatch emails. Use a second `tx.user.findMany` inside the same transaction to look up the emails of the recipients.

### Action change

- [X] T011 [US1] Edit `src/actions/shifts/publishWeek.ts`:
  - After `await publishDraftsForWeek`, loop over `notifyTo` and call `sendNotificationEmail` for each, wrapped in `try/catch` that only `console.warn`s on failure.
  - Use `Promise.all` to fire them concurrently (still serial would be fine at MVP scale; concurrent is just nicer).
  - Return the same `{ success, count }` shape — the email loop never alters the response shape.

### Smoke

- [X] T012 [US1] Smoke: publish a week with 5 shifts for Bob, confirm Bob has 1 notification with the right shiftCount and weekStartISO, console logs the email.

**US1 checkpoint**: publish emits the right number of notifications + emails.

---

## Phase 4: User Story 2 - Notifications de décision de congé (Priority: P1)

**Goal**: Approving / rejecting a time-off request notifies the requester.

### Repository change

- [X] T013 [US2] Edit `src/lib/repositories/timeOff.ts` — `decideTimeOff`:
  - Inside the existing `$transaction`, AFTER the row update, call `createNotificationsInTx(tx, [{ companyId, recipientUserId: existing.employeeId, type: "TIME_OFF_DECIDED", payload: { ... } }])`.
  - Look up the requester's email + name inside the transaction (or load it as part of the initial `findFirst` to avoid an extra round-trip).
  - Return the updated row + the recipient info so the action can email post-commit.

### Action change

- [X] T014 [US2] Edit `src/actions/timeOff/decide.ts`: after the repo call resolves, fire `sendNotificationEmail` in `try/catch`. Keep the existing return shape.

### Smoke

- [X] T015 [US2] Smoke: Alice approves Bob's request. Confirm Bob has a new TIME_OFF_DECIDED notification + email logged.

**US2 checkpoint**: decisions emit the right notification.

---

## Phase 5: User Story 3 - Notifications d'attribution de quart à combler (Priority: P2)

**Goal**: Assignment of an open shift notifies the winner + each peer.

### Repository change

- [X] T016 [US3] Edit `src/lib/repositories/shiftClaim.ts` — `assignOpenShift`:
  - Inside the existing transaction, AFTER the claim/shift updates, gather the affected employee list:
    - The winner = `claim.employeeId` (from the lookup).
    - The peers = `tx.shiftClaim.findMany({ where: { shiftId, id: { not: chosenClaimId } }, select: { employeeId: true } })`.
  - Build the notification rows: 1 APPROVED + N REJECTED.
  - Look up recipients' email+name for the post-commit email.
  - `createNotificationsInTx(tx, rows)`.
  - Return the recipient list so the action can email post-commit.

### Action change

- [X] T017 [US3] Edit `src/actions/openShifts/assignOpenShift.ts`: post-commit, loop the recipient list and `sendNotificationEmail` each.

### Smoke

- [X] T018 [US3] Smoke: 2 claims (Bob, Carol). Alice attributes to Bob. Bob gets APPROVED, Carol gets REJECTED.

**US3 checkpoint**: claim decisions emit the right notifications.

---

## Phase 6: User Story 4 - Cloche + panneau (Priority: P2)

**Goal**: A bell in the app header with a dropdown that lists the latest 10 notifications.

### Components

- [X] T019 [P] [US4] Create `src/components/notifications/NotificationRow.tsx` (`"use client"`): props `{ notification: NotificationRow; onMarkRead: () => void }`. Renders the icon (from `renderNotificationIcon`), the label (from `renderNotificationLabel`), the relative time ("il y a 3 h"), bold style if unread. Clicking the whole row fires `onMarkRead` AND optionally navigates to `renderNotificationHref` (use Next's `useRouter` to push).
- [X] T020 [P] [US4] Create `src/components/notifications/NotificationsPanel.tsx` (`"use client"`): props `{ notifications: NotificationRow[]; unreadCount: number }`. Renders a popover content with: a header "Notifications" + "Marquer toutes comme lues" button (dispatches `markAllReadAction` via `useActionState`), the list of rows or an empty state. Each row calls `markNotificationReadAction` on click.
- [X] T021 [US4] Create `src/components/notifications/NotificationsBell.tsx` (Server Component): `await requireTenantContext()`, fetch `Promise.all([listLatestForUser, countUnreadForUser])`. Re-parse payloads through Zod, drop invalid rows. Render a button with `BellIcon` + a small red dot when `unreadCount > 0`. Wraps a shadcn `Popover` containing `<NotificationsPanel notifications unreadCount />`.

### Component cleanup

- [X] T022 [US4] Edit `src/components/shell/AppShell.tsx` to actually render `<NotificationsBell />` (the T009 placeholder is replaced with the real component).

### Smoke

- [X] T023 [US4] Smoke: navigate around the app, confirm the bell renders, shows badge, opens dropdown, marks individual + all as read, navigates on click when the payload has an href.

**US4 checkpoint**: full UI loop works.

---

## Phase 7: Polish

- [X] T024 [P] Run `npx tsc --noEmit`.
- [X] T025 [P] Run `npm run build`.
- [X] T026 [P] Quickstart smoke (tests 1–6).
- [X] T027 [P] Mark every T0XX as `[X]` in this file.

---

## Dependencies

| From | To |
|------|----|
| T002 → T003 | schema then migration |
| T003 → T004–T008 | migration before code |
| T004, T005, T006 → T007, T008, T009 | helpers + repo before actions and mount |
| T010 → T011 | repo trigger before action wire |
| T013 → T014 | repo trigger before action wire |
| T016 → T017 | repo trigger before action wire |
| T019, T020, T021 → T022 | components before mount |
| Polish last |

## Implementation strategy

- **MVP scope**: T001–T009 (foundation) + T010–T012 (US1) + T013–T015 (US2) = 14 tasks. Notifications written + emails fired for the two P1 stories.
- **Increment 1 → US3**: 3 more tasks (T016–T018).
- **Increment 2 → US4**: 5 more tasks (T019–T023) — the visible UI.
- **Final**: 4 polish tasks.

**Total**: 27 tasks. MVP = 14.

## Independent test criteria summary

| Story | Independent slice |
|-------|-------------------|
| US1 (P1) | Publish a week → notifications + emails for each affected employee. |
| US2 (P1) | Decide a time-off request → notification + email for the requester. |
| US3 (P2) | Attribute an open shift → notifications + emails for the winner + peers. |
| US4 (P2) | Bell in header, dropdown with 10 latest + read state. |
