# Quickstart — 007-availability

How to run and smoke-test the availability feature once
`/speckit-implement` is done.

## Prerequisites

- `.env` present at repo root with valid `DATABASE_URL` (Neon).
- `node_modules` installed (`npm install` if first time).
- Migrations applied: `npx prisma migrate dev`.
- Dev server running: `npm run dev`.

## Smoke test 1 — Employee declares their own availability (US1)

1. Sign up a new company `CarbAcme` (creates the first MANAGER user `alice@acme.test`).
2. From `/team`, invite an employee `bob@acme.test` (Phase 2 flow).
3. Sign out, sign in as Bob.
4. Click **Disponibilités** in the sidebar (a new entry, available to all roles).
5. Click **Ajouter une plage** for *lundi*. Set 9h00 → 12h00, save. The range pill appears under Monday.
6. Add a second range for *lundi*: 14h00 → 18h00. Save.
7. Try to add a third range for *lundi*: 10h00 → 11h00. The dialog shows `Cette plage chevauche une plage existante de ce jour.` and no new range is created.
8. Click the pencil icon on the first range, change it to 8h00 → 13h00, save. The range updates in place.
9. Click the trash icon on the second range. Confirm. Range disappears.
10. Reload the page. Surviving range (lundi 8h00 → 13h00) is still there.

✅ Pass if: ranges persist, overlap rejected with a clear message, edit and delete both work.

## Smoke test 2 — Calendar warning fires on off-availability shifts (US2)

1. Stay as Bob. Add availability: *mercredi* 9h00 → 17h00.
2. Sign out, sign in as Alice (MANAGER).
3. Go to `/schedules`. Pick the current week containing a Wednesday.
4. Drag-to-create or use the "Nouveau shift" button: Bob, Wednesday, 10h00 → 15h00. Save.
5. **Expected**: the shift card shows no warning badge.
6. Create another: Bob, Wednesday, 18h00 → 22h00.
7. **Expected**: the second card shows a small amber warning glyph (top-right) and a 1px amber outline.
8. Create a shift for Bob on *jeudi* (no range declared): 10h00 → 14h00.
9. **Expected**: no warning (absence of declared ranges for that day means "non renseigné", not "off").
10. Drag the *wednesday 18h–22h* shift to *thursday* same time slot.
11. **Expected**: warning disappears immediately (optimistic) and remains gone after the server confirms.
12. Drag a Bob shift onto another employee Carol (no availability declared). Warning disappears.

✅ Pass if: warning rule respects the "global ranges exist AND shift not fully inside any range of the same day-of-week" boolean, and the warning recomputes on each drag end.

## Smoke test 3 — MANAGER edits an employee's availability (US3)

1. As Alice (MANAGER), go to `/team`.
2. Click the **Disponibilités** button on Bob's employee card.
3. **Expected**: a Dialog opens showing Bob's existing ranges in the same layout as `/disponibilites`.
4. Add a range: *samedi* 10h00 → 14h00. Save.
5. Close the dialog. Sign out, sign in as Bob.
6. Go to `/disponibilites`.
7. **Expected**: the *samedi* 10h00 → 14h00 range Alice added is visible to Bob.

✅ Pass if: the MANAGER's edits propagate to the employee's personal view.

## Smoke test 4 — Cross-tenant isolation (SC-004)

1. As Alice, copy Bob's user id from the URL of one of his ranges (or from devtools network panel for the create action).
2. Sign out. Sign up a brand-new company `CarbBeta` with `eve@beta.test` (separate MANAGER).
3. As Eve, open devtools and fire a `POST /api/...` (or simulate the Server Action) for `createAvailabilityAction` with `targetEmployeeId = <Bob's id>`. (Direct call via fetch.)
4. **Expected**: action returns `{ error: "EMPLOYEE_NOT_FOUND" }`. No row is created. No data of Bob is leaked in the response.
5. As Eve, navigate to `/team` and confirm Bob is not listed.
6. As Eve, navigate to `/disponibilites`. **Expected**: empty page, no fragments of Bob's ranges visible.

✅ Pass if: zero cross-tenant data crosses the boundary.

## Smoke test 5 — Soft warning never blocks (SC-003)

1. As Alice, with Bob having range *mercredi* 9h00 → 17h00 declared:
2. Create a shift Bob, *mercredi* 22h00 → 23h00 (fully off-availability).
3. **Expected**: shift is created. Warning shown.
4. Drag it to *jeudi* 23h00 → 24h00 (still off). **Expected**: drag succeeds. Warning still shown.
5. Edit the shift via dialog and change to *mercredi* 10h00 → 11h00 (now inside the range). **Expected**: warning disappears on close.

✅ Pass if: no flow is ever blocked by the warning.

## Reset between runs

```powershell
# Wipe and re-apply migrations (destructive — confirm twice).
$env:PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION = "yes"
npx prisma migrate reset --force
```

This drops all tables (including `Availability`) and re-applies every
migration in order, including the new `add_availability` one.
