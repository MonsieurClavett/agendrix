# Phase 0 — Research & Stack Decisions

**Feature**: Multi-Tenant Foundations
**Date**: 2026-05-28

The feature spec contained zero `NEEDS CLARIFICATION` markers — the description
was complete. This document records the stack-level decisions taken so future
phases (and a future maintainer) can see *why* we picked each tool and what we
considered instead.

---

## Decision 1: Web framework

**Decision**: Next.js 16 (App Router, Turbopack, Server Components, Server Actions).

**Rationale**:
- Server Components + Server Actions collapse the "backend vs frontend split"
  into one codebase, which directly supports Constitution Principle III
  (simplicity, one project).
- Built-in middleware (now `proxy.ts` in v16) gives a first-line auth gate
  before any page renders — supports Principle V.
- The team's pre-existing skill is React/Next; switching to anything else
  would burn time the MVP doesn't have.

**Alternatives considered**:
- **Remix**: Comparable feature set, similar Server Action ergonomics, but the
  team has no prior Remix exposure.
- **Plain React + Express**: Loses the unified deployment story, doubles the
  number of TypeScript projects, fails Principle III for an MVP.

---

## Decision 2: ORM

**Decision**: Prisma 6 (specifically `^6.x`; Prisma 7 is FORBIDDEN for the MVP).

**Rationale**:
- Mature generator, well-typed client, good Postgres support, fast Windows
  developer experience.
- Generated types are the source of truth for the application's domain types
  (supports Principle IV — type safety end-to-end).
- `$transaction` supports the atomic Company+User signup (Spec FR-002, SC-006).

**Alternatives considered**:
- **Prisma 7**: Just released. Removed `url` from the `datasource` block and
  requires a `prisma.config.ts` plus a driver adapter (`@prisma/adapter-pg`)
  for the runtime client. Adds setup ceremony with zero MVP-relevant benefit.
  Explicitly rejected in the constitution's stack section.
- **Drizzle ORM**: Lighter, SQL-first, type-safe. Strong choice in principle,
  but Prisma's `migrate dev` UX and broader documentation are decisive at
  MVP velocity.
- **Raw SQL via `pg`**: Maximum control, minimum safety. Fails Principle IV
  outright (hand-written types drift from schema).

---

## Decision 3: Authentication library

**Decision**: Auth.js v5 (`next-auth@beta`) with the Credentials provider,
JWT session strategy.

**Rationale**:
- First-class Next.js 16 App Router support (route handler + middleware).
- JWT strategy avoids a `Session` table — fewer entities, fewer queries per
  request (supports Principle III).
- Credentials provider gives us email + password without an external IdP,
  which is what the spec requires (FR-001/FR-008).
- Module augmentation on `@auth/core/jwt` and `next-auth` lets us type
  `token.companyId` and `session.user.role` as concrete `string` / `Role`,
  satisfying Principle IV.

**Alternatives considered**:
- **Lucia**: Smaller, more "library" than framework. Forces us to write more
  glue code (handlers, middleware, callbacks) for the same end state. Trades
  flexibility we don't need at MVP for time.
- **Clerk / Auth0**: External SaaS. Fastest to integrate, but adds cost, a
  third party in the security boundary, and a runtime dependency on a
  network call before every authenticated request.

**Implementation note**: The TypeScript module augmentation MUST target
`@auth/core/jwt` (not `next-auth/jwt`) — the latter cannot be resolved as a
module-augmentation target under `moduleResolution: bundler`. The
augmentation block lives inside `src/auth.ts` rather than a separate `.d.ts`
file (more discoverable, fewer surprises).

---

## Decision 4: Password hashing

**Decision**: `bcryptjs` (NOT native `bcrypt`).

**Rationale**:
- Pure JavaScript — no `node-gyp`, no native compile toolchain, no Windows-
  specific build pain.
- Same algorithm as native `bcrypt`; slower per hash, but at MVP traffic the
  difference is invisible.
- Satisfies FR-004's "modern adaptive password hashing function" requirement.

**Alternatives considered**:
- **Native `bcrypt`**: Faster, but requires a compile step that fails on
  Windows without C++ Build Tools. Wrong tradeoff for a solo Windows dev.
- **argon2**: Stronger algorithm (memory-hard), but ships as a native module
  with the same toolchain pain. Defer until we have a security reason to
  upgrade.

---

## Decision 5: UI components

**Decision**: shadcn/ui (new-york style) on Tailwind v4. Components installed
**manually** (copy source files), NOT via the `shadcn` CLI.

**Rationale**:
- shadcn/ui is unstyled-by-default Radix primitives + Tailwind — perfect for
  an MVP that needs to look passable without a designer.
- "Manual install" means components live in `src/components/ui/` as plain
  source files we can read and edit — supports Principle III (no magic).

**Alternatives considered**:
- **shadcn CLI**: The interactive `shadcn init` and `shadcn add <component>`
  prompts hang in non-interactive shells (PowerShell `-NonInteractive`,
  Claude Code's shell, CI runners). Manual install avoids this entire class
  of problem.
- **Material-UI / Chakra UI**: Heavier component-library style; harder to
  customize precisely; tighter coupling to a design system we don't have.

---

## Decision 6: Database hosting

**Decision**: Neon (managed Postgres, free tier) for dev.

**Rationale**:
- Zero local install (Docker is not on the dev box). Connection string in
  `.env`, application starts, done.
- Real Postgres — no MVP-stage shenanigans with SQLite, no surprises on
  deploy.

**Alternatives considered**:
- **Docker local Postgres**: Docker not installed on the dev box; user
  declined the install (~700 MB download, sometimes requires a reboot).
- **Supabase**: Equivalent free tier. Picked Neon arbitrarily — both would
  have worked.
- **Native Windows Postgres install**: Possible, but install ceremony and
  service-management friction won't pay off for a project of this size.

---

## Decision 7: Tenant scoping mechanism

**Decision**: Explicit `TenantContext` parameter to repository functions in
`src/lib/repositories/*`. Pages, Server Actions, and route handlers MUST
import from this layer; direct `db.company.*` / `db.user.*` calls are
forbidden outside `src/lib/repositories/`.

**Rationale**:
- The filter is visible at every call site (`{ where: { companyId: ctx.companyId } }`),
  which is reviewable in a diff.
- A grep for `db.` outside `src/lib/repositories/` immediately surfaces any
  violation — the rule is enforceable mechanically.
- No `as` casts or runtime magic; pure TypeScript types carry the constraint.
- Satisfies Principle I (NON-NEGOTIABLE).

**Alternatives considered**:
- **Prisma Client Extension (`$extends`) auto-injecting `companyId`**: Magic.
  Hides the filter from the call site. Harder to audit. Fails the
  "structurally prevented, not merely conventional" bar in FR-018 if the
  extension is ever forgotten or bypassed.
- **Row Level Security at the Postgres layer**: The strongest defense in
  depth, but requires `SET app.current_company` on every connection — which
  the connection-pooled Neon serverless driver doesn't make easy. Defer to
  a later phase if the threat model warrants it.

---

## Decision 8: Testing posture for Phase 0

**Decision**: Manual browser smoke tests only. No automated tests in Phase 0.

**Rationale**:
- Constitution III (YAGNI) and the constitution's explicit guidance:
  "automated tests are OPTIONAL and only added when explicitly requested in
  a spec". This spec did not request them.
- Manual smoke covers: signup flow, login/logout, unauthenticated redirect,
  cross-tenant adversarial check.

**Alternatives considered**:
- **Playwright E2E suite**: High value long-term; not free to set up. Add
  in Phase 1+ when adding features beyond the dashboard.
- **Vitest unit tests for repositories**: Repos are 3-line Prisma wrappers
  at this stage; the test would be testing Prisma itself.

---

## Open Questions

None. All NEEDS CLARIFICATION items from the spec validation pass (there
were none). Stack is locked for Phase 0.
