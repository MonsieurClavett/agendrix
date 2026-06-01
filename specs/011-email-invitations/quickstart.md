# Quickstart — 011-email-invitations

## Prerequisites

- `.env` with valid `DATABASE_URL`.
- `node_modules` installed (`npm install` will pull in `resend`).
- Migrations applied.
- Dev server running.
- `RESEND_API_KEY` is **optional** for dev — set it in `.env` to use real email, otherwise the link is logged to the server console.

## Smoke test 1 — Invite + accept (US1 + US2)

1. As MANAGER Alice, navigate to `/team`.
2. Click "Inviter un employé".
3. Email `bob@acme.test`, Name `Bob Builder`, Role `Employé`. Submit.
4. ✅ Toast confirms "Invitation envoyée." with a link visible (in dev fallback) or just "Email envoyé" (with Resend).
5. ✅ The "Invitations en attente" section now lists Bob with date d'expiration ≈ today + 7 days.
6. Copy the link from the toast / server log.
7. Open the link in an incognito window (no session): `/accept-invitation/<token>`.
8. ✅ Form shows `bob@acme.test` (disabled) and `Bob Builder` (editable).
9. Enter password `SecurePass1!`, confirm. Submit.
10. ✅ Redirected to `/login?welcome=1` with a success banner.
11. Log in as Bob with `bob@acme.test` / `SecurePass1!`. ✅ Bob lands on his dashboard with `EMPLOYEE` role.

## Smoke test 2 — Already-used token

1. After test 1, try the same link again in another incognito window.
2. ✅ Page shows "Cette invitation a déjà été utilisée." with a "Se connecter" link to `/login`.

## Smoke test 3 — Duplicate invite rejection

1. As Alice, try to invite `bob@acme.test` again.
2. ✅ Action returns "Cet email est déjà associé à un compte." (because Bob's User now exists).

## Smoke test 4 — Resend (US3)

1. Invite `carol@acme.test`.
2. In `/team`, click "Renvoyer" on Carol's row.
3. ✅ Toast "Email renvoyé.". A new link is logged (different from the first — the token is rotated).
4. The OLD link returns "introuvable" — the new link works.

## Smoke test 5 — Revoke (US3)

1. Invite `dave@acme.test`.
2. Click "Révoquer" on Dave's row.
3. ✅ Dave disappears from the list. His original link returns "Invitation introuvable.".

## Smoke test 6 — Cross-tenant safety

1. As Eve (MANAGER of Beta), open `/team`.
2. ✅ No invitations of Acme visible.
3. Try to access `/team` of Alice's company via direct URL guess. ✅ Forbidden (no such route, but the API is tenant-scoped).
4. Try to call `revokeInvitationAction({ invitationId: <Alice's invitation id> })` from devtools.
5. ✅ Server returns `{ error: "Invitation introuvable." }`.

## Smoke test 7 — Token hash never stored as plaintext

After invitations are created, peek at the database:

```sql
SELECT email, "tokenHash" FROM "Invitation";
```

✅ `tokenHash` is a 64-character hex string (SHA-256). The plain token is nowhere.

## Reset between runs

```powershell
$env:PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION = "yes"
npx prisma migrate reset --force
```

## Production deploy notes

Set in your hosting env:
- `RESEND_API_KEY` — your Resend API key.
- `RESEND_FROM` — e.g. `Agendrix <noreply@your-domain.com>` (must be verified in Resend dashboard).
- `APP_URL` — your production base URL, e.g. `https://app.your-domain.com`.

Without `RESEND_API_KEY`, the dev fallback runs (link logged, returned in toast) — production should always have it set.
