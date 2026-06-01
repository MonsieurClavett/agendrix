# Quickstart — 012-notifications

## Prerequisites

- `.env` with valid `DATABASE_URL`.
- Migrations applied.
- Dev server running.
- Optional: `RESEND_API_KEY` set to deliver real emails — otherwise the contents are logged to stdout.

## Smoke test 1 — Publish a week and confirm notifications (US1)

1. As MANAGER Alice, navigate to `/schedules` for a future week.
2. Create 3 DRAFT shifts for Bob (Mon/Tue/Wed).
3. Click "Publier la semaine (3)" → confirm.
4. ✅ Toast "3 shifts publiés.".
5. Sign in as Bob.
6. ✅ The bell in the header shows a "1" badge.
7. Click the bell → ✅ one row "Vous avez 3 nouveaux shifts publiés cette semaine." with date relative.
8. Click the row → ✅ the badge clears, the row appears as read, and Bob is navigated to `/schedules?week=<weekStart>`.
9. In dev mode, the server console logs `[notification email] to=bob@acme.test type=SHIFT_PUBLISHED link=…`.

## Smoke test 2 — Time-off decision (US2)

1. As Bob, `/conges`, submit a request.
2. As Alice, decide it (Approve or Reject).
3. As Bob, ✅ the bell shows a new badge.
4. Open it → ✅ one row matching the decision.
5. Server console logs the email.

## Smoke test 3 — Open shift assignment (US3)

1. As Alice, create + publish an open shift.
2. As Bob and Carol, claim it from `/quarts-a-combler`.
3. As Alice, attribute to Bob from the schedule dialog.
4. ✅ Bob sees a "Demande approuvée" notification.
5. ✅ Carol sees a "Demande refusée" notification.

## Smoke test 4 — Mark all as read (US4)

1. Pick a user with 3+ unread notifications.
2. Open the bell, click "Marquer toutes comme lues".
3. ✅ Badge disappears. Rows show as read.

## Smoke test 5 — Cross-tenant isolation

1. As Eve (Beta MANAGER), open the bell. ✅ No Acme notifications.
2. Try to call `markNotificationReadAction({ notificationId: <Bob's id> })` from devtools.
3. ✅ Server returns success but Bob's row stays unread — the where clause filtered Eve out.

## Smoke test 6 — Email failure resilience

1. Set `RESEND_API_KEY` to a deliberately invalid value (e.g. `re_invalid`).
2. Publish a week.
3. ✅ Action succeeds, in-app notification is created, server logs an email-send warning.

## Reset between runs

```powershell
$env:PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION = "yes"
npx prisma migrate reset --force
```
