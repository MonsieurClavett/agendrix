# Quickstart — Multi-Tenant Foundations

**Feature**: Multi-Tenant Foundations
**Date**: 2026-05-28

How to run this feature locally and smoke-test it end-to-end.

## Prerequisites

- Node.js ≥ 24 (`node --version`).
- A Neon (or any Postgres) `DATABASE_URL` you can reach.
- An `AUTH_SECRET` (32 random bytes, base64).

## First-time setup

1. **Clone and enter the repo**:
   ```powershell
   git clone https://github.com/MonsieurClavett/agendrix.git
   cd agendrix
   git checkout 001-multi-tenant-foundations
   ```

2. **Install dependencies**:
   ```powershell
   npm install
   ```

3. **Create `.env`** at the project root (gitignored — never commit):
   ```ini
   DATABASE_URL="postgresql://USER:PASS@HOST/DB?sslmode=require"
   AUTH_SECRET="<32-byte base64 secret>"
   ```
   Generate `AUTH_SECRET` if you don't have one:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

4. **Generate the Prisma client and run the initial migration**:
   ```powershell
   npx prisma migrate dev --name init
   ```
   This creates `Company`, `User`, and the `Role` enum in your database.

5. **Start the dev server**:
   ```powershell
   npm run dev
   ```
   Open http://localhost:3000.

## Smoke tests (Phase 0)

These match the acceptance scenarios in `spec.md` and the success criteria
SC-001 through SC-006.

### SC-001 — Found a new company

1. Open `/`. Click "Créer un compte entreprise".
2. Fill in: company name "Acme", your name "Jane", email "jane@acme.example",
   password "correcthorse".
3. Submit. **Expected**: redirected to `/dashboard`. The header shows
   "Acme". The dashboard says "Votre rôle : MANAGER" and lists exactly one
   user (Jane).

### SC-002 — Sign in to an existing account

1. From the dashboard, click "Se déconnecter". **Expected**: redirected to
   `/login`.
2. Re-enter Jane's email and password. Submit.
3. **Expected**: redirected to `/dashboard` again.

### SC-005 — Login responses are uniform

1. Sign out. On `/login`, try email "jane@acme.example" with the WRONG
   password. **Expected**: error "Email ou mot de passe invalide."
2. Now try email "nope@example.com" with any password. **Expected**: same
   error message, identical wording — no hint that "nope" doesn't exist.

### SC-003 — Tenant isolation (the load-bearing test)

1. Sign out. Go to `/signup` and create a SECOND company: company "Globex",
   your name "Carol", email "carol@globex.example", password "tr0ubador".
2. **Expected**: redirected to `/dashboard`. Header shows "Globex". User
   list shows ONLY Carol — Jane is NOT visible.
3. Sign out. Log back in as Jane.
4. **Expected**: header shows "Acme" again. User list shows ONLY Jane —
   Carol is NOT visible.
5. **Adversarial check**: while signed in as Jane, manually visit
   `/dashboard` (no query string trickery available since the page reads
   `companyId` from the verified session only). Confirm Carol's data
   never appears.

### SC-004 — Unauthenticated redirect

1. Sign out. In the browser address bar, navigate directly to
   `/dashboard`.
2. **Expected**: redirected immediately to
   `/login?callbackUrl=%2Fdashboard`. Sign in. Expected: returned to
   `/dashboard`.

### SC-006 — Atomic signup

This one is hard to trigger by hand without breaking the dev DB. The test
is mainly an inspection of the signup action source:

1. Open `src/actions/signup.ts`.
2. Confirm the `Company.create` and `User.create` calls are both inside
   the SAME `db.$transaction(...)` call.

That's the structural guarantee. If the transaction rolls back, neither
record exists; if it commits, both exist.

## What this feature explicitly does NOT do (Phase 0)

- No employee invitations (a MANAGER can't add an EMPLOYEE yet).
- No password reset / forgot-password flow.
- No email verification.
- No "edit company" or "delete account" flows.
- No automated test suite (per Constitution III — manual smoke is the
  Phase 0 testing posture).

These belong to Phase 1+.
