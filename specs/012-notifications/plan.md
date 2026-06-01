# Implementation Plan: Notifications

**Branch**: `012-notifications` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-notifications/spec.md`

## Summary

Add a `Notification` entity scoped per `Company` + `User`. Three
trigger sites in existing Server Actions emit notifications inside
the same transaction as the originating mutation:

- `publishWeekAction` (Phase 8) — `SHIFT_PUBLISHED` per assigned employee.
- `decideTimeOffAction` (Phase 7) — `TIME_OFF_DECIDED` to the requester.
- `assignOpenShiftAction` (Phase 9) — `CLAIM_DECIDED` to the winner + each loser.

A notification = an in-app row plus an email send. The email goes
through a notifications-shaped extension of `src/lib/email.ts`
(Phase 10 already wired Resend with a dev fallback). Email sends
are wrapped in `try/catch` so a Resend failure can never bubble out
of the originating Server Action.

In the app shell header, a new `NotificationsBell` client component
fetches the unread count + the latest 10 rows for the session user
and renders a dropdown with mark-as-read actions. Two new Server
Actions back the UI: `markNotificationRead` and `markAllRead`.

One Prisma migration. One new repository. Three trigger-site
modifications. One bell component + one dropdown panel. ≈30 tasks.

## Technical Context

**Language/Version**: TypeScript (strict) on Next.js 16 — carry-over.

**Primary Dependencies**: no new dep. Resend SDK already installed in Phase 10.

**Storage**: One new migration `add_notifications`:
1. Prisma enum `NotificationType { SHIFT_PUBLISHED TIME_OFF_DECIDED CLAIM_DECIDED }`.
2. Table `Notification` with `id`, `companyId`, `recipientUserId`, `type`, `payload Json`, `readAt? DateTime`, timestamps.
3. Index `(recipientUserId, createdAt desc)` for the bell query.
4. Index `(recipientUserId, readAt)` for the unread-count query (or filter on a partial index — see research.md).
5. FKs: `companyId → Company` ON DELETE CASCADE, `recipientUserId → User` ON DELETE CASCADE.

**Testing**: Manual browser smoke.

**Target Platform**: Web.

**Project Type**: Single Next.js project. New files:
`src/lib/repositories/notification.ts`, `src/lib/notifications.ts`
(payload schemas + label rendering + email-template registry),
`src/actions/notifications/{markRead,markAllRead}.ts`,
`src/components/notifications/{NotificationsBell,NotificationsPanel,NotificationRow}.tsx`.
Modified files: `prisma/schema.prisma`, `src/lib/repositories/shift.ts`
(notifications written inside `publishDraftsForWeek`),
`src/lib/repositories/timeOff.ts` (inside `decideTimeOff`),
`src/lib/repositories/shiftClaim.ts` (inside `assignOpenShift`),
`src/lib/email.ts` (added `sendNotificationEmail` companion),
`src/components/shell/AppShell.tsx` (mounts the bell).

**Performance Goals**:
- Bell fetch (unread count + last 10 rows) < 100 ms with composite indexes.
- Each trigger adds at most 1 extra INSERT per recipient inside the same `$transaction` — negligible (< 50 ms total for 10 recipients).
- Email send happens AFTER the transaction commits — does not block the action's response.

**Constraints**:
- All Phase 0–10 invariants carry over: tenant isolation, role gating, audit metadata.
- Notification creation MUST be transactional with the triggering mutation. If the originating action rolls back, no orphan notifications.
- Email sends MUST NOT be transactional — they happen post-commit and any failure is swallowed (logged only).
- The bell MUST query only `recipientUserId = ctx.userId` (no cross-user leak even inside the same company).

**Scale/Scope**: ≤ 1000 notifications per user/year, ≤ 50 unread at peak.

## Constitution Check

| Principle | How this plan satisfies it | Verdict |
|-----------|---------------------------|---------|
| **I. Multi-Tenant Isolation (NON-NEGOTIABLE)** | `Notification` carries `companyId`. The bell repo reads filter on `recipientUserId = ctx.userId`, which implicitly enforces tenant (a User belongs to exactly one company). The trigger-site writes use the existing `ctx.companyId`. | ✅ PASS |
| **II. SDD** | This plan follows `/speckit-plan`. | ✅ PASS |
| **III. Simplicity First (YAGNI)** | One new entity, one new enum, no push, no preferences, no digests. The render layer is a single switch over `NotificationType`. | ✅ PASS |
| **IV. Type Safety End-to-End** | `NotificationType` is Prisma-generated. Payload is `Json` in DB but cast on read through a Zod validator that returns the typed `SHIFT_PUBLISHED_PAYLOAD | TIME_OFF_DECIDED_PAYLOAD | CLAIM_DECIDED_PAYLOAD` discriminated union. UI consumes the typed union, not raw JSON. | ✅ PASS |
| **V. Server-Authoritative Authorization** | The bell's two Server Actions go through `requireTenantContext`. The repository's `markRead` / `markAllRead` add `recipientUserId: ctx.userId` to every where clause so a user cannot mark another user's notifications. | ✅ PASS |

**Gate verdict**: 5/5 PASS.

## Project Structure

### Documentation (this feature)

```text
specs/012-notifications/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/server-actions.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (delta against Phase 10 baseline)

```text
agendrix/
├── prisma/
│   ├── schema.prisma                                # ★ adds NotificationType + Notification
│   └── migrations/
│       └── <add_notifications>/migration.sql       # ★ new
├── src/
│   ├── actions/
│   │   └── notifications/
│   │       ├── markRead.ts                          # ★ NEW
│   │       └── markAllRead.ts                       # ★ NEW
│   ├── components/
│   │   ├── notifications/
│   │   │   ├── NotificationsBell.tsx                # ★ NEW (header trigger + badge)
│   │   │   ├── NotificationsPanel.tsx               # ★ NEW (dropdown body)
│   │   │   └── NotificationRow.tsx                  # ★ NEW (one row)
│   │   └── shell/
│   │       └── AppShell.tsx                         # ★ mounts the bell
│   ├── lib/
│   │   ├── notifications.ts                         # ★ NEW (payload zod + render helpers + email templates)
│   │   ├── email.ts                                 # ★ extended with sendNotificationEmail
│   │   └── repositories/
│   │       ├── notification.ts                      # ★ NEW: list/count/markRead/markAllRead + createNotification helper
│   │       ├── shift.ts                              # ★ publishDraftsForWeek emits SHIFT_PUBLISHED
│   │       ├── timeOff.ts                            # ★ decideTimeOff emits TIME_OFF_DECIDED
│   │       └── shiftClaim.ts                         # ★ assignOpenShift emits CLAIM_DECIDED + REJECTED
│   └── generated/prisma/                             # regenerated
```

**Structure Decision**: The Notification entity is small but cuts
across three Server Actions. The repository function
`createNotificationsInTx(tx, rows[])` is invoked from inside the
existing `$transaction` of `publishDraftsForWeek`,
`decideTimeOff`, and `assignOpenShift`. This guarantees that a
rollback of the originating mutation also rolls back the
notifications.

The post-commit email send happens in the Server Action layer
(not the repository), AFTER the await on the repository call
resolves successfully. Each email is awaited in a `try/catch` that
logs but swallows errors. We don't run them in parallel because the
volumes are tiny (< 10 per trigger) and serial keeps the code
simple.

The Bell component is a Server Component that fetches its data
inline (no extra round-trip) and hands it to a small Client
component for the dropdown interactions. This means the bell
reflects the latest state on every server render of the AppShell,
which happens on every page navigation — good enough without
real-time push.

## Complexity Tracking

No violations. The `Json` column + Zod refinement is one borderline
case but stays simple by virtue of three fixed types.

## Post-Design Re-Check

- The transactional emission inside `publishDraftsForWeek` requires aggregating per-employee counts BEFORE the `updateMany` — we run a quick `groupBy` first, then the updateMany, then the inserts. All inside the same `$transaction`.
- For `decideTimeOff`, the existing transaction already touches the row to flip status — adding one notification INSERT is trivial.
- For `assignOpenShift`, the transaction touches the winner claim + the shift + the peer claims. Adding 1+N notifications stays atomic.
- The bell query is bounded (LIMIT 10 + a separate count). On a user with 5000 historical notifications it's still indexed.
- Email sends post-commit means a user could see the in-app notification BEFORE the email arrives. That's acceptable — the in-app channel is the authoritative one.
- The Zod parsing of the JSON payload tolerates legacy shapes gracefully — unknown keys are stripped, missing required keys throw `INVALID_PAYLOAD` which the UI renders as a generic "Notification" label.

Gate remains ✅ PASS.
