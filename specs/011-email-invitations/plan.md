# Implementation Plan: Email Invitations

**Branch**: `011-email-invitations` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-email-invitations/spec.md`

## Summary

Add an `Invitation` entity scoped per `Company` representing a
pending or accepted invitation. The current "create User with temp
password" flow is replaced: MANAGER → creates invitation → email
sent (or link shown in dev) → invitee visits
`/accept-invitation/[token]` → sets password → User is created and
invitation marked ACCEPTED.

Token is generated as 32 random bytes encoded base64url and shown
only in the email link. The DB stores the SHA-256 hash only — no
recovery from the DB. Expiration is 7 days, computed at creation.

Email is sent via the Resend SDK when `RESEND_API_KEY` is set;
otherwise the URL is logged to stdout and returned to the MANAGER
in the action result so the dev flow works end-to-end without an
external dependency.

One new npm dep (`resend`). One Prisma migration. One new
repository. Three new Server Actions (`create`, `resend`, `revoke`)
plus a public `accept` action. One new route
`/accept-invitation/[token]`. The existing `InviteEmployeeDialog`
and `inviteEmployeeAction` are rewritten; the temp-password helper
is removed.

## Technical Context

**Language/Version**: TypeScript (strict) on Next.js 16 — carry-over.

**Primary Dependencies**: one new dep — `resend` (^4.x — the official Node SDK). Reuses Phase 0–9 stack otherwise.

**Storage**: Same Neon Postgres. One new migration `add_invitations`:
1. Add Prisma enum `InvitationStatus { PENDING ACCEPTED }`.
2. Create `Invitation` table with `id`, `companyId`, `email` (lowercase), `name`, `role`, `tokenHash`, `expiresAt`, `status`, `acceptedAt`, `invitedByUserId`, timestamps.
3. UNIQUE on `tokenHash` (token must be uniquely findable by its hash, and the same hash collision would be a security incident).
4. Partial UNIQUE on `(companyId, email)` WHERE `status = 'PENDING'` — prevents duplicate active invitations but allows ACCEPTED rows + new PENDING to coexist after a re-invitation.
5. FKs: `companyId → Company` ON DELETE CASCADE, `invitedByUserId → User` ON DELETE SET NULL.

**Testing**: Manual browser smoke + a quick local Resend sandbox test (or fallback to console-log mode).

**Target Platform**: Web.

**Project Type**: Single Next.js project. New files: `src/lib/email.ts`, `src/lib/tokens.ts`, `src/lib/repositories/invitation.ts`, `src/actions/invitations/{create,resend,revoke,accept}.ts`, `src/app/accept-invitation/[token]/page.tsx` + `_components/AcceptInvitationForm.tsx`. Modified files: `prisma/schema.prisma`, `src/proxy.ts` (allow public access to `/accept-invitation/*`), `src/app/(dashboard)/team/page.tsx`, `src/app/(dashboard)/team/_components/{InviteEmployeeDialog,TeamTable,PendingInvitationsList}.tsx` (new). Removed: `src/lib/temp-password.ts`, `src/actions/team/invite.ts` (replaced).

**Performance Goals**:
- Create-invitation Server Action < 1 s (includes email send when configured; the Resend SDK is fast — ~200ms p50).
- Accept-invitation page render < 200 ms.
- Accept-invitation Server Action < 500 ms (bcrypt + DB transaction).

**Constraints**:
- All Phase 0–9 invariants carry over: tenant isolation, role gating, audit metadata convention.
- The `accept` Server Action is the ONLY tenant-scoped mutation in the codebase that runs WITHOUT a `TenantContext` — its authorization is the token validity check.
- No token in clear is stored in DB or logs (Constitution Principle V's spirit, applied to the invitation token).
- `RESEND_API_KEY` is optional — the system MUST not break when it's missing.

**Scale/Scope**: ≤ 50 invitations active per company at once, ≤ 100 acceptances/day across all companies in MVP.

## Constitution Check

| Principle | How this plan satisfies it | Verdict |
|-----------|---------------------------|---------|
| **I. Multi-Tenant Isolation (NON-NEGOTIABLE)** | The `Invitation` table carries `companyId`. List/resend/revoke functions all take `TenantContext` and filter on it. The `accept` function is the documented exception: it has no `TenantContext` (the invitee isn't logged in), but it derives `companyId` solely from the validated invitation row. The created User inherits that `companyId` atomically. | ✅ PASS (with documented exception) |
| **II. SDD** | This plan is `/speckit-plan` output. | ✅ PASS |
| **III. Simplicity First (YAGNI)** | One new entity. One new dep (Resend SDK). Fixed 7-day expiry. No bulk invite, no email customization, no auto-login. Token storage uses Node's `crypto` — no extra package. | ✅ PASS |
| **IV. Type Safety End-to-End** | `InvitationStatus` and `Invitation` are Prisma-generated. Email payload + token shape are typed. Server Actions are Zod-validated. The token-hash function returns `string`, not `Buffer`, to keep types simple. | ✅ PASS |
| **V. Server-Authoritative Authorization** | `create`/`resend`/`revoke` go through `requireManagerContext`. The `accept` Server Action validates the token hash + status + expiry inside a `$transaction` with the User insert — the lookup and the mutation share a single DB round-trip. | ✅ PASS |

**Gate verdict**: 5/5 PASS. The accept-action exception is documented in Principle I.

## Project Structure

### Documentation (this feature)

```text
specs/011-email-invitations/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/server-actions.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (delta against Phase 9 baseline)

```text
agendrix/
├── prisma/
│   ├── schema.prisma                                # ★ adds InvitationStatus + Invitation
│   └── migrations/
│       └── <add_invitations>/migration.sql         # ★ new (includes partial unique index)
├── src/
│   ├── proxy.ts                                     # ★ allows /accept-invitation/* to be unauthenticated
│   ├── app/
│   │   ├── accept-invitation/
│   │   │   └── [token]/
│   │   │       ├── page.tsx                         # ★ NEW: Server Component, public
│   │   │       └── _components/
│   │   │           └── AcceptInvitationForm.tsx     # ★ NEW: client form
│   │   └── (dashboard)/
│   │       └── team/
│   │           ├── page.tsx                         # ★ fetches pending invitations
│   │           └── _components/
│   │               ├── InviteEmployeeDialog.tsx     # ★ rewritten (email-only flow)
│   │               └── PendingInvitationsList.tsx   # ★ NEW
│   ├── actions/
│   │   └── invitations/
│   │       ├── create.ts                            # ★ NEW (replaces inviteEmployeeAction)
│   │       ├── resend.ts                            # ★ NEW
│   │       ├── revoke.ts                            # ★ NEW
│   │       └── accept.ts                            # ★ NEW (public)
│   ├── lib/
│   │   ├── email.ts                                 # ★ NEW: Resend wrapper + dev fallback
│   │   ├── tokens.ts                                # ★ NEW: secure random + SHA-256
│   │   └── repositories/
│   │       └── invitation.ts                        # ★ NEW
│   └── generated/prisma/                             # regenerated
└── REMOVED:
    ├── src/lib/temp-password.ts                     # no longer needed
    └── src/actions/team/invite.ts                   # replaced by actions/invitations/create.ts
```

**Structure Decision**: The `Invitation` entity holds everything the
acceptance flow needs to construct the new `User` (`companyId`,
`name`, `role`) — no extra lookup is required at acceptance time.

The token is generated as 32 random bytes encoded as base64url
(URL-safe, no padding); the SHA-256 hash of that string is stored
in `tokenHash`. The hash is a single `string` column with a unique
index — finding an invitation by token is a single equality scan.

The email service abstraction lives in `src/lib/email.ts`. It
exposes `sendInvitationEmail({ to, name, company, link, expiresAt })`
which: (a) renders a short French HTML body inline (no template
engine — too much for the scope), (b) calls Resend if
`RESEND_API_KEY` is set, (c) otherwise logs the link to console
and returns. The function returns `{ delivered: boolean; link: string }`
so the caller (the Server Action) can decide whether to show the
link in the toast.

`/accept-invitation/[token]` is rendered server-side: it looks up
the invitation by hash, branches on `expired | accepted | valid` and
renders the appropriate UI. Only `valid` mounts the form.

## Complexity Tracking

No violations. The one documented exception (accept without `TenantContext`) is necessary by definition of the flow and is constrained to a single Server Action.

## Post-Design Re-Check

- The Resend dep is small (~1 MB tree-shaken) and pure-Node. No native bindings.
- The partial-unique index `(companyId, email) WHERE status = 'PENDING'` is the right shape but requires hand-editing the Prisma migration SQL (Prisma cannot express partial indexes declaratively).
- The accept transaction guards against the obvious race: two recipients clicking the same token in parallel would both pass the existence check but only one INSERT would succeed (unique on `User.email`). The losing transaction throws, the user retries and sees "already accepted".
- The 7-day expiry is a pure arithmetic check at acceptance time; no background job needed.
- Removing `src/lib/temp-password.ts` and `src/actions/team/invite.ts` is a real code deletion — Phase 2's behavior is replaced, not extended.

Gate remains ✅ PASS.
