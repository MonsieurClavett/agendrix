---
description: "Task list for the Email Invitations feature (Phase 10)"
---

# Tasks: Invitations email

**Input**: Design documents from `/specs/011-email-invitations/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md. Phases 0–9 MUST be in place.

**Tests**: Manual browser smoke.

## Format

`- [ ] TXXX [P?] [USX?] Description with file path`

---

## Phase 1: Setup

- [X] T001 `npm install resend` — adds the official Resend SDK.

---

## Phase 2: Foundational

### Database

- [X] T002 Update `prisma/schema.prisma`:
  - Add `enum InvitationStatus { PENDING ACCEPTED }`.
  - Add `Invitation` model per data-model.md, with relation `invitedBy User?` named `"Inviter"`, `@@index([companyId, status])`, and `tokenHash` `@unique`.
  - Add back-relations: `invitations Invitation[]` on `Company`, `sentInvitations Invitation[] @relation("Inviter")` on `User`.
- [X] T003 Run `npx prisma migrate dev --create-only --name add_invitations`. Hand-edit the generated SQL to add the partial unique index right after the table creation:
  ```sql
  CREATE UNIQUE INDEX "Invitation_pending_uniq"
    ON "Invitation"("companyId", "email")
    WHERE "status" = 'PENDING';
  ```
  Re-run `npx prisma migrate dev` to apply.

### Token + email helpers

- [X] T004 [P] Create `src/lib/tokens.ts` exporting:
  - `generateInvitationToken(): { token: string; hash: string }` — `randomBytes(32).toString("base64url")` + SHA-256 hex.
  - `hashInvitationToken(token: string): string` — used by the accept path to recompute the hash from a URL token.
- [X] T005 [P] Create `src/lib/email.ts` exporting `sendInvitationEmail({ to, inviteeName, companyName, link, expiresAt })`. Returns `{ delivered: boolean }`. Reads `RESEND_API_KEY` and `RESEND_FROM` from env. Dev fallback logs to console and returns `delivered: false`. Render a short French HTML body inline (no template engine). Use dynamic `await import("resend")` so the import cost is paid only when the key is set.

### Repository

- [X] T006 [P] Create `src/lib/repositories/invitation.ts` with `InvitationRow` type (NEVER includes `tokenHash`) and the five functions defined in contracts/server-actions.md: `listInvitationsForCompany`, `createInvitation`, `findInvitationByTokenHash` (public — no ctx), `acceptInvitation` (public — no ctx), `resendInvitation`, `revokeInvitation`. Catch Prisma P2002 on the partial-unique to translate to `ALREADY_PENDING`.

### Proxy / middleware

- [X] T007 [P] Edit `src/proxy.ts`: do NOT add `/accept-invitation` to `PROTECTED_PREFIXES` (it must be public) — verify the existing matcher list already excludes it; if any catch-all-style rule covers it, add an explicit pass-through.

### Cleanup of Phase-2 temp-password flow

- [X] T008 Delete `src/lib/temp-password.ts`.
- [X] T009 Delete `src/actions/team/invite.ts`. The new `createInvitationAction` replaces it.
- [X] T010 Remove the now-orphan import `createInvitedUser` if it isn't used elsewhere (verify in `src/lib/repositories/user.ts`).

**Checkpoint**: schema migrated, helpers + repository in place, old flow removed.

---

## Phase 3: User Story 1 - MANAGER envoie une invitation (Priority: P1) 🎯 MVP

**Goal**: A MANAGER can send a new invitation that creates an `Invitation` row and (optionally) sends an email.

### Server Action

- [X] T011 [P] [US1] Create `src/actions/invitations/create.ts` exporting `createInvitationAction`. `requireManagerContext()`. Zod: `email z.string().email()`, `name z.string().min(1).max(80)`, `role z.enum(["MANAGER","EMPLOYEE"])`. Steps: generate token, compute `expiresAt = now + 7d`, fetch company name (`db.company.findUnique`), call `createInvitation`, call `sendInvitationEmail`, return `{ success: true, link, delivered }`. Map `EMAIL_TAKEN` and `ALREADY_PENDING` to French strings. Revalidate `/team`.

### UI

- [X] T012 [US1] Rewrite `src/app/(dashboard)/team/_components/InviteEmployeeDialog.tsx`:
  - Form fields: email, name, role (same shape as before).
  - On submit, dispatch the new `createInvitationAction`.
  - On success: toast "Invitation envoyée." plus a copy-able link box (always — useful as backup; in dev it's the only way).
  - Remove the `TempPasswordCard` sub-component.

### Smoke

- [X] T013 [US1] Smoke: invite `bob@acme.test` and confirm the invitation row + the link is shown.

**US1 checkpoint**: invitations can be created and (in prod) emailed.

---

## Phase 4: User Story 2 - L'invité active son compte (Priority: P1) 🎯 MVP

**Goal**: A recipient clicks the link, sets a password, and gets a working account.

### Server Action

- [X] T014 [P] [US2] Create `src/actions/invitations/accept.ts` exporting `acceptInvitationAction`. Public — NO `requireTenantContext`. Zod: `token z.string().min(10)`, `name z.string().min(1).max(80)`, `password z.string().min(8)`, `confirmPassword z.string()`. Refine `password === confirmPassword`. Compute `tokenHash`, call `acceptInvitation`. Map `ALREADY_USED` / `EXPIRED` / `EMAIL_TAKEN` / `INVALID_INPUT`. Redirect to `/login?welcome=1` on success.

### UI

- [X] T015 [P] [US2] Create `src/app/accept-invitation/[token]/_components/AcceptInvitationForm.tsx` (`"use client"`): form with `email` (display only), `name` (pre-filled), `password`, `confirmPassword`. Dispatches `acceptInvitationAction`. Renders inline error.
- [X] T016 [US2] Create `src/app/accept-invitation/[token]/page.tsx` (Server Component, public route): compute `tokenHash`, call `findInvitationByTokenHash`. Branch on `null | ACCEPTED | expired | valid` and render the appropriate state card. Pass `token` and `invitation` to the form when valid.

### Smoke

- [X] T017 [US2] Smoke: copy a link from the MANAGER toast (Phase 3 T013), open it in incognito, set a password, submit. Login as the new user.

**US2 checkpoint**: end-to-end invitation → account.

---

## Phase 5: User Story 3 - Gestion des invitations en attente (Priority: P2)

**Goal**: A MANAGER can resend or revoke pending invitations.

### Server Actions

- [X] T018 [P] [US3] Create `src/actions/invitations/resend.ts`. `requireManagerContext()`. Zod: `invitationId`. Generate new token + hash. Call `resendInvitation(ctx, invitationId, { newTokenHash, newExpiresAt })`. Fetch company name. Call `sendInvitationEmail`. Return `{ success, link, delivered }`. Revalidate `/team`.
- [X] T019 [P] [US3] Create `src/actions/invitations/revoke.ts`. `requireManagerContext()`. Zod: `invitationId`. Call `revokeInvitation`. Map `NOT_FOUND`. Revalidate.

### UI

- [X] T020 [US3] Create `src/app/(dashboard)/team/_components/PendingInvitationsList.tsx` (`"use client"`): props `{ invitations: InvitationRow[] }`. Renders a Card per row with email + role badge + status ("En attente" / "Expirée" computed from `expiresAt`). Two icon buttons: "Renvoyer" (calls `resendInvitationAction`, disabled when expired) and "Révoquer" (calls `revokeInvitationAction`).
- [X] T021 [US3] Edit `src/app/(dashboard)/team/page.tsx`: after the existing `listAllUsersInCompany` call, also fetch `listInvitationsForCompany(ctx)`. Pass both to the page. Render `PendingInvitationsList` between the header and the `TeamTable`.

### Smoke

- [X] T022 [US3] Smoke: invite, resend (verify new link works, old one doesn't), revoke (verify the link returns "introuvable").

**US3 checkpoint**: pending-invitation management works.

---

## Phase 6: Polish

- [X] T023 [P] Run `npx tsc --noEmit`.
- [X] T024 [P] Run `npm run build`.
- [X] T025 [P] Quickstart smoke pass (tests 1–7).
- [X] T026 [P] Mark every T0XX as `[X]`.

---

## Dependencies

| From | To |
|------|----|
| T001 → T002 | dep install before schema |
| T002 → T003 | schema then migration |
| T003 → T004–T010 | migration before code |
| T004, T005 → T006 | helpers before repo |
| T006 → T011, T014, T018, T019 | repo before actions |
| T011 → T012, T013 | action before dialog before smoke |
| T014 → T015 → T016 → T017 | accept action → form → page → smoke |
| T018, T019 → T020 → T021 → T022 | resend/revoke actions → list → page wiring → smoke |
| Polish last |

## Implementation strategy

- **MVP scope**: T001 + T002–T010 (foundation) + T011–T017 (US1 + US2) = 17 tasks. The end-to-end invite + accept loop works.
- **Increment 1 → US3**: 5 more tasks (T018–T022).
- **Final**: 4 polish tasks.

**Total**: 26 tasks. MVP = 17 tasks.

## Independent test criteria summary

| Story | Independent slice |
|-------|-------------------|
| US1 (P1) | MANAGER creates an invitation; row exists; link shown / email sent. |
| US2 (P1) | Invitee accepts via link; User created; can log in. |
| US3 (P2) | MANAGER resends (new link) or revokes (link dies). |
