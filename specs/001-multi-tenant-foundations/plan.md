# Implementation Plan: Multi-Tenant Foundations

**Branch**: `001-multi-tenant-foundations` | **Date**: 2026-05-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-multi-tenant-foundations/spec.md`

## Summary

Stand up the multi-tenant foundations of Agendrix: a visitor can found a company
(atomic creation of `Company` + first `MANAGER` `User`), an existing user can sign
in and out, and a protected dashboard demonstrates the tenant-isolation
invariant — users only ever see their own company's data, enforced by a single
central scoping mechanism rather than by convention.

Technical approach: a Next.js 16 App Router application with TypeScript strict,
Prisma 6 on Postgres (Neon), Auth.js v5 Credentials + JWT sessions, and a
central `requireTenantContext()` helper that every repository function in
`src/lib/repositories/*` consumes — pages, Server Actions, and route handlers
MUST go through these repositories, never call Prisma directly. shadcn/ui
provides the UI primitives. bcryptjs hashes passwords.

## Technical Context

**Language/Version**: TypeScript (strict) on Next.js 16 (App Router, Turbopack), Node.js 24

**Primary Dependencies**: Next.js 16, React 19, Prisma 6 (NOT 7 — see research.md), Auth.js v5 (`next-auth@beta`) with Credentials provider, Tailwind CSS v4, shadcn/ui (new-york style), bcryptjs, zod

**Storage**: PostgreSQL hosted on Neon for development (`DATABASE_URL` in `.env`, gitignored). Schema migrations checked into `prisma/migrations/`.

**Testing**: Manual browser smoke tests for Phase 0 (per Constitution III: tests OPTIONAL unless explicitly requested in the feature spec; this spec did not request automated tests).

**Target Platform**: Web — modern desktop and mobile browsers (Chrome, Firefox, Safari, Edge — current and previous major version).

**Project Type**: Single Next.js web application — `src/` directory, `@/*` path alias, App Router with route groups.

**Performance Goals**:
- New visitor signup-to-dashboard < 90 s end-to-end (per SC-001)
- Returning user login-to-dashboard < 30 s (per SC-002)
- Unauthenticated → login redirect in < 500 ms for 99% of requests (per SC-004)

**Constraints**:
- 100% tenant isolation: zero cross-company data leaks under adversarial test (per SC-003 + FR-017/18/19)
- Atomic signup: no orphan `Company`-without-`MANAGER` ever observable (per SC-006 + FR-002)
- Account-enumeration-resistant login responses (per SC-005 + FR-010)
- `DATABASE_URL` and `AUTH_SECRET` never committed

**Scale/Scope**: MVP — single hosted instance, handful of test companies, ≤100 users in early use. Phase 0 ships 3 user stories and 19 functional requirements.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.0.0 ratified 2026-05-28. Five non-negotiable principles to gate against:

| Principle | How this plan satisfies it | Verdict |
|-----------|---------------------------|---------|
| **I. Multi-Tenant Isolation (NON-NEGOTIABLE)** | Every tenant-scoped query routes through `src/lib/repositories/*` functions accepting a `TenantContext`. Pages and Server Actions never touch Prisma directly. `requireTenantContext()` reads the verified JWT session and is the SINGLE source of `companyId`. | ✅ PASS |
| **II. Specification-Driven Development (NON-NEGOTIABLE)** | This plan is the output of `/speckit-plan` operating on a `/speckit-specify` artifact, after `/speckit-constitution`. Implementation will be driven by `/speckit-tasks` → `/speckit-implement`. | ✅ PASS |
| **III. Simplicity First (YAGNI)** | Single Next.js app, no monorepo, no service split. Single Prisma database, no read replicas. No feature flags. No automated tests yet (manual smoke per Constitution). `Session` entity uses JWT (no DB session table). | ✅ PASS |
| **IV. Type Safety End-to-End** | TypeScript `strict: true`. Domain types derived from Prisma's generated client and Zod schemas. JWT and Session interfaces augmented (module declaration in `src/auth.ts`) so `token.companyId` is typed `string`, not `unknown`. No `any`, no `!` outside justified edges. | ✅ PASS |
| **V. Server-Authoritative Authorization** | `proxy.ts` redirects unauthenticated dashboard requests. `requireTenantContext()` enforces "must be signed in" on every page/action that needs tenant scope. Client forms cannot bypass these — they call Server Actions that re-check on the server. Role + `companyId` come from the verified JWT only, never from form input. | ✅ PASS |

**Gate verdict**: All five principles pass with no violations. The Complexity
Tracking section below is intentionally empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-multi-tenant-foundations/
├── spec.md              # Feature specification (output of /speckit-specify)
├── plan.md              # This file (output of /speckit-plan)
├── research.md          # Phase 0: stack decisions + rationale + alternatives
├── data-model.md        # Phase 1: Company, User, Session entities + relationships
├── quickstart.md        # Phase 1: how to run + smoke-test this feature
├── contracts/           # Phase 1: route + Server Action contracts
│   ├── pages.md         # User-facing routes
│   └── server-actions.md # Server Action input/output contracts
├── checklists/
│   └── requirements.md  # Spec quality gate (output of /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Single Next.js application — App Router, `src/` directory, `@/*` path alias.

```text
agendrix/
├── prisma/
│   ├── schema.prisma                    # Company, User, Role enum
│   └── migrations/
│       └── 0001_init/migration.sql
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx           # /login
│   │   │   └── signup/page.tsx          # /signup
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx               # header (company name + logout button), guards on auth
│   │   │   └── dashboard/page.tsx       # /dashboard — exercises requireTenantContext()
│   │   ├── api/auth/[...nextauth]/route.ts  # NextAuth handler
│   │   ├── layout.tsx                   # root layout
│   │   └── page.tsx                     # landing
│   ├── lib/
│   │   ├── db.ts                        # PrismaClient singleton
│   │   ├── session.ts                   # requireTenantContext(), requireManagerContext()
│   │   ├── utils.ts                     # cn()
│   │   └── repositories/                # ALL tenant-scoped data access lives here
│   │       ├── company.ts               # getCurrentCompany(ctx)
│   │       └── user.ts                  # listUsersInCompany(ctx), getCurrentUser(ctx)
│   ├── actions/                         # Server Actions
│   │   ├── login.ts                     # loginAction
│   │   ├── logout.ts                    # logoutAction
│   │   └── signup.ts                    # signupAction (creates Company + MANAGER atomically)
│   ├── components/
│   │   ├── LoginForm.tsx                # client form -> loginAction
│   │   ├── LogoutButton.tsx             # form -> logoutAction
│   │   ├── SignupForm.tsx               # client form -> signupAction
│   │   └── ui/                          # shadcn (Button, Input, Label, Card)
│   ├── auth.ts                          # NextAuth config + JWT/Session type augmentation
│   ├── proxy.ts                         # Next 16 middleware (renamed): redirects unauth to /login
│   └── generated/prisma/                # generated Prisma client (gitignored)
├── .env                                  # DATABASE_URL + AUTH_SECRET (gitignored)
├── .env.example                          # placeholder template (committed)
├── components.json                       # shadcn config
├── next.config.ts
├── package.json
├── tsconfig.json
└── tailwind.config (implicit, v4 zero-config)
```

**Structure Decision**: Single Next.js App Router project. No backend/frontend
split (Next 16 unifies them via Server Components + Server Actions). All
tenant-scoped data access funnels through `src/lib/repositories/*` accepting
a `TenantContext` from `src/lib/session.ts` — this is the structural enforcement
of Principle I. Auth lives in `src/auth.ts` (config + handlers exported); the
route handler at `app/api/auth/[...nextauth]/route.ts` re-exports the handlers.
`src/proxy.ts` is the Next 16 equivalent of `middleware.ts` (file renamed in
Next 16; the export shape is unchanged).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations to justify. All five constitutional principles pass on first
evaluation. Re-evaluation after Phase 1 design: see "Post-Design Re-Check"
appendix below.

## Post-Design Re-Check

After completing Phase 1 (data-model, contracts, quickstart), re-evaluated
against the constitution:

- The `Session` entity in `data-model.md` is the JWT payload — no DB table,
  satisfying Principle III's "no premature abstraction" without weakening
  Principle V (the JWT is signed and verified by Auth.js).
- The route + Server Action contracts in `contracts/` reaffirm that every
  authenticated entry point calls `requireTenantContext()` before any data
  access, satisfying Principles I and V.
- `quickstart.md` includes an adversarial test step (try to access Company B's
  dashboard while signed in as Company A) — concrete validation of Principle I.

No new violations surfaced during design. Gate remains: ✅ PASS.
