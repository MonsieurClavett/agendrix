<!--
Sync Impact Report
==================
Version change: TEMPLATE (uninitialized) → 1.0.0
Rationale: Initial ratification — first concrete constitution for the Agendrix project.

Modified principles: N/A (initial creation)
Added sections:
  - Core Principles (I–V)
  - Technology Stack & Architecture Constraints
  - Development Workflow
  - Governance
Removed sections: None

Templates requiring updates:
  - .specify/templates/plan-template.md  ✅ verified (Constitution Check gate stays generic; will be filled per-plan)
  - .specify/templates/spec-template.md  ✅ verified (no constitution references)
  - .specify/templates/tasks-template.md ✅ verified (no constitution references)
  - CLAUDE.md                            ✅ verified (already aligned with principles I, II, III)

Follow-up TODOs: None
-->

# Agendrix Constitution

## Core Principles

### I. Multi-Tenant Isolation (NON-NEGOTIABLE)

Every tenant-scoped database table MUST carry a `companyId` column. All read and write
access to tenant data MUST flow through a central tenant-context helper
(`requireTenantContext()` / `requireManagerContext()`) and through repository functions
that accept a `TenantContext` and inject `where: { companyId: ctx.companyId }` into every
query. Pages, Server Actions, route handlers, and middleware MUST NOT call the ORM
directly for tenant-scoped tables — they MUST go through the repository layer.

**Rationale**: In a B2B SaaS, a single missed `WHERE companyId = ?` clause is a
product-ending defect. Centralizing tenant filtering in one layer eliminates the entire
class of "forgot the where clause" bugs and makes the security argument auditable in one
folder (`src/lib/repositories/`).

### II. Specification-Driven Development (NON-NEGOTIABLE)

Every feature MUST follow the Spec Kit pipeline in order:
`/speckit-constitution` → `/speckit-specify` → `/speckit-clarify` (when ambiguous) →
`/speckit-plan` → `/speckit-tasks` → `/speckit-implement`. Code MUST trace back to a
spec; specs MUST trace back to either a principle in this constitution or an explicit
user-stated value. Bugfixes MAY be committed without a new spec only when scoped under
an existing spec; cleanup commits MUST cite the spec they support.

**Rationale**: The project is delivered as part of an academic assignment that grades
SDD discipline. The pipeline also keeps scope honest by forcing the question "what is
this for?" before any code is written.

### III. Simplicity First (YAGNI)

Prefer standard, well-documented solutions over clever or trendy ones. Do NOT add
abstractions, error handlers, fallbacks, configuration options, or feature flags for
scenarios that do not yet exist. Three similar lines of code beat one premature
abstraction. Half-finished implementations and "we might need it later" code are
forbidden.

**Rationale**: This is an MVP maintained by a solo developer with finite time. Each
piece of unjustified complexity is a unit of future maintenance that won't be paid for.
Over-engineering is the most common failure mode of student SaaS projects.

### IV. Type Safety End-to-End

TypeScript MUST be configured with `strict: true`. Use of `any`, non-null assertions
(`x!`), and unsafe casts (`x as Foo` to bypass real type checks) is forbidden outside
edge cases that MUST be justified in the surrounding commit message. Domain types MUST
be derived from the database schema (Prisma) or Zod schemas — never hand-rolled twice on
the client and server.

**Rationale**: The multi-tenant guarantee in Principle I depends on `TenantContext`
flowing through the type system from session to query. Weakening the types weakens the
security argument. Type errors caught at compile time cost minutes; the same bug caught
in production costs days.

### V. Server-Authoritative Authorization

Authentication and authorization checks MUST occur server-side (in Server Components,
Server Actions, route handlers, and middleware/proxy). Client-side gating exists for UX
only and MUST NOT be relied upon for security. The user's identity, role, and
`companyId` MUST come from the session token verified by the auth library — never from
a request body, query string, header, or cookie payload outside that verified envelope.

**Rationale**: Client code is attacker-controlled. One missed server-side check is a
privilege-escalation or cross-tenant data-leak vulnerability. The fastest reliable place
to enforce this is at the data-access boundary (Principle I) plus the page/route entry
points.

## Technology Stack & Architecture Constraints

The following stack is fixed for the duration of the MVP. Deviations require a
constitutional amendment with a written rationale.

- **Framework**: Next.js 16 (App Router, Turbopack, `src/` directory, `@/*` path alias).
- **Language**: TypeScript with `strict: true`.
- **Styling**: Tailwind CSS v4 + shadcn/ui components (installed manually — the
  interactive CLI does not work in non-interactive shells).
- **Database**: PostgreSQL hosted on Neon for development. `DATABASE_URL` lives in
  `.env`, which is gitignored.
- **ORM**: Prisma 6. Prisma 7 is explicitly forbidden in MVP scope (removed `url` from
  datasource, requires driver adapters — added friction without MVP-relevant value).
- **Auth**: Auth.js v5 (`next-auth@beta`) with the Credentials provider and JWT session
  strategy. Module augmentation MUST be done against `@auth/core/jwt`, not
  `next-auth/jwt`.
- **Password hashing**: `bcryptjs` (pure JS — avoids `node-gyp` toolchain on Windows).
- **Repository shape**: one repository, one application. No monorepo.
- **Source layout**: `src/app/` for routes (with `(auth)` and `(dashboard)` route
  groups), `src/lib/` for shared utilities and the repositories, `src/actions/` for
  Server Actions, `src/components/` for components, `src/proxy.ts` for the auth guard
  (Next 16 renamed `middleware.ts` → `proxy.ts`).

## Development Workflow

- All feature work MUST start with `/speckit-specify` on a fresh feature branch created
  via `/speckit-git-feature`. Direct work on `main` is forbidden except for amendments
  to this constitution.
- Each Spec Kit phase auto-prompts for a commit via the configured git extension hooks.
  Accept these commits — they form the SDD audit trail the assignment is graded on.
- The implementation plan (`/speckit-plan`) MUST include a "Constitution Check" section
  that names which principles the feature touches and whether any planned complexity
  requires an entry in the "Complexity Tracking" table.
- Prisma migrations are checked into `prisma/migrations/`. Schema changes MUST go
  through a migration — no `db push` in committed work.
- `CLAUDE.md` at the project root carries runtime guidance for the coding agent
  (environment state, install gotchas, agent-specific tips). It is NOT a substitute for
  this constitution; if the two conflict, this constitution wins.
- Testing posture for MVP: manual browser smoke tests at the end of each story are
  acceptable. Automated tests are OPTIONAL and only added when explicitly requested in
  a spec. When added, they MUST exercise real database calls for the repository layer
  (the multi-tenant guarantee in Principle I is meaningless against mocked tables).

## Governance

This constitution supersedes any ad-hoc preference expressed during a single
conversation. Where a chat instruction conflicts with a principle, the principle wins
unless the user explicitly amends the constitution in the same turn.

Amendments require:

1. A written rationale in the amendment commit message.
2. A version bump following semantic versioning:
   - **MAJOR**: a principle is removed, redefined incompatibly, or governance changed in
     a backward-incompatible way.
   - **MINOR**: a new principle or section is added, or guidance is materially expanded.
   - **PATCH**: clarifications, wording fixes, typos — no semantic change.
3. A Sync Impact Report (HTML comment at the top of this file) listing modified
   principles, added/removed sections, templates updated, and any deferred TODOs.
4. Propagation to `.specify/templates/*` and `CLAUDE.md` as needed.

All plans produced via `/speckit-plan` MUST pass the Constitution Check gate before
proceeding to Phase 0 research, and MUST be re-checked after Phase 1 design. Any
violation MUST be justified in the plan's "Complexity Tracking" table or the plan MUST
be revised to remove the violation.

Runtime development guidance for the coding agent lives in `CLAUDE.md`.

**Version**: 1.0.0 | **Ratified**: 2026-05-28 | **Last Amended**: 2026-05-28
