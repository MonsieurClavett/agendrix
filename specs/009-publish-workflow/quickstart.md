# Quickstart — 009-publish-workflow

## Prerequisites

- `.env` with valid `DATABASE_URL`.
- `node_modules` installed.
- Migrations applied: `npx prisma migrate dev`.
- Dev server: `npm run dev`.

## Smoke test 1 — DRAFT is invisible to EMPLOYEE (US1)

1. As MANAGER `alice@acme.test`, navigate to `/schedules`. Pick a future week (e.g. 13 July 2026).
2. Create three shifts (Bob × 3 days).
3. ✅ Each card shows the "Brouillon" badge + reduced opacity + dashed border.
4. Sign out, sign in as Bob.
5. Navigate to `/schedules` for the same week.
6. ✅ Bob sees no shifts.

## Smoke test 2 — Publish the week (US2)

1. As Alice, on the same week with 3 DRAFT shifts: confirm "Publier la semaine" button is enabled with count "(3)".
2. Click it. Confirmation dialog reads "Publier 3 shifts pour la semaine du 13 juillet 2026 ?".
3. Confirm.
4. ✅ Cards lose their "Brouillon" badge.
5. ✅ Toast "3 shifts publiés." appears.
6. Sign in as Bob.
7. ✅ Bob now sees the three shifts in his schedule.
8. As Alice, click "Publier la semaine" a second time. ✅ Button is disabled; or click is a no-op and the toast says "0 shifts publiés."

## Smoke test 3 — Unpublish a shift (US3)

1. As Alice with a PUBLISHED shift visible: open the shift's dialog (click the card).
2. ✅ A "Dépublier" button is visible at the bottom of the dialog.
3. Click it, confirm.
4. ✅ The card re-acquires the DRAFT visual.
5. As Bob, refresh schedules. ✅ The shift is gone.

## Smoke test 4 — Drag-and-drop does not change status

1. As Alice, drag a DRAFT shift to another cell.
2. ✅ Still DRAFT after the drop.
3. Drag a PUBLISHED shift.
4. ✅ Still PUBLISHED after the drop.

## Smoke test 5 — Cross-tenant safety

1. As MANAGER Eve (company Beta), create some DRAFT shifts.
2. As Alice (company Acme), click "Publier la semaine".
3. ✅ Only Acme's drafts move. Eve's drafts remain DRAFT.

## Smoke test 6 — Backfill check

After migration, run:

```sql
SELECT status, COUNT(*) FROM "Shift" GROUP BY status;
```

✅ All pre-Phase-8 rows are `PUBLISHED`. Only rows created by this dev session are `DRAFT`.

## Reset between runs

```powershell
$env:PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION = "yes"
npx prisma migrate reset --force
```
