# Quickstart — 010-open-shifts

## Prerequisites

- `.env` with valid `DATABASE_URL`.
- `node_modules` installed.
- Migrations applied.
- Dev server running.

## Smoke test 1 — Create an open shift (US1)

1. As MANAGER, `/schedules`, "Créer".
2. Leave the employee selector on "Quart à combler" (empty / unassigned).
3. Date 16 July 2026, 10:00–15:00, position Service.
4. Save.
5. ✅ Shift appears in a dedicated "Quarts à combler" row at the top of the grid, with an unassigned icon and the "Brouillon" badge (Phase 8 default).
6. Click "Publier la semaine" → confirm.
7. ✅ The "Brouillon" badge disappears. The shift is now PUBLISHED and visible to EMPLOYEEs on `/quarts-a-combler`.

## Smoke test 2 — Claim the shift (US2)

1. As EMPLOYEE Bob, click "Quarts à combler" in the sidebar.
2. ✅ The shift from test 1 appears with a "Je veux ce quart" button.
3. Click it, confirm.
4. ✅ Button is replaced by a "Demande envoyée" badge.
5. As EMPLOYEE Carol, same page, same shift. Click "Je veux ce quart". ✅ Both Bob and Carol have a PENDING claim now.

## Smoke test 3 — Assign the shift (US3)

1. As MANAGER, `/schedules`, click the open shift card.
2. ✅ Dialog opens with the shift fields AND a "Demandes" section listing Bob and Carol.
3. Click "Attribuer à Bob" → confirmation dialog → confirm.
4. ✅ The shift's card disappears from the "Quarts à combler" row, reappears under Bob's row.
5. Bob's claim is APPROVED, Carol's claim is REJECTED.
6. As Bob, `/schedules`: ✅ shift appears in his published view.
7. As Carol, `/quarts-a-combler`: ✅ the shift no longer appears (it has an `employeeId` now).

## Smoke test 4 — Overlap rejection at attribution

1. As MANAGER, create a normal shift for Bob 10:00–15:00 on 17 July.
2. Create an open shift 11:00–16:00 on 17 July. Publish.
3. As Bob, claim it.
4. As MANAGER, try to attribute it to Bob.
5. ✅ Action returns `{ error: "ASSIGNEE_OVERLAP" }` with the French message "Cet employé a déjà un shift qui chevauche cette plage.". The shift remains unassigned, no claim is decided.

## Smoke test 5 — Cross-tenant safety

1. As EMPLOYEE Eve (company Beta), `/quarts-a-combler`.
2. ✅ Only Beta open shifts (or empty list). No Acme shift visible.
3. As Eve, attempt to call `createClaimAction({ shiftId: <Acme shift id> })`.
4. ✅ `{ error: "SHIFT_NOT_AVAILABLE" }`.

## Smoke test 6 — Cancel a PENDING claim

1. As Bob with a PENDING claim, `/quarts-a-combler`.
2. Click "Annuler ma demande".
3. ✅ Claim disappears, "Je veux ce quart" button comes back.

## Smoke test 7 — Idempotent uniqueness

1. As Bob with a PENDING claim on a shift, try to call `createClaimAction` again on the same shift (e.g., via devtools).
2. ✅ Returns `{ error: "DUPLICATE_CLAIM" }`. The unique index enforces it.

## Reset between runs

```powershell
$env:PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION = "yes"
npx prisma migrate reset --force
```
