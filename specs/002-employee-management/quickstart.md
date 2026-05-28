# Quickstart — Employee Management

**Feature**: Employee Management
**Date**: 2026-05-28

How to verify Phase 1 end-to-end. Assumes Phase 0 is in place (signup +
login + dashboard work) and the dev server is running on
http://localhost:3000.

## First-time setup (delta against Phase 0)

1. Switch to the branch:
   ```powershell
   git checkout 002-employee-management
   ```
2. Apply the new migration to the dev DB:
   ```powershell
   npx prisma migrate dev
   ```
   (Picks up the `add_user_is_active` migration; backfills existing rows
   to `isActive = true`.)
3. Restart the dev server if it's already running (`npm run dev`).

## Smoke tests

These match the spec's acceptance scenarios and success criteria.

### SC-001 — Invite an employee

1. Sign in as a MANAGER (use the founder account from Phase 0, e.g.
   `jane@acme.example`).
2. Open `/team` from the header link.
3. Click "Inviter un employé". Fill: email `bob@acme.example`, name "Bob",
   role EMPLOYEE. Submit.
4. **Expected**: a confirmation card appears showing Bob's email and a
   16-character temporary password (e.g. `K3M7-XQRH-2P9V-8WJB`). Copy it.
5. Sign out. On `/login`, sign in as `bob@acme.example` with that
   temporary password. **Expected**: lands on `/dashboard` with header
   "Acme" and role "EMPLOYEE".

### SC-002 — EMPLOYEE cannot reach `/team`

1. Continue as Bob (or any EMPLOYEE). Manually type `/team` in the address
   bar.
2. **Expected**: immediately redirected to `/dashboard`. A one-time
   banner reads "Vous n'avez pas accès à la gestion d'équipe."

### Edit a team member's name and role (US2)

1. Sign back in as Jane (the MANAGER). Open `/team`.
2. Click the row for Bob → "Modifier".
3. Change name to "Robert", role to MANAGER. Save.
4. **Expected**: team table refreshes. Bob's row now shows "Robert" and
   the role badge reads "MANAGER".
5. Sign out, sign in as Bob with his temp password. **Expected**: header
   link to `/team` now appears, and Bob can load `/team` successfully.

### SC-004 — Last-MANAGER invariant

1. Sign back in as Jane (still a MANAGER). On `/team`, change Robert's
   role from MANAGER back to EMPLOYEE (Robert was just promoted in the
   previous step). Save. ✅ Allowed (Jane remains the active manager).
2. Now try to demote yourself: open Jane's own row, change role to
   EMPLOYEE, save.
3. **Expected**: the action is rejected with "Une entreprise doit
   toujours avoir au moins un gestionnaire actif." Jane's role remains
   MANAGER.

### SC-003 — Deactivated user cannot sign in

1. Still as Jane: open Bob/Robert's row, click "Désactiver", confirm the
   modal.
2. **Expected**: Bob's row is now flagged "désactivé" but still listed.
3. Sign out. Try to sign in as Bob with his temp password.
4. **Expected**: same uniform "Email ou mot de passe invalide." message
   that wrong-password produces. No hint that the account is disabled.
5. Compare to: sign-in attempt with `noone@example.com` and any password
   — the error message MUST be identical.

### Reactivation

1. Sign back in as Jane. On `/team`, click "Réactiver" on Bob's row,
   confirm.
2. **Expected**: Bob's row no longer flagged. Bob can sign in again with
   his temp password.

### Edge: deactivate yourself

1. As Jane (the founder, last active manager), click "Désactiver" on
   your own row.
2. **Expected**: action rejected with "Vous ne pouvez pas désactiver
   votre propre compte." (and / or the "≥ 1 active manager" message
   — either is acceptable; both protect the invariant).

### SC-005 — Cross-tenant isolation (carry-over)

1. Sign out. Create a NEW company via `/signup`: company "Globex",
   user "Carol", email `carol@globex.example`.
2. Open `/team` as Carol. **Expected**: team list shows ONLY Carol. No
   trace of Jane / Robert / Bob from Acme.
3. (Optional adversarial sniff test: open the Network tab and inspect
   any team-management request. No payload should reference an Acme
   user id.)

### SC-006 — Temp password is one-time

1. Sign back in as Jane. On `/team`, invite a fresh user "Dan" with
   email `dan@acme.example`, role EMPLOYEE.
2. After the confirmation card shows the temp password, navigate away
   (click "Annuler" or refresh the page).
3. **Expected**: the temp password is gone from the UI. No re-display
   path exists. To re-issue access for Dan, you would need to wait for
   the future password-reset feature OR delete-and-re-invite (the latter
   would require new code that Phase 1 does not include — so for Phase 1,
   the practical answer is "be careful when issuing temp passwords").

## What this feature explicitly does NOT do (Phase 1)

- No invitation emails (the manager copies the temp password out of
  band).
- No password reset / "set your own password" flow.
- No hard delete.
- No employee self-edit of name or password.
- No forced session revocation when a user is deactivated mid-session.
- No bulk invite / CSV import.
- No audit log of who invited / deactivated whom.
