# Quickstart — 008-time-off

How to run and smoke-test the time-off feature.

## Prerequisites

- `.env` present with valid `DATABASE_URL` (Neon).
- `node_modules` installed.
- Migrations applied: `npx prisma migrate dev`.
- Dev server running: `npm run dev`.

## Smoke test 1 — EMPLOYEE submits and cancels a request (US1)

1. Sign in as an EMPLOYEE (`bob@acme.test`).
2. Click "Congés" in the sidebar.
3. Click "Nouvelle demande". Pick 15 → 22 July 2026, type "Payé", reason "Vacances été". Save.
4. ✅ The request appears with badge "En attente".
5. Try to create a second request 12 → 18 July 2026. ✅ Server returns "Cette demande chevauche une autre demande en attente ou approuvée." No new row created.
6. Click "Annuler" on the first PENDING request. ✅ Row disappears.
7. Try clicking "Annuler" on a request you previously had approved (set up via the next test). ✅ The "Annuler" button is not rendered.

## Smoke test 2 — MANAGER approves and rejects (US2)

1. With Bob having submitted a PENDING request, sign in as MANAGER (`alice@acme.test`).
2. Go to `/conges`. ✅ Two tabs visible: "À approuver" and "Historique".
3. On "À approuver", Bob's request is visible. Click "Approuver".
4. ✅ Request disappears from "À approuver" and shows up in "Historique" with badge "Approuvée" + the decision date.
5. Have Bob submit another request. As Alice, click "Refuser".
6. ✅ Request now appears in "Historique" with badge "Refusée".
7. As Alice, attempt to access (via direct URL guess) a request id belonging to a different tenant. ✅ 404 / no data leak.

## Smoke test 3 — Calendar overlay and shift warning (US3)

1. Have Bob with one APPROVED request (15 → 17 July 2026).
2. As Alice, go to `/schedules` and navigate to the week of 13 July.
3. ✅ The cells of 15, 16, 17 July for Bob's row are tinted (pale + dashed border) with a small "Congé" label.
4. Add Bob a request with PENDING status for 20 → 22 July. As Alice, the cells for those days show a lighter tint with a "?" marker.
5. Create a shift for Bob on 16 July (10:00 → 15:00). ✅ The card displays the absence marker icon in addition to any availability-related warning from Phase 6.
6. Drag the shift to 14 July (no time-off). ✅ Absence marker disappears.
7. Drag the shift to Carol on 16 July (no time-off declared for her). ✅ Absence marker disappears for Carol's row.
8. Drag back to Bob on 16 July. ✅ Marker re-appears.

## Smoke test 4 — Cross-tenant isolation

1. As Eve (MANAGER of `Beta`), open `/conges`. ✅ Empty (no Bob/Acme data leaks).
2. Try to call `deleteTimeOffAction` from devtools with Bob's `requestId`. ✅ Returns `{ error: "NOT_FOUND" }`.

## Smoke test 5 — Soft warning never blocks

1. With Bob having APPROVED 15 → 17 July:
2. Create shifts on 15, 16, 17 July. ✅ All created. Warning shown on all three.
3. Drag a shift to 18 July. ✅ Drag succeeds. Warning gone.
4. Edit a warned shift via the dialog. ✅ Dialog opens with no special restriction.

## Reset between runs

```powershell
$env:PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION = "yes"
npx prisma migrate reset --force
```
