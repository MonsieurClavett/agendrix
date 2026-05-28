# Implementation Plan: Employee Management

**Branch**: `002-employee-management` | **Date**: 2026-05-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-employee-management/spec.md`

## Summary

Add team-management capabilities on top of the Phase 0 foundations: a MANAGER
can invite new employees (in-app form, temp password shown once), see the full
team roster, edit name + role, and deactivate / reactivate users. Login is
extended to reject deactivated users with the existing uniform error message.
The "≥ 1 active MANAGER" invariant is enforced at the data-access layer.

Technical approach: extend `User` with an `isActive` boolean (one Prisma
migration), introduce a `(team)` route group guarded by
`requireManagerContext()`, add team-scoped Server Actions
(`inviteEmployeeAction`, `updateEmployeeAction`, `setUserActiveAction`) that
all flow through new repository functions (`listAllUsersInCompany`,
`createInvitedUser`, `updateUserById`, `setUserActiveStatus`) — all
accepting `TenantContext` and filtering by `companyId`. Auth.js `authorize()`
is updated to reject users with `isActive: false` (returns `null`,
surfacing as the same uniform login error). Temp password = 16-character
base32 chunk derived from `crypto.randomBytes(10)`, hashed with bcryptjs
before persistence, and flashed once on the response.

## Technical Context

**Language/Version**: TypeScript (strict) on Next.js 16 (App Router), Node.js 24 — carry-over from Phase 0.

**Primary Dependencies**: same stack as Phase 0 (Next.js 16, Prisma 6, Auth.js v5, Tailwind v4, shadcn/ui, bcryptjs, zod). No new packages — `crypto` is in Node core.

**Storage**: Same Neon Postgres. One new migration: `ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;` (Prisma `migrate dev --name add_user_is_active`).

**Testing**: Manual browser smoke (carry-over per Constitution III). The Phase 1 spec did not request automated tests.

**Target Platform**: Web, modern desktop + mobile browsers (carry-over).

**Project Type**: Same single Next.js project — adds one route group `/team` under `(dashboard)` + new files under `src/actions/team/`, `src/components/`, `src/lib/repositories/`.

**Performance Goals**:
- Invite flow < 60 s end-to-end (SC-001).
- Login latency for deactivated users indistinguishable from login latency for non-existent emails (uniform timing prevents enumeration via response time — SC-003).

**Constraints**:
- 100% role gating on `/team` (SC-002): proxy + page-level `requireManagerContext()` + Server Action-level re-check.
- Temp password disclosed exactly once (SC-006): plaintext lives only in the response payload of `inviteEmployeeAction` and is never logged, stored, or written to disk.
- "≥ 1 active MANAGER" invariant (SC-004): enforced inside the repository function that performs the affecting operation (deactivate, role change to EMPLOYEE) — checked in the same transaction.
- Cross-tenant isolation (SC-005): every new repository function requires a `TenantContext` and filters on `ctx.companyId` — same pattern as Phase 0.

**Scale/Scope**: MVP — teams of < 50 people; no pagination needed for the team page yet.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.0.0 (unchanged since Phase 0).

| Principle | How this plan satisfies it | Verdict |
|-----------|---------------------------|---------|
| **I. Multi-Tenant Isolation (NON-NEGOTIABLE)** | Every new repository function (`listAllUsersInCompany`, `createInvitedUser`, `updateUserById`, `setUserActiveStatus`) takes a `TenantContext` and includes `where: { companyId: ctx.companyId }` (or `AND` on update). Pages and Server Actions for `/team` never touch Prisma directly. | ✅ PASS |
| **II. Specification-Driven Development (NON-NEGOTIABLE)** | This plan is the output of `/speckit-plan` operating on `/speckit-specify` output, after `/speckit-constitution`. Implementation will be driven by `/speckit-tasks` → `/speckit-implement`. | ✅ PASS |
| **III. Simplicity First (YAGNI)** | One boolean column added. One new route group. Four new repository functions. No new tables, no audit log, no email integration, no rate-limiter — all explicitly deferred in the spec's Assumptions. No abstraction over "invite flow" — it's a single Server Action. | ✅ PASS |
| **IV. Type Safety End-to-End** | `Role` enum reused unchanged. `User` gains a typed `isActive: boolean`. Action input parsed via Zod (typed enum for role, validated email). Temp password generator returns `string` — no `any`. The session continues to carry the typed `Role`. | ✅ PASS |
| **V. Server-Authoritative Authorization** | `/team` is guarded by (a) `src/proxy.ts` matcher (carry-over redirects unauth), (b) the `(team)` layout calling `requireManagerContext()`, AND (c) every team-management Server Action calling `requireManagerContext()` on entry. Client-side role checks are presentation-only. Auth.js `authorize()` rejects `isActive: false` users — deactivation enforced at the auth boundary, not at the page. | ✅ PASS |

**Gate verdict**: All five principles pass. Complexity Tracking section
remains empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-employee-management/
├── spec.md
├── plan.md              # This file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── pages.md
│   └── server-actions.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (not created here)
```

### Source Code (delta against Phase 0)

```text
agendrix/
├── prisma/
│   ├── schema.prisma                          # ★ User gains isActive
│   └── migrations/
│       ├── <init>/                            # from Phase 0
│       └── <add_user_is_active>/migration.sql # ★ new
├── src/
│   ├── app/
│   │   └── (dashboard)/
│   │       └── team/
│   │           ├── layout.tsx                  # ★ MANAGER-only gate
│   │           ├── page.tsx                    # ★ team list
│   │           └── _components/                # ★ feature-local UI
│   │               ├── InviteEmployeeDialog.tsx
│   │               ├── EditEmployeeDialog.tsx
│   │               └── TeamTable.tsx
│   ├── actions/
│   │   ├── team/
│   │   │   ├── invite.ts                       # ★ inviteEmployeeAction
│   │   │   ├── update.ts                       # ★ updateEmployeeAction
│   │   │   └── set-active.ts                   # ★ setUserActiveAction
│   │   └── ... (Phase 0 actions unchanged)
│   ├── lib/
│   │   ├── repositories/
│   │   │   └── user.ts                         # ★ extended with new fns
│   │   ├── temp-password.ts                    # ★ generate
│   │   └── session.ts                          # already exposes requireManagerContext
│   ├── components/
│   │   └── ui/
│   │       ├── dialog.tsx                      # ★ shadcn dialog (new)
│   │       ├── table.tsx                       # ★ shadcn table (new)
│   │       └── badge.tsx                       # ★ shadcn badge (new)
│   ├── auth.ts                                  # ★ authorize() rejects isActive: false
│   └── ... (everything else unchanged)
```

**Structure Decision**: Phase 1 is purely additive on top of Phase 0's tree.
The `/team` route lives under the existing `(dashboard)` group so it
inherits the dashboard layout (header, logout button). Team-management
Server Actions live under `src/actions/team/` so they are grouped by
domain. Feature-local components stay under
`src/app/(dashboard)/team/_components/` (underscore prefix = not a route)
adjacent to the page that uses them; only widely-reused shadcn primitives
live under `src/components/ui/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. Section intentionally empty.

## Post-Design Re-Check

After completing Phase 1 design (data-model, contracts, quickstart),
re-evaluated against the constitution:

- The new `isActive` field and the Auth.js `authorize()` rejection of
  deactivated users are the simplest way to satisfy FR-014 + SC-003 without
  introducing a separate "session revocation" mechanism — keeps Principle
  III intact.
- The `requireManagerContext()` helper from Phase 0 is reused verbatim;
  no new authorization primitive is invented — Principle III again.
- The "≥ 1 active MANAGER" invariant is checked inside the repository
  function (`setUserActiveStatus`, `updateUserById`) under the SAME
  transaction that performs the change — Principle I (single central
  enforcement point) preserved.
- The temp password generator (`src/lib/temp-password.ts`) returns the
  plaintext exactly once to its caller and writes only the bcryptjs hash
  to the DB. No call site logs or persists the plaintext. The Server
  Action returns it inside the action's state object so the client UI
  can flash it; nothing writes it to disk on the server.
- `quickstart.md` includes adversarial smoke tests: EMPLOYEE trying to
  load `/team`, MANAGER trying to deactivate themselves, MANAGER trying
  to demote the last MANAGER — concrete validation of Principles I + V.

Gate remains: ✅ PASS.
